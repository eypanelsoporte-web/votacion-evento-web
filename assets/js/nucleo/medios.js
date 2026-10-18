// Validacion de las URL de imagenes y videos que vienen de la base de datos.
// Solo se aceptan rutas relativas simples o https:// hacia hosts permitidos
// (config.medios_hosts). Cualquier otra cosa se descarta.
import { cfg } from './configuracion.js';

const RUTA_RELATIVA = /^[A-Za-z0-9_][A-Za-z0-9_./%-]*$/;
const CARACTERES_PROHIBIDOS = /[\s<>"'\\]/;

function hostPermitido(host, patron) {
  if (typeof patron !== 'string') return false;
  if (patron.startsWith('*.')) {
    const sufijo = patron.slice(1);
    return host.length > sufijo.length && host.endsWith(sufijo);
  }
  return host === patron;
}

export function urlMedioSegura(url) {
  if (typeof url !== 'string' || url.length > 500 || CARACTERES_PROHIBIDOS.test(url)) return null;
  if (RUTA_RELATIVA.test(url) && !url.includes('..')) return url;

  let parsed;
  try { parsed = new URL(url); } catch (e) { return null; }
  if (parsed.protocol !== 'https:') return null;

  const permitidos = cfg.json('medios_hosts');
  if (!Array.isArray(permitidos)) return null;
  return permitidos.some((p) => hostPermitido(parsed.hostname, p)) ? parsed.href : null;
}
