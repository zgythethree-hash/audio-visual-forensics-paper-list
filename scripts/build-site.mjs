import { mkdir, readdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { readAtlas, validateAtlas, validatePage } from './atlas.mjs';

// Explicit allowlist: never publish the working directory or research history.
const target = new URL('../_site/', import.meta.url);
const allowed = ['index.html', 'atlas-share-latest.html', 'manifest.json', '.nojekyll', 'LICENSE.txt', 'THIRD_PARTY_NOTICES.txt'];
const source = await readAtlas();
const summary = validateAtlas(source.data);
validatePage(source.html);
await mkdir(target, { recursive: true });
if ((await lstat(target)).isSymbolicLink()) throw Error('_site may not be a symlink');
for (const name of await readdir(target)) {
  if (!allowed.includes(name)) throw Error(`Unexpected file in _site; inspect it before publishing: ${name}`);
  if ((await lstat(new URL(name, target))).isSymbolicLink()) throw Error(`Symlink in _site: ${name}`);
}
for (const name of ['index.html', 'atlas-share-latest.html']) await writeFile(new URL(name, target), source.bytes);
await writeFile(new URL('.nojekyll', target), '');
for (const [input, output] of [['LICENSE', 'LICENSE.txt'], ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.txt']]) {
  await writeFile(new URL(output, target), await readFile(new URL(`../${input}`, import.meta.url)));
}
await writeFile(new URL('manifest.json', target), JSON.stringify({
  ...summary,
  source: 'atlas-share-latest.html',
  source_sha256: source.sha256,
  license_scope: 'MIT applies only to project-owned code. Paper content and third-party resources retain their original rights.',
  generated_from_embedded_data: true
}, null, 2) + '\n');
console.log(`Built _site: ${summary.paper_count} papers; identical HTML bytes; no local research files.`);
