// Post-traitement de `expo export -p web` : transforme dist/ en PWA installable.
// - manifest.webmanifest + icônes (assets/pwa/*)
// - service worker (sw.js) : cache hors ligne de l'app shell et des bundles
// - balises iOS/Android (apple-touch-icon, theme-color…)
// - 404.html = index.html (routage SPA sur GitHub Pages)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const pwa = JSON.parse(fs.readFileSync(path.join(root, 'pwa.json'), 'utf8'));
const base = (app.experiments?.baseUrl ?? '').replace(/\/$/, '');
const scope = base + '/';

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html introuvable — lancez d’abord `npx expo export -p web`.');
  process.exit(1);
}

// 1. Icônes
const iconDir = path.join(root, 'assets', 'pwa');
for (const f of fs.readdirSync(iconDir)) fs.copyFileSync(path.join(iconDir, f), path.join(dist, f));

// 2. Manifest
const manifest = {
  name: pwa.name,
  short_name: pwa.short_name,
  description: pwa.description,
  lang: pwa.lang ?? 'fr',
  dir: pwa.dir ?? 'auto',
  start_url: scope,
  scope,
  id: scope,
  display: 'standalone',
  orientation: 'portrait',
  theme_color: pwa.theme_color,
  background_color: pwa.background_color,
  categories: pwa.categories ?? [],
  icons: [
    { src: `${scope}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${scope}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${scope}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// 3. Service worker : précache de tous les fichiers exportés
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (!/\.map$/.test(f) && f !== 'sw.js') files.push(scope + path.relative(dist, p).split(path.sep).join('/'));
  }
})(dist);
const version = `${app.slug}-${Date.now().toString(36)}`;
const sw = `// Service worker généré par scripts/pwa.mjs — ${version}
const CACHE = ${JSON.stringify(version)};
const PRECACHE = ${JSON.stringify([scope, ...files.filter((f) => f !== scope + 'index.html'), scope + 'index.html'])};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Réseau d'abord (mises à jour), sinon app shell en cache (hors ligne)
    e.respondWith(fetch(req).catch(() => caches.match(${JSON.stringify(scope + 'index.html')})));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
fs.writeFileSync(path.join(dist, 'sw.js'), sw);

// 4. Injection dans index.html
const head = `
<link rel="manifest" href="${scope}manifest.webmanifest">
<meta name="theme-color" content="${pwa.theme_color}">
<meta name="description" content="${pwa.description.replace(/"/g, '&quot;')}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="${pwa.dark ? 'black-translucent' : 'default'}">
<meta name="apple-mobile-web-app-title" content="${pwa.short_name}">
<link rel="apple-touch-icon" href="${scope}apple-touch-icon.png">
<style>html,body{background:${pwa.background_color}}</style>
<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${scope}sw.js',{scope:'${scope}'}).catch(function(e){console.warn('SW',e)})})}</script>
`;
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
html = html.replace(/<html lang="[^"]*"/, `<html lang="${pwa.lang ?? 'fr'}"`);
html = html.replace(/<title>[^<]*<\/title>/, `<title>${pwa.name}</title>`);
html = html.replace('</head>', head + '</head>');
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(path.join(dist, '404.html'), html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`PWA prête : ${files.length} fichiers précachés, scope ${scope}`);
