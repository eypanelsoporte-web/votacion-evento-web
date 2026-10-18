// Sesion del usuario del iPad (rol "operador"). Usa la logica comun de sesion y le
// agrega la lista de roles que pueden usar el iPad y el ultimo rol conocido sin red.
import { almacen } from '../nucleo/almacen.js';
import {
  sesionActual as sesion, obtenerPerfil, iniciarSesion as entrar, alCerrarSesion as alSalir,
} from '../nucleo/sesion.js';

const ROLES_PERMITIDOS = ['operador', 'admin', 'superadmin'];

export const sesionActual = sesion;
export const alCerrarSesion = alSalir;
export const rolPermitido = (rol) => ROLES_PERMITIDOS.includes(rol);
export const iniciarSesion = (email, clave) => entrar(email, clave, ROLES_PERMITIDOS);

// Devuelve el rol; si no hay red usa el ultimo rol conocido para no interrumpir el trabajo.
export async function obtenerRol(userId) {
  const perfil = await obtenerPerfil(userId);
  if (perfil === undefined) return almacen.leer('rol', null);
  const rol = perfil ? perfil.rol : null;
  almacen.guardar('rol', rol);
  return rol;
}
