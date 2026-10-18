// Cambio de pantalla (una sola visible a la vez).
import { porId } from '../nucleo/dom.js';

const PANTALLAS = ['cargando', 'error', 'login', 'voto', 'enviando', 'gracias', 'diferido', 'rechazo'];
let actual = null;

export function mostrar(nombre) {
  for (const p of PANTALLAS) porId(`pantalla-${p}`).hidden = p !== nombre;
  actual = nombre;
}

export const pantallaActual = () => actual;
