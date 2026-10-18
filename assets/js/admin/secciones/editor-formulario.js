// Formulario (en una ventana) para crear o editar una fila de contenido. Valida cada campo
// segun su tipo y envia solo lo que cambio. La base valida de nuevo y deja el registro de quien lo hizo.
import { crear } from '../../nucleo/dom.js';
import { t } from '../../nucleo/textos.js';
import { urlMedioSegura } from '../../nucleo/medios.js';
import { abrirDialogo } from '../ui/dialogo.js';
import { campoTexto, campoNumero, campoArea, campoSelect, campoCasilla } from '../ui/campos.js';
import { avisar } from '../ui/aviso.js';
import { actualizarFila, insertarFila } from '../api/contenido-api.js';
import { valorDesdeEntrada, variablesFaltantes } from '../validacion.js';

// El campo "valor" de la configuracion cambia de forma segun las reglas de esa clave.
function campoConfig(fila, etiqueta) {
  const reglas = fila.reglas || {};
  const ayuda = fila.descripcion || '';
  if (reglas.tipo === 'booleano') return campoCasilla({ etiqueta, valor: fila.valor === true });
  if (reglas.tipo === 'numero' && Array.isArray(reglas.opciones)) {
    const c = campoSelect({ etiqueta, valor: fila.valor, ayuda, opciones: reglas.opciones.map((o) => ({ valor: o, texto: String(o) })) });
    return { ...c, leer: () => Number(c.leer()) };
  }
  if (reglas.tipo === 'numero') return campoNumero({ etiqueta, valor: fila.valor, min: reglas.min, max: reglas.max, ayuda });
  if (reglas.tipo === 'texto' && Array.isArray(reglas.opciones)) {
    return campoSelect({ etiqueta, valor: fila.valor, ayuda, opciones: reglas.opciones.map((o) => ({ valor: o, texto: o })) });
  }
  if (reglas.tipo === 'texto') return campoTexto({ etiqueta, valor: fila.valor, ayuda });
  return campoArea({ etiqueta, valor: JSON.stringify(fila.valor, null, 1), filas: 6, ayuda });
}

function construirCampo(campo, fila) {
  const etiqueta = `admin.contenido.campo.${campo.clave}`;
  const valor = fila[campo.clave] !== undefined ? fila[campo.clave] : campo.porDefecto;
  switch (campo.tipo) {
    case 'numero': return campoNumero({ etiqueta, valor, min: campo.min, max: campo.max });
    case 'booleano': return campoCasilla({ etiqueta, valor });
    case 'enum': return campoSelect({ etiqueta, valor, opciones: campo.valores.map((v) => ({ valor: v, texto: t(`admin.contenido.enum.${v}`) })) });
    case 'area': return campoArea({ etiqueta, valor, maximo: campo.max, soloLectura: campo.soloLectura });
    case 'valor-config': return campoConfig(fila, etiqueta);
    default: return campoTexto({ etiqueta, valor, maximo: campo.max, soloLectura: campo.soloLectura });
  }
}

// Devuelve { ok, valor } o { ok: false, error } (error = admin.contenido.error.<error>).
function validarCampo(campo, entrada, fila) {
  switch (campo.tipo) {
    case 'booleano': return { ok: true, valor: !!entrada };
    case 'enum': return campo.valores.includes(entrada) ? { ok: true, valor: entrada } : { ok: false, error: 'opcion' };
    case 'numero':
      if (entrada === null) return campo.opcional ? { ok: true, valor: null } : { ok: false, error: 'numero' };
      if (!Number.isFinite(entrada) || (campo.min !== undefined && entrada < campo.min) || (campo.max !== undefined && entrada > campo.max)) return { ok: false, error: 'rango' };
      return { ok: true, valor: entrada };
    case 'url': {
      const segura = urlMedioSegura(entrada);
      return segura ? { ok: true, valor: segura } : { ok: false, error: 'url' };
    }
    case 'valor-config': return valorDesdeEntrada(fila.reglas, entrada, fila.valor);
    default:
      if (campo.requerido && !entrada) return { ok: false, error: 'requerido' };
      if (campo.max && entrada.length > campo.max) return { ok: false, error: 'rango' };
      return { ok: true, valor: entrada === '' ? null : entrada };
  }
}

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function abrirFormulario({ def, fila, alGuardar }) {
  const esNueva = !fila;
  const base = fila || {};
  const campos = {};
  for (const campo of def.campos) campos[campo.clave] = construirCampo(campo, base);
  const error = crear('p', { clase: 'msg-error', atributos: { role: 'alert' } });

  async function guardar() {
    const cambios = {};
    for (const campo of def.campos) {
      if (campo.soloLectura) continue;
      const r = validarCampo(campo, campos[campo.clave].leer(), base);
      if (!r.ok) { error.textContent = `${t(`admin.contenido.campo.${campo.clave}`)}: ${t(`admin.contenido.error.${r.error}`)}`; return false; }
      if (esNueva || !iguales(r.valor, base[campo.clave])) cambios[campo.clave] = r.valor;
    }
    if (def.id === 'textos' && cambios.valor !== undefined) {
      const faltan = variablesFaltantes(base.valor, cambios.valor);
      if (faltan.length) { error.textContent = t('admin.contenido.error.variables', { lista: faltan.join(' ') }); return false; }
    }
    if (!esNueva && !Object.keys(cambios).length) return true;
    if (esNueva && def.autoClave) cambios[def.autoClave.campo] = `${def.autoClave.prefijo}_${Date.now().toString(36)}`;

    const r = esNueva ? await insertarFila(def.tabla, cambios) : await actualizarFila(def.tabla, def.pk, base[def.pk], cambios);
    if (!r.ok) { error.textContent = t('admin.contenido.error.guardar'); return false; }
    avisar(t('admin.contenido.guardado'));
    await alGuardar();
    return true;
  }

  abrirDialogo({
    titulo: t(esNueva ? 'admin.contenido.nuevo_titulo' : 'admin.contenido.editar_titulo'),
    cuerpo: crear('div', { clase: 'formulario-dialogo', hijos: [...def.campos.map((c) => campos[c.clave].el), error] }),
    acciones: [{ clave: 'admin.cancelar' }, { clave: 'admin.guardar', clase: 'btn-principal', alClick: guardar }],
  });
}
