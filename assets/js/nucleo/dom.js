// Ayudantes de DOM. Regla de seguridad: NUNCA se inserta HTML. Todo texto
// que llega de la base de datos entra solo por textContent.

export const porId = (id) => document.getElementById(id);

export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

const ATRIBUTO_PROHIBIDO = /^(on|style$|srcdoc$|formaction$)/i;

export function crear(etiqueta, { clase, texto, atributos, hijos, alClick } = {}) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== null) el.textContent = String(texto);
  if (atributos) {
    for (const [nombre, valor] of Object.entries(atributos)) {
      if (ATRIBUTO_PROHIBIDO.test(nombre)) throw new Error(`Atributo no permitido: ${nombre}`);
      el.setAttribute(nombre, String(valor));
    }
  }
  if (hijos) for (const h of hijos) if (h) el.appendChild(h);
  if (alClick) el.addEventListener('click', alClick);
  return el;
}

export function mostrarFatal(error) {
  // Error de despliegue (configuracion faltante): se muestra tal cual, sin base de datos.
  document.querySelectorAll('main, header').forEach((el) => { el.hidden = true; });
  const pre = document.createElement('pre');
  pre.className = 'error-fatal';
  pre.textContent = String(error && error.message ? error.message : error);
  document.body.appendChild(pre);
}
