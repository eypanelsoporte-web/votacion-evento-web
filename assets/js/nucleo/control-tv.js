// Control de las pantallas: estado de los dispositivos, modo de la TV y ordenes remotas.
// Lo usan el iPad (control de la asesora) y el panel de administracion.
import { cfg } from './configuracion.js';
import { cliente, consulta } from './cliente.js';
import { t } from './textos.js';
import { dormir } from './util.js';

export const MODOS_TV = ['auto', 'resultados', 'descanso'];

export function claseSemaforo(segundos) {
  if (segundos <= cfg.num('semaforo_verde_s', { min: 10 })) return 'ok';
  if (segundos <= cfg.num('semaforo_ambar_s', { min: 20 })) return 'lento';
  return 'sin';
}

export function textoHace(segundos) {
  return segundos < 90
    ? t('ipad.control.latido_s', { n: segundos })
    : t('ipad.control.latido_min', { n: Math.round(segundos / 60) });
}

export async function listarDispositivos() {
  const r = await consulta(cliente().from('v_dispositivos').select('id,tipo,nombre,segundos_sin_latido').order('tipo'));
  return r.error || !Array.isArray(r.data) ? { ok: false, filas: [] } : { ok: true, filas: r.data };
}

export async function leerModoTv() {
  const r = await consulta(cliente().from('control').select('modo').eq('id', 1).maybeSingle());
  return r.data ? r.data.modo : null;
}

export async function cambiarModoTv(modo) {
  if (!MODOS_TV.includes(modo)) return false;
  const r = await consulta(cliente().from('control').update({ modo }).eq('id', 1).select('modo'));
  return !r.error && Array.isArray(r.data) && r.data.length > 0;
}

// destino: 'tv', 'ipad' o el id de un dispositivo. Devuelve 'error' | 'confirmada' | 'sin_respuesta'.
export async function recargarDispositivo(destino) {
  const ins = await consulta(cliente().from('comandos').insert({ destino, comando: 'recargar' }).select('id').single());
  if (ins.error || !ins.data) return 'error';
  const limite = Date.now() + cfg.num('ipad_confirmacion_tv_s', { min: 3, max: 60 }) * 1000;
  while (Date.now() < limite) {
    await dormir(2000);
    const c = await consulta(cliente().from('comandos').select('confirmado_en').eq('id', ins.data.id).maybeSingle());
    if (c.data && c.data.confirmado_en) return 'confirmada';
  }
  return 'sin_respuesta';
}
