// Cola de votos: cada voto se guarda primero en el iPad y se envia al
// servidor con reintentos. Es idempotente (el id del voto lo crea el iPad), por
// eso reenviar nunca duplica. Si se corta internet, no se pierde nada.
import { almacen } from '../nucleo/almacen.js';
import { rpc, esErrorDeRed } from '../nucleo/cliente.js';
import { log } from '../nucleo/registro.js';
import { cfg } from '../nucleo/configuracion.js';

const MAX_RECHAZADOS = 50;

let items = almacen.leer('cola_votos', []);
let rechazados = almacen.leer('votos_rechazados', []);
const resultados = new Map();
const oyentes = new Set();
let procesando = null;
let dispositivoId = null;

function guardar() {
  almacen.guardar('cola_votos', items);
  almacen.guardar('votos_rechazados', rechazados);
  oyentes.forEach((f) => f());
}

export const configurarCola = (dispositivo) => { dispositivoId = dispositivo.id; };

// Privacidad: los datos de un registro rechazado no se guardan mas de lo necesario.
export function depurarRechazados() {
  const limite = cfg.num('ipad_retencion_rechazados_h', { min: 1, max: 720 }) * 3600000;
  const antes = rechazados.length;
  rechazados = rechazados.filter((r) => Date.now() - new Date(r.en).getTime() < limite);
  if (rechazados.length !== antes) guardar();
}
export const alCambiarCola = (f) => { oyentes.add(f); };
export const pendientes = () => items.length;
export const listaRechazados = () => rechazados.slice();
export const resultadoDe = (id) => resultados.get(id) || null;

// Hay votos esperando porque la sesion perdio permiso (hay que volver a entrar).
export function bloqueadaPorPermiso() {
  if (!items.length) return false;
  const r = resultados.get(items[0].id);
  return !!r && r.estado === 'sin_permiso';
}

export function agregar(voto) {
  items.push(voto);
  guardar();
}

export function descartarRechazado(id) {
  rechazados = rechazados.filter((r) => r.id !== id);
  guardar();
}

function enviarUno(it) {
  return rpc('registrar_voto', {
    p_id: it.id, p_nombre: it.nombre, p_email: it.email || null, p_telefono: it.telefono || null,
    p_opcion_id: it.opcion_id, p_consentimiento: it.consentimiento, p_es_prueba: false,
    p_dispositivo: dispositivoId,
  });
}

// Una pasada por la cola, en orden. Se detiene ante el primer problema
// recuperable (sin red, error interno, sesion vencida) y lo reintenta despues.
async function recorrerCola() {
  while (items.length) {
    const it = items[0];
    const r = await enviarUno(it);

    if (r.error) {
      resultados.set(it.id, { estado: 'pendiente' });
      if (!esErrorDeRed(r)) log.aviso('El servidor devolvio un error al registrar un voto', { codigo: r.error.code, http: r.status });
      return;
    }

    const d = r.data || {};
    if (d.ok) {
      resultados.set(it.id, { estado: d.estado === 'ya_existia' ? 'ya_existia' : 'ok' });
      items.shift();
      guardar();
      continue;
    }

    const codigo = String(d.codigo || 'GENERICO');
    if (codigo === 'SIN_PERMISO') {
      resultados.set(it.id, { estado: 'sin_permiso' });
      return; // queda en la cola hasta volver a iniciar sesion
    }
    it.intentos = (it.intentos || 0) + 1;
    if (codigo === 'ERROR_INTERNO' && it.intentos < cfg.num('ipad_max_intentos', { min: 1, max: 50 })) {
      resultados.set(it.id, { estado: 'pendiente' });
      guardar();
      return;
    }

    resultados.set(it.id, { estado: 'rechazado', codigo });
    rechazados.push({
      id: it.id, nombre: it.nombre, email: it.email, opcion: it.opcion_etiqueta,
      codigo, en: new Date().toISOString(),
    });
    if (rechazados.length > MAX_RECHAZADOS) rechazados.shift();
    items.shift();
    guardar();
  }
}

// Procesa la cola. Si ya hay una pasada en curso, espera a esa.
// La limpieza va en .finally(): siempre corre DESPUES de asignar la promesa,
// asi `procesando` nunca queda trabado aunque la cola este vacia.
export function procesar() {
  if (procesando) return procesando;
  procesando = recorrerCola().catch((e) => {
    log.error(`Error procesando la cola de votos: ${e && e.message}`);
  }).finally(() => {
    procesando = null;
    oyentes.forEach((f) => f());
  });
  return procesando;
}
