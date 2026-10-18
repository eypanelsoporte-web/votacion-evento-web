// Comandos remotos: permiten recargar o limpiar una pantalla sin tocarla.
// Solo se ejecutan los comandos NUEVOS (posteriores al arranque), asi una
// recarga ordenada no se vuelve a ejecutar en bucle.
import { almacen } from './almacen.js';
import { cfg } from './configuracion.js';
import { cliente, consulta, rpc } from './cliente.js';
import { log } from './registro.js';
import { recargar } from './vigilancia.js';
import { suscribir } from './tiempo-real.js';

const COMANDOS_CONOCIDOS = ['ping', 'recargar', 'limpiar_cache'];

export function iniciarComandos({ dispositivo }) {
  let ultimoId = almacen.leer('ultimo_cmd', null);

  const aplica = (c) => c.destino === 'todos' || c.destino === dispositivo.tipo || c.destino === dispositivo.id;
  const confirmar = (id, resultado) =>
    rpc('confirmar_comando', { p_id: id, p_dispositivo: dispositivo.id, p_resultado: resultado }, 4000);

  async function limpiarCache() {
    if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    if (navigator.serviceWorker) {
      await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    }
  }

  function ejecutar(c) {
    if (ultimoId === null || c.id <= ultimoId) return;
    ultimoId = c.id;
    almacen.guardar('ultimo_cmd', ultimoId);
    if (!aplica(c) || !COMANDOS_CONOCIDOS.includes(c.comando)) return;
    log.info(`Comando recibido: ${c.comando}`, { id: c.id });

    if (c.comando === 'ping') { confirmar(c.id, 'ok'); return; }
    if (c.comando === 'recargar') {
      confirmar(c.id, 'recargando').then(() => recargar('comando remoto', true));
      return;
    }
    confirmar(c.id, 'limpiando')
      .then(limpiarCache)
      .catch(() => {})
      .then(() => recargar('limpieza de cache remota', true));
  }

  async function sincronizar() {
    const base = cliente().from('comandos');
    const consultaBase = ultimoId === null
      ? base.select('id').order('id', { ascending: false }).limit(1)
      : base.select('id,destino,comando').gt('id', ultimoId).order('id', { ascending: true }).limit(20);
    const r = await consulta(consultaBase);
    if (r.error || !Array.isArray(r.data)) return;
    if (ultimoId === null) {
      ultimoId = r.data.length ? r.data[0].id : 0;
      almacen.guardar('ultimo_cmd', ultimoId);
      return;
    }
    r.data.forEach(ejecutar);
  }

  sincronizar();
  setInterval(sincronizar, cfg.num('poll_s', { min: 3, max: 120 }) * 1000);
  suscribir('cmd', ['comandos'], (tabla, carga) => {
    if (carga.eventType === 'INSERT' && carga.new) ejecutar(carga.new);
  });
}
