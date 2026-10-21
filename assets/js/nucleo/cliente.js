// Cliente de base de datos: creacion validada, consultas con tiempo limite y
// seguimiento del ultimo contacto exitoso con el servidor.
import { VALORES_SEGUROS } from './valores-seguros.js';

const DESPLIEGUE = window.EVENTO_CONFIG || {};
const URL_SUPABASE = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;
const URL_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

let sb = null;
let ultimoContacto = Date.now();
let tiempoLimiteMs = VALORES_SEGUROS.rpc_timeout_s * 1000;

export const versionApp = () => String(DESPLIEGUE.VERSION || '0');
export const cliente = () => sb;
export const marcarContacto = () => { ultimoContacto = Date.now(); };
export const msSinContacto = () => Date.now() - ultimoContacto;
export const fijarTiempoLimite = (ms) => { tiempoLimiteMs = ms; };

// Una clave "service_role"/"secret" NUNCA debe estar en una pagina publica:
// si alguien la pega por error, la pantalla se niega a arrancar.
function claveEsPrivada(clave) {
  if (/^sb_secret_/i.test(clave)) return true;
  try {
    const carga = clave.split('.')[1];
    const json = atob(carga.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role === 'service_role';
  } catch (e) {
    return false;
  }
}

export function crearCliente({ persistir }) {
  const url = String(DESPLIEGUE.SUPABASE_URL || '');
  const clave = String(DESPLIEGUE.SUPABASE_ANON_KEY || '');
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Falta la libreria assets/vendor/supabase.js');
  }
  if (!(URL_SUPABASE.test(url) || URL_LOCAL.test(url)) || /TU-PROYECTO/i.test(url) ||
      clave.length < 20 || /TU-CLAVE/i.test(clave)) {
    throw new Error('Falta completar assets/config.js con la URL y la clave publica del proyecto.');
  }
  if (claveEsPrivada(clave)) {
    throw new Error('assets/config.js contiene una clave PRIVADA (service_role). Usar solo la clave publica "anon".');
  }
  sb = window.supabase.createClient(url, clave, {
    auth: { persistSession: persistir, autoRefreshToken: persistir, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return sb;
}

export function esErrorDeRed(r) {
  if (!r || !r.error) return false;
  const st = r.status;
  return !st || st === 408 || st >= 500 ||
    /fetch|network|abort|timeout|load failed/i.test(String(r.error.message || r.error));
}

export function esErrorDeAuth(r) {
  if (!r || !r.error) return false;
  return r.status === 401 || r.status === 403 || r.error.code === 'PGRST301' ||
    /jwt|invalid.*token/i.test(String(r.error.message || ''));
}

// Ejecuta una consulta (o rpc) con tiempo limite. Nunca lanza: devuelve {data, error, status}.
// El limite no depende de que el navegador sepa cancelar pedidos (los viejos, como el de algunas
// teles, ignoran la senal): a los N segundos se responde con error aunque el pedido siga en curso.
export function consulta(builder, esperaMs) {
  const ctrl = new AbortController();
  let limite = null;
  const vencido = new Promise((resolver) => {
    limite = setTimeout(() => {
      ctrl.abort();
      resolver({ data: null, error: { message: 'timeout' }, status: 408 });
    }, esperaMs || tiempoLimiteMs);
  });
  const pedido = Promise.resolve(builder.abortSignal(ctrl.signal)).then(
    (r) => {
      if (r && !r.error) ultimoContacto = Date.now();
      return r;
    },
    (e) => ({ data: null, error: e || { message: 'error de red' }, status: 0 }),
  );
  return Promise.race([pedido, vencido]).then((r) => { clearTimeout(limite); return r; });
}

export const rpc = (nombre, args, esperaMs) => consulta(sb.rpc(nombre, args || {}), esperaMs);
