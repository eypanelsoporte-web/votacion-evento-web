// Seccion "Auditoria": quien cambio que y cuando (ediciones, altas de usuarios, exportaciones).
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { construirTabla } from '../ui/tabla.js';
import { crearPaginador } from '../ui/paginador.js';
import { campoSelect } from '../ui/campos.js';
import { listarAuditoria, listarTablasAuditadas } from '../api/registros-api.js';
import { listarPerfiles } from '../api/usuarios-api.js';
import { formatearFechaHora } from '../reporte/datos.js';
import { resumirCambios } from '../auditoria-resumen.js';
import { ACCIONES_AUDITORIA } from '../constantes.js';

let ctx = null;
let zona = null;
let selectorTabla = null;
let pagina = 0;
let correos = new Map();

const textoAccion = (a) => (ACCIONES_AUDITORIA.includes(a) ? t(`admin.auditoria.accion.${a}`) : a);

async function buscar() {
  const porPagina = cfg.num('admin_filas_por_pagina', { min: 5, max: 200 });
  const r = await listarAuditoria({ tabla: selectorTabla.leer() }, pagina, porPagina);
  pagina = r.pagina;
  vaciar(zona);
  if (!r.ok) { zona.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') })); return; }
  zona.appendChild(construirTabla({
    vacio: t('admin.sin_datos'),
    filas: r.filas,
    columnas: [
      { titulo: t('admin.col.fecha'), celda: (f) => { const x = formatearFechaHora(f.creado_en, ctx.zona); return `${x.fecha} ${x.hora}`; } },
      { titulo: t('admin.auditoria.col.usuario'), celda: (f) => correos.get(f.usuario) || '' },
      { titulo: t('admin.auditoria.col.tabla'), celda: (f) => f.tabla },
      { titulo: t('admin.auditoria.col.accion'), celda: (f) => textoAccion(f.accion) },
      { titulo: t('admin.auditoria.col.cambios'), celda: (f) => resumirCambios(f), clase: 'celda-larga' },
    ],
  }));
  zona.appendChild(crearPaginador({ pagina, total: r.total, porPagina, alCambiar: (n) => { pagina = n; buscar(); } }));
}

async function cargarFiltros() {
  const [tablas, perfiles] = await Promise.all([listarTablasAuditadas(), listarPerfiles()]);
  correos = new Map(perfiles.filas.map((p) => [p.user_id, p.email || p.nombre || '']));
  const actual = selectorTabla.leer();
  vaciar(selectorTabla.input);
  selectorTabla.input.appendChild(crear('option', { texto: t('admin.filtro.todas'), atributos: { value: '' } }));
  for (const tabla of tablas) selectorTabla.input.appendChild(crear('option', { texto: tabla, atributos: { value: tabla } }));
  selectorTabla.input.value = tablas.includes(actual) ? actual : '';
}

export const auditoria = {
  id: 'auditoria',
  montar(raiz, contexto) {
    ctx = contexto;
    zona = crear('div');
    selectorTabla = campoSelect({ etiqueta: 'admin.auditoria.col.tabla', opciones: [{ valor: '', texto: t('admin.filtro.todas') }] });
    selectorTabla.input.addEventListener('change', () => { pagina = 0; buscar(); });
    raiz.append(
      crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.auditoria') })] }),
      crear('p', { clase: 'ayuda', texto: t('admin.auditoria.ayuda') }),
      crear('div', { clase: 'filtros', hijos: [selectorTabla.el] }),
      zona,
    );
  },
  async alMostrar() { await cargarFiltros(); buscar(); },
  alOcultar() {},
};
