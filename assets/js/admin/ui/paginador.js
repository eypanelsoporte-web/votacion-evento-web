// Barra de paginas: anterior / "Pagina X de Y" / siguiente. La pagina 0 es la primera.
import { crear } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';

export function crearPaginador({ pagina, total, porPagina, alCambiar }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const anterior = crear('button', {
    clase: 'btn-sec', texto: t('admin.pag.anterior'), atributos: { type: 'button' }, alClick: () => alCambiar(pagina - 1),
  });
  const siguiente = crear('button', {
    clase: 'btn-sec', texto: t('admin.pag.siguiente'), atributos: { type: 'button' }, alClick: () => alCambiar(pagina + 1),
  });
  anterior.disabled = pagina <= 0;
  siguiente.disabled = pagina >= paginas - 1;
  const info = crear('span', { clase: 'paginador-info', texto: t('admin.pag.info', { pagina: pagina + 1, paginas, total }) });
  return crear('div', { clase: 'paginador', hijos: [anterior, info, siguiente] });
}
