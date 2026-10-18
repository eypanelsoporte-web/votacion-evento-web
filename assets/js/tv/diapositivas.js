// Reproductor de diapositivas (imagenes y videos). Cada diapositiva tiene
// salvaguardas: si un archivo no carga, un video no arranca o se queda
// trabado, se salta a la siguiente. Los videos viejos se liberan de memoria.
import { cfg } from '../nucleo/configuracion.js';
import { crear, porId } from '../nucleo/dom.js';
import { log } from '../nucleo/registro.js';
import { t } from '../nucleo/textos.js';
import { estado } from './datos.js';

const DURACION_FUNDIDO_MS = 600;

let sesion = 0; // cada reproduccion nueva invalida los avisos pendientes de la anterior
let temporizador = null;
let indice = -1;
let activa = false;

const contenedor = () => porId('slide-contenedor');

function liberar(el) {
  if (el.tagName === 'VIDEO') {
    el.pause();
    el.removeAttribute('src');
    el.load();
  }
  el.remove();
}

export function detener() {
  sesion += 1;
  activa = false;
  clearTimeout(temporizador);
  contenedor().querySelectorAll('img, video').forEach(liberar);
  porId('slide-texto').hidden = true;
}

export const estaActiva = () => activa;
export const indiceActual = () => indice;

function mostrarTextoDescanso() {
  const texto = porId('slide-texto');
  texto.textContent = t('tv.descanso');
  texto.hidden = false;
}

function montar(el) {
  const cont = contenedor();
  const anteriores = Array.from(cont.children);
  el.classList.add('entrando');
  cont.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('entrando')));
  setTimeout(() => anteriores.forEach(liberar), DURACION_FUNDIDO_MS);
}

function precargarSiguiente(lista) {
  const proxima = lista[(indice + 1) % lista.length];
  if (proxima && proxima.tipo === 'imagen') new Image().src = proxima.url;
}

function prepararImagen(d, avanzar, programar) {
  const img = crear('img', { atributos: { alt: '' } });
  img.addEventListener('error', () => { log.aviso('Imagen que no carga: se salta', { id: d.id }); avanzar(); });
  img.addEventListener('load', () => {
    programar(avanzar, (d.duracion_s || cfg.num('tv_slide_s', { min: 1, max: 600 })) * 1000);
  }, { once: true });
  img.src = d.url;
  return img;
}

function prepararVideo(d, avanzar, programar) {
  const margen = cfg.num('tv_video_margen_s', { min: 1, max: 60 });
  const video = crear('video', { atributos: { playsinline: '', preload: 'auto' } });
  video.muted = true;
  video.playsInline = true;
  let esperaBuffer = null;

  video.addEventListener('ended', avanzar);
  video.addEventListener('error', () => { log.aviso('Video con error: se salta', { id: d.id }); avanzar(); });
  video.addEventListener('waiting', () => {
    clearTimeout(esperaBuffer);
    esperaBuffer = setTimeout(() => { log.aviso('Video trabado: se salta', { id: d.id }); avanzar(); },
      cfg.num('tv_medio_arranque_s', { min: 3, max: 120 }) * 1000);
  });
  video.addEventListener('playing', () => {
    clearTimeout(esperaBuffer);
    const duracion = Number.isFinite(video.duration) ? video.duration : 0;
    const limite = d.duracion_s || duracion || cfg.num('tv_slide_s', { min: 1, max: 600 });
    programar(avanzar, (limite + (d.duracion_s ? 0 : margen)) * 1000);
  }, { once: true });

  video.src = d.url;
  const intento = video.play();
  if (intento && typeof intento.catch === 'function') {
    intento.catch(() => { log.aviso('El navegador no dejo reproducir un video: se salta', { id: d.id }); avanzar(); });
  }
  return video;
}

// Reproduce la lista de diapositivas.
//   unaPasada: al terminar la lista llama a alTerminar (si no, da vueltas sin parar)
//   maxMs: corta la pasada si dura mas que esto
export function reproducir({ unaPasada = false, maxMs = 0, alTerminar = () => {} } = {}) {
  detener();
  const miSesion = sesion;
  const lista = estado.diapositivas;
  const inicio = Date.now();
  indice = -1;

  if (!lista.length) { mostrarTextoDescanso(); return; }
  activa = true;

  const terminar = () => { detener(); alTerminar(); };

  const siguiente = () => {
    if (miSesion !== sesion) return;
    clearTimeout(temporizador);
    indice += 1;
    if (indice >= lista.length) {
      if (unaPasada) { terminar(); return; }
      indice = 0;
    }
    if (maxMs && Date.now() - inicio >= maxMs) { terminar(); return; }

    const d = lista[indice];
    let avanzado = false;
    const avanzar = () => {
      if (avanzado || miSesion !== sesion) return;
      avanzado = true;
      siguiente();
    };
    const programar = (funcion, ms) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(funcion, ms);
    };

    // Si el medio nunca arranca, se salta.
    programar(() => { log.aviso('Medio que no arranca: se salta', { id: d.id }); avanzar(); },
      cfg.num('tv_medio_arranque_s', { min: 3, max: 120 }) * 1000);

    montar(d.tipo === 'video' ? prepararVideo(d, avanzar, programar) : prepararImagen(d, avanzar, programar));
    precargarSiguiente(lista);
  };
  siguiente();
}

