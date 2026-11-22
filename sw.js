// Service worker: permite instalar la app y abrirla aunque falle el internet
const VERSION = 'hv-1.1.1';
const SHELL = ['./', 'index.html', 'css/estilos.css', 'js/core.js', 'js/pedidos.js', 'js/catalogo.js', 'js/negocio.js', 'config.js', 'manifest.json', 'img/logo.jpg', 'img/logo-sello.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase y CDNs van directo
  const esImagen = /\.(jpg|jpeg|png|webp|gif)$/i.test(url.pathname);
  if (esImagen) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copia = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return res;
    })));
  } else {
    e.respondWith(fetch(e.request).then(res => {
      const copia = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  }
});
