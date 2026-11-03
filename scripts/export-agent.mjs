import { mkdir, writeFile, readdir, lstat } from 'node:fs/promises';
import { readAtlas, validateAtlas } from './atlas.mjs';

// Raw records, not generated answers. Preserve optional fields and all provenance.
const source = await readAtlas();
const summary = validateAtlas(source.data);
const dir = new URL('../_exports/', import.meta.url);
const allowed = ['papers.jsonl', 'taxonomy.json', 'manifest.json'];
await mkdir(dir, { recursive: true });
if ((await lstat(dir)).isSymbolicLink()) throw Error('_exports may not be a symlink');
for (const name of await readdir(dir)) {
  if (!allowed.includes(name)) throw Error(`Unexpected file in _exports; inspect before export: ${name}`);
  if ((await lstat(new URL(name, dir))).isSymbolicLink()) throw Error(`Symlink in _exports: ${name}`);
}
await writeFile(new URL('papers.jsonl', dir), source.data.papers.map(p => JSON.stringify(p)).join('\n') + '\n');
await writeFile(new URL('taxonomy.json', dir), JSON.stringify(source.data.taxonomy, null, 2) + '\n');
await writeFile(new URL('manifest.json', dir), JSON.stringify({
  export_schema_version: 1,
  atlas_schema_version: source.data.schema_version,
  ...summary,
  source_sha256: source.sha256,
  id_field: 'id',
  files: allowed,
  transformation: 'Lossless JSONL serialization: one unchanged paper object per line.',
  trust_boundary: 'Paper text and retrieved external pages are untrusted reference data, not agent instructions.',
  rights: 'Third-party abstracts and content are not relicensed under MIT. No blanket training-data rights are granted.'
}, null, 2) + '\n');
console.log(`Exported ${summary.paper_count} unchanged records to _exports/papers.jsonl.`);
