// Seccion "Registros" (solo superadmin): errores de las pantallas, mantenimiento y reparacion.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { antirrebote } from '../../nucleo/util.js';
import { construirTabla, pastilla } from '../ui/tabla.js';
import { crearPaginador } from '../ui/paginador.js';
import { campoSelect, campoTexto } from '../ui/campos.js';
import { confirmar } from '../ui/dialogo.js';
import { avisar } from '../ui/aviso.js';
import { listarLogs, ejecutarMantenimiento, recalcularConteos } from '../api/registros-api.js';
import { formatearFechaHora } from '../reporte/datos.js';
import { NIVELES_LOG as NIVELES, ORIGENES_LOG as ORIGENES } from '../constantes.js';

const TIPO_PASTILLA = { debug: 'info', info: 'info', warn: 'aviso', error: 'error', fatal: 'error' };

let ctx = null;
let zona = null;
let pagina = 0;
let nivel = null;
let origen = null;
let texto = null;

async function buscar() {
  const porPagina = cfg.num('admin_filas_por_pagina', { min: 5, max: 200 });
  const r = await listarLogs({ nivel: nivel.leer(), origen: origen.leer(), texto: texto.leer() }, pagina, porPagina);
  pagina = r.pagina;
  vaciar(zona);
  if (!r.ok) { zona.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') })); return; }
  zona.appendChild(construirTabla({
    vacio: t('admin.registros.vacio'),
    filas: r.filas,
    columnas: [
      { titulo: t('admin.col.fecha'), celda: (f) => { const x = formatearFechaHora(f.creado_en, ctx.zona); return `${x.fecha} ${x.hora}`; } },
      { titulo: t('admin.registros.col.nivel'), celda: (f) => pastilla(t(`admin.registros.nivel.${f.nivel}`), TIPO_PASTILLA[f.nivel] || 'info') },
      { titulo: t('admin.registros.col.origen'), celda: (f) => t(`admin.registros.origen.${f.origen}`) },
      { titulo: t('admin.registros.col.dispositivo'), celda: (f) => f.dispositivo_id || '' },
      { titulo: t('admin.registros.col.mensaje'), celda: (f) => f.mensaje, clase: 'celda-larga' },
    ],
  }));
  zona.appendChild(crearPaginador({ pagina, total: r.total, porPagina, alCambiar: (n) => { pagina = n; buscar(); } }));
}

const filtrar = () => { pagina = 0; buscar(); };

async function limpiar() {
  const dias = cfg.num('admin_retencion_logs_dias', { min: 1, max: 365 });
  if (!(await confirmar({ titulo: t('admin.confirmar_titulo'), mensaje: t('admin.registros.confirmar_limpiar', { dias }) }))) return;
  const r = await ejecutarMantenimiento(dias);
  if (!r.ok) { avisar(t('admin.registros.error'), 'error'); return; }
  avisar(t('admin.registros.limpiado', { logs: r.detalle.logs, comandos: r.detalle.comandos, dispositivos: r.detalle.dispositivos }));
  buscar();
}

async function recalcular() {
  if (!(await confirmar({ titulo: t('admin.confirmar_titulo'), mensaje: t('admin.registros.confirmar_recalcular') }))) return;
  const r = await recalcularConteos();
  avisar(t(r.ok ? 'admin.registros.recalculado' : 'admin.registros.error'), r.ok ? 'ok' : 'error');
}

export const registros = {
  id: 'registros',
  montar(raiz, contexto) {
    ctx = contexto;
    zona = crear('div');
    nivel = campoSelect({ etiqueta: 'admin.registros.col.nivel', opciones: [{ valor: '', texto: t('admin.filtro.todos') }, ...NIVELES.map((n) => ({ valor: n, texto: t(`admin.registros.nivel.${n}`) }))] });
    origen = campoSelect({ etiqueta: 'admin.registros.col.origen', opciones: [{ valor: '', texto: t('admin.filtro.todos') }, ...ORIGENES.map((o) => ({ valor: o, texto: t(`admin.registros.origen.${o}`) }))] });
    texto = campoTexto({ etiqueta: 'admin.registros.buscar' });
    nivel.input.addEventListener('change', filtrar);
    origen.input.addEventListener('change', filtrar);
    texto.input.addEventListener('input', antirrebote(filtrar, 400));
    raiz.append(
      crear('div', {
        clase: 'seccion-cabecera',
        hijos: [
          crear('h2', { texto: t('admin.nav.registros') }),
          crear('div', {
            clase: 'fila-botones',
            hijos: [
              crear('button', { clase: 'btn-sec', texto: t('admin.actualizar'), atributos: { type: 'button' }, alClick: buscar }),
              crear('button', { clase: 'btn-sec', texto: t('admin.registros.limpiar'), atributos: { type: 'button' }, alClick: limpiar }),
              crear('button', { clase: 'btn-sec', texto: t('admin.registros.recalcular'), atributos: { type: 'button' }, alClick: recalcular }),
            ],
          }),
        ],
      }),
      crear('div', { clase: 'filtros', hijos: [nivel.el, origen.el, texto.el] }),
      zona,
    );
  },
  alMostrar() { buscar(); },
  alOcultar() {},
};
