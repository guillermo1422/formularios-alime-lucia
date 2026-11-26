/* Formularios Alime-Lucia - Service Worker */

const CACHE = 'fal-v1.1.0';
const ARCHIVOS = [
  './',
  'index.html',
  'estilos.css?v=1.1.0',
  'utilidades.js?v=1.1.0',
  'api.js?v=1.1.0',
  'app.js?v=1.1.0',
  'contactos.js?v=1.1.0',
  'documento.js?v=1.1.0',
  'vendor/html5-qrcode.min.js',
  'productos.js?v=1.1.0',
  'escaner.js?v=1.1.0',
  'manifest.json',
  'assets/logo-alime.jpg',
  'assets/logo-lucia.png',
  'assets/icono-192.png',
  'assets/icono-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ARCHIVOS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (clave) {
        if (clave !== CACHE) return caches.delete(clave);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (evento) {
  const solicitud = evento.request;
  if (solicitud.method !== 'GET') return;

  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api') !== -1) return;

  if (solicitud.mode === 'navigate') {
    evento.respondWith(
      fetch(solicitud).then(function (respuesta) {
        const copia = respuesta.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put('index.html', copia);
        });
        return respuesta;
      }).catch(function () {
        return caches.match('index.html').then(function (respuesta) {
          return respuesta || caches.match('./');
        });
      })
    );
    return;
  }

  evento.respondWith(
    fetch(solicitud).then(function (nueva) {
      if (nueva && nueva.status === 200 && nueva.type !== 'opaque') {
        const copia = nueva.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(solicitud, copia);
        });
      }
      return nueva;
    }).catch(function () {
      return caches.match(solicitud).then(function (respuesta) {
        return respuesta || caches.match('index.html');
      });
    })
  );
});
