// Acceso a los votos desde el panel. Los permisos reales los decide la base de datos:
// aca solo se arman las consultas (con filtros saneados) y se ordenan los resultados.
import { cliente, consulta } from '../../nucleo/cliente.js';
import { esDiaValido } from '../validacion.js';
import { ESTADOS_VOTOS } from '../constantes.js';
import { leerPagina, esFueraDeRango } from './paginas.js';

const COLUMNAS = 'id,creado_en,dia_evento,nombre,email,telefono,opcion_id,consentimiento,es_prueba,eliminado,dispositivo_id,actualizado_en';
const TAMANO_LOTE = 1000;
const ESPERA_MS = 25000;

// Quita los caracteres que tienen significado especial en los filtros de la API (el apostrofe no
// lo tiene y es comun en apellidos como D'Elia u O'Brien, por eso se conserva).
export const limpiarBusqueda = (texto) => String(texto || '').replace(/[,()*%\\:"&|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

// filtros: { texto, dia, opcionId, estado }
export function aplicarFiltros(base, filtros) {
  let q = base;
  if (esDiaValido(filtros.dia)) q = q.eq('dia_evento', filtros.dia);
  if (Number.isInteger(Number(filtros.opcionId)) && Number(filtros.opcionId) > 0) q = q.eq('opcion_id', Number(filtros.opcionId));
  const estado = ESTADOS_VOTOS.includes(filtros.estado) ? filtros.estado : 'validos';
  if (estado === 'validos') q = q.eq('eliminado', false).eq('es_prueba', false);
  else if (estado === 'pruebas') q = q.eq('eliminado', false).eq('es_prueba', true);
  else if (estado === 'eliminados') q = q.eq('eliminado', true);
  const texto = limpiarBusqueda(filtros.texto);
  if (texto) q = q.or(`nombre.ilike.*${texto}*,email.ilike.*${texto}*,telefono.ilike.*${texto}*`);
  return q;
}

export function buscarVotos(filtros, pagina, porPagina) {
  const construir = () => aplicarFiltros(cliente().from('votos').select(COLUMNAS, { count: 'exact' }), filtros)
    .order('creado_en', { ascending: false }).order('id');
  return leerPagina(construir, pagina, porPagina, ESPERA_MS);
}

// Lee de a lotes de 1000 (el maximo de la API) hasta agotar los datos o llegar al tope.
async function leerLotes(construir, maximo, alProgreso) {
  const filas = [];
  for (let desde = 0; desde < maximo; desde += TAMANO_LOTE) {
    const hasta = Math.min(desde + TAMANO_LOTE, maximo) - 1;
    const r = await consulta(construir().range(desde, hasta), ESPERA_MS);
    if (esFueraDeRango(r)) return { ok: true, filas, truncado: false }; // el total era justo multiplo del lote
    if (r.error || !Array.isArray(r.data)) return { ok: false, filas, truncado: false };
    filas.push(...r.data);
    if (alProgreso) alProgreso(filas.length);
    if (r.data.length < hasta - desde + 1) return { ok: true, filas, truncado: false };
  }
  return { ok: true, filas, truncado: true };
}

export function cargarTodos(filtros, maximo, alProgreso) {
  return leerLotes(() => aplicarFiltros(cliente().from('votos').select(COLUMNAS), filtros)
    .order('creado_en', { ascending: true }).order('id'), maximo, alProgreso);
}

export async function listarDias() {
  const r = await leerLotes(() => cliente().from('votos').select('dia_evento').order('dia_evento'), 20000);
  return r.ok ? [...new Set(r.filas.map((f) => f.dia_evento))].sort() : [];
}

// Solo las columnas livianas necesarias para contar. Los conteos por opcion y por dia se arman aca.
export function votosParaResumen() {
  return leerLotes(() => cliente().from('votos').select('opcion_id,dia_evento,es_prueba,eliminado,creado_en').order('creado_en').order('id'), 20000);
}

export async function actualizarVoto(id, cambios) {
  const r = await consulta(cliente().from('votos').update(cambios).eq('id', id).select(COLUMNAS), ESPERA_MS);
  if (r.error) return { ok: false, codigo: r.error.code || 'ERROR' };
  if (!Array.isArray(r.data) || !r.data.length) return { ok: false, codigo: 'SIN_FILAS' }; // la base no dejo modificarlo
  return { ok: true, fila: r.data[0] };
}
