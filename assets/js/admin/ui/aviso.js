// Avisos breves ("Guardado", "No se pudo...") en una esquina de la pantalla.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, porId } from '../../nucleo/dom.js';

// tipo: 'ok' | 'error' | 'info'
export function avisar(texto, tipo = 'ok') {
  const aviso = crear('div', { clase: `aviso aviso-${tipo}`, texto, atributos: { role: tipo === 'error' ? 'alert' : 'status' } });
  porId('avisos').appendChild(aviso);
  setTimeout(() => aviso.remove(), cfg.num('admin_aviso_s', { min: 2, max: 60 }) * 1000);
}
