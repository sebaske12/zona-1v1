// En el anfitrión: la intención del jugador que está en el otro aparato, tal como llega por la red.
const VACIA = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, rodada: false, usar: false, cambiar: false, burla: 0 };

export class EntradaRed {
  constructor() {
    this.ultima = VACIA;
    this.reiniciarToques();
  }

  reiniciarToques() {
    this.toques = { rodada: false, usar: false, cambiar: false, burla: 0 };
  }

  recibir(d) {
    if (!d) return;
    this.ultima = { ...VACIA, ...d };
    // Los toques (rodar, usar…) se guardan hasta leerlos para que no se pierdan
    if (d.rodada) this.toques.rodada = true;
    if (d.usar) this.toques.usar = true;
    if (d.cambiar) this.toques.cambiar = true;
    if (d.burla) this.toques.burla = d.burla;
  }

  leer() {
    const r = { ...this.ultima, ...this.toques };
    this.reiniciarToques();
    return r;
  }
}
