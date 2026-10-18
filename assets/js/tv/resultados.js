// Vista de resultados: una barra por opcion con cantidad y porcentaje.
import { crear, porId, vaciar } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { porcentajes } from '../nucleo/util.js';
import { estado, totalVotos } from './datos.js';

let filas = new Map(); // opcion_id -> { barra, valor }

export function construirResultados() {
  const cont = porId('barras');
  vaciar(cont);
  filas = new Map();
  for (const op of estado.opciones) {
    const barra = crear('div', { clase: 'barra-relleno' });
    const valor = crear('span', { clase: 'fila-valor' });
    cont.appendChild(crear('div', {
      clase: 'fila',
      hijos: [
        crear('div', { clase: 'fila-cabecera', hijos: [crear('span', { clase: 'fila-etiqueta', texto: op.etiqueta }), valor] }),
        crear('div', { clase: 'barra-fondo', hijos: [barra] }),
      ],
    }));
    filas.set(op.id, { barra, valor });
  }
  actualizarResultados();
}

export function actualizarResultados() {
  const valores = estado.opciones.map((op) => estado.conteos.get(op.id) || 0);
  const total = valores.reduce((a, b) => a + b, 0);
  const pct = porcentajes(valores);

  estado.opciones.forEach((op, i) => {
    const fila = filas.get(op.id);
    if (!fila) return;
    const n = valores[i];
    fila.barra.style.width = `${total ? (n / total) * 100 : 0}%`;
    fila.valor.textContent = t(n === 1 ? 'tv.votos_uno' : 'tv.votos_otros', { n, pct: pct[i] });
  });
  porId('tv-total').textContent = t('tv.total', { n: totalVotos() });
}
