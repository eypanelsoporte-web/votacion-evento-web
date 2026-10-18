// Punto de entrada del panel de administracion: inicio de sesion, armado del panel segun
// el rol, y cierre limpio (que no quede ningun dato personal en pantalla al salir).
import { iniciarNucleo, cargarContenidoBase } from '../nucleo/arranque.js';
import { cliente, consulta } from '../nucleo/cliente.js';
import { cfg } from '../nucleo/configuracion.js';
import { porId, mostrarFatal } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { sesionActual, obtenerPerfil, iniciarSesion, cerrarSesion, alCerrarSesion } from '../nucleo/sesion.js';
import { montarNavegacion, desmontarNavegacion } from './navegacion.js';
import { iniciarInactividad } from './inactividad.js';
import { registrarEvento } from './api/panel-api.js';
import { abrirMiCuenta } from './mi-cuenta.js';

const ROLES_DEL_PANEL = ['superadmin', 'admin', 'consulta'];
const VISTAS = ['cargando', 'login', 'panel'];

let detenerInactividad = null;
let ctx = null;
let motivoPendiente; // por que se esta cerrando la sesion ('' = lo pidio la persona)

function salir(motivo) {
  motivoPendiente = motivo;
  return cerrarSesion();
}

const mostrarVista = (nombre) => VISTAS.forEach((v) => { porId(`vista-${v}`).hidden = v !== nombre; });
const hayPanel = () => !porId('vista-panel').hidden;

function mostrarLogin(motivo) {
  porId('login-msg').textContent = motivo ? t(`admin.login.error_${motivo}`) : '';
  mostrarVista('login');
}

async function leerOpciones() {
  const r = await consulta(cliente().from('opciones').select('id,clave,etiqueta,orden,activa').order('orden', { ascending: true }));
  return r.error || !Array.isArray(r.data) ? [] : r.data;
}

async function recargarBase() {
  await cargarContenidoBase();
  ctx.zona = cfg.texto('zona_horaria') || 'UTC';
  ctx.opciones = await leerOpciones();
}

// Cierra todo: corta el temporizador y borra del DOM cualquier dato personal.
function cerrarPanel(motivo) {
  if (detenerInactividad) detenerInactividad();
  detenerInactividad = null;
  desmontarNavegacion();
  porId('cuenta-info').textContent = '';
  ctx = null;
  mostrarLogin(motivo);
}

async function entrar() {
  const sesion = await sesionActual();
  if (!sesion) { mostrarLogin(); return; }
  const perfil = await obtenerPerfil(sesion.user.id);
  if (perfil === undefined) { mostrarLogin('red'); return; }
  if (!perfil || !ROLES_DEL_PANEL.includes(perfil.rol)) {
    await salir('permiso');
    return;
  }

  ctx = { perfil: { ...perfil, userId: sesion.user.id }, rol: perfil.rol, zona: 'UTC', opciones: [], recargarBase };
  await recargarBase();
  porId('cuenta-info').textContent = `${perfil.email || perfil.nombre || ''} · ${t(`admin.rol.${perfil.rol}`)}`;
  montarNavegacion(ctx);
  detenerInactividad = iniciarInactividad(() => { salir('inactividad'); });
  mostrarVista('panel');
  registrarEvento('abrir_panel', {});
}

function conectarLogin() {
  porId('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = porId('login-email').value.trim();
    const clave = porId('login-clave').value;
    if (!email || !clave) { porId('login-msg').textContent = t('admin.login.error_vacio'); return; }

    const boton = porId('login-btn');
    boton.disabled = true;
    boton.textContent = t('admin.login.entrando');
    const r = await iniciarSesion(email, clave, ROLES_DEL_PANEL);
    boton.disabled = false;
    boton.textContent = t('admin.login.entrar');

    porId('login-clave').value = '';
    if (r.ok) { porId('login-msg').textContent = ''; await entrar(); } else porId('login-msg').textContent = t(`admin.login.error_${r.motivo}`);
  });
  porId('btn-salir').addEventListener('click', () => { salir(''); });
  porId('btn-mi-cuenta').addEventListener('click', () => { if (ctx) abrirMiCuenta(ctx); });
}

async function principal() {
  try {
    await iniciarNucleo({ tipo: 'admin', persistir: true });
  } catch (error) {
    mostrarFatal(error);
    return;
  }
  mostrarVista('cargando');
  conectarLogin();
  // Si la sesion se cierra (boton, inactividad, o vencida), se limpia la pantalla.
  alCerrarSesion(() => {
    cerrarPanel(motivoPendiente !== undefined ? motivoPendiente : (hayPanel() ? 'sesion' : null));
    motivoPendiente = undefined;
  });
  await cargarContenidoBase();
  await entrar();
}

principal();
