// Vigilancia: estado de la conexion, recarga automatica ante un cuelgue y
// recarga preventiva. Incluye un freno contra recargas en bucle.
import { almacen } from './almacen.js';
import { cfg } from './configuracion.js';
import { msSinContacto, marcarContacto } from './cliente.js';
import { log, vaciarLogs } from './registro.js';
import { dormir } from './util.js';

const VENTANA_RECARGAS_MS = 10 * 60 * 1000;

export function recargar(motivo, forzar = false) {
  const limite = cfg.num('max_recargas_10min', { min: 1, max: 100 });
  const historial = almacen.leer('recargas', []).filter((t) => Date.now() - t < VENTANA_RECARGAS_MS);
  if (!forzar && historial.length >= limite) {
    log.error('Demasiadas recargas seguidas: se frena la recarga automatica', { motivo });
    return false;
  }
  historial.push(Date.now());
  almacen.guardar('recargas', historial);
  log.aviso(`Recarga de pantalla: ${motivo}`);
  Promise.race([vaciarLogs(), dormir(1500)]).then(() => location.reload());
  return true;
}

export function estadoConexion() {
  if (navigator.onLine === false) return 'sin_conexion';
  const sin = msSinContacto();
  const limite = cfg.num('watchdog_s', { min: 10, max: 600 }) * 1000;
  if (sin > limite) return 'sin_conexion';
  if (sin > limite / 2) return 'lento';
  return 'ok';
}

// puedeRecargar: permite a cada pantalla impedir una recarga que le haria
// perder algo (por ejemplo, datos a medio escribir en el iPad).
export function iniciarVigilancia({ puedeRecargar = () => true } = {}) {
  let ultimaCarga = Date.now();
  setInterval(() => {
    if (navigator.onLine === false || !puedeRecargar()) return;

    const sin = msSinContacto();
    if (sin > cfg.num('watchdog_s', { min: 10, max: 600 }) * 1000) {
      marcarContacto();
      recargar(`sin contacto con el servidor hace ${Math.round(sin / 1000)} s`);
      return;
    }
    const preventiva = cfg.num('recarga_preventiva_min', { min: 0, max: 1440 }) * 60000;
    if (preventiva > 0 && Date.now() - ultimaCarga > preventiva) {
      ultimaCarga = Date.now();
      recargar('recarga preventiva programada');
    }
  }, 5000);
}
