// Registro de errores: se guarda primero en el dispositivo y se envia al
// servidor apenas hay conexion. Nunca debe romper la pantalla ni filtrar
// datos personales.
import { almacen } from './almacen.js';
import { rpc, esErrorDeRed } from './cliente.js';

const MAX_COLA = 100;
const VENTANA_REPETIDOS_MS = 60000;
const CLAVE_PRIVADA = /(mail|nombre|telefono|celular|dni|clave|pass|token|secret|apikey|key|auth)/i;

let tipo = 'otro';
let dispositivoId = null;
let version = '0';
let cola = almacen.leer('logbuf', []);
const vistos = new Map();
let vaciando = false;

export function configurarRegistro(opciones) {
  tipo = opciones.tipo;
  dispositivoId = opciones.dispositivoId;
  version = opciones.version;
}

// Se descartan las claves que puedan contener datos personales o secretos.
function sanear(detalle) {
  const salida = {};
  if (!detalle || typeof detalle !== 'object') return salida;
  for (const [k, v] of Object.entries(detalle)) {
    if (CLAVE_PRIVADA.test(k)) continue;
    if (typeof v === 'string') salida[k] = v.slice(0, 200);
    else if (typeof v === 'number' || typeof v === 'boolean' || v === null) salida[k] = v;
    else salida[k] = '[objeto]';
  }
  return salida;
}

function registrar(nivel, mensaje, detalle) {
  try {
    const consola = nivel === 'fatal' ? 'error' : nivel;
    if (window.console && console[consola]) console[consola]('[evento]', mensaje);

    const clave = `${nivel}|${mensaje}`;
    const ahora = Date.now();
    if (vistos.has(clave) && ahora - vistos.get(clave) < VENTANA_REPETIDOS_MS) return;
    if (vistos.size > 200) vistos.clear();
    vistos.set(clave, ahora);

    cola.push({
      nivel,
      mensaje: String(mensaje).slice(0, 500),
      detalle: { ...sanear(detalle), ocurrio_en: new Date().toISOString(), version },
    });
    if (cola.length > MAX_COLA) cola.splice(0, cola.length - MAX_COLA);
    almacen.guardar('logbuf', cola);
    vaciarLogs();
  } catch (e) { /* el registro nunca debe romper la pantalla */ }
}

export const log = {
  debug: (m, d) => registrar('debug', m, d),
  info: (m, d) => registrar('info', m, d),
  aviso: (m, d) => registrar('warn', m, d),
  error: (m, d) => registrar('error', m, d),
  fatal: (m, d) => registrar('fatal', m, d),
};

export const logsPendientes = () => cola.length;

export async function vaciarLogs() {
  if (vaciando || !cola.length || navigator.onLine === false) return;
  vaciando = true;
  try {
    while (cola.length) {
      const it = cola[0];
      const r = await rpc('registrar_log', {
        p_nivel: it.nivel, p_origen: tipo, p_dispositivo: dispositivoId,
        p_mensaje: it.mensaje, p_detalle: it.detalle,
      }, 6000);
      if (r.error && esErrorDeRed(r)) break;
      cola.shift();
      almacen.guardar('logbuf', cola);
    }
  } finally {
    vaciando = false;
  }
}
