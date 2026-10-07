// Punto de entrada: configura Phaser y arranca la primera escena.
import Phaser from 'phaser';
import { Ronda } from './escenas/Ronda.js';

new Phaser.Game({
  type: Phaser.AUTO,           // usa WebGL si se puede; si no, Canvas
  parent: 'juego',             // el <div id="juego"> de index.html
  width: 1280,                 // el mapa mide exactamente una pantalla
  height: 720,
  backgroundColor: '#0d111d',
  scale: {
    mode: Phaser.Scale.FIT,               // se ajusta a la ventana sin deformarse
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',          // física simple: velocidad y choques
    arcade: { debug: false },   // ponlo en true para ver las cajas de choque
  },
  scene: [Ronda],
});
