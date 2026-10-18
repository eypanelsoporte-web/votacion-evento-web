// Descripcion de lo que se puede editar desde el panel: que tabla, que columnas se ven y que
// campos tiene cada formulario. Los limites repiten los de la base (que valida de nuevo).
//
// tipos de campo: texto | area | numero | booleano | enum | url | valor-config
export const DEFINICIONES = [
  {
    id: 'opciones', tabla: 'opciones', pk: 'id', orden: 'orden', crear: true, eliminar: false, buscar: ['etiqueta'],
    autoClave: { campo: 'clave', prefijo: 'opcion' },
    columnas: ['etiqueta', 'orden', 'activa'],
    campos: [
      { clave: 'etiqueta', tipo: 'texto', max: 120, requerido: true },
      { clave: 'orden', tipo: 'numero', min: 0, max: 32767, porDefecto: 0 },
      { clave: 'activa', tipo: 'booleano', porDefecto: true },
    ],
  },
  {
    id: 'diapositivas', tabla: 'diapositivas', pk: 'id', orden: 'orden', crear: true, eliminar: true, buscar: ['titulo', 'url'],
    columnas: ['tipo', 'titulo', 'url', 'duracion_s', 'activa'],
    campos: [
      { clave: 'tipo', tipo: 'enum', valores: ['imagen', 'video'], porDefecto: 'imagen' },
      { clave: 'url', tipo: 'url', max: 500, requerido: true },
      { clave: 'titulo', tipo: 'texto', max: 200 },
      { clave: 'duracion_s', tipo: 'numero', min: 1, max: 600, opcional: true },
      { clave: 'orden', tipo: 'numero', min: 0, max: 32767, porDefecto: 0 },
      { clave: 'activa', tipo: 'booleano', porDefecto: true },
    ],
  },
  {
    id: 'textos', tabla: 'textos', pk: 'clave', orden: 'clave', crear: false, eliminar: false, buscar: ['clave', 'valor'], grupos: true,
    columnas: ['clave', 'valor'],
    campos: [
      { clave: 'clave', tipo: 'texto', soloLectura: true },
      { clave: 'valor', tipo: 'area', max: 1000, requerido: true },
    ],
  },
  {
    id: 'config', tabla: 'config', pk: 'clave', orden: 'clave', crear: false, eliminar: false, buscar: ['clave', 'descripcion'],
    columnas: ['clave', 'valor', 'descripcion'],
    campos: [
      { clave: 'clave', tipo: 'texto', soloLectura: true },
      { clave: 'valor', tipo: 'valor-config' },
    ],
  },
];

export const CLAVES_DE_CAMPO = [...new Set(DEFINICIONES.flatMap((d) => [...d.columnas, ...d.campos.map((c) => c.clave)]))];
export const VALORES_ENUM = ['imagen', 'video'];
