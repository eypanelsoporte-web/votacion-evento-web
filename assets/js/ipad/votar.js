// Flujo de un voto: guardar en la cola local, enviar, y mostrar el resultado.
import { cfg } from '../nucleo/configuracion.js';
import { t } from '../nucleo/textos.js';
import { porId } from '../nucleo/dom.js';
import { uuid, dormir } from '../nucleo/util.js';
import { mostrar } from './pantallas.js';
import * as formulario from './formulario.js';
import * as cola from './cola-votos.js';
import { dibujarOpciones } from './contenido.js';
import { claveTextoRechazo, CODIGOS_CORREGIBLES } from './codigos.js';

let votando = false;
let pedirSesion = () => {};
let accionRechazo = () => {};

export function iniciarVotacion({ alNecesitarSesion }) {
  pedirSesion = alNecesitarSesion;
  formulario.conectarEventos();
  porId('rechazo-btn').addEventListener('click', () => accionRechazo());
}

export function prepararFormulario() {
  formulario.aplicarReglas();
  dibujarOpciones(votar);
  formulario.actualizar();
}

export function volverAlFormulario() {
  votando = false;
  formulario.limpiar();
  mostrar('voto');
}

async function votar(opcion) {
  if (votando || formulario.faltantes().length) return;
  votando = true;

  const datos = formulario.leerDatos();
  const voto = {
    id: uuid(),
    nombre: datos.nombre,
    email: datos.email,
    telefono: datos.telefono,
    opcion_id: opcion.id,
    opcion_etiqueta: opcion.etiqueta,
    consentimiento: datos.consentimiento,
  };
  cola.agregar(voto); // primero a disco: aunque se apague el iPad, no se pierde
  mostrar('enviando');

  const espera = cfg.num('ipad_voto_espera_s', { min: 2, max: 60 }) * 1000;
  await Promise.race([cola.procesar(), dormir(espera)]);
  mostrarResultado(voto, opcion);
}

function volverLuego() {
  setTimeout(volverAlFormulario, cfg.num('ipad_gracias_s', { min: 1, max: 60 }) * 1000);
}

function mostrarResultado(voto, opcion) {
  const res = cola.resultadoDe(voto.id) || { estado: 'pendiente' };
  switch (res.estado) {
    case 'ok':
    case 'ya_existia':
      porId('gracias-opcion').textContent = t('ipad.gracias.opcion', { opcion: opcion.etiqueta });
      mostrar('gracias');
      volverLuego();
      break;
    case 'rechazado':
      cola.descartarRechazado(voto.id); // ya se le aviso a la asesora en pantalla
      mostrarRechazo(res.codigo);
      break;
    case 'sin_permiso':
      mostrarRechazo('SIN_PERMISO');
      break;
    default: // pendiente: queda guardado y se envia solo
      mostrar('diferido');
      volverLuego();
  }
}

export function mostrarRechazo(codigo) {
  porId('rechazo-titulo').textContent = t(claveTextoRechazo(codigo, 'titulo'));
  porId('rechazo-msg').textContent = t(claveTextoRechazo(codigo, 'msg'));
  porId('rechazo-btn').textContent = t(claveTextoRechazo(codigo, 'boton'));
  accionRechazo = () => {
    if (codigo === 'SIN_PERMISO') { votando = false; pedirSesion(); return; }
    if (CODIGOS_CORREGIBLES.includes(codigo)) { votando = false; mostrar('voto'); return; }
    volverAlFormulario();
  };
  mostrar('rechazo');
}
