// Ventana de dialogo (usa el <dialog> nativo del navegador: foco y tecla Escape incluidos).
// Hay un solo <dialog> en la pagina: si una accion abre otra ventana (por ejemplo, mostrar la clave
// temporal despues de crear un usuario), la primera NO debe cerrarla al terminar. Por eso cada
// ventana recuerda su numero y solo se cierra si sigue siendo la ultima abierta. Lo mismo vale para
// el aviso de cierre (alCerrar): el evento 'close' llega un instante DESPUES de cerrar, y si en ese
// intervalo se abrio otra ventana, el aviso viejo no debe tocarla.
import { crear, porId, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';

let ultima = 0;
let alCerrarPendiente = null;

// acciones: [{ clave: 'clave-de-texto', clase, alClick }]. Si alClick devuelve false, el dialogo
// no se cierra (por ejemplo, cuando hay un dato mal cargado). alCerrar se llama una vez cuando la
// ventana se cierra por cualquier via (boton, tecla Escape) o cuando otra ventana la reemplaza.
export function abrirDialogo({ titulo, cuerpo, acciones = [], alCerrar }) {
  const dialogo = porId('dialogo');
  if (alCerrarPendiente) { const previo = alCerrarPendiente; alCerrarPendiente = null; previo(); }
  vaciar(dialogo);
  ultima += 1;
  const mia = ultima;
  const cerrar = () => { if (mia === ultima && dialogo.open) dialogo.close(); };

  const barra = crear('div', { clase: 'dialogo-acciones' });
  for (const accion of acciones) {
    barra.appendChild(crear('button', {
      clase: accion.clase || 'btn-sec',
      texto: t(accion.clave),
      atributos: { type: 'button' },
      alClick: async (evento) => {
        const boton = evento.currentTarget;
        boton.disabled = true;
        let resultado;
        try { resultado = accion.alClick ? await accion.alClick() : undefined; } finally { boton.disabled = false; }
        if (resultado !== false) cerrar();
      },
    }));
  }
  dialogo.append(crear('h2', { texto: titulo }), cuerpo, barra);
  if (alCerrar) {
    alCerrarPendiente = alCerrar;
    const alCierre = () => {
      if (dialogo.open) return; // evento atrasado de una ventana anterior: esta sigue abierta
      dialogo.removeEventListener('close', alCierre);
      if (mia === ultima && alCerrarPendiente === alCerrar) { alCerrarPendiente = null; alCerrar(); }
    };
    dialogo.addEventListener('close', alCierre);
  }
  if (!dialogo.open) dialogo.showModal();
  return { cerrar };
}

// Pregunta de confirmacion. Devuelve una promesa con true/false.
export function confirmar({ titulo, mensaje }) {
  return new Promise((resolver) => {
    let decidido = false;
    const terminar = (valor) => { if (!decidido) { decidido = true; resolver(valor); } };
    abrirDialogo({
      titulo,
      cuerpo: crear('p', { texto: mensaje }),
      acciones: [
        { clave: 'admin.cancelar', alClick: () => terminar(false) },
        { clave: 'admin.confirmar', clase: 'btn-principal', alClick: () => terminar(true) },
      ],
      alCerrar: () => terminar(false),
    });
  });
}
