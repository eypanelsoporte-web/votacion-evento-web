// Seccion "En vivo": estado de las pantallas, que muestra la TV y ordenes remotas.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import {
  MODOS_TV, claseSemaforo, textoHace, listarDispositivos, leerModoTv, cambiarModoTv, recargarDispositivo,
} from '../../nucleo/control-tv.js';
import { construirTabla } from '../ui/tabla.js';

let zonaDispositivos = null;
let zonaModos = null;
let mensaje = null;
let temporizador = null;
let modoActual = null;

async function pintarDispositivos() {
  const { ok, filas } = await listarDispositivos();
  vaciar(zonaDispositivos);
  if (!ok) { zonaDispositivos.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') })); return; }
  const tipoLegible = (d) => t(`ipad.control.dispositivo.${['tv', 'ipad', 'admin'].includes(d.tipo) ? d.tipo : 'otro'}`);
  zonaDispositivos.appendChild(construirTabla({
    vacio: t('ipad.control.sin_dispositivos'),
    filas,
    columnas: [
      { titulo: t('admin.envivo.col.dispositivo'), celda: (d) => `${tipoLegible(d)} ${d.nombre || d.id}` },
      {
        titulo: t('admin.envivo.col.estado'),
        celda: (d) => crear('span', { hijos: [crear('span', { clase: `punto ${claseSemaforo(d.segundos_sin_latido)}` }), crear('span', { texto: ` ${textoHace(d.segundos_sin_latido)}` })] }),
      },
    ],
  }));
}

function pintarModos() {
  for (const boton of zonaModos.querySelectorAll('button')) boton.classList.toggle('activo', boton.dataset.modo === modoActual);
}

async function refrescar() {
  await pintarDispositivos();
  modoActual = await leerModoTv();
  pintarModos();
}

async function cambiarModo(modo) {
  const ok = await cambiarModoTv(modo);
  mensaje.textContent = ok ? t('ipad.control.modo_ok', { modo: t(`ipad.control.modo.${modo}`) }) : t('ipad.control.modo_error');
  if (ok) { modoActual = modo; pintarModos(); }
}

async function recargar(destino) {
  mensaje.textContent = t('ipad.control.orden_enviada');
  const resultado = await recargarDispositivo(destino);
  mensaje.textContent = t(`admin.envivo.${{ error: 'orden_error', confirmada: 'confirmada', sin_respuesta: 'sin_respuesta' }[resultado]}`);
}

export const enVivo = {
  id: 'en_vivo',
  montar(raiz) {
    zonaDispositivos = crear('div');
    zonaModos = crear('div', { clase: 'fila-botones' });
    for (const modo of MODOS_TV) {
      zonaModos.appendChild(crear('button', { clase: 'btn-sec', texto: t(`ipad.control.modo.${modo}`), atributos: { type: 'button', 'data-modo': modo }, alClick: () => cambiarModo(modo) }));
    }
    mensaje = crear('p', { clase: 'msg', atributos: { role: 'status' } });
    raiz.append(
      crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.en_vivo') })] }),
      crear('h3', { texto: t('admin.envivo.dispositivos') }), zonaDispositivos,
      crear('h3', { texto: t('admin.envivo.modo') }), zonaModos,
      crear('h3', { texto: t('admin.envivo.acciones') }),
      crear('div', {
        clase: 'fila-botones',
        hijos: [
          crear('button', { clase: 'btn-sec', texto: t('admin.envivo.recargar_tv'), atributos: { type: 'button' }, alClick: () => recargar('tv') }),
          crear('button', { clase: 'btn-sec', texto: t('admin.envivo.recargar_ipads'), atributos: { type: 'button' }, alClick: () => recargar('ipad') }),
        ],
      }),
      mensaje,
    );
  },
  alMostrar() {
    refrescar();
    temporizador = setInterval(refrescar, cfg.num('admin_refresco_s', { min: 5, max: 600 }) * 1000);
  },
  alOcultar() { clearInterval(temporizador); },
};
