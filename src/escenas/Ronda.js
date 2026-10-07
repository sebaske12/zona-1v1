// La escena donde se juega una ronda.
// Semana 1: un solo jugador (un cuadrado) que se mueve con W A S D.
import Phaser from 'phaser';
import { EntradaTeclado } from '../entrada/Teclado.js';

const VELOCIDAD = 220; // píxeles por segundo (plan, sección 1.3)

export class Ronda extends Phaser.Scene {
  constructor() {
    super('Ronda');
  }

  // create() corre una sola vez, al empezar la escena
  create() {
    // Piso de la arena
    this.add.rectangle(640, 360, 1280, 720, 0x1a2135);

    // Jugador 1: un cuadrado azul de 28 px. Después será un personaje dibujado.
    this.jugador1 = this.add.rectangle(90, 90, 28, 28, 0x2453d4);
    this.physics.add.existing(this.jugador1);        // le da un cuerpo físico
    this.jugador1.body.setCollideWorldBounds(true);  // no se sale de la pantalla

    this.entrada1 = new EntradaTeclado(this, {
      arriba: 'W', abajo: 'S', izquierda: 'A', derecha: 'D',
    });

    this.add.text(16, 16, 'Zona 1v1 · Semana 1 · Muévete con W A S D', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#e7eaf2',
    });
  }

  // update() corre unas 60 veces por segundo
  update() {
    const intencion = this.entrada1.leer();

    // Sin esto, en diagonal irías 41 % más rápido. normalize() deja el
    // vector en largo 1 y scale() lo lleva a la velocidad del jugador.
    const velocidad = new Phaser.Math.Vector2(intencion.moverX, intencion.moverY)
      .normalize()
      .scale(VELOCIDAD);

    this.jugador1.body.setVelocity(velocidad.x, velocidad.y);
  }
}
