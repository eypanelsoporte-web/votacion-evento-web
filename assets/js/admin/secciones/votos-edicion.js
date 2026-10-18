// Ventana para corregir un voto mal cargado (solo admin y superadmin; la base lo exige igual).
// Cada cambio queda en la auditoria con quien lo hizo, el valor anterior y el nuevo.
import { cfg } from '../../nucleo/configuracion.js';
import { crear } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { abrirDialogo } from '../ui/dialogo.js';
import { campoTexto, campoSelect, campoCasilla } from '../ui/campos.js';
import { avisar } from '../ui/aviso.js';
import { actualizarVoto } from '../api/votos-api.js';
import { validarVoto } from '../validacion.js';
import { formatearFechaHora } from '../reporte/datos.js';

const lineaInfo = (clave, valor) => crear('p', { clase: 'info', texto: `${t(clave)}: ${valor}` });

// Solo viaja lo que cambio de verdad.
function calcularCambios(fila, nuevo) {
  const cambios = {};
  if (nuevo.nombre !== fila.nombre) cambios.nombre = nuevo.nombre;
  if (nuevo.email !== (fila.email || '')) cambios.email = nuevo.email || null;
  if (nuevo.telefono !== (fila.telefono || '')) cambios.telefono = nuevo.telefono || null;
  if (nuevo.opcionId !== fila.opcion_id) cambios.opcion_id = nuevo.opcionId;
  if (nuevo.esPrueba !== fila.es_prueba) cambios.es_prueba = nuevo.esPrueba;
  if (nuevo.eliminado !== fila.eliminado) cambios.eliminado = nuevo.eliminado;
  return cambios;
}

export function abrirEdicionVoto(fila, ctx, alGuardar) {
  const nombre = campoTexto({ etiqueta: 'admin.votos.campo.nombre', valor: fila.nombre, maximo: 120 });
  const email = campoTexto({ etiqueta: 'admin.votos.campo.email', valor: fila.email, tipo: 'email', maximo: 254 });
  const telefono = campoTexto({ etiqueta: 'admin.votos.campo.telefono', valor: fila.telefono, tipo: 'tel', maximo: 30 });
  const opcion = campoSelect({
    etiqueta: 'admin.votos.campo.opcion', valor: fila.opcion_id,
    opciones: ctx.opciones.map((o) => ({ valor: o.id, texto: o.activa ? o.etiqueta : `${o.etiqueta} (${t('admin.inactiva')})` })),
  });
  const prueba = campoCasilla({ etiqueta: 'admin.votos.campo.prueba', valor: fila.es_prueba });
  const eliminado = campoCasilla({ etiqueta: 'admin.votos.campo.eliminado', valor: fila.eliminado });
  const error = crear('p', { clase: 'msg-error', atributos: { role: 'alert' } });

  const f = formatearFechaHora(fila.creado_en, ctx.zona);
  const cuerpo = crear('div', {
    clase: 'formulario-dialogo',
    hijos: [
      lineaInfo('admin.votos.campo.fecha', `${f.fecha} ${f.hora}`),
      lineaInfo('admin.votos.campo.consentimiento', fila.consentimiento ? t('admin.si') : t('admin.no')),
      nombre.el, email.el, telefono.el, opcion.el, prueba.el, eliminado.el, error,
    ],
  });

  abrirDialogo({
    titulo: t('admin.votos.editar_titulo'),
    cuerpo,
    acciones: [
      { clave: 'admin.cancelar' },
      {
        clave: 'admin.guardar', clase: 'btn-principal',
        alClick: async () => {
          const datos = { nombre: nombre.leer(), email: email.leer().toLowerCase(), telefono: telefono.leer() };
          const errores = validarVoto(datos, { emailRequerido: cfg.bool('email_requerido') });
          if (errores.length) { error.textContent = t(`admin.votos.error.${errores[0]}`); return false; }

          const cambios = calcularCambios(fila, {
            ...datos, opcionId: Number(opcion.leer()), esPrueba: prueba.leer(), eliminado: eliminado.leer(),
          });
          if (!Object.keys(cambios).length) return true;

          const r = await actualizarVoto(fila.id, cambios);
          if (!r.ok) { error.textContent = t(r.codigo === 'SIN_FILAS' ? 'admin.votos.error.sin_permiso' : 'admin.votos.error.guardar'); return false; }
          avisar(t('admin.votos.guardado'));
          alGuardar();
          return true;
        },
      },
    ],
  });
}
