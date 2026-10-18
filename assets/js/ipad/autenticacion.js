// Sesion del usuario del iPad (rol "operador"). La clave nunca se guarda:
// solo la sesion que entrega el servidor.
import { cliente, consulta, esErrorDeRed } from '../nucleo/cliente.js';
import { almacen } from '../nucleo/almacen.js';

const ROLES_PERMITIDOS = ['operador', 'admin', 'superadmin'];

export async function sesionActual() {
  const { data } = await cliente().auth.getSession();
  return data && data.session ? data.session : null;
}

// Devuelve el rol del usuario; si no hay red usa el ultimo rol conocido.
export async function obtenerRol(userId) {
  const r = await consulta(cliente().from('perfiles').select('rol,activo').eq('user_id', userId).maybeSingle());
  if (r.error) return esErrorDeRed(r) ? almacen.leer('rol', null) : null;
  const rol = r.data && r.data.activo ? r.data.rol : null;
  almacen.guardar('rol', rol);
  return rol;
}

export const rolPermitido = (rol) => ROLES_PERMITIDOS.includes(rol);

// motivo: 'ok' | 'credenciales' | 'red' | 'permiso'
export async function iniciarSesion(email, clave) {
  const r = await cliente().auth.signInWithPassword({ email, password: clave }).catch((e) => ({ error: e }));
  if (r.error || !r.data || !r.data.session) {
    const msg = String((r.error && r.error.message) || '');
    return { ok: false, motivo: /fetch|network|failed|abort/i.test(msg) ? 'red' : 'credenciales' };
  }
  const rol = await obtenerRol(r.data.session.user.id);
  if (!rolPermitido(rol)) {
    await cliente().auth.signOut();
    return { ok: false, motivo: 'permiso' };
  }
  return { ok: true, motivo: 'ok' };
}

export function alCerrarSesion(callback) {
  cliente().auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') callback(); });
}
