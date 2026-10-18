// Convierte una fila de auditoria en una frase corta: que campos cambiaron y de que a que.
// Funcion pura (sin pantalla), para poder probarla.
const IGNORAR = new Set(['actualizado_en', 'actualizado_por', 'creado_en', 'id', 'user_id']);
const MAXIMO_VALOR = 60;

function corto(valor) {
  if (valor === null || valor === undefined || valor === '') return '∅';
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  return texto.length > MAXIMO_VALOR ? `${texto.slice(0, MAXIMO_VALOR)}…` : texto;
}

export function resumirCambios({ tabla, accion, antes, despues }) {
  const a = antes || {};
  const d = despues || {};
  if (tabla === 'panel') return Object.entries(d).map(([k, v]) => `${k}: ${corto(v)}`).join('; ');
  if (accion === 'UPDATE') {
    return Object.keys(d)
      .filter((k) => !IGNORAR.has(k) && JSON.stringify(a[k]) !== JSON.stringify(d[k]))
      .map((k) => `${k}: ${corto(a[k])} → ${corto(d[k])}`).join('; ');
  }
  const origen = accion === 'DELETE' ? a : d;
  return Object.entries(origen).filter(([k]) => !IGNORAR.has(k)).slice(0, 4).map(([k, v]) => `${k}: ${corto(v)}`).join('; ');
}
