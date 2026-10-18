// Fuentes estandar del PDF (Helvetica): anchos de caracter y codificacion de texto.
// Los PDF traen Helvetica incorporada, asi no hay que incluir ninguna fuente.

// Anchos de Helvetica (milesimas de em) para los caracteres 32 a 126.
const ANCHOS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];
export const CANTIDAD_ANCHOS = ANCHOS.length; // debe ser 95

const FACTOR_NEGRITA = 1.07;
const ANCHO_POR_DEFECTO = 556;

// Caracteres que no estan en Latin-1 pero si en la codificacion WinAnsi del PDF.
const ESPECIALES = new Map([
  [0x20AC, 0x80], [0x2026, 0x85], [0x2018, 0x91], [0x2019, 0x92],
  [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
]);

function codigoWinAnsi(caracter) {
  const punto = caracter.codePointAt(0);
  if (punto >= 32 && punto <= 126) return punto;
  if (punto >= 160 && punto <= 255) return punto;
  return ESPECIALES.get(punto) || 63; // 63 = "?"
}

// Texto listo para ir entre parentesis en un PDF: todo ASCII, con octales para tildes.
export function textoPdf(texto) {
  let salida = '';
  for (const c of String(texto)) {
    const codigo = codigoWinAnsi(c);
    if (c === '(' || c === ')' || c === '\\') salida += `\\${c}`;
    else if (codigo >= 32 && codigo <= 126) salida += String.fromCharCode(codigo);
    else salida += `\\${codigo.toString(8).padStart(3, '0')}`;
  }
  return salida;
}

export function anchoCaracter(caracter, negrita) {
  const punto = caracter.codePointAt(0);
  let ancho;
  if (punto >= 32 && punto <= 126) ancho = ANCHOS[punto - 32];
  else if (punto === 0x2026) ancho = 1000;
  else {
    const base = caracter.normalize('NFD')[0].codePointAt(0); // "á" mide como "a"
    ancho = base >= 32 && base <= 126 ? ANCHOS[base - 32] : ANCHO_POR_DEFECTO;
  }
  return negrita ? ancho * FACTOR_NEGRITA : ancho;
}

// Ancho del texto en puntos para un tamano de letra dado.
export function anchoTexto(texto, tamano, negrita = false) {
  let suma = 0;
  for (const c of String(texto)) suma += anchoCaracter(c, negrita);
  return (suma * tamano) / 1000;
}

// Recorta con "…" para que entre en el ancho disponible.
export function ajustarTexto(texto, maximo, tamano, negrita = false) {
  const limpio = String(texto).replace(/[\r\n\t]+/g, ' ');
  if (anchoTexto(limpio, tamano, negrita) <= maximo) return limpio;
  const puntos = anchoTexto('…', tamano, negrita);
  let salida = '';
  let ancho = 0;
  for (const c of limpio) {
    const w = (anchoCaracter(c, negrita) * tamano) / 1000;
    if (ancho + w + puntos > maximo) break;
    salida += c;
    ancho += w;
  }
  return `${salida}…`;
}
