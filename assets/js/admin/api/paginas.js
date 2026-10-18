// Lectura de listas por paginas. La API responde con ERROR (416 / PGRST103) cuando se pide una
// pagina que queda mas alla del final, en vez de una lista vacia. Eso pasa en casos normales:
// se corrige el ultimo voto de la ultima pagina, o se limpian registros viejos. Aca se resuelve
// una sola vez para todas las listas.
import { consulta } from '../../nucleo/cliente.js';

export const esFueraDeRango = (r) => !!r && !!r.error && (r.status === 416 || r.error.code === 'PGRST103');

// construir(): devuelve una consulta NUEVA con select(columnas, { count: 'exact' }) y los filtros y el
// orden ya puestos (sin range). Devuelve { ok, filas, total, pagina }, donde `pagina` es la que se
// leyo de verdad (si la pedida ya no existe, la ultima que si existe).
export async function leerPagina(construir, pagina, porPagina, espera) {
  const pedir = (n) => consulta(construir().range(n * porPagina, (n + 1) * porPagina - 1), espera);
  let efectiva = pagina;
  let r = await pedir(efectiva);
  if (esFueraDeRango(r) && pagina > 0) {
    const sonda = await consulta(construir().range(0, 0), espera);
    if (!sonda.error) {
      efectiva = Math.max(0, Math.ceil((sonda.count || 0) / porPagina) - 1);
      r = await pedir(efectiva);
    }
  }
  if (r.error || !Array.isArray(r.data)) return { ok: false, filas: [], total: 0, pagina: efectiva };
  return { ok: true, filas: r.data, total: r.count || 0, pagina: efectiva };
}
