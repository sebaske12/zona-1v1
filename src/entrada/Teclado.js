// Convierte el teclado en una "intención" (plan, sección 1.9).
// Control.js hace lo mismo con un control, y el jugador no sabe de dónde vino la orden.
import Phaser from 'phaser';

const { JustDown } = Phaser.Input.Keyboard;

export const TECLAS = [
  { arriba: 'W', abajo: 'S', izquierda: 'A', derecha: 'D', disparar: 'SPACE', rodada: 'SHIFT', usar: 'Q', cambiar: 'E', burla1: 'ONE', burla2: 'TWO', burla3: 'THREE' },
  { arriba: 'UP', abajo: 'DOWN', izquierda: 'LEFT', derecha: 'RIGHT', disparar: 'K', rodada: 'J', usar: 'L', cambiar: 'I', burla1: 'EIGHT', burla2: 'NINE', burla3: 'ZERO' },
];

export class EntradaTeclado {
  constructor(escena, teclas) {
    this.t = escena.input.keyboard.addKeys(teclas);
  }

  leer() {
    const t = this.t;
    return {
      moverX: (t.derecha.isDown ? 1 : 0) - (t.izquierda.isDown ? 1 : 0),
      moverY: (t.abajo.isDown ? 1 : 0) - (t.arriba.isDown ? 1 : 0),
      apuntarX: 0,
      apuntarY: 0, // con teclado el apuntado es asistido
      disparar: t.disparar.isDown,
      rodada: JustDown(t.rodada),
      usar: JustDown(t.usar),
      cambiar: JustDown(t.cambiar),
      burla: JustDown(t.burla1) ? 1 : JustDown(t.burla2) ? 2 : JustDown(t.burla3) ? 3 : 0,
    };
  }
}
