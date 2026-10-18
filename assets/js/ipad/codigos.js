// Codigos de respuesta del servidor para un voto rechazado. Cada codigo tiene
// sus textos en la tabla `textos` (ipad.rechazo.<CODIGO>.titulo/.msg/.boton).
// Este archivo solo clasifica; no contiene frases.

// El dato se puede corregir en el formulario y volver a intentar.
export const CODIGOS_CORREGIBLES = [
  'EMAIL_INVALIDO', 'TELEFONO_INVALIDO', 'NOMBRE_INVALIDO', 'SIN_CONSENTIMIENTO', 'OPCION_INVALIDA',
];

// Codigos que tienen texto propio. Cualquier otro usa GENERICO.
export const CODIGOS_CON_TEXTO = [
  ...CODIGOS_CORREGIBLES, 'DUPLICADO', 'SIN_PERMISO', 'GENERICO',
];

export function claveTextoRechazo(codigo, parte) {
  const usado = CODIGOS_CON_TEXTO.includes(codigo) ? codigo : 'GENERICO';
  return `ipad.rechazo.${usado}.${parte}`;
}
