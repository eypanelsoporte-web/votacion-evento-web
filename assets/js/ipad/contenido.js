// Opciones de voto: se leen de la tabla `opciones` (con copia local) y se
// dibujan como botones. El texto de cada boton es el de la base de datos.
import { almacen } from '../nucleo/almacen.js';
import { cliente, consulta } from '../nucleo/cliente.js';
import { crear, porId, vaciar } from '../nucleo/dom.js';

let opciones = almacen.leer('opciones_cache', []);

export const listaOpciones = () => opciones;
export const buscarOpcion = (id) => opciones.find((o) => o.id === id) || null;

export async function cargarOpciones() {
  const r = await consulta(cliente().from('opciones').select('id,clave,etiqueta,orden')
    .eq('activa', true).order('orden', { ascending: true }));
  if (!r.error && Array.isArray(r.data)) {
    opciones = r.data;
    almacen.guardar('opciones_cache', opciones);
  }
  return opciones.length > 0;
}

export function dibujarOpciones(alElegir) {
  const cont = porId('opciones');
  vaciar(cont);
  for (const op of opciones) {
    cont.appendChild(crear('button', {
      clase: 'opcion-btn',
      texto: op.etiqueta,
      atributos: { type: 'button', 'data-id': op.id },
      alClick: () => alElegir(op),
    }));
  }
}
