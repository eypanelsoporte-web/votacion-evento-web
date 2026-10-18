// Punto de entrada de la TV: arma las piezas y las pone en marcha.
import { iniciarNucleo, refrescarPresentacion } from '../nucleo/arranque.js';
import { mostrarFatal } from '../nucleo/dom.js';
import { iniciarLatido } from '../nucleo/dispositivo.js';
import { iniciarVigilancia } from '../nucleo/vigilancia.js';
import { iniciarComandos } from '../nucleo/comandos.js';
import { iniciarEscenario, ajustarEscenario } from './escenario.js';
import { iniciarDatos, alCambiar, estado, totalVotos } from './datos.js';
import { iniciarControlador, vistaActual } from './controlador.js';
import { iniciarIndicadores, pintarModo } from './indicadores.js';
import { indiceActual } from './diapositivas.js';

async function principal() {
  let dispositivo;
  try {
    ({ dispositivo } = await iniciarNucleo({ tipo: 'tv', persistir: false }));
  } catch (error) {
    mostrarFatal(error);
    return;
  }

  iniciarEscenario();
  // Se registra ANTES de leer los datos: asi tema, textos y rotacion recien
  // descargados se aplican de inmediato, y no los de la copia vieja.
  alCambiar('presentacion', () => { refrescarPresentacion(); ajustarEscenario(); });
  await iniciarDatos();
  iniciarControlador({ alCambiarModo: pintarModo });
  iniciarIndicadores();

  iniciarLatido({
    dispositivo,
    obtenerEstado: () => ({
      vista: vistaActual(), modo: estado.modo, diapositiva: indiceActual(),
      total: totalVotos(), ancho: window.innerWidth, alto: window.innerHeight,
    }),
  });
  iniciarVigilancia();
  iniciarComandos({ dispositivo });
}

principal();
