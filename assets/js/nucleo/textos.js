// Textos de las pantallas: vienen de la tabla `textos` (editables). El HTML
// y el codigo no contienen frases, solo claves.
import { almacen } from './almacen.js';
import { cliente, consulta } from './cliente.js';
import { plantilla } from './util.js';
import { log } from './registro.js';

let mapa = almacen.leer('textos_cache', {});

export async function cargarTextos() {
  const r = await consulta(cliente().from('textos').select('clave,valor'));
  if (r.error || !Array.isArray(r.data)) return false;
  const nuevo = {};
  for (const fila of r.data) nuevo[fila.clave] = fila.valor;
  mapa = nuevo;
  almacen.guardar('textos_cache', nuevo);
  return true;
}

export const hayTextos = () => Object.keys(mapa).length > 0;

export function t(clave, variables) {
  if (!Object.prototype.hasOwnProperty.call(mapa, clave)) {
    if (hayTextos()) log.aviso(`Texto faltante en la base: ${clave}`);
    return '';
  }
  return variables ? plantilla(mapa[clave], variables) : mapa[clave];
}

// Rellena los elementos marcados con data-t / data-t-ph / data-t-aria / data-t-title.
export function aplicarTextos(raiz = document) {
  raiz.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  raiz.querySelectorAll('[data-t-ph]').forEach((el) => { el.setAttribute('placeholder', t(el.dataset.tPh)); });
  raiz.querySelectorAll('[data-t-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
  raiz.querySelectorAll('[data-t-title]').forEach((el) => { el.setAttribute('title', t(el.dataset.tTitle)); });
}
