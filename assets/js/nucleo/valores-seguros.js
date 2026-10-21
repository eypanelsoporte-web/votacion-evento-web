// Valores tecnicos de ultimo recurso.
//
// La FUENTE DE VERDAD de cada valor es la tabla `config` de la base de datos
// (sql/02_datos_iniciales.sql). Este archivo solo se consulta cuando una clave
// no existe todavia en la base (por ejemplo, la primera vez que arranca una
// pantalla sin internet). Es el unico lugar del codigo con valores por defecto,
// y dev/auditoria-estatica.mjs verifica que no se desincronice de la base.
export const VALORES_SEGUROS = Object.freeze({
  email_requerido: true,
  telefono_requerido: false,
  consentimiento_requerido: true,

  tv_estrategia: 'ciclo',
  tv_resultados_s: 25,
  tv_bloque_max_s: 120,
  tv_inactividad_s: 30,
  tv_voto_interrumpe: false,
  tv_slide_s: 8,
  tv_medio_arranque_s: 10,
  tv_video_margen_s: 3,
  tv_rotacion: 0,
  tv_contenido_min: 5,

  latido_s: 30,
  watchdog_s: 45,
  poll_s: 10,
  recarga_preventiva_min: 120,
  max_recargas_10min: 6,
  rpc_timeout_s: 8,
  semaforo_verde_s: 75,
  semaforo_ambar_s: 180,

  ipad_gracias_s: 4,
  ipad_voto_espera_s: 10,
  ipad_reintento_s: 5,
  ipad_pulsacion_ms: 1500,
  ipad_contenido_min: 5,
  ipad_control_refresco_s: 5,
  ipad_confirmacion_tv_s: 9,
  ipad_max_intentos: 5,
  ipad_retencion_rechazados_h: 48,

  tv_requiere_login: true, // ante la duda, la TV pide usuario y clave

  zona_horaria: 'America/Argentina/Buenos_Aires',

  admin_secciones: {
    consulta: ['resumen', 'votos', 'exportar'],
    admin: ['resumen', 'votos', 'exportar', 'usuarios', 'contenido', 'en_vivo'],
    superadmin: ['resumen', 'votos', 'exportar', 'usuarios', 'contenido', 'en_vivo', 'auditoria', 'registros'],
  },
  admin_estados_votos: {
    consulta: ['validos', 'pruebas'],
    admin: ['validos', 'pruebas', 'eliminados', 'todos'],
    superadmin: ['validos', 'pruebas', 'eliminados', 'todos'],
  },
  admin_roles_gestionables: { admin: ['consulta'], superadmin: ['consulta', 'operador', 'admin', 'tv'] },
  admin_filas_por_pagina: 25,
  admin_max_exportar: 20000,
  admin_refresco_s: 15,
  admin_sesion_inactividad_min: 30,
  admin_aviso_s: 6,
  admin_clave_min: 12,
  admin_retencion_logs_dias: 30,

  medios_hosts: ['*.supabase.co'],
  tema: {
    fondo: '#0b0b0d', panel: '#17171b', borde: '#2a2a30', texto: '#f5f5f5', suave: '#9a9aa2',
    primario: '#e11d2e', 'primario-osc': '#a4141f', ok: '#27ae60', ambar: '#e1a91d', rojo: '#e5484d',
  },
});
