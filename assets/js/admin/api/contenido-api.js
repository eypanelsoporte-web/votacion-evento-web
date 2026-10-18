// Lectura y edicion de las tablas de contenido (opciones, textos, configuracion, diapositivas).
// El navegador solo manda los campos permitidos; la base valida de nuevo y registra quien cambio que.
import { cliente, consulta } from '../../nucleo/cliente.js';

export async function listarFilas(tabla, orden) {
  const r = await consulta(cliente().from(tabla).select('*').order(orden, { ascending: true }));
  return r.error || !Array.isArray(r.data) ? { ok: false, filas: [] } : { ok: true, filas: r.data };
}

export async function actualizarFila(tabla, pk, valorPk, cambios) {
  const r = await consulta(cliente().from(tabla).update(cambios).eq(pk, valorPk).select());
  if (r.error) return { ok: false, mensaje: String(r.error.message || '') };
  if (!Array.isArray(r.data) || !r.data.length) return { ok: false, mensaje: '' };
  return { ok: true, fila: r.data[0] };
}

export async function insertarFila(tabla, fila) {
  const r = await consulta(cliente().from(tabla).insert(fila).select());
  if (r.error || !Array.isArray(r.data) || !r.data.length) return { ok: false, mensaje: String((r.error && r.error.message) || '') };
  return { ok: true, fila: r.data[0] };
}

export async function borrarFila(tabla, pk, valorPk) {
  const r = await consulta(cliente().from(tabla).delete().eq(pk, valorPk).select());
  return { ok: !r.error && Array.isArray(r.data) && r.data.length > 0 };
}
