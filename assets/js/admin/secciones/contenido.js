// Seccion "Contenido": editores de opciones, textos, configuracion y diapositivas.
import { crear } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { DEFINICIONES } from './contenido-def.js';
import { crearEditor } from './editor-tabla.js';

const editores = new Map();
const botones = new Map();
let actual = null;

function mostrarPestana(id) {
  actual = id;
  for (const [clave, editor] of editores) {
    editor.el.hidden = clave !== id;
    botones.get(clave).classList.toggle('activo', clave === id);
  }
  editores.get(id).recargar();
}

export const contenido = {
  id: 'contenido',
  montar(raiz, ctx) {
    const barra = crear('div', { clase: 'pestanas' });
    const zona = crear('div');
    for (const def of DEFINICIONES) {
      const editor = crearEditor(def, ctx);
      editor.el.hidden = true;
      editores.set(def.id, editor);
      zona.appendChild(editor.el);
      const boton = crear('button', { clase: 'btn-sec', texto: t(`admin.contenido.tab.${def.id}`), atributos: { type: 'button' }, alClick: () => mostrarPestana(def.id) });
      botones.set(def.id, boton);
      barra.appendChild(boton);
    }
    raiz.append(
      crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.contenido') })] }),
      crear('p', { clase: 'ayuda', texto: t('admin.contenido.ayuda') }),
      barra, zona,
    );
  },
  alMostrar() { mostrarPestana(actual || DEFINICIONES[0].id); },
  alOcultar() {},
};
