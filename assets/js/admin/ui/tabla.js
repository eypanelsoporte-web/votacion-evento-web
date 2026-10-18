// Tabla simple. Los datos entran siempre como texto (nunca como HTML).
import { crear } from '../../nucleo/dom.js';

// columnas: [{ titulo, celda: (fila) => texto | Node, clase }]
export function construirTabla({ columnas, filas, vacio }) {
  const cabecera = crear('tr', { hijos: columnas.map((c) => crear('th', { texto: c.titulo })) });
  const cuerpo = crear('tbody');

  if (!filas.length) {
    cuerpo.appendChild(crear('tr', {
      hijos: [crear('td', { clase: 'tabla-vacia', texto: vacio, atributos: { colspan: columnas.length } })],
    }));
  }
  for (const fila of filas) {
    const tr = crear('tr');
    for (const columna of columnas) {
      const valor = columna.celda(fila);
      const td = crear('td', { clase: columna.clase });
      if (valor instanceof Node) td.appendChild(valor);
      else td.textContent = valor === null || valor === undefined ? '' : String(valor);
      tr.appendChild(td);
    }
    cuerpo.appendChild(tr);
  }
  const tabla = crear('table', { clase: 'tabla', hijos: [crear('thead', { hijos: [cabecera] }), cuerpo] });
  return crear('div', { clase: 'tabla-scroll', hijos: [tabla] });
}

// Pastilla de color para estados (activo, error, etc.)
export function pastilla(texto, tipo) {
  return crear('span', { clase: `pastilla pastilla-${tipo}`, texto });
}
