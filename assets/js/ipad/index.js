// Punto de entrada del iPad: arma las piezas y las pone en marcha.
import { iniciarNucleo, cargarContenidoBase } from '../nucleo/arranque.js';
import { cliente } from '../nucleo/cliente.js';
import { cfg } from '../nucleo/configuracion.js';
import { porId, mostrarFatal } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { dormir, antirrebote } from '../nucleo/util.js';
import { iniciarLatido } from '../nucleo/dispositivo.js';
import { iniciarVigilancia } from '../nucleo/vigilancia.js';
import { iniciarComandos } from '../nucleo/comandos.js';
import { suscribir } from '../nucleo/tiempo-real.js';
import { mostrar, pantallaActual } from './pantallas.js';
import { sesionActual, obtenerRol, rolPermitido, iniciarSesion, alCerrarSesion } from './autenticacion.js';
import { cargarOpciones } from './contenido.js';
import { estaVacio, actualizar } from './formulario.js';
import { configurarCola, depurarRechazados, pendientes, listaRechazados, procesar, bloqueadaPorPermiso } from './cola-votos.js';
import { iniciarVotacion, prepararFormulario } from './votar.js';
import { iniciarBarra } from './barra-estado.js';
import { iniciarControl, abrirControl } from './control.js';

let dispositivo = null;
let serviciosIniciados = false;

function mostrarLogin(motivo) {
  porId('login-msg').textContent = motivo ? t(`ipad.login.error_${motivo}`) : '';
  mostrar('login');
}

async function refrescarContenido() {
  await cargarContenidoBase();
  depurarRechazados();
  if (await cargarOpciones() && pantallaActual() === 'voto') {
    prepararFormulario();
    actualizar();
  }
}

function iniciarServicios() {
  if (serviciosIniciados) return;
  serviciosIniciados = true;

  iniciarLatido({
    dispositivo,
    obtenerEstado: () => ({ pantalla: pantallaActual(), pendientes: pendientes(), rechazados: listaRechazados().length }),
  });
  // Nunca se recarga con datos a medio escribir ni con votos sin enviar.
  iniciarVigilancia({ puedeRecargar: () => pantallaActual() === 'voto' && estaVacio() && pendientes() === 0 });
  iniciarComandos({ dispositivo });
  iniciarBarra({ alAbrirControl: abrirControl });
  iniciarControl({ dispositivo });

  setInterval(async () => {
    if (!pendientes()) return;
    await procesar();
    if (bloqueadaPorPermiso() && pantallaActual() === 'voto') mostrarLogin();
  }, cfg.num('ipad_reintento_s', { min: 2, max: 120 }) * 1000);
  window.addEventListener('online', () => procesar());

  setInterval(refrescarContenido, cfg.num('ipad_contenido_min', { min: 1, max: 120 }) * 60000);
  suscribir('ipad', ['config', 'textos', 'opciones'], antirrebote(refrescarContenido, 1500));
}

async function entrar() {
  const sesion = await sesionActual();
  if (!sesion) { mostrarLogin(); return; }

  const rol = await obtenerRol(sesion.user.id);
  if (!rolPermitido(rol)) {
    await cliente().auth.signOut();
    mostrarLogin('permiso');
    return;
  }

  mostrar('cargando');
  await cargarContenidoBase();
  depurarRechazados();
  while (!(await cargarOpciones())) {
    mostrar('error');
    await dormir(cfg.num('ipad_reintento_s', { min: 2, max: 120 }) * 1000);
    await cargarContenidoBase();
  }
  prepararFormulario();
  mostrar('voto');
  iniciarServicios();
  procesar();
}

function conectarLogin() {
  porId('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = porId('login-email').value.trim();
    const clave = porId('login-clave').value;
    if (!email || !clave) { porId('login-msg').textContent = t('ipad.login.error_vacio'); return; }

    const boton = porId('login-btn');
    boton.disabled = true;
    boton.textContent = t('ipad.login.entrando');
    const r = await iniciarSesion(email, clave);
    boton.disabled = false;
    boton.textContent = t('ipad.login.entrar');

    if (r.ok) {
      porId('login-clave').value = '';
      porId('login-msg').textContent = '';
      entrar();
    } else {
      porId('login-msg').textContent = t(`ipad.login.error_${r.motivo}`);
    }
  });
}

async function principal() {
  try {
    ({ dispositivo } = await iniciarNucleo({ tipo: 'ipad', persistir: true }));
  } catch (error) {
    mostrarFatal(error);
    return;
  }
  mostrar('cargando');
  configurarCola(dispositivo);
  iniciarVotacion({ alNecesitarSesion: () => mostrarLogin() });
  conectarLogin();
  alCerrarSesion(() => mostrarLogin());

  await cargarContenidoBase();
  await entrar();
}

principal();
