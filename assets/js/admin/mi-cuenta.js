// Ventana "Mi cuenta": datos de quien esta conectado y cambio de su propia clave.
import { cfg } from '../nucleo/configuracion.js';
import { crear } from '../nucleo/dom.js';
import { t } from '../nucleo/textos.js';
import { cambiarClave } from '../nucleo/sesion.js';
import { abrirDialogo } from './ui/dialogo.js';
import { campoTexto } from './ui/campos.js';
import { avisar } from './ui/aviso.js';

export function abrirMiCuenta(ctx) {
  const nueva = campoTexto({ etiqueta: 'admin.cuenta.nueva', tipo: 'password', autocompletar: 'new-password' });
  const repetir = campoTexto({ etiqueta: 'admin.cuenta.repetir', tipo: 'password', autocompletar: 'new-password' });
  const error = crear('p', { clase: 'msg-error', atributos: { role: 'alert' } });
  const minimo = cfg.num('admin_clave_min', { min: 8, max: 64 });

  abrirDialogo({
    titulo: t('admin.cuenta.titulo'),
    cuerpo: crear('div', {
      clase: 'formulario-dialogo',
      hijos: [
        crear('p', { clase: 'info', texto: `${t('admin.col.email')}: ${ctx.perfil.email || ''}` }),
        crear('p', { clase: 'info', texto: `${t('admin.usuarios.col.rol')}: ${t(`admin.rol.${ctx.rol}`)}` }),
        crear('p', { clase: 'ayuda', texto: t('admin.cuenta.ayuda', { minimo }) }),
        nueva.el, repetir.el, error,
      ],
    }),
    acciones: [
      { clave: 'admin.cerrar' },
      {
        clave: 'admin.cuenta.cambiar', clase: 'btn-principal',
        alClick: async () => {
          // La clave se toma tal cual (sin recortar espacios) para no cambiarla sin querer.
          const a = nueva.input.value;
          if (a.length < minimo) { error.textContent = t('admin.cuenta.error.corta', { minimo }); return false; }
          if (a !== repetir.input.value) { error.textContent = t('admin.cuenta.error.distinta'); return false; }
          const r = await cambiarClave(a);
          if (!r.ok) { error.textContent = t(`admin.cuenta.error.${r.motivo}`); return false; }
          avisar(t('admin.cuenta.cambiada'));
          return true;
        },
      },
    ],
  });
}
