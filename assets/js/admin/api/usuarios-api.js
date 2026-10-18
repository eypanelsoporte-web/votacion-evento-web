// Usuarios del sistema. Crear, activar, desactivar y resetear claves pasa por una funcion
// segura del servidor (gestionar-usuarios), porque requiere privilegios que el navegador no tiene.
import { cliente, consulta } from '../../nucleo/cliente.js';

export async function listarPerfiles() {
  const r = await consulta(cliente().from('perfiles').select('user_id,email,nombre,rol,activo,creado_en').order('creado_en', { ascending: true }));
  return r.error || !Array.isArray(r.data) ? { ok: false, filas: [] } : { ok: true, filas: r.data };
}

// accion: 'crear' | 'activar' | 'desactivar' | 'resetear_clave'. Devuelve { ok, codigo, ...datos }.
export async function gestionar(accion, datos) {
  let r;
  try {
    r = await cliente().functions.invoke('gestionar-usuarios', { body: { accion, ...datos } });
  } catch (e) {
    return { ok: false, codigo: 'SIN_CONEXION' };
  }
  if (!r.error) return r.data && r.data.ok ? { ...r.data } : { ok: false, codigo: (r.data && r.data.codigo) || 'ERROR_INTERNO' };

  let cuerpo = null;
  try { cuerpo = await r.error.context.json(); } catch (e) { /* sin cuerpo */ }
  if (cuerpo && cuerpo.codigo) return { ok: false, codigo: cuerpo.codigo };
  return { ok: false, codigo: /fetch|network|failed/i.test(String(r.error.message || '')) ? 'SIN_CONEXION' : 'ERROR_INTERNO' };
}
