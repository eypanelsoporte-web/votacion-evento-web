// Entrega un archivo generado en el navegador como descarga.

export function descargarArchivo(nombre, bytes, tipoMime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tipoMime }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
