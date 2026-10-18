// Formulario del votante: lectura, validacion de apoyo (el servidor es la
// validacion definitiva) y estado de los botones.
import { cfg } from '../nucleo/configuracion.js';
import { porId } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_TELEFONO = /^[0-9+()\s.-]+$/;

export function leerDatos() {
  return {
    nombre: porId('nombre').value.trim(),
    email: porId('email').value.trim().toLowerCase(),
    telefono: porId('telefono').value.trim(),
    consentimiento: porId('consent').checked,
  };
}

export const estaVacio = () => {
  const d = leerDatos();
  return !d.nombre && !d.email && !d.telefono && !d.consentimiento;
};

// Devuelve las claves de lo que falta (ipad.falta.<clave>).
export function faltantes() {
  const d = leerDatos();
  const falta = [];
  if (d.nombre.length < 2) falta.push('nombre');
  if ((cfg.bool('email_requerido') || d.email) && !RE_EMAIL.test(d.email)) falta.push('email');
  const digitos = d.telefono.replace(/\D/g, '').length;
  if ((cfg.bool('telefono_requerido') || d.telefono) &&
      (!RE_TELEFONO.test(d.telefono) || digitos < 6 || digitos > 15)) falta.push('telefono');
  if (cfg.bool('consentimiento_requerido') && !d.consentimiento) falta.push('consentimiento');
  return falta;
}

// Aplica las reglas de config al formulario (campos obligatorios/visibles).
export function aplicarReglas() {
  porId('tel-opcional').hidden = cfg.bool('telefono_requerido');
  porId('fila-consent').hidden = !cfg.bool('consentimiento_requerido');
}

export function actualizar() {
  const falta = faltantes();
  document.querySelectorAll('#opciones .opcion-btn').forEach((b) => { b.disabled = falta.length > 0; });
  porId('ayuda-form').textContent = falta.length
    ? t('ipad.ayuda.falta', { lista: falta.map((k) => t(`ipad.falta.${k}`)).join(', ') })
    : '';
}

export function limpiar() {
  porId('nombre').value = '';
  porId('email').value = '';
  porId('telefono').value = '';
  porId('consent').checked = false;
  actualizar();
}

export function conectarEventos() {
  for (const id of ['nombre', 'email', 'telefono', 'consent']) {
    porId(id).addEventListener('input', actualizar);
    porId(id).addEventListener('change', actualizar);
  }
  porId('form-voto').addEventListener('submit', (e) => e.preventDefault());
}
