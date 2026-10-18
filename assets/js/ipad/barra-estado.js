// Barra superior: estado de la conexion, votos pendientes y accesos al control.
import { cfg } from '../nucleo/configuracion.js';
import { porId } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { estadoConexion } from '../nucleo/vigilancia.js';
import { pendientes, listaRechazados, alCambiarCola } from './cola-votos.js';

const CLASE_POR_ESTADO = { ok: 'ok', lento: 'lento', sin_conexion: 'sin' };

export function iniciarBarra({ alAbrirControl }) {
  const boton = porId('estado-con');

  function pintar() {
    const clase = CLASE_POR_ESTADO[estadoConexion()];
    boton.className = `estado ${clase}`;
    porId('estado-texto').textContent = t(`ipad.estado.${clase}`);

    const p = pendientes();
    const bp = porId('badge-pendientes');
    bp.hidden = p === 0;
    if (p) bp.textContent = t('ipad.badge.pendientes', { n: p });

    const r = listaRechazados().length;
    const br = porId('badge-rechazados');
    br.hidden = r === 0;
    if (r) br.textContent = t('ipad.badge.rechazados', { n: r });
  }

  pintar();
  setInterval(pintar, 1000);
  alCambiarCola(pintar);

  // El control se abre con una pulsacion larga (o desde los avisos), para
  // que nadie lo toque sin querer.
  let temporizador = null;
  const empezar = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(alAbrirControl, cfg.num('ipad_pulsacion_ms', { min: 300, max: 10000 }));
  };
  const cancelar = () => clearTimeout(temporizador);
  boton.addEventListener('pointerdown', empezar);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => boton.addEventListener(ev, cancelar));
  boton.addEventListener('contextmenu', (e) => e.preventDefault());
  porId('badge-rechazados').addEventListener('click', alAbrirControl);
  porId('badge-pendientes').addEventListener('click', alAbrirControl);
}
