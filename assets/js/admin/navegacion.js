// Menu de secciones del panel. Que secciones ve cada rol lo define la configuracion
// (admin_secciones); el acceso real a los datos siempre lo decide la base de datos.
import { cfg } from '../nucleo/configuracion.js';
import { crear, porId, vaciar } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { resumen } from './secciones/resumen.js';
import { votos } from './secciones/votos.js';
import { exportar } from './secciones/exportar.js';
import { usuarios } from './secciones/usuarios.js';
import { contenido } from './secciones/contenido.js';
import { enVivo } from './secciones/en-vivo.js';
import { auditoria } from './secciones/auditoria.js';
import { registros } from './secciones/registros.js';

const SECCIONES = [resumen, votos, exportar, usuarios, contenido, enVivo, auditoria, registros];

export function montarNavegacion(ctx) {
  const mapa = cfg.json('admin_secciones');
  const permitidas = mapa && Array.isArray(mapa[ctx.rol]) ? mapa[ctx.rol] : ['resumen'];
  const visibles = SECCIONES.filter((s) => permitidas.includes(s.id));

  const nav = porId('navegacion');
  const contenedor = porId('contenido-secciones');
  vaciar(nav);
  vaciar(contenedor);

  const cajas = new Map();
  let actual = null;

  function mostrar(id) {
    if (actual && actual !== id) cajas.get(actual).seccion.alOcultar();
    actual = id;
    for (const [clave, { caja, boton }] of cajas) {
      caja.hidden = clave !== id;
      boton.classList.toggle('activo', clave === id);
      boton.setAttribute('aria-current', clave === id ? 'page' : 'false');
    }
    cajas.get(id).seccion.alMostrar();
  }

  for (const seccion of visibles) {
    const caja = crear('section', { clase: 'seccion', atributos: { id: `seccion-${seccion.id}` } });
    caja.hidden = true;
    contenedor.appendChild(caja);
    seccion.montar(caja, ctx);
    const boton = crear('button', { clase: 'nav-btn', texto: t(`admin.nav.${seccion.id}`), atributos: { type: 'button' }, alClick: () => mostrar(seccion.id) });
    nav.appendChild(boton);
    cajas.set(seccion.id, { caja, boton, seccion });
  }
  if (visibles.length) mostrar(visibles[0].id);
}

export function desmontarNavegacion() {
  vaciar(porId('navegacion'));
  vaciar(porId('contenido-secciones'));
}
