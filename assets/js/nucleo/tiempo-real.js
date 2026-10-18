// Suscripcion a cambios en tiempo real. Es un complemento: cada pantalla
// ademas consulta el servidor periodicamente (poll_s), asi que si el canal
// se cae nunca queda desactualizada.
import { cliente, marcarContacto } from './cliente.js';
import { log } from './registro.js';

export function suscribir(nombre, tablas, alCambiar) {
  const sufijo = Math.random().toString(36).slice(2, 8);
  const canal = cliente().channel(`${nombre}-${sufijo}`);
  for (const tabla of tablas) {
    canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, (carga) => {
      try { alCambiar(tabla, carga); } catch (e) { log.error(`Error procesando cambio de ${tabla}: ${e.message}`); }
    });
  }
  canal.subscribe((estado) => {
    if (estado === 'SUBSCRIBED') marcarContacto();
    else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') log.aviso(`Tiempo real: ${estado}`);
  });
  return canal;
}
