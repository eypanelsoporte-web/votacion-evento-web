// Tema de colores: la base de datos define variables CSS (--primario, etc.).
// Solo se aceptan nombres y valores simples: nada de url(), expresiones ni
// texto libre, para que un dato mal cargado no pueda inyectar estilos.
import { cfg } from './configuracion.js';

const NOMBRE_VALIDO = /^[a-z][a-z0-9-]{0,30}$/;
const VALOR_VALIDO = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[0-9.,%\s]+\)|[a-zA-Z]{3,20})$/;

export function aplicarTema() {
  const tema = cfg.json('tema');
  if (!tema || typeof tema !== 'object' || Array.isArray(tema)) return;
  const estilo = document.documentElement.style;
  for (const [nombre, valor] of Object.entries(tema)) {
    if (NOMBRE_VALIDO.test(nombre) && typeof valor === 'string' && VALOR_VALIDO.test(valor)) {
      estilo.setProperty(`--${nombre}`, valor);
    }
  }
}
