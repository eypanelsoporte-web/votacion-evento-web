// Seccion "Exportar": descarga un reporte en Excel o PDF con los filtros elegidos.
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { campoSelect, llenarOpciones } from '../ui/campos.js';
import { listarDias } from '../api/votos-api.js';
import { generarReporte } from '../reporte/generar.js';
import { FORMATOS_REPORTE } from '../constantes.js';
import { diaLegible } from '../reporte/datos.js';
import { estadosPermitidos, opcionesDelFiltro } from './votos.js';

let ctx = null;
let selectorDia = null;
let formato = null;
let opcion = null;
let estado = null;
let boton = null;
let resultado = null;

async function cargarDias() {
  const dias = await listarDias();
  vaciar(selectorDia.input);
  selectorDia.input.appendChild(crear('option', { texto: t('admin.filtro.todos'), atributos: { value: '' } }));
  for (const d of dias) selectorDia.input.appendChild(crear('option', { texto: diaLegible(d), atributos: { value: d } }));
}

function describirFiltros() {
  const partes = [];
  if (selectorDia.leer()) partes.push(`${t('admin.col.dia')}: ${diaLegible(selectorDia.leer())}`);
  if (opcion.leer()) partes.push(`${t('admin.col.opcion')}: ${(ctx.opciones.find((o) => String(o.id) === opcion.leer()) || {}).etiqueta || ''}`);
  partes.push(`${t('admin.col.estado')}: ${t(`admin.votos.estado.${estado.leer()}`)}`);
  return partes.join('; ');
}

async function generar() {
  boton.disabled = true;
  resultado.className = 'msg';
  resultado.textContent = t('admin.exportar.preparando');
  const r = await generarReporte({
    formato: formato.leer(),
    filtros: { dia: selectorDia.leer(), opcionId: opcion.leer(), estado: estado.leer(), texto: '' },
    textoFiltros: describirFiltros(),
    ctx,
    alProgreso: (n) => { resultado.textContent = t('admin.exportar.progreso', { n }); },
  });
  boton.disabled = false;
  if (!r.ok) { resultado.className = 'msg-error'; resultado.textContent = t('admin.exportar.error'); return; }
  resultado.className = 'msg msg-ok';
  resultado.textContent = t(r.truncado ? 'admin.exportar.truncado' : 'admin.exportar.listo', { n: r.filas });
}

export const exportar = {
  id: 'exportar',
  montar(raiz, contexto) {
    ctx = contexto;
    formato = campoSelect({
      etiqueta: 'admin.exportar.formato',
      opciones: FORMATOS_REPORTE.map((f) => ({ valor: f, texto: t(`admin.exportar.formato.${f}`) })),
    });
    selectorDia = campoSelect({ etiqueta: 'admin.col.dia', opciones: [{ valor: '', texto: t('admin.filtro.todos') }] });
    opcion = campoSelect({ etiqueta: 'admin.col.opcion', opciones: opcionesDelFiltro(ctx) });
    estado = campoSelect({
      etiqueta: 'admin.col.estado',
      opciones: estadosPermitidos(ctx.rol).map((e) => ({ valor: e, texto: t(`admin.votos.estado.${e}`) })),
      valor: 'validos',
    });
    boton = crear('button', { clase: 'btn-principal', texto: t('admin.exportar.generar'), atributos: { type: 'button' }, alClick: generar });
    resultado = crear('p', { clase: 'msg', atributos: { role: 'status' } });
    raiz.append(
      crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.exportar') })] }),
      crear('p', { clase: 'ayuda', texto: t('admin.exportar.ayuda') }),
      crear('div', { clase: 'filtros', hijos: [formato.el, selectorDia.el, opcion.el, estado.el] }),
      boton, resultado,
    );
  },
  alMostrar() { llenarOpciones(opcion.input, opcionesDelFiltro(ctx)); cargarDias(); },
  alOcultar() {},
};
