// Arranque comun de todas las pantallas: cliente, identidad, registro de
// errores, service worker, y carga de configuracion + textos + tema.
import { crearCliente, versionApp, fijarTiempoLimite } from './cliente.js';
import { identificar } from './dispositivo.js';
import { configurarRegistro, log } from './registro.js';
import { cargarConfig, cfg } from './configuracion.js';
import { cargarTextos, aplicarTextos } from './textos.js';
import { aplicarTema } from './tema.js';

// Las extensiones del navegador (traductores, gestores de contrasenas, bloqueadores) a veces dejan
// errores propios en la pagina. No son de esta aplicacion y llenarian el registro de ruido.
const DE_EXTENSION = /(chrome|moz|safari-web)-extension:\/\//;

function instalarManejadoresGlobales() {
  window.addEventListener('error', (e) => {
    if (DE_EXTENSION.test(String(e.filename))) return;
    log.error(e.message || 'Error de pagina', { archivo: e.filename, linea: e.lineno, columna: e.colno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const motivo = e.reason;
    const pila = motivo && motivo.stack ? String(motivo.stack) : '';
    if (DE_EXTENSION.test(pila)) return;
    log.error(`Promesa rechazada: ${motivo && motivo.message ? motivo.message : String(motivo)}`, { pila: pila.split('\n').slice(0, 3).join(' | ') });
  });
  window.addEventListener('offline', () => log.aviso('El dispositivo perdio la conexion a internet'));
  window.addEventListener('online', () => log.info('El dispositivo recupero la conexion a internet'));
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch((e) => {
    log.aviso(`No se pudo registrar el service worker: ${e && e.message}`);
  });
}

// Aplica tema y textos con lo que haya (cache o base de datos).
export function refrescarPresentacion() {
  aplicarTema();
  aplicarTextos();
}

export async function iniciarNucleo({ tipo, persistir }) {
  crearCliente({ persistir });
  const dispositivo = identificar(tipo);
  configurarRegistro({ tipo, dispositivoId: dispositivo.id, version: versionApp() });
  instalarManejadoresGlobales();
  registrarServiceWorker();
  fijarTiempoLimite(cfg.num('rpc_timeout_s', { min: 2, max: 60 }) * 1000);
  refrescarPresentacion();
  return { dispositivo };
}

// Descarga configuracion y textos. Si no hay red usa la copia guardada.
export async function cargarContenidoBase() {
  const [configOk, textosOk] = await Promise.all([cargarConfig(), cargarTextos()]);
  fijarTiempoLimite(cfg.num('rpc_timeout_s', { min: 2, max: 60 }) * 1000);
  refrescarPresentacion();
  return configOk && textosOk;
}
