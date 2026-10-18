// Editor generico de una tabla de contenido: buscador, filtro por grupo, paginas, y botones
// de editar / nuevo / eliminar segun lo que permita la definicion de esa tabla.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { construirTabla } from '../ui/tabla.js';
import { crearPaginador } from '../ui/paginador.js';
import { campoTexto, campoSelect } from '../ui/campos.js';
import { confirmar } from '../ui/dialogo.js';
import { avisar } from '../ui/aviso.js';
import { listarFilas, borrarFila } from '../api/contenido-api.js';
import { abrirFormulario } from './editor-formulario.js';

const LARGO_MAXIMO_CELDA = 70;

function resumir(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return t(valor ? 'admin.si' : 'admin.no');
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  return texto.length > LARGO_MAXIMO_CELDA ? `${texto.slice(0, LARGO_MAXIMO_CELDA)}…` : texto;
}

export function crearEditor(def, ctx) {
  const raiz = crear('div', { clase: 'editor' });
  const zona = crear('div');
  const estado = { filas: [], busqueda: '', grupo: '', pagina: 0 };

  const filtradas = () => {
    const texto = estado.busqueda.toLowerCase();
    return estado.filas.filter((f) => (!estado.grupo || f.grupo === estado.grupo)
      && (!texto || def.buscar.some((c) => String(f[c] === null || f[c] === undefined ? '' : f[c]).toLowerCase().includes(texto))));
  };

  const alGuardar = async () => { await recargar(); await ctx.recargarBase(); };

  function pintar() {
    vaciar(zona);
    const porPagina = cfg.num('admin_filas_por_pagina', { min: 5, max: 200 });
    const todas = filtradas();
    const visibles = todas.slice(estado.pagina * porPagina, (estado.pagina + 1) * porPagina);
    const columnas = def.columnas.map((c) => ({ titulo: t(`admin.contenido.campo.${c}`), celda: (f) => resumir(f[c]) }));
    columnas.push({
      titulo: '', clase: 'acciones',
      celda: (fila) => crear('div', {
        clase: 'acciones-fila',
        hijos: [
          crear('button', { clase: 'btn-sec', texto: t('admin.editar'), atributos: { type: 'button' }, alClick: () => abrirFormulario({ def, fila, alGuardar }) }),
          def.eliminar ? crear('button', {
            clase: 'btn-sec', texto: t('admin.eliminar'), atributos: { type: 'button' },
            alClick: async () => {
              if (!(await confirmar({ titulo: t('admin.confirmar_titulo'), mensaje: t('admin.contenido.confirmar_eliminar') }))) return;
              const r = await borrarFila(def.tabla, def.pk, fila[def.pk]);
              if (r.ok) { avisar(t('admin.contenido.eliminado')); await alGuardar(); } else avisar(t('admin.contenido.error.guardar'), 'error');
            },
          }) : null,
        ],
      }),
    });
    zona.appendChild(construirTabla({ columnas, filas: visibles, vacio: t('admin.sin_datos') }));
    zona.appendChild(crearPaginador({ pagina: estado.pagina, total: todas.length, porPagina, alCambiar: (n) => { estado.pagina = n; pintar(); } }));
  }

  let selectorGrupo = null;

  function rellenarGrupos() {
    if (!selectorGrupo) return;
    vaciar(selectorGrupo.input);
    selectorGrupo.input.appendChild(crear('option', { texto: t('admin.filtro.todos'), atributos: { value: '' } }));
    for (const g of [...new Set(estado.filas.map((f) => f.grupo).filter(Boolean))].sort()) {
      selectorGrupo.input.appendChild(crear('option', { texto: g, atributos: { value: g } }));
    }
    selectorGrupo.input.value = estado.grupo;
  }

  async function recargar() {
    const r = await listarFilas(def.tabla, def.orden);
    if (!r.ok) { vaciar(zona); zona.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') })); return; }
    estado.filas = r.filas;
    rellenarGrupos();
    pintar();
  }

  const buscador = campoTexto({ etiqueta: 'admin.contenido.buscar' });
  buscador.input.addEventListener('input', () => { estado.busqueda = buscador.leer(); estado.pagina = 0; pintar(); });
  const herramientas = [buscador.el];
  if (def.grupos) {
    selectorGrupo = campoSelect({ etiqueta: 'admin.contenido.grupo', opciones: [{ valor: '', texto: t('admin.filtro.todos') }] });
    selectorGrupo.input.addEventListener('change', () => { estado.grupo = selectorGrupo.leer(); estado.pagina = 0; pintar(); });
    herramientas.push(selectorGrupo.el);
  }
  if (def.crear) {
    herramientas.push(crear('button', { clase: 'btn-principal', texto: t('admin.contenido.nuevo'), atributos: { type: 'button' }, alClick: () => abrirFormulario({ def, fila: null, alGuardar }) }));
  }
  raiz.append(crear('div', { clase: 'filtros', hijos: herramientas }), zona);
  return { el: raiz, recargar };
}
