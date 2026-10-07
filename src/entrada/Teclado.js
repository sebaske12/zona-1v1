// Convierte el teclado en una "intención" (plan, sección 1.9).
// Más adelante habrá Control.js, Tactil.js y Red.js que devuelven lo mismo,
// y el jugador no sabrá de dónde vino la orden.
export class EntradaTeclado {
  // teclas: { arriba: 'W', abajo: 'S', izquierda: 'A', derecha: 'D' }
  constructor(escena, teclas) {
    this.teclas = escena.input.keyboard.addKeys(teclas);
  }

  leer() {
    const t = this.teclas;
    return {
      moverX: (t.derecha.isDown ? 1 : 0) - (t.izquierda.isDown ? 1 : 0), // -1, 0 o 1
      moverY: (t.abajo.isDown ? 1 : 0) - (t.arriba.isDown ? 1 : 0),
    };
  }
}
