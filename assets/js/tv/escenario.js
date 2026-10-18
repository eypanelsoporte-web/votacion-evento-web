// Escenario: el diseno se hace sobre un lienzo fijo (las medidas salen del CSS)
// y se escala para llenar cualquier resolucion de pantalla, en vertical o
// girado segun la configuracion de rotacion.
import { cfg } from '../nucleo/configuracion.js';
import { porId } from '../nucleo/dom.js';

const ROTACIONES = [0, 90, 180, 270];

export function ajustarEscenario() {
  const escenario = porId('escenario');
  const ancho = escenario.offsetWidth;
  const alto = escenario.offsetHeight;
  if (!ancho || !alto) return;

  const pedida = cfg.num('tv_rotacion', { min: 0, max: 270 });
  const rotacion = ROTACIONES.includes(pedida) ? pedida : 0;
  const girado = rotacion === 90 || rotacion === 270;

  const escala = girado
    ? Math.min(window.innerWidth / alto, window.innerHeight / ancho)
    : Math.min(window.innerWidth / ancho, window.innerHeight / alto);

  escenario.style.transform = `translate(-50%, -50%) rotate(${rotacion}deg) scale(${escala})`;
}

export function iniciarEscenario() {
  ajustarEscenario();
  window.addEventListener('resize', ajustarEscenario);
  window.addEventListener('orientationchange', ajustarEscenario);
}
