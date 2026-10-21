// Usuarios del sistema. Crear, activar, desactivar y resetear claves pasa por una funcion
// segura del servidor (gestionar-usuarios), porque requiere privilegios que el navegador no tiene.
import { cliente, consulta } from '../../nucleo/cliente.js';

export async function listarPerfiles() {
  const r = await consulta(cliente().from('perfiles').select('user_id,email,nombre,rol,activo,creado_en').order('creado_en', { ascending: true }));
  return r.error || !Array.isArray(r.data) ? { ok: false, filas: [] } : { ok: true, filas: r.data };
}

// Desde el navegador, "la funcion no existe" y "no hay internet" fallan igual (la consulta previa del
// navegador no recibe respuesta valida). Para distinguirlos se prueba si la base responde: si responde,
// el problema no es la conexion sino que la funcion no esta publicada.
async function clasificarFalloDeRed() {
  const sonda = await consulta(cliente().from('config').select('clave').limit(1), 8000);
  return { ok: false, codigo: sonda.error ? 'SIN_CONEXION' : 'FUNCION_NO_DISPONIBLE' };
}

// accion: 'crear' | 'activar' | 'desactivar' | 'resetear_clave'. Devuelve { ok, codigo, ...datos }.
export async function gestionar(accion, datos) {
  let r;
  try {
    r = await cliente().functions.invoke('gestionar-usuarios', { body: { accion, ...datos } });
  } catch (e) {
    return clasificarFalloDeRed();
  }
  if (!r.error) return r.data && r.data.ok ? { ...r.data } : { ok: false, codigo: (r.data && r.data.codigo) || 'ERROR_INTERNO' };

  let cuerpo = null;
  try { cuerpo = await r.error.context.json(); } catch (e) { /* sin cuerpo */ }
  if (cuerpo && cuerpo.codigo === 'NOT_FOUND') return { ok: false, codigo: 'FUNCION_NO_DISPONIBLE' };
  if (cuerpo && cuerpo.codigo) return { ok: false, codigo: cuerpo.codigo };
  if (/fetch|network|failed|send a request/i.test(String(r.error.message || ''))) return clasificarFalloDeRed();
  return { ok: false, codigo: 'ERROR_INTERNO' };
}
