// Seccion "Votos": listado con busqueda, filtros y paginas. Admin y superadmin pueden corregir un voto.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { antirrebote } from '../../nucleo/util.js';
import { construirTabla, pastilla } from '../ui/tabla.js';
import { crearPaginador } from '../ui/paginador.js';
import { campoTexto, campoSelect, llenarOpciones } from '../ui/campos.js';
import { buscarVotos, listarDias } from '../api/votos-api.js';
import { formatearFechaHora, diaLegible } from '../reporte/datos.js';
import { abrirEdicionVoto } from './votos-edicion.js';

const filtros = { texto: '', dia: '', opcionId: '', estado: 'validos' };
let ctx = null;
let pagina = 0;
let zona = null;
let selectorDia = null;
let selectorOpcion = null;

// Opciones del filtro "opcion": se arman con las opciones actuales (se pueden renombrar desde Contenido).
export const opcionesDelFiltro = (ctx) => [{ valor: '', texto: t('admin.filtro.todas') }, ...ctx.opciones.map((o) => ({ valor: o.id, texto: o.etiqueta }))];

export const estadosPermitidos = (rol) => {
  const mapa = cfg.json('admin_estados_votos');
  return mapa && Array.isArray(mapa[rol]) ? mapa[rol] : ['validos'];
};

function pastillaEstado(v) {
  if (v.eliminado) return pastilla(t('admin.estado.eliminado'), 'error');
  if (v.es_prueba) return pastilla(t('admin.estado.prueba'), 'info');
  return pastilla(t('admin.estado.valido'), 'ok');
}

async function buscar() {
  const porPagina = cfg.num('admin_filas_por_pagina', { min: 5, max: 200 });
  const r = await buscarVotos(filtros, pagina, porPagina);
  pagina = r.pagina;
  vaciar(zona);
  if (!r.ok) { zona.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') })); return; }

  const puedeEditar = ctx.rol === 'admin' || ctx.rol === 'superadmin';
  const nombreOpcion = (id) => (ctx.opciones.find((o) => o.id === id) || {}).etiqueta || '';
  const columnas = [
    { titulo: t('admin.col.fecha'), celda: (v) => { const f = formatearFechaHora(v.creado_en, ctx.zona); return `${f.fecha} ${f.hora}`; } },
    { titulo: t('admin.col.nombre'), celda: (v) => v.nombre },
    { titulo: t('admin.col.email'), celda: (v) => v.email || '' },
    { titulo: t('admin.col.telefono'), celda: (v) => v.telefono || '' },
    { titulo: t('admin.col.opcion'), celda: (v) => nombreOpcion(v.opcion_id) },
    { titulo: t('admin.col.dia'), celda: (v) => diaLegible(v.dia_evento) },
    { titulo: t('admin.col.estado'), celda: pastillaEstado },
  ];
  if (puedeEditar) {
    columnas.push({
      titulo: '', clase: 'acciones',
      celda: (v) => crear('button', { clase: 'btn-sec', texto: t('admin.editar'), atributos: { type: 'button' }, alClick: () => abrirEdicionVoto(v, ctx, buscar) }),
    });
  }
  zona.appendChild(construirTabla({ columnas, filas: r.filas, vacio: t('admin.votos.vacio') }));
  zona.appendChild(crearPaginador({ pagina, total: r.total, porPagina, alCambiar: (n) => { pagina = n; buscar(); } }));
}

const filtrar = () => { pagina = 0; buscar(); };

async function cargarDias() {
  const dias = await listarDias();
  const actual = selectorDia.input.value;
  vaciar(selectorDia.input);
  selectorDia.input.appendChild(crear('option', { texto: t('admin.filtro.todos'), atributos: { value: '' } }));
  for (const d of dias) selectorDia.input.appendChild(crear('option', { texto: diaLegible(d), atributos: { value: d } }));
  selectorDia.input.value = dias.includes(actual) ? actual : '';
}

export const votos = {
  id: 'votos',
  montar(raiz, contexto) {
    ctx = contexto;
    const texto = campoTexto({ etiqueta: 'admin.votos.buscar' });
    texto.input.addEventListener('input', antirrebote(() => { filtros.texto = texto.leer(); filtrar(); }, 400));
    selectorDia = campoSelect({ etiqueta: 'admin.col.dia', opciones: [{ valor: '', texto: t('admin.filtro.todos') }] });
    selectorDia.input.addEventListener('change', () => { filtros.dia = selectorDia.leer(); filtrar(); });
    selectorOpcion = campoSelect({ etiqueta: 'admin.col.opcion', opciones: opcionesDelFiltro(ctx) });
    selectorOpcion.input.addEventListener('change', () => { filtros.opcionId = selectorOpcion.leer(); filtrar(); });
    const estado = campoSelect({
      etiqueta: 'admin.col.estado',
      opciones: estadosPermitidos(ctx.rol).map((e) => ({ valor: e, texto: t(`admin.votos.estado.${e}`) })),
      valor: 'validos',
    });
    estado.input.addEventListener('change', () => { filtros.estado = estado.leer(); filtrar(); });

    zona = crear('div');
    raiz.append(
      crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.votos') })] }),
      crear('div', { clase: 'filtros', hijos: [texto.el, selectorDia.el, selectorOpcion.el, estado.el] }),
      zona,
    );
  },
  alMostrar() { llenarOpciones(selectorOpcion.input, opcionesDelFiltro(ctx)); filtros.opcionId = selectorOpcion.leer(); cargarDias(); buscar(); },
  alOcultar() {},
};
