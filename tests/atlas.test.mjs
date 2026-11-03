import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readAtlas, parseAtlas, serializeAtlas, validateAtlas, validatePage, validatePreservation, safeURL, validDate, normalizeArxiv, normalizeDoi } from '../scripts/atlas.mjs';

const source = await readAtlas();
const root = fileURLToPath(new URL('../', import.meta.url));
const clone = () => structuredClone(source.data);
const run = script => execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });

test('current embedded data and self-contained page validate', () => {
  const s = validateAtlas(source.data);
  assert.equal(s.paper_count, source.data.papers.length);
  assert.equal(validatePage(source.html).navigation_links, 13);
});
test('duplicate/missing atlas-data is rejected', () => {
  assert.throws(() => parseAtlas('<html></html>'));
  assert.throws(() => parseAtlas(source.html + source.html));
});
test('safe JSON serialization round-trips HTML and Unicode boundary characters', () => {
  const d = clone();
  d.papers[0].abstract = '</script><script>alert(1)</script> & 中文 \u2028 \u2029';
  const encoded = serializeAtlas(d);
  assert(!encoded.includes('<') && !encoded.includes('&') && !encoded.includes('\u2028'));
  assert.deepEqual(parseAtlas(`<script id="atlas-data" type="application/json">${encoded}</script>`), d);
});
test('code links must be arrays; invalid taxonomy is rejected', () => {
  const d = clone(); d.papers[0].links.code = 'https://example.org/';
  assert.throws(() => validateAtlas(d), /links.code/);
  const e = clone(); e.papers[0].tasks = ['invented'];
  assert.throws(() => validateAtlas(e), /unknown tasks/);
});
test('normalized DOI, arXiv and title duplicates are rejected', () => {
  for (const field of ['doi', 'arxiv_id', 'title']) {
    const d = clone(); const p = d.papers.find(p => p[field]);
    const q = d.papers.find(q => q.id !== p.id);
    q[field] = field === 'doi' ? `https://doi.org/${p[field].toUpperCase()}` : field === 'arxiv_id' ? `${p[field]}v99` : p.title.toUpperCase();
    assert.throws(() => validateAtlas(d), new RegExp(`Duplicate ${field}`));
  }
});
test('rejected resources cannot become active again', () => {
  const d = clone(); d.papers[0].rejected_urls = [d.papers[0].links.paper];
  assert.throws(() => validateAtlas(d), /rejected URL/);
  const e = clone(); e.papers[0].rejected_arxiv_ids = ['2401.12345']; e.papers[0].links.pdf = 'https://arxiv.org/pdf/2401.12345v2';
  assert.throws(() => validateAtlas(e), /rejected arXiv/);
});
test('counts and dates are checked without inventing date precision', () => {
  const d = clone(); d.count++;
  assert.throws(() => validateAtlas(d), /counts differ/);
  assert(validDate('2026') && validDate('2026-10') && validDate('2024-02-29'));
  assert(!validDate('2026-02-29') && !validDate('2026-00') && !validDate('2026-04-31'));
});
test('URL and identity helpers', () => {
  assert(safeURL('https://arxiv.org/abs/2601.12345'));
  for (const u of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pass@example.org', 'https://bad url']) assert(!safeURL(u));
  assert.equal(normalizeArxiv('https://arxiv.org/pdf/2601.12345v2.pdf'), '2601.12345');
  assert.equal(normalizeDoi('https://doi.org/10.1000/ABC'), '10.1000/abc');
});
test('optional fields, stable IDs and provenance are preserved', () => {
  assert.equal(validatePreservation(source.data, clone()).old_ids_retained, source.data.papers.length);
  const d = clone(); d.papers.shift();
  assert.throws(() => validatePreservation(source.data, d), /ID removed/);
  const e = clone(); e.papers[0].source_records = [];
  assert.throws(() => validatePreservation(source.data, e), /history changed/);
  const f = clone(); delete f.papers[0].original_ids;
  assert.throws(() => validatePreservation(source.data, f), /optional field removed/);
});
test('changed primary link must remain reachable through history', () => {
  const before = clone(); before.papers[0].links.project = 'https://example.org/history-only-fixture';
  const after = structuredClone(before); after.papers[0].links.project = 'https://example.org/new-fixture';
  assert.throws(() => validatePreservation(before, after), /former link lost/);
  after.papers[0].urls.push(before.papers[0].links.project);
  assert.doesNotThrow(() => validatePreservation(before, after));
});
test('build publishes only the allowlist and byte-identical HTML', async () => {
  run('scripts/build-site.mjs');
  const files = await readdir(new URL('../_site/', import.meta.url));
  assert.deepEqual(files.sort(), ['.nojekyll', 'LICENSE.txt', 'THIRD_PARTY_NOTICES.txt', 'atlas-share-latest.html', 'index.html', 'manifest.json'].sort());
  for (const file of ['index.html', 'atlas-share-latest.html']) assert.deepEqual(await readFile(new URL(`../_site/${file}`, import.meta.url)), source.bytes);
  const manifest = JSON.parse(await readFile(new URL('../_site/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.source_sha256, source.sha256);
});
test('Agent JSONL export preserves every record and taxonomy', async () => {
  run('scripts/export-agent.mjs');
  const raw = await readFile(new URL('../_exports/papers.jsonl', import.meta.url), 'utf8');
  assert.deepEqual(raw.trimEnd().split('\n').map(x => JSON.parse(x)), source.data.papers);
  assert.deepEqual(JSON.parse(await readFile(new URL('../_exports/taxonomy.json', import.meta.url), 'utf8')), source.data.taxonomy);
  const manifest = JSON.parse(await readFile(new URL('../_exports/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.source_sha256, source.sha256);
});
test('README domain statistics match actual data', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  for (const d of source.data.taxonomy.domains) {
    const count = source.data.papers.filter(p => p.primary_domain === d.id).length;
    assert(readme.includes(`| ${d.label} | \`${d.id}\` | ${count} |`), `${d.id}: update README statistics`);
  }
});
