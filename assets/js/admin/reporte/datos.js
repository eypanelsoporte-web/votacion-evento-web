// Armado del contenido del reporte (Excel y PDF) a partir de los votos.
// Son funciones puras: reciben los datos y la funcion de textos, y devuelven tablas.
import { porcentajes } from '../../nucleo/util.js';

const esValido = (v) => !v.eliminado && !v.es_prueba;

// "2026-10-17T14:03:09Z" -> { fecha: "17/10/2026", hora: "11:03:09" } en la zona horaria del evento.
export function formatearFechaHora(iso, zona) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return { fecha: '', hora: '' };
  let formato;
  try {
    formato = new Intl.DateTimeFormat('es-AR', {
      timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch (e) {
    formato = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  const p = Object.fromEntries(formato.formatToParts(fecha).map((x) => [x.type, x.value]));
  return { fecha: `${p.day}/${p.month}/${p.year}`, hora: `${p.hour}:${p.minute}:${p.second}` };
}

export const diaLegible = (dia) => (/^\d{4}-\d{2}-\d{2}$/.test(String(dia)) ? String(dia).split('-').reverse().join('/') : String(dia || ''));

export function resumenPorOpcion(votos, opciones) {
  const cuenta = new Map(opciones.map((o) => [o.id, 0]));
  for (const v of votos) if (esValido(v) && cuenta.has(v.opcion_id)) cuenta.set(v.opcion_id, cuenta.get(v.opcion_id) + 1);
  const valores = opciones.map((o) => cuenta.get(o.id));
  const pct = porcentajes(valores);
  return opciones.map((o, i) => ({ opcion: o.etiqueta, votos: valores[i], porcentaje: pct[i] }));
}

export function resumenPorDia(votos, opciones) {
  const dias = new Map();
  for (const v of votos) {
    if (!esValido(v)) continue;
    if (!dias.has(v.dia_evento)) dias.set(v.dia_evento, new Map(opciones.map((o) => [o.id, 0])));
    const fila = dias.get(v.dia_evento);
    if (fila.has(v.opcion_id)) fila.set(v.opcion_id, fila.get(v.opcion_id) + 1);
  }
  return [...dias.keys()].sort().map((dia) => {
    const fila = dias.get(dia);
    const valores = opciones.map((o) => fila.get(o.id));
    return { dia, valores, total: valores.reduce((a, b) => a + b, 0) };
  });
}

// ctx: { votos, opciones, t, zona, ahora, usuario, filtros (texto) }
export function armarReporte(ctx) {
  const { votos, opciones, t, zona, ahora, usuario, filtros } = ctx;
  const validos = votos.filter(esValido).length;
  const porOpcion = resumenPorOpcion(votos, opciones);
  const porDia = resumenPorDia(votos, opciones);
  const generado = formatearFechaHora(ahora.toISOString(), zona);

  const estado = (v) => (v.eliminado ? t('admin.estado.eliminado') : v.es_prueba ? t('admin.estado.prueba') : t('admin.estado.valido'));
  const orden = [...votos].sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en)));
  const detalle = orden.map((v, i) => {
    const f = formatearFechaHora(v.creado_en, zona);
    return [i + 1, f.fecha, f.hora, diaLegible(v.dia_evento), v.nombre, v.email || '', v.telefono || '',
      (opciones.find((o) => o.id === v.opcion_id) || {}).etiqueta || '', estado(v),
      v.consentimiento ? t('admin.si') : t('admin.no')];
  });

  const colsOpcion = [t('admin.col.opcion'), t('admin.col.votos'), t('admin.col.porcentaje')];
  const colsDia = [t('admin.col.dia'), ...opciones.map((o) => o.etiqueta), t('admin.col.total')];
  const colsDetalle = ['admin.col.numero', 'admin.col.fecha', 'admin.col.hora', 'admin.col.dia', 'admin.col.nombre', 'admin.col.email',
    'admin.col.telefono', 'admin.col.opcion', 'admin.col.estado', 'admin.col.consentimiento'].map((k) => t(k));

  const filasOpcion = porOpcion.map((r) => [r.opcion, r.votos, `${r.porcentaje}%`]);
  const filasDia = porDia.map((r) => [diaLegible(r.dia), ...r.valores, r.total]);

  const sello = `${generado.fecha.split('/').reverse().join('')}-${generado.hora.slice(0, 5).replace(':', '')}`;
  return {
    titulo: t('admin.reporte.titulo'),
    lineas: [
      t('admin.reporte.generado', { fecha: `${generado.fecha} ${generado.hora}`, usuario }),
      t('admin.reporte.filtros', { filtros: filtros || t('admin.reporte.sin_filtros') }),
      t('admin.reporte.totales', { validos, filas: votos.length }),
    ],
    nombreArchivo: `${String(t('admin.reporte.archivo')).replace(/[^\p{L}\p{N}_-]+/gu, '-')}-${sello}`,
    hojas: [
      { nombre: t('admin.reporte.hoja_opciones'), columnas: colsOpcion.map((titulo, i) => ({ titulo, ancho: i ? 12 : 30 })), filas: filasOpcion },
      { nombre: t('admin.reporte.hoja_dias'), columnas: colsDia.map((titulo, i) => ({ titulo, ancho: i ? 14 : 14 })), filas: filasDia },
      { nombre: t('admin.reporte.hoja_votos'),
        columnas: colsDetalle.map((titulo, i) => ({ titulo, ancho: [6, 12, 10, 12, 28, 32, 18, 20, 12, 14][i] })), filas: detalle },
    ],
    tablasPdf: [
      { titulo: t('admin.reporte.hoja_opciones'),
        columnas: colsOpcion.map((titulo, i) => ({ titulo, peso: i ? 1 : 4, alinear: i ? 'der' : 'izq' })), filas: filasOpcion },
      { titulo: t('admin.reporte.hoja_dias'),
        columnas: colsDia.map((titulo, i) => ({ titulo, peso: 1, alinear: i ? 'der' : 'izq' })), filas: filasDia },
      { titulo: t('admin.reporte.hoja_votos'),
        columnas: colsDetalle.map((titulo, i) => ({ titulo, peso: [0.6, 1.1, 0.9, 1.1, 3, 3, 1.7, 1.5, 1.1, 1.8][i], alinear: i === 0 ? 'der' : 'izq' })),
        filas: detalle },
    ],
    pie: (pagina, total) => t('admin.reporte.pie', { pagina, total }),
  };
}
