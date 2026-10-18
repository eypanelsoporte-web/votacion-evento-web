// Campos de formulario con su etiqueta. Cada uno devuelve { el, leer, input } para
// poder armar pantallas sin repetir marcado. El texto de las etiquetas viene de la base.
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';

let contador = 0;
const idUnico = () => { contador += 1; return `campo-${contador}`; };

function envolver(etiqueta, control, ayuda) {
  control.id = idUnico();
  const nodo = crear('label', {
    clase: 'campo', atributos: { for: control.id },
    hijos: [crear('span', { clase: 'campo-etiqueta', texto: t(etiqueta) }), control],
  });
  if (ayuda) nodo.appendChild(crear('small', { clase: 'campo-ayuda', texto: ayuda }));
  return nodo;
}

export function campoTexto({ etiqueta, valor = '', tipo = 'text', maximo, soloLectura = false, ayuda, autocompletar = 'off' }) {
  const atributos = { type: tipo, autocomplete: autocompletar };
  if (maximo) atributos.maxlength = maximo;
  const input = crear('input', { atributos });
  input.value = valor === null || valor === undefined ? '' : String(valor);
  input.readOnly = soloLectura;
  return { el: envolver(etiqueta, input, ayuda), leer: () => input.value.trim(), input };
}

export function campoNumero({ etiqueta, valor, min, max, paso = 1, ayuda }) {
  const atributos = { type: 'number', step: paso };
  if (min !== undefined) atributos.min = min;
  if (max !== undefined) atributos.max = max;
  const input = crear('input', { atributos });
  input.value = valor === null || valor === undefined ? '' : String(valor);
  return {
    el: envolver(etiqueta, input, ayuda),
    leer: () => (input.value.trim() === '' ? null : Number(input.value)),
    input,
  };
}

export function campoArea({ etiqueta, valor = '', maximo, filas = 4, soloLectura = false, ayuda }) {
  const atributos = { rows: filas };
  if (maximo) atributos.maxlength = maximo;
  const input = crear('textarea', { atributos });
  input.value = valor === null || valor === undefined ? '' : String(valor);
  input.readOnly = soloLectura;
  return { el: envolver(etiqueta, input, ayuda), leer: () => input.value.trim(), input };
}

// Vuelve a llenar un <select> conservando lo elegido (si sigue existiendo). opciones: [{ valor, texto }]
export function llenarOpciones(input, opciones, valor) {
  const elegido = valor === undefined || valor === null ? input.value : String(valor);
  vaciar(input);
  for (const o of opciones) input.appendChild(crear('option', { texto: o.texto, atributos: { value: o.valor } }));
  const existe = [...input.options].some((x) => x.value === elegido);
  input.value = existe ? elegido : (input.options.length ? input.options[0].value : '');
}

export function campoSelect({ etiqueta, opciones, valor, ayuda }) {
  const input = crear('select');
  llenarOpciones(input, opciones, valor);
  return { el: envolver(etiqueta, input, ayuda), leer: () => input.value, input };
}

export function campoCasilla({ etiqueta, valor = false }) {
  const input = crear('input', { atributos: { type: 'checkbox' } });
  input.checked = !!valor;
  const nodo = crear('label', { clase: 'campo campo-casilla', hijos: [input, crear('span', { texto: t(etiqueta) })] });
  return { el: nodo, leer: () => input.checked, input };
}
