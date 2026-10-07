// Punto de entrada: configura Phaser y la lista de escenas.
import Phaser from 'phaser';
import { ANCHO, ALTO } from './config.js';
import { Sonido } from './sistemas/Sonido.js';
import { Arranque } from './escenas/Arranque.js';
import { Menu } from './escenas/Menu.js';
import { Preparacion } from './escenas/Preparacion.js';
import { Historial } from './escenas/Historial.js';
import { Ajustes } from './escenas/Ajustes.js';
import { Ronda } from './escenas/Ronda.js';
import { HUD } from './escenas/HUD.js';
import { Ventajas } from './escenas/Ventajas.js';
import { Victoria } from './escenas/Victoria.js';
import { Sala } from './escenas/Sala.js';
import { RondaEnLinea } from './escenas/RondaEnLinea.js';
import { RondaInvitado } from './escenas/RondaInvitado.js';

const config = {
  type: Phaser.AUTO,           // WebGL si se puede; si no, Canvas
  parent: 'juego',
  width: ANCHO,                // el mapa mide exactamente una pantalla
  height: ALTO,
  backgroundColor: '#0d111d',
  scale: {
    mode: Phaser.Scale.FIT,    // se ajusta a la ventana sin deformarse
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: { createContainer: true }, // para los campos de texto (nombres y apuestas)
  input: { gamepad: true, activePointers: 4 }, // controles de PS / Xbox y varios dedos a la vez
  physics: {
    default: 'arcade',
    arcade: { debug: false },     // ponlo en true para ver las cajas de choque
  },
  // El orden importa: el HUD va después de las rondas para dibujarse encima
  scene: [Arranque, Menu, Preparacion, Historial, Ajustes, Sala, Ronda, RondaEnLinea, RondaInvitado, HUD, Ventajas, Victoria],
};

// iOS y los navegadores solo dejan sonar después del primer toque o tecla
for (const evento of ['pointerdown', 'keydown', 'touchend']) {
  window.addEventListener(evento, () => Sonido.desbloquear(), { passive: true });
}

// Espera la fuente (máximo 1,5 s) para que los textos no cambien de letra al aparecer
async function arrancar() {
  try {
    await Promise.race([
      document.fonts.load('700 20px "Chakra Petch"'),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) { /* sin internet se usa la letra del sistema */ }
  window.juego = new Phaser.Game(config); // window.juego sirve para revisar el juego desde la consola
}

arrancar();
