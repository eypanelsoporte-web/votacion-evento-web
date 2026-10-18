// Controlador de la TV: decide que se ve en cada momento.
//
//  Modo manual (lo cambia la asesora desde el iPad):
//    resultados -> resultados fijos | descanso -> diapositivas fijas
//  Modo automatico, segun config.tv_estrategia:
//    ciclo       -> resultados X segundos, luego una pasada de diapositivas, y repite
//    inactividad -> resultados mientras entran votos; sin votos, diapositivas hasta el proximo
import { cfg } from '../nucleo/configuracion.js';
import { porId } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { estado, alCambiar } from './datos.js';
import { construirResultados, actualizarResultados } from './resultados.js';
import * as diapositivas from './diapositivas.js';

let vista = null;
let temporizadorFase = null;
let estrategiaEnCurso = null;
let alCambiarModo = () => {};

export const vistaActual = () => vista;

function fijarVista(nueva) {
  vista = nueva;
  porId('vista-resultados').classList.toggle('oculta', nueva !== 'resultados');
  porId('vista-slides').classList.toggle('oculta', nueva !== 'slides');
  if (nueva !== 'slides') diapositivas.detener();
}

function limpiarFase() {
  clearTimeout(temporizadorFase);
  temporizadorFase = null;
}

// ---- Estrategia "ciclo" ----
function cicloResultados() {
  limpiarFase();
  fijarVista('resultados');
  temporizadorFase = setTimeout(cicloSlides, cfg.num('tv_resultados_s', { min: 3, max: 3600 }) * 1000);
}

function cicloSlides() {
  limpiarFase();
  if (!estado.diapositivas.length) { cicloResultados(); return; }
  fijarVista('slides');
  diapositivas.reproducir({
    unaPasada: true,
    maxMs: cfg.num('tv_bloque_max_s', { min: 5, max: 3600 }) * 1000,
    alTerminar: cicloResultados,
  });
}

// ---- Estrategia "inactividad" ----
function inactividadResultados() {
  limpiarFase();
  fijarVista('resultados');
  temporizadorFase = setTimeout(inactividadDescanso, cfg.num('tv_inactividad_s', { min: 3, max: 3600 }) * 1000);
}

function inactividadDescanso() {
  limpiarFase();
  fijarVista('slides');
  diapositivas.reproducir({ unaPasada: false });
}

function iniciarAutomatico() {
  estrategiaEnCurso = cfg.texto('tv_estrategia') === 'inactividad' ? 'inactividad' : 'ciclo';
  if (estrategiaEnCurso === 'inactividad') inactividadResultados();
  else cicloResultados();
}

function aplicarModo() {
  limpiarFase();
  if (estado.modo === 'resultados') {
    fijarVista('resultados');
  } else if (estado.modo === 'descanso') {
    fijarVista('slides');
    diapositivas.reproducir({ unaPasada: false });
  } else {
    iniciarAutomatico();
  }
  alCambiarModo(estado.modo);
}

function alVoto({ aumento }) {
  actualizarResultados();
  if (estado.modo !== 'auto' || !aumento) return;
  if (estrategiaEnCurso === 'inactividad') inactividadResultados();
  else if (cfg.bool('tv_voto_interrumpe') && vista === 'slides') cicloResultados();
}

function alCambiarPresentacion() {
  actualizarResultados();
  const nueva = cfg.texto('tv_estrategia') === 'inactividad' ? 'inactividad' : 'ciclo';
  if (estado.modo === 'auto' && nueva !== estrategiaEnCurso) iniciarAutomatico();
  alCambiarModo(estado.modo);
}

export function iniciarControlador({ alCambiarModo: avisarModo }) {
  alCambiarModo = avisarModo;
  construirResultados();
  alCambiar('conteos', alVoto);
  alCambiar('opciones', () => { construirResultados(); });
  alCambiar('modo', aplicarModo);
  alCambiar('presentacion', alCambiarPresentacion);
  alCambiar('diapositivas', () => {
    // Si se estaba mostrando el descanso, se reinicia con la lista nueva.
    if (vista === 'slides') {
      if (estado.modo === 'descanso' || estrategiaEnCurso === 'inactividad') diapositivas.reproducir({ unaPasada: false });
      else cicloSlides();
    }
  });
  aplicarModo();
}

export function textoModo() {
  return estado.modo === 'auto' ? '' : t(`tv.modo.${estado.modo}`);
}
