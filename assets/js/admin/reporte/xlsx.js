// Generador de archivos Excel (.xlsx) sin librerias externas.
// Todo texto se escribe como cadena (nunca como formula): un dato que empiece con
// "=", "+", "-" o "@" jamas se ejecuta al abrir el archivo.
import { crearZip } from './zip.js';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CABECERA_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAX_CELDA = 32000; // el limite de Excel es 32767 caracteres por celda
const MAX_NOMBRE_HOJA = 31;

const CARACTERES_PROHIBIDOS_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapar = (texto) => String(texto).replace(CARACTERES_PROHIBIDOS_XML, '').replace(/[&<>"]/g, (c) => ESCAPES[c]);

export function letraColumna(indice) {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function nombreHojaSeguro(nombre, usados) {
  let base = String(nombre).replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, MAX_NOMBRE_HOJA) || 'Hoja';
  let candidato = base;
  let n = 2;
  while (usados.has(candidato.toLowerCase())) { candidato = `${base.slice(0, MAX_NOMBRE_HOJA - 3)} ${n}`; n += 1; }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function celda(valor, fila, columna, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  const s = estilo ? ` s="${estilo}"` : '';
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  if (valor === null || valor === undefined || valor === '') return '';
  const texto = escapar(String(valor).slice(0, MAX_CELDA));
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`;
}

function xmlHoja({ columnas, filas }) {
  const ultimaColumna = Math.max(columnas.length - 1, 0);
  const anchos = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho || 16}" customWidth="1"/>`).join('');
  const encabezado = `<row r="1">${columnas.map((c, i) => celda(c.titulo, 1, i, 1)).join('')}</row>`;
  const cuerpo = filas.map((fila, r) =>
    `<row r="${r + 2}">${columnas.map((_, i) => celda(fila[i], r + 2, i, 0)).join('')}</row>`).join('');
  const rango = `A1:${letraColumna(ultimaColumna)}${filas.length + 1}`;
  return `${CABECERA_XML}<worksheet xmlns="${NS}"><dimension ref="${rango}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<sheetFormatPr defaultRowHeight="15"/><cols>${anchos}</cols><sheetData>${encabezado}${cuerpo}</sheetData>` +
    `<autoFilter ref="${rango}"/></worksheet>`;
}

const ESTILOS = `${CABECERA_XML}<styleSheet xmlns="${NS}">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

// hojas: [{ nombre, columnas: [{ titulo, ancho }], filas: [[valor, ...], ...] }]
export function crearXlsx(hojas, fecha = new Date()) {
  const codificador = new TextEncoder();
  const usados = new Set();
  const nombres = hojas.map((h) => nombreHojaSeguro(h.nombre, usados));
  const archivo = (nombre, texto) => ({ nombre, datos: codificador.encode(texto) });

  const tipos = `${CABECERA_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    '</Types>';

  const relsRaiz = `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

  const libro = `${CABECERA_XML}<workbook xmlns="${NS}" xmlns:r="${NS_REL}"><sheets>` +
    nombres.map((n, i) => `<sheet name="${escapar(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';

  const relsLibro = `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  return crearZip([
    archivo('[Content_Types].xml', tipos),
    archivo('_rels/.rels', relsRaiz),
    archivo('xl/workbook.xml', libro),
    archivo('xl/_rels/workbook.xml.rels', relsLibro),
    archivo('xl/styles.xml', ESTILOS),
    ...hojas.map((h, i) => archivo(`xl/worksheets/sheet${i + 1}.xml`, xmlHoja(h))),
  ], fecha);
}
