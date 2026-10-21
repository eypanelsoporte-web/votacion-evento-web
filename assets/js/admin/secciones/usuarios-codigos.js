// Codigos de respuesta de la funcion segura "gestionar-usuarios". Cada uno tiene su
// frase en la tabla `textos` (admin.usuarios.error.<CODIGO>). Aca solo se clasifican.

export const CODIGOS_USUARIOS = [
  'SIN_PERMISO', 'DATOS_INVALIDOS', 'EMAIL_EXISTE', 'ROL_NO_PERMITIDO', 'USUARIO_NO_ENCONTRADO',
  'SOBRE_SI_MISMO', 'ULTIMO_SUPERADMIN', 'SIN_CONEXION', 'FUNCION_NO_DISPONIBLE', 'ERROR_INTERNO',
];

export const claveErrorUsuario = (codigo) =>
  `admin.usuarios.error.${CODIGOS_USUARIOS.includes(codigo) ? codigo : 'ERROR_INTERNO'}`;
