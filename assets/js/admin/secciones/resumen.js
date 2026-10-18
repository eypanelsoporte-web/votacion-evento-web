// Seccion "Resumen": totales, votos por opcion (con barras) y votos por dia.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { construirTabla } from '../ui/tabla.js';
import { votosParaResumen } from '../api/votos-api.js';
import { resumenPorOpcion, resumenPorDia, formatearFechaHora, diaLegible } from '../reporte/datos.js';

let ctx = null;
let cuerpo = null;
let temporizador = null;
let cargando = false;

const tarjeta = (clave, valor) => crear('div', {
  clase: 'tarjeta', hijos: [crear('span', { clase: 'tarjeta-valor', texto: valor }), crear('span', { clase: 'tarjeta-etiqueta', texto: t(clave) })],
});

function barra(porcentaje) {
  const relleno = crear('div', { clase: 'barra-relleno' });
  relleno.style.width = `${porcentaje}%`;
  return crear('div', { clase: 'barra', hijos: [relleno] });
}

function dibujar(votos) {
  vaciar(cuerpo);
  const validos = votos.filter((v) => !v.eliminado && !v.es_prueba);
  const pruebas = votos.filter((v) => v.es_prueba && !v.eliminado).length;
  const eliminados = votos.filter((v) => v.eliminado).length;
  const ultimo = validos.reduce((maximo, v) => (v.creado_en > maximo ? v.creado_en : maximo), '');
  const f = ultimo ? formatearFechaHora(ultimo, ctx.zona) : null;

  const tarjetas = [tarjeta('admin.resumen.validos', validos.length), tarjeta('admin.resumen.pruebas', pruebas)];
  if (ctx.rol !== 'consulta') tarjetas.push(tarjeta('admin.resumen.eliminados', eliminados));
  tarjetas.push(tarjeta('admin.resumen.ultimo', f ? `${f.fecha} ${f.hora}` : t('admin.resumen.sin_votos')));
  cuerpo.appendChild(crear('div', { clase: 'tarjetas', hijos: tarjetas }));

  const porOpcion = resumenPorOpcion(votos, ctx.opciones.filter((o) => o.activa));
  cuerpo.appendChild(crear('h3', { texto: t('admin.resumen.por_opcion') }));
  cuerpo.appendChild(construirTabla({
    vacio: t('admin.sin_datos'),
    columnas: [
      { titulo: t('admin.col.opcion'), celda: (r) => r.opcion },
      { titulo: t('admin.col.votos'), celda: (r) => r.votos, clase: 'num' },
      { titulo: t('admin.col.porcentaje'), celda: (r) => `${r.porcentaje}%`, clase: 'num' },
      { titulo: '', celda: (r) => barra(r.porcentaje), clase: 'celda-barra' },
    ],
    filas: porOpcion,
  }));

  const activas = ctx.opciones.filter((o) => o.activa);
  cuerpo.appendChild(crear('h3', { texto: t('admin.resumen.por_dia') }));
  cuerpo.appendChild(construirTabla({
    vacio: t('admin.sin_datos'),
    columnas: [
      { titulo: t('admin.col.dia'), celda: (r) => diaLegible(r.dia) },
      ...activas.map((o, i) => ({ titulo: o.etiqueta, celda: (r) => r.valores[i], clase: 'num' })),
      { titulo: t('admin.col.total'), celda: (r) => r.total, clase: 'num' },
    ],
    filas: resumenPorDia(votos, activas),
  }));
}

async function refrescar() {
  if (cargando) return;
  cargando = true;
  const r = await votosParaResumen();
  cargando = false;
  if (!r.ok) {
    vaciar(cuerpo);
    cuerpo.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') }));
    return;
  }
  dibujar(r.filas);
}

export const resumen = {
  id: 'resumen',
  montar(raiz, contexto) {
    ctx = contexto;
    const boton = crear('button', { clase: 'btn-sec', texto: t('admin.actualizar'), atributos: { type: 'button' }, alClick: refrescar });
    cuerpo = crear('div');
    raiz.append(crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.resumen') }), boton] }), cuerpo);
  },
  alMostrar() {
    refrescar();
    temporizador = setInterval(refrescar, cfg.num('admin_refresco_s', { min: 5, max: 600 }) * 1000);
  },
  alOcultar() { clearInterval(temporizador); },
};
