/* Service worker: red primero, copia local como respaldo.
 * Asi la pantalla vuelve a abrir aunque se caiga internet, y cuando hay
 * red siempre se descarga la version nueva (no queda nada "viejo" pegado).
 * dev/auditoria-estatica.mjs verifica que esta lista incluya todos los archivos. */
var CACHE = 'evento-shell-v1';
var PRECACHE = [
  'ipad.html', 'tv.html',
  'assets/config.js',
  'assets/css/ipad.css', 'assets/css/tv.css',
  'assets/vendor/supabase.js',
  'assets/js/nucleo/almacen.js', 'assets/js/nucleo/arranque.js', 'assets/js/nucleo/cliente.js',
  'assets/js/nucleo/comandos.js', 'assets/js/nucleo/configuracion.js', 'assets/js/nucleo/dispositivo.js',
  'assets/js/nucleo/dom.js', 'assets/js/nucleo/medios.js', 'assets/js/nucleo/registro.js',
  'assets/js/nucleo/tema.js', 'assets/js/nucleo/textos.js', 'assets/js/nucleo/tiempo-real.js',
  'assets/js/nucleo/util.js', 'assets/js/nucleo/valores-seguros.js', 'assets/js/nucleo/vigilancia.js',
  'assets/js/ipad/autenticacion.js', 'assets/js/ipad/barra-estado.js', 'assets/js/ipad/codigos.js',
  'assets/js/ipad/cola-votos.js', 'assets/js/ipad/contenido.js', 'assets/js/ipad/control.js',
  'assets/js/ipad/formulario.js', 'assets/js/ipad/index.js', 'assets/js/ipad/pantallas.js',
  'assets/js/ipad/votar.js',
  'assets/js/tv/controlador.js', 'assets/js/tv/datos.js', 'assets/js/tv/diapositivas.js',
  'assets/js/tv/escenario.js', 'assets/js/tv/index.js', 'assets/js/tv/indicadores.js',
  'assets/js/tv/resultados.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (/\.(mp4|webm|mov|m4v)$/i.test(url.pathname) || req.headers.has('range')) return;
  e.respondWith(redPrimero(req));
});

function redPrimero(req) {
  return caches.open(CACHE).then(function (cache) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(req, { signal: ctrl.signal, cache: 'no-cache' }).then(function (res) {
      clearTimeout(t);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function (err) {
      clearTimeout(t);
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        throw err;
      });
    });
  });
}
