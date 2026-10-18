// Listas fijas del panel. No dependen de nada (ni de la pantalla), asi que tambien las usa la
// auditoria para comprobar que cada opcion tiene su texto en la base.

export const IDS_SECCIONES = ['resumen', 'votos', 'exportar', 'usuarios', 'contenido', 'en_vivo', 'auditoria', 'registros'];
export const ESTADOS_VOTOS = ['validos', 'pruebas', 'eliminados', 'todos'];
export const FORMATOS_REPORTE = ['xlsx', 'pdf'];
export const NIVELES_LOG = ['debug', 'info', 'warn', 'error', 'fatal'];
export const ORIGENES_LOG = ['tv', 'ipad', 'admin', 'db', 'otro'];
export const ROLES = ['superadmin', 'admin', 'consulta', 'operador'];
export const ACCIONES_AUDITORIA = ['INSERT', 'UPDATE', 'DELETE', 'exportar', 'abrir_panel', 'crear', 'activar', 'desactivar', 'resetear_clave'];
