// Control de PS o Xbox (por cable o Bluetooth) convertido en la misma "intención".
const VACIA = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, rodada: false, usar: false, cambiar: false, burla: 0 };

// Números de botón del estándar de los navegadores
const B = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7, ARRIBA: 12, IZQ: 14, DER: 15 };

export class EntradaControl {
  constructor(escena, indice) {
    this.escena = escena;
    this.indice = indice;
    this.antes = {};
  }

  pad() {
    const gp = this.escena.input.gamepad;
    if (!gp || gp.total === 0) return null;
    const pad = gp.getPad(this.indice);
    return pad && pad.connected ? pad : null;
  }

  boton(pad, n) {
    const b = pad.buttons[n];
    return !!b && (b.pressed || b.value > 0.4);
  }

  // true solo en el cuadro en que se empieza a apretar
  flanco(nombre, valor) {
    const antes = this.antes[nombre];
    this.antes[nombre] = valor;
    return valor && !antes;
  }

  leer() {
    const pad = this.pad();
    if (!pad) return VACIA;
    const zona = (v, m) => (Math.abs(v) < m ? 0 : v);
    return {
      moverX: zona(pad.leftStick.x, 0.25),
      moverY: zona(pad.leftStick.y, 0.25),
      apuntarX: zona(pad.rightStick.x, 0.3),
      apuntarY: zona(pad.rightStick.y, 0.3),
      disparar: this.boton(pad, B.R2) || this.boton(pad, B.A),
      rodada: this.flanco('rodada', this.boton(pad, B.L2) || this.boton(pad, B.B)),
      usar: this.flanco('usar', this.boton(pad, B.R1) || this.boton(pad, B.X)),
      cambiar: this.flanco('cambiar', this.boton(pad, B.L1) || this.boton(pad, B.Y)),
      burla: this.flanco('b1', this.boton(pad, B.ARRIBA)) ? 1 : this.flanco('b2', this.boton(pad, B.IZQ)) ? 2 : this.flanco('b3', this.boton(pad, B.DER)) ? 3 : 0,
    };
  }
}
