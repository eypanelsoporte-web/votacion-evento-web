// Pantalla completa desde el control remoto. El navegador de las teles deja siempre visibles sus barras
// (pestanas y direccion), que tapan parte de la imagen. Un navegador solo permite pasar a pantalla
// completa despues de un gesto de la persona: la tecla OK (Enter) del control remoto lo es.
// Apretar OK otra vez vuelve a como estaba.
const TECLAS = ['Enter', ' '];
const CODIGO_OK = 13;

const enPantallaCompleta = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

function alternar() {
  const raiz = document.documentElement;
  const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
  const salir = document.exitFullscreen || document.webkitExitFullscreen;
  try {
    const respuesta = enPantallaCompleta() ? salir && salir.call(document) : pedir && pedir.call(raiz);
    if (respuesta && typeof respuesta.catch === 'function') respuesta.catch(() => {});
  } catch (e) {
    // El navegador no lo permite: la TV sigue funcionando igual, solo con sus barras.
  }
}

export function iniciarPantallaCompleta() {
  document.addEventListener('keydown', (e) => {
    if (TECLAS.includes(e.key) || e.keyCode === CODIGO_OK) alternar();
  });
}
