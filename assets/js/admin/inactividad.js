// Cierre automatico de sesion por inactividad: el panel muestra datos personales, asi que si
// alguien se va y deja la pantalla abierta, se cierra sola. El tiempo viene de la configuracion.
import { cfg } from '../nucleo/configuracion.js';

const EVENTOS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
const INTERVALO_MINIMO_MS = 1000;

export function iniciarInactividad(alExpirar) {
  let temporizador = null;
  let ultimo = 0;
  const reiniciar = () => {
    const ahora = Date.now();
    if (ahora - ultimo < INTERVALO_MINIMO_MS) return;
    ultimo = ahora;
    clearTimeout(temporizador);
    temporizador = setTimeout(alExpirar, cfg.num('admin_sesion_inactividad_min', { min: 0.05, max: 480 }) * 60000);
  };
  EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
  reiniciar();
  return () => {
    clearTimeout(temporizador);
    EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar));
  };
}
