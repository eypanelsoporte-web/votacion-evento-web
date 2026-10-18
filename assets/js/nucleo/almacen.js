// Almacenamiento local seguro: nunca lanza errores (puede estar bloqueado
// o lleno) y siempre devuelve el valor por defecto si algo falla.
const PREFIJO = 'ev_';

export const almacen = {
  leer(clave, defecto) {
    try {
      const v = localStorage.getItem(PREFIJO + clave);
      return v === null ? defecto : JSON.parse(v);
    } catch (e) {
      return defecto;
    }
  },
  guardar(clave, valor) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  },
  borrar(clave) {
    try { localStorage.removeItem(PREFIJO + clave); } catch (e) { /* nada */ }
  },
};
