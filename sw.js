// Service worker · Hilda VelPer v1.3.0
// Permite instalar la app, abrirla sin internet y mostrar avisos de tareas.
const VERSION = 'hv-1.3.0';
const SHELL = ['./', 'index.html', 'css/estilos.css', 'js/core.js', 'js/pedidos.js', 'js/catalogo.js', 'js/negocio.js', 'js/extras.js', 'js/tanda2.js',
               'config.js', 'manifest.json', 'img/logo.jpg', 'img/logo-sello.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'hv-avisos').map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  }
});

/* ---------- AVISOS ---------- */
// La app guarda las tareas de los próximos 14 días en la caché "hv-avisos".
// Android despierta este código más o menos una vez al día (cuando la app está instalada).
async function revisarAvisos() {
  const c = await caches.open('hv-avisos');
  const r = await c.match('avisos.json'); if (!r) return;
  const { tareas = [] } = await r.json();
  const d = new Date(); const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const ya = await c.match('avisados.json'); const avisados = ya ? await ya.json() : {};
  if (avisados[hoy]) return;
  const deHoy = tareas.filter(t => t.fecha <= hoy);
  if (deHoy.length) {
    await self.registration.showNotification(`Hilda VelPer · ${deHoy.length} pendiente${deHoy.length === 1 ? '' : 's'} para hoy`, {
      body: deHoy.slice(0, 4).map(t => '• ' + t.titulo + (t.hora ? ' (' + t.hora + ')' : '')).join('\n'),
      icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'hv-hoy', data: { url: './#/hoy' }
    });
  }
  avisados[hoy] = true;
  await c.put('avisados.json', new Response(JSON.stringify(avisados)));
}
self.addEventListener('periodicsync', e => { if (e.tag === 'hv-avisos') e.waitUntil(revisarAvisos()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './#/hoy';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
