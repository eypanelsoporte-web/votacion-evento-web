// Identidad del dispositivo y latido ("estoy vivo") hacia el servidor.
import { almacen } from './almacen.js';
import { uuid } from './util.js';
import { rpc, msSinContacto, versionApp } from './cliente.js';
import { cfg } from './configuracion.js';
import { logsPendientes, vaciarLogs } from './registro.js';

export function identificar(tipo) {
  const params = new URLSearchParams(location.search);
  const nombreUrl = (params.get('nombre') || '').replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 60);
  if (nombreUrl) almacen.guardar(`device_nombre_${tipo}`, nombreUrl);

  let id = almacen.leer(`device_id_${tipo}`, null);
  if (!id) {
    id = `${tipo}-${uuid().slice(0, 6)}`;
    almacen.guardar(`device_id_${tipo}`, id);
  }
  return { id, nombre: almacen.leer(`device_nombre_${tipo}`, null), tipo };
}

export function iniciarLatido({ dispositivo, obtenerEstado }) {
  function latir() {
    let estado = {};
    try { estado = (obtenerEstado && obtenerEstado()) || {}; } catch (e) { /* nada */ }
    estado.online = navigator.onLine !== false;
    estado.sin_contacto_s = Math.round(msSinContacto() / 1000);
    estado.logs_pendientes = logsPendientes();
    rpc('latido', {
      p_id: dispositivo.id, p_tipo: dispositivo.tipo, p_nombre: dispositivo.nombre,
      p_estado: estado, p_version: versionApp(), p_ua: navigator.userAgent,
    });
    vaciarLogs();
  }
  latir();
  setInterval(latir, cfg.num('latido_s', { min: 5, max: 600 }) * 1000);
  window.addEventListener('online', latir);
}
