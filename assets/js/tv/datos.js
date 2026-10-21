// Datos de la TV: opciones, conteos, modo manual y diapositivas. Se consultan
// al servidor periodicamente (respaldo) y tambien por tiempo real. Todo se
// guarda en cache local para que un reinicio sin internet no deje la pantalla vacia.
import { almacen } from '../nucleo/almacen.js';
import { cliente, consulta } from '../nucleo/cliente.js';
import { cfg, cargarConfig } from '../nucleo/configuracion.js';
import { cargarTextos } from '../nucleo/textos.js';
import { suscribir } from '../nucleo/tiempo-real.js';
import { urlMedioSegura } from '../nucleo/medios.js';
import { antirrebote } from '../nucleo/util.js';

const MODOS = ['auto', 'resultados', 'descanso'];

export const estado = {
  opciones: almacen.leer('tv_opciones', []),
  conteos: new Map(Object.entries(almacen.leer('tv_conteos', {})).map(([k, v]) => [Number(k), Number(v)])),
  modo: MODOS.includes(almacen.leer('tv_modo', 'auto')) ? almacen.leer('tv_modo', 'auto') : 'auto',
  diapositivas: almacen.leer('tv_slides', []),
};

const oyentes = { conteos: [], modo: [], diapositivas: [], opciones: [], presentacion: [] };
export const alCambiar = (tipo, funcion) => { oyentes[tipo].push(funcion); };
const emitir = (tipo, dato) => oyentes[tipo].forEach((f) => f(dato));

const sumar = (mapa) => Array.from(mapa.values()).reduce((a, b) => a + b, 0);
export const totalVotos = () => sumar(estado.conteos);

let totalAnterior = null; // null = todavia no se leyo nada (la primera lectura no cuenta como voto nuevo)

async function leerConteos() {
  const r = await consulta(cliente().from('conteos').select('opcion_id,total'));
  if (r.error || !Array.isArray(r.data)) return;
  const nuevo = new Map(r.data.map((f) => [Number(f.opcion_id), Number(f.total)]));
  const total = sumar(nuevo);
  const aumento = totalAnterior !== null && total > totalAnterior;
  const cambio = totalAnterior === null || JSON.stringify([...nuevo]) !== JSON.stringify([...estado.conteos]);
  totalAnterior = total;
  estado.conteos = nuevo;
  almacen.guardar('tv_conteos', [...nuevo].reduce((obj, [clave, valor]) => ({ ...obj, [clave]: valor }), {}));
  if (cambio) emitir('conteos', { aumento });
}

async function leerModo() {
  const r = await consulta(cliente().from('control').select('modo').eq('id', 1).maybeSingle());
  if (r.error || !r.data || !MODOS.includes(r.data.modo)) return;
  if (r.data.modo !== estado.modo) {
    estado.modo = r.data.modo;
    almacen.guardar('tv_modo', estado.modo);
    emitir('modo', estado.modo);
  }
}

async function leerOpciones() {
  const r = await consulta(cliente().from('opciones').select('id,etiqueta,orden')
    .eq('activa', true).order('orden', { ascending: true }));
  if (r.error || !Array.isArray(r.data)) return;
  if (JSON.stringify(r.data) !== JSON.stringify(estado.opciones)) {
    estado.opciones = r.data;
    almacen.guardar('tv_opciones', r.data);
    emitir('opciones');
  }
}

async function leerDiapositivas() {
  const r = await consulta(cliente().from('diapositivas').select('id,tipo,url,titulo,duracion_s,orden')
    .eq('activa', true).order('orden', { ascending: true }));
  if (r.error || !Array.isArray(r.data)) return;
  // Se descarta cualquier medio cuya URL no pase la validacion de seguridad.
  const seguras = r.data
    .map((d) => ({ ...d, url: urlMedioSegura(d.url) }))
    .filter((d) => d.url && (d.tipo === 'imagen' || d.tipo === 'video'));
  if (JSON.stringify(seguras) !== JSON.stringify(estado.diapositivas)) {
    estado.diapositivas = seguras;
    almacen.guardar('tv_slides', seguras);
    emitir('diapositivas');
  }
}

async function leerPresentacion() {
  const [a, b] = await Promise.all([cargarConfig(), cargarTextos()]);
  if (a || b) emitir('presentacion');
}

// El orden importa: la config (hosts permitidos) debe estar antes de validar las diapositivas.
async function refrescarContenido() {
  await leerPresentacion();
  await Promise.all([leerOpciones(), leerDiapositivas()]);
}

export async function iniciarDatos() {
  await leerPresentacion();
  await Promise.all([leerOpciones(), leerConteos(), leerModo(), leerDiapositivas()]);

  setInterval(() => { leerConteos(); leerModo(); }, cfg.num('poll_s', { min: 3, max: 120 }) * 1000);
  setInterval(refrescarContenido, cfg.num('tv_contenido_min', { min: 1, max: 120 }) * 60000);

  const alContenido = antirrebote(refrescarContenido, 1500);
  const alConteo = antirrebote(leerConteos, 150);
  suscribir('tv', ['conteos', 'control', 'opciones', 'diapositivas', 'config', 'textos'], (tabla) => {
    if (tabla === 'conteos') alConteo();
    else if (tabla === 'control') leerModo();
    else alContenido();
  });
}
