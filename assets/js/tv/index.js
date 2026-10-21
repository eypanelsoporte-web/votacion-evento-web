// Punto de entrada de la TV: arma las piezas y las pone en marcha.
import { iniciarNucleo, cargarContenidoBase, refrescarPresentacion } from '../nucleo/arranque.js';
import { mostrarFatal } from '../nucleo/dom.js';
import { iniciarLatido } from '../nucleo/dispositivo.js';
import { iniciarVigilancia } from '../nucleo/vigilancia.js';
import { iniciarComandos } from '../nucleo/comandos.js';
import { iniciarEscenario, ajustarEscenario } from './escenario.js';
import { iniciarDatos, alCambiar, estado, totalVotos } from './datos.js';
import { iniciarControlador, vistaActual } from './controlador.js';
import { iniciarIndicadores, pintarModo } from './indicadores.js';
import { indiceActual } from './diapositivas.js';
import { iniciarPantallaCompleta } from './pantalla-completa.js';
import { asegurarAcceso, vigilarSesion } from './acceso.js';

async function principal() {
  let dispositivo;
  let conAcceso = false;
  try {
    ({ dispositivo } = await iniciarNucleo({ tipo: 'tv', persistir: true }));
  } catch (error) {
    mostrarFatal(error);
    return;
  }

  // Configuracion y textos son publicos (la pantalla de ingreso los necesita). Los resultados, no.
  await cargarContenidoBase();
  iniciarEscenario();
  iniciarPantallaCompleta(); // disponible desde el primer momento, tambien en la pantalla de ingreso
  // Mientras se espera el ingreso la TV avisa que esta encendida (para verla en el panel), pero no se
  // reinicia sola: reiniciar borraria lo que la persona esta escribiendo.
  iniciarLatido({
    dispositivo,
    obtenerEstado: () => (conAcceso
      ? {
        vista: vistaActual(), modo: estado.modo, diapositiva: indiceActual(),
        total: totalVotos(), ancho: window.innerWidth, alto: window.innerHeight,
      }
      : { vista: 'ingreso', ancho: window.innerWidth, alto: window.innerHeight }),
  });
  await asegurarAcceso();
  conAcceso = true;
  vigilarSesion();
  // Se registra ANTES de leer los datos: asi tema, textos y rotacion recien
  // descargados se aplican de inmediato, y no los de la copia vieja.
  alCambiar('presentacion', () => { refrescarPresentacion(); ajustarEscenario(); });
  await iniciarDatos();
  iniciarControlador({ alCambiarModo: pintarModo });
  iniciarIndicadores();
  iniciarVigilancia();
  iniciarComandos({ dispositivo });
}

principal();
