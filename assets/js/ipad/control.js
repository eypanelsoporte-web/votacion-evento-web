// Panel de control de la asesora: estado de las pantallas, que muestra la TV,
// ordenes remotas y registros pendientes. Todo en lenguaje simple.
import { cfg } from '../nucleo/configuracion.js';
import { cliente, consulta } from '../nucleo/cliente.js';
import { crear, porId, vaciar } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { dormir } from '../nucleo/util.js';
import { recargar } from '../nucleo/vigilancia.js';
import { procesar, pendientes, listaRechazados, descartarRechazado, alCambiarCola } from './cola-votos.js';
import { claveTextoRechazo } from './codigos.js';

let abierto = false;
let temporizador = null;
let idEsteDispositivo = null;

const mensaje = (id, texto) => { porId(id).textContent = texto; };

function claseSemaforo(segundos) {
  if (segundos <= cfg.num('semaforo_verde_s', { min: 10 })) return 'ok';
  if (segundos <= cfg.num('semaforo_ambar_s', { min: 20 })) return 'lento';
  return 'sin';
}

function textoHace(segundos) {
  return segundos < 90
    ? t('ipad.control.latido_s', { n: segundos })
    : t('ipad.control.latido_min', { n: Math.round(segundos / 60) });
}

async function pintarDispositivos() {
  const lista = porId('ctl-estado');
  const r = await consulta(cliente().from('v_dispositivos').select('id,tipo,nombre,segundos_sin_latido').order('tipo'));
  vaciar(lista);
  if (r.error || !Array.isArray(r.data)) {
    lista.appendChild(crear('li', { texto: t('ipad.control.sin_conexion') }));
    return;
  }
  if (!r.data.length) {
    lista.appendChild(crear('li', { texto: t('ipad.control.sin_dispositivos') }));
    return;
  }
  for (const d of r.data) {
    const tipo = ['tv', 'ipad', 'admin'].includes(d.tipo) ? d.tipo : 'otro';
    const este = d.id === idEsteDispositivo ? ` ${t('ipad.control.este')}` : '';
    lista.appendChild(crear('li', {
      hijos: [
        crear('span', { clase: `punto ${claseSemaforo(d.segundos_sin_latido)}` }),
        crear('span', { texto: `${t(`ipad.control.dispositivo.${tipo}`)} ${d.nombre || d.id}${este}` }),
        crear('span', { clase: 'detalle', texto: textoHace(d.segundos_sin_latido) }),
      ],
    }));
  }
}

async function pintarModo() {
  const r = await consulta(cliente().from('control').select('modo').eq('id', 1).maybeSingle());
  const modo = r.data ? r.data.modo : null;
  porId('ctl-modos').querySelectorAll('button').forEach((b) => b.classList.toggle('activo', b.dataset.modo === modo));
}

function pintarCola() {
  const p = pendientes();
  porId('ctl-grupo-pend').hidden = p === 0;
  if (p) mensaje('ctl-pend-txt', t('ipad.control.pendientes_msg', { n: p }));

  const rech = listaRechazados();
  porId('ctl-grupo-rech').hidden = rech.length === 0;
  const ul = porId('ctl-rech-lista');
  vaciar(ul);
  for (const r of rech) {
    ul.appendChild(crear('li', {
      hijos: [
        crear('span', { texto: `${r.nombre} · ${r.email || ''}` }),
        crear('span', { clase: 'detalle', texto: t(claveTextoRechazo(r.codigo, 'titulo')) }),
        crear('button', { texto: t('ipad.control.descartar'), atributos: { type: 'button' }, alClick: () => descartarRechazado(r.id) }),
      ],
    }));
  }
}

async function cambiarModo(modo) {
  const r = await consulta(cliente().from('control').update({ modo }).eq('id', 1).select('modo'));
  if (r.error || !r.data || !r.data.length) { mensaje('ctl-modo-msg', t('ipad.control.modo_error')); return; }
  mensaje('ctl-modo-msg', t('ipad.control.modo_ok', { modo: t(`ipad.control.modo.${modo}`) }));
  pintarModo();
}

async function recargarTv() {
  const ins = await consulta(cliente().from('comandos').insert({ destino: 'tv', comando: 'recargar' }).select('id').single());
  if (ins.error || !ins.data) { mensaje('ctl-accion-msg', t('ipad.control.orden_error')); return; }
  mensaje('ctl-accion-msg', t('ipad.control.orden_enviada'));
  const limite = Date.now() + cfg.num('ipad_confirmacion_tv_s', { min: 3, max: 60 }) * 1000;
  while (Date.now() < limite) {
    await dormir(2000);
    const c = await consulta(cliente().from('comandos').select('confirmado_en').eq('id', ins.data.id).maybeSingle());
    if (c.data && c.data.confirmado_en) { mensaje('ctl-accion-msg', t('ipad.control.tv_confirmo')); return; }
  }
  mensaje('ctl-accion-msg', t('ipad.control.tv_sin_respuesta'));
}

function refrescar() {
  pintarDispositivos();
  pintarModo();
  pintarCola();
}

export function abrirControl() {
  abierto = true;
  mensaje('ctl-modo-msg', '');
  mensaje('ctl-accion-msg', '');
  porId('control').hidden = false;
  refrescar();
  temporizador = setInterval(refrescar, cfg.num('ipad_control_refresco_s', { min: 2, max: 60 }) * 1000);
}

function cerrar() {
  abierto = false;
  clearInterval(temporizador);
  porId('control').hidden = true;
}

export function iniciarControl({ dispositivo }) {
  idEsteDispositivo = dispositivo.id;
  porId('ctl-cerrar').addEventListener('click', cerrar);
  porId('ctl-modos').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => cambiarModo(b.dataset.modo)));
  porId('ctl-recargar-tv').addEventListener('click', recargarTv);
  porId('ctl-recargar-ipad').addEventListener('click', () => recargar('manual desde el control', true));
  porId('ctl-reenviar').addEventListener('click', () => procesar());
  alCambiarCola(() => { if (abierto) pintarCola(); });
}
