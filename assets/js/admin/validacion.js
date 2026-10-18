// Validaciones de apoyo del panel. Avisan antes de enviar; el servidor vuelve a validar todo.
const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_TELEFONO = /^[0-9+()\s.-]+$/;
const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;

export const esEmailValido = (email) => RE_EMAIL.test(email) && email.length <= 254;
export const esDiaValido = (dia) => RE_DIA.test(String(dia || ''));

// Devuelve las claves de los campos con problema (admin.votos.error.<campo>).
export function validarVoto({ nombre, email, telefono }, { emailRequerido }) {
  const errores = [];
  if (nombre.length < 2 || nombre.length > 120) errores.push('nombre');
  if ((emailRequerido || email) && !esEmailValido(email)) errores.push('email');
  const digitos = telefono.replace(/\D/g, '').length;
  if (telefono && (!RE_TELEFONO.test(telefono) || telefono.length > 30 || digitos < 6 || digitos > 15)) errores.push('telefono');
  return errores;
}

// Variables {nombre} que tenia el texto viejo y le faltan al nuevo (las pantallas las necesitan).
export function variablesFaltantes(viejo, nuevo) {
  const variables = (s) => new Set(String(s).match(/\{\w+\}/g) || []);
  const actuales = variables(nuevo);
  return [...variables(viejo)].filter((v) => !actuales.has(v));
}

// Convierte lo escrito en el campo al valor JSON que se guarda en config, segun las reglas de esa clave.
// reglas: { tipo: 'numero'|'booleano'|'texto'|'json', min, max, opciones }. Devuelve { ok, valor, error }.
export function valorDesdeEntrada(reglas, entrada, valorActual) {
  const tipo = (reglas && reglas.tipo) || 'json';
  if (tipo === 'booleano') return { ok: true, valor: !!entrada };
  if (tipo === 'numero') {
    if (entrada === null || entrada === '' || !Number.isFinite(Number(entrada))) return { ok: false, error: 'numero' };
    const n = Number(entrada);
    if ((reglas.min !== undefined && n < reglas.min) || (reglas.max !== undefined && n > reglas.max)) return { ok: false, error: 'rango' };
    if (Array.isArray(reglas.opciones) && !reglas.opciones.includes(n)) return { ok: false, error: 'opcion' };
    return { ok: true, valor: n };
  }
  if (tipo === 'texto') {
    const texto = String(entrada);
    if (!texto) return { ok: false, error: 'vacio' };
    if (Array.isArray(reglas.opciones) && !reglas.opciones.includes(texto)) return { ok: false, error: 'opcion' };
    return { ok: true, valor: texto };
  }
  let valor;
  try { valor = JSON.parse(String(entrada)); } catch (e) { return { ok: false, error: 'json' }; }
  const tipoJs = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
  if (valorActual !== undefined && tipoJs(valor) !== tipoJs(valorActual)) return { ok: false, error: 'tipo' };
  return { ok: true, valor };
}
