// Registro de hechos del panel (quien exporto datos, quien abrio el panel). Queda en la auditoria.
import { rpc } from '../../nucleo/cliente.js';

// accion: 'exportar' | 'abrir_panel'. Nunca bloquea el trabajo si falla.
export async function registrarEvento(accion, detalle = {}) {
  const r = await rpc('registrar_evento_panel', { p_accion: accion, p_detalle: detalle }, 8000);
  return !r.error;
}
