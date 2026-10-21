// Seccion "Usuarios": alta de usuarios, activar / desactivar y nueva clave temporal.
// Las altas pasan por la funcion segura del servidor; el panel nunca ve claves de nadie
// salvo la clave temporal que se muestra UNA vez al crearla o resetearla.
import { cfg } from '../../nucleo/configuracion.js';
import { crear, vaciar } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { construirTabla, pastilla } from '../ui/tabla.js';
import { abrirDialogo, confirmar } from '../ui/dialogo.js';
import { campoTexto, campoSelect } from '../ui/campos.js';
import { avisar } from '../ui/aviso.js';
import { listarPerfiles, gestionar } from '../api/usuarios-api.js';
import { esEmailValido } from '../validacion.js';
import { claveErrorUsuario } from './usuarios-codigos.js';

let ctx = null;
let zona = null;

export const rolesGestionables = (rol) => {
  const mapa = cfg.json('admin_roles_gestionables');
  return mapa && Array.isArray(mapa[rol]) ? mapa[rol] : [];
};

function mostrarClaveTemporal(clave) {
  const caja = crear('code', { clase: 'clave-temporal', texto: clave });
  const copiar = crear('button', {
    clase: 'btn-sec', texto: t('admin.usuarios.copiar'), atributos: { type: 'button' },
    alClick: async () => {
      try { await navigator.clipboard.writeText(clave); avisar(t('admin.usuarios.copiada')); } catch (e) { avisar(t('admin.usuarios.no_copiada'), 'error'); }
    },
  });
  abrirDialogo({
    titulo: t('admin.usuarios.clave_titulo'),
    cuerpo: crear('div', { hijos: [crear('p', { texto: t('admin.usuarios.clave_aviso') }), caja, copiar] }),
    acciones: [{ clave: 'admin.cerrar', clase: 'btn-principal' }],
  });
}

async function ejecutar(accion, datos, exitoClave) {
  const r = await gestionar(accion, datos);
  if (!r.ok) { avisar(t(claveErrorUsuario(r.codigo)), 'error'); return false; }
  avisar(t(exitoClave));
  if (r.clave_temporal) mostrarClaveTemporal(r.clave_temporal);
  await pintar();
  return true;
}

function abrirAlta() {
  const email = campoTexto({ etiqueta: 'admin.usuarios.campo.email', tipo: 'email', maximo: 254 });
  const nombre = campoTexto({ etiqueta: 'admin.usuarios.campo.nombre', maximo: 80 });
  const roles = rolesGestionables(ctx.rol);
  const rol = campoSelect({ etiqueta: 'admin.usuarios.campo.rol', opciones: roles.map((r) => ({ valor: r, texto: t(`admin.rol.${r}`) })) });
  const error = crear('p', { clase: 'msg-error', atributos: { role: 'alert' } });
  abrirDialogo({
    titulo: t('admin.usuarios.alta_titulo'),
    cuerpo: crear('div', { clase: 'formulario-dialogo', hijos: [email.el, nombre.el, rol.el, error] }),
    acciones: [
      { clave: 'admin.cancelar' },
      {
        clave: 'admin.usuarios.crear', clase: 'btn-principal',
        alClick: async () => {
          const datos = { email: email.leer().toLowerCase(), nombre: nombre.leer(), rol: rol.leer() };
          if (!esEmailValido(datos.email) || datos.nombre.length < 2) { error.textContent = t('admin.usuarios.error.DATOS_INVALIDOS'); return false; }
          const r = await gestionar('crear', datos);
          if (!r.ok) { error.textContent = t(claveErrorUsuario(r.codigo)); return false; }
          avisar(t('admin.usuarios.creado'));
          if (r.clave_temporal) mostrarClaveTemporal(r.clave_temporal);
          await pintar();
          return true;
        },
      },
    ],
  });
}

async function pedirConfirmacion(claveMensaje, usuario) {
  return confirmar({ titulo: t('admin.confirmar_titulo'), mensaje: t(claveMensaje, { email: usuario.email || usuario.nombre || '' }) });
}

// Cambiar el rol: ventana con los roles que quien esta conectado puede asignar (lo define la configuracion).
function abrirCambioDeRol(u) {
  const rol = campoSelect({
    etiqueta: 'admin.usuarios.campo.rol', valor: u.rol,
    opciones: rolesGestionables(ctx.rol).map((r) => ({ valor: r, texto: t(`admin.rol.${r}`) })),
  });
  const error = crear('p', { clase: 'msg-error', atributos: { role: 'alert' } });
  abrirDialogo({
    titulo: t('admin.usuarios.cambiar_rol_titulo', { email: u.email || u.nombre || '' }),
    cuerpo: crear('div', { clase: 'formulario-dialogo', hijos: [crear('p', { clase: 'ayuda', texto: t('admin.usuarios.cambiar_rol_ayuda') }), rol.el, error] }),
    acciones: [
      { clave: 'admin.cancelar' },
      {
        clave: 'admin.guardar', clase: 'btn-principal',
        alClick: async () => {
          if (rol.leer() === u.rol) return true;
          const r = await gestionar('cambiar_rol', { user_id: u.user_id, rol: rol.leer() });
          if (!r.ok) { error.textContent = t(claveErrorUsuario(r.codigo)); return false; }
          avisar(t('admin.usuarios.rol_cambiado'));
          await pintar();
          return true;
        },
      },
    ],
  });
}

function botones(u) {
  const propios = u.user_id === ctx.perfil.userId;
  if (propios || !rolesGestionables(ctx.rol).includes(u.rol)) return crear('span', { clase: 'detalle', texto: propios ? t('admin.usuarios.usted') : '' });
  const alternar = crear('button', {
    clase: 'btn-sec', texto: t(u.activo ? 'admin.usuarios.desactivar' : 'admin.usuarios.activar'), atributos: { type: 'button' },
    alClick: async () => {
      if (!(await pedirConfirmacion(u.activo ? 'admin.usuarios.confirmar_desactivar' : 'admin.usuarios.confirmar_activar', u))) return;
      await ejecutar(u.activo ? 'desactivar' : 'activar', { user_id: u.user_id }, u.activo ? 'admin.usuarios.desactivado' : 'admin.usuarios.activado');
    },
  });
  const resetear = crear('button', {
    clase: 'btn-sec', texto: t('admin.usuarios.resetear'), atributos: { type: 'button' },
    alClick: async () => {
      if (!(await pedirConfirmacion('admin.usuarios.confirmar_resetear', u))) return;
      await ejecutar('resetear_clave', { user_id: u.user_id }, 'admin.usuarios.reseteado');
    },
  });
  const cambiarRol = rolesGestionables(ctx.rol).length > 1
    ? crear('button', { clase: 'btn-sec', texto: t('admin.usuarios.cambiar_rol'), atributos: { type: 'button' }, alClick: () => abrirCambioDeRol(u) })
    : null; // con un solo rol posible no hay nada que elegir
  return crear('div', { clase: 'acciones-fila', hijos: [alternar, cambiarRol, resetear] });
}

async function pintar() {
  const r = await listarPerfiles();
  vaciar(zona);
  if (!r.ok) { zona.appendChild(crear('p', { clase: 'msg-error', texto: t('admin.error_cargar') })); return; }
  zona.appendChild(construirTabla({
    vacio: t('admin.sin_datos'),
    filas: r.filas,
    columnas: [
      { titulo: t('admin.col.email'), celda: (u) => u.email || '' },
      { titulo: t('admin.col.nombre'), celda: (u) => u.nombre || '' },
      { titulo: t('admin.usuarios.col.rol'), celda: (u) => t(`admin.rol.${u.rol}`) },
      { titulo: t('admin.col.estado'), celda: (u) => pastilla(t(u.activo ? 'admin.usuarios.activo' : 'admin.usuarios.inactivo'), u.activo ? 'ok' : 'error') },
      { titulo: '', clase: 'acciones', celda: botones },
    ],
  }));
}

export const usuarios = {
  id: 'usuarios',
  montar(raiz, contexto) {
    ctx = contexto;
    zona = crear('div');
    const alta = crear('button', { clase: 'btn-principal', texto: t('admin.usuarios.nuevo'), atributos: { type: 'button' }, alClick: abrirAlta });
    raiz.append(
      crear('div', { clase: 'seccion-cabecera', hijos: [crear('h2', { texto: t('admin.nav.usuarios') }), alta] }),
      crear('p', { clase: 'ayuda', texto: t('admin.usuarios.ayuda') }),
      zona,
    );
  },
  alMostrar() { pintar(); },
  alOcultar() {},
};
