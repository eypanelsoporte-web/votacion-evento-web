// Generador de PDF sin librerias externas: titulo, lineas de datos y tablas con
// encabezado repetido en cada pagina y numeracion "Pagina X de Y".
import { textoPdf, anchoTexto, ajustarTexto } from './pdf-fuentes.js';

const TAMANOS_PAGINA = { horizontal: [842, 595], vertical: [595, 842] };
const MARGEN = 36;
const MARGEN_INFERIOR = 40;
const ALTO_FILA = 14;
const RELLENO_CELDA = 4;
const TAMANO_TEXTO = 8;
const TAMANO_ENCABEZADO = 8.5;

const num = (n) => Number(n).toFixed(2);

class Paginador {
  constructor(orientacion) {
    [this.ancho, this.alto] = TAMANOS_PAGINA[orientacion] || TAMANOS_PAGINA.horizontal;
    this.utilAncho = this.ancho - MARGEN * 2;
    this.paginas = [];
    this.nueva();
  }

  nueva() {
    this.ops = [];
    this.paginas.push(this.ops);
    this.y = this.alto - MARGEN;
  }

  espacio(altura) {
    if (this.y - altura < MARGEN_INFERIOR) { this.nueva(); return true; }
    return false;
  }

  texto(x, y, cadena, tamano, negrita = false, gris = 0) {
    this.ops.push(`BT /${negrita ? 'F2' : 'F1'} ${tamano} Tf ${num(gris)} g ${num(x)} ${num(y)} Td (${textoPdf(cadena)}) Tj ET`);
  }

  rectangulo(x, y, ancho, alto, gris) {
    this.ops.push(`${num(gris)} g ${num(x)} ${num(y)} ${num(ancho)} ${num(alto)} re f 0 g`);
  }
}

function dibujarFila(p, columnas, celdas, { negrita, fondo }) {
  const abajo = p.y - ALTO_FILA;
  if (fondo !== null) p.rectangulo(MARGEN, abajo, p.utilAncho, ALTO_FILA, fondo);
  const tamano = negrita ? TAMANO_ENCABEZADO : TAMANO_TEXTO;
  let x = MARGEN;
  columnas.forEach((col, i) => {
    const disponible = col.puntos - RELLENO_CELDA * 2;
    const texto = ajustarTexto(celdas[i] === null || celdas[i] === undefined ? '' : celdas[i], disponible, tamano, negrita);
    const desplazamiento = col.alinear === 'der' ? disponible - anchoTexto(texto, tamano, negrita) : 0;
    p.texto(x + RELLENO_CELDA + desplazamiento, abajo + 4, texto, tamano, negrita);
    x += col.puntos;
  });
  p.y = abajo;
}

function dibujarTabla(p, tabla) {
  const pesoTotal = tabla.columnas.reduce((s, c) => s + (c.peso || 1), 0);
  const columnas = tabla.columnas.map((c) => ({ ...c, puntos: (p.utilAncho * (c.peso || 1)) / pesoTotal }));
  const titulos = columnas.map((c) => c.titulo);

  if (tabla.titulo) {
    p.espacio(ALTO_FILA * 4);
    p.texto(MARGEN, p.y - 12, tabla.titulo, 11, true);
    p.y -= 22;
  }
  p.espacio(ALTO_FILA * 3);
  dibujarFila(p, columnas, titulos, { negrita: true, fondo: 0.88 });
  tabla.filas.forEach((fila, n) => {
    if (p.espacio(ALTO_FILA)) dibujarFila(p, columnas, titulos, { negrita: true, fondo: 0.88 });
    dibujarFila(p, columnas, fila, { negrita: false, fondo: n % 2 ? 0.96 : null });
  });
  p.y -= 14;
}

function serializar(paginas, ancho, alto, titulo) {
  const objetos = [];
  const agregar = (cuerpo) => { objetos.push(cuerpo); return objetos.length; };

  agregar('<< /Type /Catalog /Pages 2 0 R >>');
  const idPaginas = agregar('');
  agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  agregar(`<< /Title (${textoPdf(titulo)}) /Producer (Panel de votacion) >>`);

  const hijos = [];
  for (const ops of paginas) {
    const contenido = ops.join('\n');
    const idContenido = objetos.length + 2;
    const idPagina = agregar(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Contents ${idContenido} 0 R ` +
      '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>');
    agregar(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    hijos.push(`${idPagina} 0 R`);
  }
  objetos[idPaginas - 1] = `<< /Type /Pages /Kids [${hijos.join(' ')}] /Count ${hijos.length} >>`;

  let salida = '%PDF-1.4\n';
  const posiciones = [];
  objetos.forEach((cuerpo, i) => {
    posiciones.push(salida.length);
    salida += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });
  const inicioXref = salida.length;
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const pos of posiciones) salida += `${String(pos).padStart(10, '0')} 00000 n \n`;
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return new TextEncoder().encode(salida);
}

// opciones: { orientacion, titulo, lineas: [texto], tablas: [{ titulo, columnas: [{ titulo, peso, alinear }], filas }],
//             pie: (pagina, total) => texto }
export function crearPdf({ orientacion = 'horizontal', titulo, lineas = [], tablas = [], pie }) {
  const p = new Paginador(orientacion);
  p.texto(MARGEN, p.y - 16, titulo, 16, true);
  p.y -= 26;
  for (const linea of lineas) {
    p.texto(MARGEN, p.y - 9, linea, 9, false, 0.25);
    p.y -= 13;
  }
  p.y -= 8;
  for (const tabla of tablas) dibujarTabla(p, tabla);

  if (pie) {
    p.paginas.forEach((ops, i) => {
      const texto = pie(i + 1, p.paginas.length);
      const ancho = anchoTexto(texto, 8);
      ops.push(`BT /F1 8 Tf 0.4 g ${num((p.ancho - ancho) / 2)} 20 Td (${textoPdf(texto)}) Tj ET`);
    });
  }
  return serializar(p.paginas, p.ancho, p.alto, titulo);
}
