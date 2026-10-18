// Avisos discretos en la TV: "sin conexion" y "modo manual".
import { porId } from '../nucleo/dom.js';
import { estadoConexion } from '../nucleo/vigilancia.js';
import { estado } from './datos.js';
import { textoModo } from './controlador.js';

export function pintarModo() {
  const el = porId('ind-modo');
  const texto = textoModo();
  el.hidden = estado.modo === 'auto';
  el.textContent = texto;
}

export function iniciarIndicadores() {
  const conexion = porId('ind-conexion');
  setInterval(() => { conexion.hidden = estadoConexion() !== 'sin_conexion'; }, 1000);
  pintarModo();
}
