import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../_site/', import.meta.url));
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/paper-list/')) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice('/paper-list/'.length)) || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root)) { res.writeHead(403).end(); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': target.endsWith('.html') ? 'text/html; charset=utf-8' : target.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(4173, '127.0.0.1');
