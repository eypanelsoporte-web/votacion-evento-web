// Sesion de las personas que inician sesion (iPad y panel): perfil, rol y cambio de clave.
// La clave nunca se guarda en el dispositivo: solo la sesion que entrega el servidor.
import { cliente, consulta, esErrorDeRed } from './cliente.js';

export async function sesionActual() {
  const { data } = await cliente().auth.getSession();
  return data && data.session ? data.session : null;
}

// Devuelve { rol, nombre, email } si el usuario existe y esta activo; null si no.
// Si no hay red devuelve undefined (no se sabe), para no sacar a nadie por un corte.
export async function obtenerPerfil(userId) {
  const r = await consulta(cliente().from('perfiles').select('rol,activo,nombre,email').eq('user_id', userId).maybeSingle());
  if (r.error) return esErrorDeRed(r) ? undefined : null;
  return r.data && r.data.activo ? { rol: r.data.rol, nombre: r.data.nombre, email: r.data.email } : null;
}

// motivo: 'ok' | 'credenciales' | 'red' | 'permiso'
export async function iniciarSesion(email, clave, rolesPermitidos) {
  const r = await cliente().auth.signInWithPassword({ email, password: clave }).catch((e) => ({ error: e }));
  if (r.error || !r.data || !r.data.session) {
    const mensaje = String((r.error && r.error.message) || '');
    return { ok: false, motivo: /fetch|network|failed|abort/i.test(mensaje) ? 'red' : 'credenciales' };
  }
  const perfil = await obtenerPerfil(r.data.session.user.id);
  if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
    await cliente().auth.signOut();
    return { ok: false, motivo: 'permiso' };
  }
  return { ok: true, motivo: 'ok', perfil };
}

export const cerrarSesion = () => cliente().auth.signOut();

export function alCerrarSesion(callback) {
  cliente().auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') callback(); });
}

export async function cambiarClave(nueva) {
  const r = await cliente().auth.updateUser({ password: nueva }).catch((e) => ({ error: e }));
  if (!r.error) return { ok: true };
  const mensaje = String(r.error.message || '');
  return { ok: false, motivo: /fetch|network|failed|abort/i.test(mensaje) ? 'red' : /weak|short|least|should/i.test(mensaje) ? 'debil' : 'otro' };
}
