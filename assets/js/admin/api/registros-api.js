// Registros tecnicos (errores), auditoria y mantenimiento. Los permisos los decide la base.
import { cliente, consulta, rpc } from '../../nucleo/cliente.js';
import { limpiarBusqueda } from './votos-api.js';
import { leerPagina } from './paginas.js';

const ESPERA_MS = 20000;

export function listarLogs({ nivel, origen, texto }, pagina, porPagina) {
  const buscado = limpiarBusqueda(texto);
  const construir = () => {
    let q = cliente().from('logs').select('id,creado_en,nivel,origen,dispositivo_id,mensaje', { count: 'exact' });
    if (nivel) q = q.eq('nivel', nivel);
    if (origen) q = q.eq('origen', origen);
    if (buscado) q = q.ilike('mensaje', `*${buscado}*`);
    return q.order('creado_en', { ascending: false }).order('id', { ascending: false });
  };
  return leerPagina(construir, pagina, porPagina, ESPERA_MS);
}

export function listarAuditoria({ tabla }, pagina, porPagina) {
  const construir = () => {
    let q = cliente().from('auditoria').select('id,creado_en,tabla,registro,accion,antes,despues,usuario', { count: 'exact' });
    if (tabla) q = q.eq('tabla', tabla);
    return q.order('creado_en', { ascending: false }).order('id', { ascending: false });
  };
  return leerPagina(construir, pagina, porPagina, ESPERA_MS);
}

export async function listarTablasAuditadas() {
  const r = await consulta(cliente().from('auditoria').select('tabla').order('creado_en', { ascending: false }).limit(1000), ESPERA_MS);
  return r.error || !Array.isArray(r.data) ? [] : [...new Set(r.data.map((f) => f.tabla))].sort();
}

export async function ejecutarMantenimiento(dias) {
  const r = await rpc('mantenimiento', { p_dias: dias }, ESPERA_MS);
  return r.error ? { ok: false } : { ok: true, detalle: r.data };
}

export async function recalcularConteos() {
  const r = await rpc('recalcular_todos_conteos', {}, ESPERA_MS);
  return { ok: !r.error };
}
