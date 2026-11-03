import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const docs = ['README.md', 'README.en.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', ...(await readdir(path.join(root, 'docs'))).filter(f => f.endsWith('.md')).map(f => `docs/${f}`)];

test('public documentation has balanced fences and portable local links', async () => {
  for (const name of docs) {
    const text = await readFile(path.join(root, name), 'utf8');
    assert.equal((text.match(/^```/gm) || []).length % 2, 0, `Unbalanced Markdown fence: ${name}`);
    assert(!/[A-Z]:[\\/](?:Users|zgy)\b/.test(text), `Private machine path: ${name}`);
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(target)) continue;
      await access(path.resolve(root, path.dirname(name), target.split('#')[0]));
    }
  }
});
test('workflow pins action commits and does not deploy pull requests', async () => {
  const text = await readFile(path.join(root, '.github/workflows/pages.yml'), 'utf8');
  const uses = [...text.matchAll(/uses:\s+(\S+)/g)].map(m => m[1]);
  assert(uses.length >= 5 && uses.every(s => /^actions\/[a-z-]+@[0-9a-f]{40}$/.test(s)));
  assert(text.includes("github.event_name != 'pull_request' && github.ref == 'refs/heads/main'"));
  assert(!text.includes('pull_request_target'));
  assert(text.includes('path: _site'));
});
