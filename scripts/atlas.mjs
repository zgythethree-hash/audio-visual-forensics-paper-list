import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

export const SOURCE = new URL('../atlas-share-latest.html', import.meta.url);
export const GROUPS = ['paper_types', 'tasks', 'techniques', 'properties'];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const normalizeTitle = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const normalizeArxiv = value => value.replace(/^https?:\/\/(?:export\.)?arxiv\.org\/(?:abs|pdf)\//i, '').replace(/\.pdf$/i, '').replace(/v\d+$/i, '').trim();
export const normalizeDoi = value => value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim().toLowerCase();
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
export function safeURL(value) {
  if (typeof value !== 'string' || /[\s<>]/u.test(value)) return false;
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password; }
  catch { return false; }
}
export function parseAtlas(html) {
  const matches = [...html.matchAll(/<script\b(?=[^>]*\bid=["']atlas-data["'])[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  assert(matches.length === 1, 'Expected exactly one atlas-data script');
  assert(!/<\/script/i.test(matches[0][1]), 'Unsafe JSON script boundary');
  const data = JSON.parse(matches[0][1]);
  assert(object(data) && Array.isArray(data.papers), 'atlas-data.papers must be an array');
  return data;
}
export async function readAtlas(file = SOURCE) {
  const bytes = await readFile(file);
  const html = bytes.toString('utf8');
  return { bytes, html, data: parseAtlas(html), sha256: sha256(bytes) };
}
export function serializeAtlas(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
export function validDate(value) {
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 2100 || (m !== undefined && (m < 1 || m > 12))) return false;
  return d === undefined || (d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate());
}
export function summarize(data) {
  return {
    data_version: data.version,
    updated_at: data.updated_at,
    paper_count: data.papers.length,
    domains: Object.fromEntries(data.taxonomy.domains.map(d => [d.id, data.papers.filter(p => p.primary_domain === d.id).length])),
    missing: Object.fromEntries(['authors', 'abstract', 'venue', 'publication'].map(f => [f, data.papers.filter(p => Array.isArray(p[f]) ? !p[f].length : !p[f]).length]))
  };
}
export function validateAtlas(data) {
  assert(data.schema_version === 2, 'Unexpected schema_version; review migrations explicitly');
  assert(object(data.taxonomy) && object(data.stats), 'Missing taxonomy/stats');
  const groups = ['domains', ...GROUPS];
  for (const group of groups) {
    const list = data.taxonomy[group];
    assert(Array.isArray(list) && list.length > 0, `Missing taxonomy ${group}`);
    assert(list.every(t => typeof t.id === 'string' && typeof t.label === 'string'), `Invalid taxonomy ${group}`);
    assert(new Set(list.map(t => t.id)).size === list.length, `Duplicate taxonomy ID: ${group}`);
  }
  const domains = new Set(data.taxonomy.domains.map(t => t.id));
  for (const field of ['id', 'doi', 'arxiv_id', 'title']) {
    const seen = new Map();
    for (const p of data.papers) {
      const v = p[field];
      assert(v === undefined || typeof v === 'string', `${p.id}: ${field} must be a string`);
      if (!v) continue;
      const k = field === 'title' ? normalizeTitle(v) : field === 'doi' ? normalizeDoi(v) : field === 'arxiv_id' ? normalizeArxiv(v) : v;
      assert(!seen.has(k), `Duplicate ${field}: ${p.id} and ${seen.get(k)}`);
      seen.set(k, p.id);
    }
  }
  for (const p of data.papers) {
    assert(/^p-[a-f0-9]{16}$/.test(p.id), `Invalid paper ID: ${p.id}`);
    assert(typeof p.title === 'string' && p.title.trim(), `${p.id}: missing title`);
    assert(Number.isInteger(p.year) && p.year >= 1900 && p.year <= 2100, `${p.id}: invalid year`);
    assert(typeof p.abstract === 'string' && typeof p.venue === 'string', `${p.id}: abstract/venue types`);
    for (const field of ['authors', ...GROUPS, 'training_modalities', 'inference_modalities', 'urls']) {
      assert(Array.isArray(p[field]) && p[field].every(v => typeof v === 'string'), `${p.id}: ${field} must be a string array`);
    }
    for (const field of ['source_records', 'classification_evidence']) {
      assert(Array.isArray(p[field]) && p[field].length && p[field].every(object), `${p.id}: missing ${field}`);
    }
    for (const field of ['original_ids', 'original_branches', 'rejected_arxiv_ids', 'rejected_urls']) {
      if (field in p) assert(Array.isArray(p[field]) && p[field].every(v => typeof v === 'string'), `${p.id}: invalid ${field}`);
    }
    assert(domains.has(p.primary_domain), `${p.id}: invalid primary_domain`);
    for (const field of GROUPS) {
      const allowed = new Set(data.taxonomy[field].map(t => t.id));
      assert(p[field].every(v => allowed.has(v)), `${p.id}: unknown ${field} ID`);
    }
    assert(object(p.links) && Array.isArray(p.links.code), `${p.id}: links.code must remain an array`);
    for (const [field, value] of Object.entries(p.links)) {
      if (['paper', 'pdf', 'project', 'arxiv'].includes(field)) assert(typeof value === 'string', `${p.id}: links.${field} must be a string`);
      const values = Array.isArray(value) ? value : [value];
      for (const u of values) {
        assert(typeof u === 'string' && (!u || safeURL(u)), `${p.id}: invalid resource URL`);
        assert(!p.rejected_urls?.includes(u), `${p.id}: rejected URL restored`);
        if (u.includes('arxiv.org/')) assert(!p.rejected_arxiv_ids?.map(normalizeArxiv).includes(normalizeArxiv(u)), `${p.id}: rejected arXiv URL restored`);
      }
    }
    assert(!p.arxiv_id || !p.rejected_arxiv_ids?.map(normalizeArxiv).includes(normalizeArxiv(p.arxiv_id)), `${p.id}: rejected arXiv restored`);
    for (const f of ['first_published', 'publication_date', 'arxiv_first_submitted', 'updated', 'checked_at', 'conference_date']) {
      if (p[f]) assert(typeof p[f] === 'string' && validDate(p[f]), `${p.id}: invalid date ${f}`);
    }
    if (p.abstract_kind) assert(['summary', 'original'].includes(p.abstract_kind), `${p.id}: unknown abstract_kind`);
  }
  const s = summarize(data);
  assert(data.count === s.paper_count && data.stats.final_papers === s.paper_count, 'Stored paper counts differ from actual data');
  for (const [k, v] of Object.entries(s.domains)) assert(data.stats.domains[k] === v, `Domain count mismatch: ${k}`);
  for (const [field, count] of Object.entries(s.missing)) {
    const key = { authors: 'missing_authors', abstract: 'missing_abstracts', venue: 'missing_venues', publication: 'missing_publications' }[field];
    if (key in data.stats) assert(data.stats[key] === count, `Missing-field count mismatch: ${key}`);
  }
  assert(validDate(data.updated_at), 'Invalid dataset update date');
  return s;
}
export function validatePage(html) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert(new Set(ids).size === ids.length, 'Duplicate HTML id');
  assert(!/<script[^>]+src\s*=|<link[^>]+rel=["']stylesheet/i.test(html), 'Runtime must remain self-contained');
  let count = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/application\/json/i.test(m[1])) continue;
    new Script(m[2], { filename: `inline-${++count}.js` });
  }
  assert(count > 0, 'Missing rendering script');
  const nav = html.match(/<nav\b[^>]*class="research-hub"[\s\S]*?<\/nav>/)?.[0];
  assert(nav, 'Missing research navigation');
  const links = [...nav.matchAll(/<a\b([^>]+)>/g)];
  assert(links.length === 13, 'Expected 12 conference entries plus AI Safety HOT');
  assert(nav.includes('https://aisafetyhot.com/zh'), 'AI Safety HOT URL changed');
  for (const [, attrs] of links) {
    assert(/target="_blank"/.test(attrs) && /rel="[^"]*noopener[^"]*noreferrer/.test(attrs), 'External navigation link lacks isolation');
  }
  return { inline_scripts: count, navigation_links: links.length };
}
export function validatePreservation(before, after) {
  const current = new Map(after.papers.map(p => [p.id, p]));
  for (const p of before.papers) {
    const q = current.get(p.id);
    assert(q, `Existing ID removed without explicit migration: ${p.id}`);
    for (const field of Object.keys(p)) assert(field in q, `${p.id}: optional field removed: ${field}`);
    for (const field of ['source_records', 'classification_evidence', 'original_ids', 'original_branches', 'rejected_arxiv_ids', 'rejected_urls', 'identity_conflict']) {
      if (Array.isArray(p[field])) assert(JSON.stringify(q[field]?.slice(0, p[field].length)) === JSON.stringify(p[field]), `${p.id}: history changed: ${field}`);
    }
    if (p.title_correction) assert(JSON.stringify(q.title_correction) === JSON.stringify(p.title_correction), `${p.id}: title correction history overwritten`);
    const full = JSON.stringify(q);
    for (const value of Object.values(p.links)) for (const u of Array.isArray(value) ? value : [value]) {
      if (u) assert(full.includes(JSON.stringify(u).slice(1, -1)), `${p.id}: former link lost instead of retained in history`);
    }
  }
  return { old_ids_retained: before.papers.length };
}
