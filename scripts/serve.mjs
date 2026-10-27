// Sert dist/ en local sous le baseUrl de app.json (ex. http://localhost:8080/famcal/), avec repli SPA.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const base = (JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.experiments?.baseUrl || '').replace(/\/$/, '');
const port = Number(process.env.PORT || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml' };

http
  .createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (base && !p.startsWith(base)) {
      res.writeHead(302, { Location: `${base}/` });
      return res.end();
    }
    p = p.slice(base.length) || '/';
    let file = path.join(dist, p);
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`PWA servie sur http://localhost:${port}${base}/`));
