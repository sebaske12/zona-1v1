// En línea desde un PC: el ratón apunta y el clic izquierdo dispara.
// Si el ratón no se mueve por un rato, vuelve el apuntado asistido.
const VACIA = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, rodada: false, usar: false, cambiar: false, burla: 0 };

export class EntradaRaton {
  constructor(escena, obtenerJugador) {
    this.escena = escena;
    this.obtener = obtenerJugador;
    this.ultimoMovimiento = -99999;
    escena.input.on('pointermove', (p) => {
      if (!p.wasTouch) this.ultimoMovimiento = escena.game.loop.time;
    });
  }

  leer() {
    const p = this.escena.input.activePointer;
    const j = this.obtener();
    if (!j || !j.vivo || p.wasTouch) return VACIA;
    const activo = p.isDown || this.escena.game.loop.time - this.ultimoMovimiento < 2500;
    if (!activo) return VACIA;
    const dx = p.worldX - j.x;
    const dy = p.worldY - j.y;
    const largo = Math.hypot(dx, dy) || 1;
    return { ...VACIA, apuntarX: dx / largo, apuntarY: dy / largo, disparar: p.isDown && p.leftButtonDown() };
  }
}
