// Configuracion de reglas y valores: se lee de la tabla `config`, se guarda
// en cache local (la pantalla arranca aunque no haya internet) y se consulta
// con lectores tipados que sanean cualquier valor raro.
import { almacen } from './almacen.js';
import { VALORES_SEGUROS } from './valores-seguros.js';
import { cliente, consulta } from './cliente.js';

let valores = almacen.leer('config_cache', {});

export async function cargarConfig() {
  const r = await consulta(cliente().from('config').select('clave,valor'));
  if (r.error || !Array.isArray(r.data)) return false;
  const nuevos = {};
  for (const fila of r.data) nuevos[fila.clave] = fila.valor;
  valores = nuevos;
  almacen.guardar('config_cache', nuevos);
  return true;
}

const crudo = (clave) => (clave in valores ? valores[clave] : VALORES_SEGUROS[clave]);

export const cfg = {
  texto(clave) {
    const v = crudo(clave);
    return v === undefined || v === null ? '' : String(v);
  },
  num(clave, { min = -Infinity, max = Infinity } = {}) {
    let v = Number(crudo(clave));
    if (!Number.isFinite(v)) v = Number(VALORES_SEGUROS[clave]);
    if (!Number.isFinite(v)) v = 0;
    return Math.min(max, Math.max(min, v));
  },
  bool(clave) {
    const v = crudo(clave);
    return v === true || v === 'true';
  },
  json(clave) {
    return crudo(clave);
  },
};
