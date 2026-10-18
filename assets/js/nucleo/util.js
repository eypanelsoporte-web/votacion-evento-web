// Utilidades genericas sin dependencias.

export const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export function uuid() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Reemplaza {variable} por su valor. Las variables que no vengan quedan como estan.
export function plantilla(texto, variables = {}) {
  return String(texto).replace(/\{(\w+)\}/g, (marca, nombre) =>
    Object.prototype.hasOwnProperty.call(variables, nombre) ? String(variables[nombre]) : marca);
}

export function antirrebote(funcion, ms) {
  let temporizador = null;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcion(...args), ms);
  };
}

export function acotar(numero, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, numero));
}
