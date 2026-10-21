// Ingreso de la TV. Los resultados son datos de la empresa: la pantalla pide usuario y clave (un usuario
// propio de la TV, rol "tv") y hasta entonces no muestra ni guarda ningun dato. La sesion queda guardada
// en el aparato y se renueva sola; si deja de valer (usuario dado de baja, clave cambiada), vuelve a pedirla.
import { cliente } from '../nucleo/cliente.js';
import { almacen } from '../nucleo/almacen.js';
import { porId } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { sesionActual, obtenerPerfil, iniciarSesion, alCerrarSesion } from '../nucleo/sesion.js';

// Quienes pueden ver la TV: su usuario propio y el equipo que la configura.
const ROLES_TV = ['tv', 'admin', 'superadmin'];
// Copia local de los resultados: se borra al salir para no dejar datos de la empresa en el aparato.
const COPIAS_LOCALES = ['tv_opciones', 'tv_conteos', 'tv_modo', 'tv_slides'];

const olvidarDatos = () => COPIAS_LOCALES.forEach((c) => almacen.borrar(c));

function textoDeError(motivo) {
  switch (motivo) {
    case 'vacio': return t('tv.login.error_vacio');
    case 'credenciales': return t('tv.login.error_credenciales');
    case 'red': return t('tv.login.error_red');
    case 'permiso': return t('tv.login.error_permiso');
    default: return '';
  }
}

// Muestra el formulario y devuelve una promesa que se cumple cuando el ingreso es correcto.
function pedirIngreso(motivo) {
  return new Promise((resolver) => {
    const vista = porId('vista-login');
    const mensaje = porId('login-msg');
    const boton = porId('login-btn');
    mensaje.textContent = textoDeError(motivo);
    vista.hidden = false;
    document.body.classList.add('con-cursor'); // en la TV hace falta ver el puntero para elegir los campos
    porId('login-email').focus();

    porId('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = porId('login-email').value.trim();
      const clave = porId('login-clave').value;
      if (!email || !clave) { mensaje.textContent = textoDeError('vacio'); return; }

      boton.disabled = true;
      boton.textContent = t('tv.login.entrando');
      const r = await iniciarSesion(email, clave, ROLES_TV);
      boton.disabled = false;
      boton.textContent = t('tv.login.entrar');
      porId('login-clave').value = '';

      if (!r.ok) { mensaje.textContent = textoDeError(r.motivo); return; }
      mensaje.textContent = '';
      vista.hidden = true;
      document.body.classList.remove('con-cursor');
      resolver();
    });
  });
}

// Devuelve cuando hay una sesion valida. Si no la hay, pide usuario y clave.
export async function asegurarAcceso() {
  let motivo = '';
  const sesion = await sesionActual();
  if (sesion) {
    const perfil = await obtenerPerfil(sesion.user.id);
    if (perfil === undefined) return; // sin internet: se sigue con la sesion guardada
    if (perfil && ROLES_TV.includes(perfil.rol)) return;
    await cliente().auth.signOut(); // usuario desactivado o con otro rol
    olvidarDatos();
    motivo = perfil ? 'permiso' : '';
  }
  await pedirIngreso(motivo);
}

// Si la sesion se cierra mientras la TV esta andando, se borran las copias y se vuelve al ingreso.
export function vigilarSesion() {
  alCerrarSesion(() => {
    olvidarDatos();
    window.location.reload();
  });
}
