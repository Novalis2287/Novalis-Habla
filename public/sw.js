// Permite instalar la app y abrirla aunque falle la conexión.
// Solo guarda los archivos de la propia app; los datos de pacientes nunca se guardan aquí.
const CACHE = 'novalis-habla-v2';
// Páginas que abre el paciente (documentos, enlaces de la clínica y páginas personales): siempre por la red, nunca guardadas.
const PAGINAS = /^\/(d|p)\/|^\/(ubicacion|conocenos|instagram|facebook)\/?$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(claves => Promise.all(claves.filter(c => c !== CACHE).map(c => caches.delete(c)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Esas páginas y todo lo que no sea de la app van siempre por la red.
  if (e.request.method !== 'GET' || url.origin !== location.origin || PAGINAS.test(url.pathname)) return;
  // Primero la red (para tener siempre la última versión); si no hay conexión, la copia guardada.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  );
});
