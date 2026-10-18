// Genera y descarga un reporte (Excel o PDF) con los votos que cumplen los filtros.
// Cada exportacion queda registrada en la auditoria: quien, cuando y cuantas filas.
import { cfg } from '../../nucleo/configuracion.js';
import { t } from '../../nucleo/textos.js';
import { cargarTodos } from '../api/votos-api.js';
import { registrarEvento } from '../api/panel-api.js';
import { armarReporte } from './datos.js';
import { crearXlsx } from './xlsx.js';
import { crearPdf } from './pdf.js';
import { descargarArchivo } from './descarga.js';

const FORMATOS = {
  xlsx: { extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pdf: { extension: 'pdf', mime: 'application/pdf' },
};

// Devuelve { ok, filas, truncado } o { ok: false, motivo }.
export async function generarReporte({ formato, filtros, textoFiltros, ctx, alProgreso }) {
  const definicion = FORMATOS[formato];
  if (!definicion) return { ok: false, motivo: 'formato' };

  const maximo = cfg.num('admin_max_exportar', { min: 100, max: 100000 });
  const lectura = await cargarTodos(filtros, maximo, alProgreso);
  if (!lectura.ok) return { ok: false, motivo: 'carga' };

  const reporte = armarReporte({
    votos: lectura.filas, opciones: ctx.opciones, t, zona: ctx.zona, ahora: new Date(),
    usuario: ctx.perfil.email || ctx.perfil.nombre || '', filtros: textoFiltros,
  });
  const bytes = formato === 'pdf'
    ? crearPdf({ titulo: reporte.titulo, lineas: reporte.lineas, tablas: reporte.tablasPdf, pie: reporte.pie })
    : crearXlsx(reporte.hojas);

  descargarArchivo(`${reporte.nombreArchivo}.${definicion.extension}`, bytes, definicion.mime);
  await registrarEvento('exportar', { formato, filas: lectura.filas.length, filtros: textoFiltros, truncado: lectura.truncado });
  return { ok: true, filas: lectura.filas.length, truncado: lectura.truncado };
}
