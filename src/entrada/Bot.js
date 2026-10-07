// Rival controlado por la computadora (modo entrenamiento).
// Produce la misma "intención" que un teclado: el jugador no sabe que es un bot.
import Phaser from 'phaser';
import { ANCHO, ALTO, CENTRO } from '../config.js';

const CELDA = 40; // el mapa se divide en cuadritos para buscar caminos
const DISTANCIA_PREFERIDA = { pistola: 260, subfusil: 190, escopeta: 110, rifle: 320, dorado: 320, franco: 560 };
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class EntradaBot {
  constructor(escena, indice) {
    this.escena = escena;
    this.indice = indice;
    this.camino = [];
    this.proximoPlan = 0;
    this.lado = 1;
    this.cambioLado = 0;
    this.vioRival = -1;
    this.vidaAntes = null;
    this.proximaRodada = 0;
    this.proximoObjeto = 0;
    this.burlo = false;
    this.atascado = { x: 0, y: 0, desde: 0, escapeHasta: 0, dir: null };
    this.construirRejilla();
  }

  get yo() { return this.escena.jugadores[this.indice]; }
  get rival() { return this.escena.jugadores[1 - this.indice]; }

  construirRejilla() {
    this.cols = Math.ceil(ANCHO / CELDA);
    this.filas = Math.ceil(ALTO / CELDA);
    this.bloqueada = new Uint8Array(this.cols * this.filas);
    for (let f = 0; f < this.filas; f++) {
      for (let c = 0; c < this.cols; c++) {
        const zona = new Phaser.Geom.Rectangle(c * CELDA + 4, f * CELDA + 4, CELDA - 8, CELDA - 8);
        if (this.escena.rectMuros.some((m) => Phaser.Geom.Intersects.RectangleToRectangle(zona, m))) this.bloqueada[f * this.cols + c] = 1;
      }
    }
  }

  celda(x, y) {
    return {
      c: Phaser.Math.Clamp(Math.floor(x / CELDA), 0, this.cols - 1),
      f: Phaser.Math.Clamp(Math.floor(y / CELDA), 0, this.filas - 1),
    };
  }

  // Búsqueda en anchura sobre la rejilla: devuelve los puntos del camino
  buscarCamino(desde, hasta) {
    const idx = (c, f) => f * this.cols + c;
    const a = this.celda(desde.x, desde.y);
    const b = this.celda(hasta.x, hasta.y);
    const inicio = idx(a.c, a.f);
    const meta = idx(b.c, b.f);
    const previo = new Int32Array(this.cols * this.filas).fill(-1);
    previo[inicio] = inicio;
    const cola = [inicio];
    for (let cabeza = 0; cabeza < cola.length; cabeza++) {
      const actual = cola[cabeza];
      if (actual === meta) break;
      const c = actual % this.cols;
      const f = Math.floor(actual / this.cols);
      for (const [dc, df] of VECINOS) {
        const nc = c + dc;
        const nf = f + df;
        if (nc < 0 || nf < 0 || nc >= this.cols || nf >= this.filas) continue;
        const n = idx(nc, nf);
        if (previo[n] !== -1 || (this.bloqueada[n] && n !== meta)) continue;
        if (dc && df && (this.bloqueada[idx(c + dc, f)] || this.bloqueada[idx(c, f + df)])) continue; // no cortar esquinas
        previo[n] = actual;
        cola.push(n);
      }
    }
    if (previo[meta] === -1) return [];
    const camino = [];
    for (let n = meta; n !== previo[n]; n = previo[n]) {
      camino.push({ x: (n % this.cols) * CELDA + CELDA / 2, y: Math.floor(n / this.cols) * CELDA + CELDA / 2 });
    }
    return camino.reverse();
  }

  leer() {
    const e = this.escena;
    const yo = this.yo;
    const rival = this.rival;
    const r = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, rodada: false, usar: false, cambiar: false, burla: 0 };
    if (!yo || !yo.vivo || e.estado !== 'jugando') return r;
    const t = e.reloj;

    const ve = rival.vivo && e.hayVision(yo.x, yo.y, rival.x, rival.y);
    const dist = Phaser.Math.Distance.Between(yo.x, yo.y, rival.x, rival.y);
    if (ve && this.vioRival < 0) this.vioRival = t;
    if (!ve) this.vioRival = -1;
    const listo = ve && t - this.vioRival > 0.35; // tarda un poquito en reaccionar

    // Si lo golpean, a veces rueda
    if (this.vidaAntes !== null && yo.vida < this.vidaAntes - 0.5 && t > this.proximaRodada && Math.random() < 0.35) {
      r.rodada = true;
      this.proximaRodada = t + 1.6;
    }
    this.vidaAntes = yo.vida;

    // Mientras se cura se queda quieto
    if (yo.curando) return r;

    // Objetos
    if (t > this.proximoObjeto) {
      if (!ve && yo.vida < yo.vidaMax * 0.55 && yo.objetos.botiquin > 0) {
        yo.seleccion = 'botiquin';
        r.usar = true;
        this.proximoObjeto = t + 1;
        return r;
      }
      if (listo && yo.objetos.granada > 0 && dist > 130 && dist < 300 && Math.random() < 0.02) {
        yo.seleccion = 'granada';
        r.usar = true;
        this.proximoObjeto = t + 2;
      } else if (listo && yo.objetos.gel > 0 && yo.vida < yo.vidaMax * 0.4 && Math.random() < 0.03) {
        yo.seleccion = 'gel';
        r.usar = true;
        this.proximoObjeto = t + 3;
      }
    }

    if (listo && !this.burlo && rival.vida < rival.vidaMax * 0.25) {
      r.burla = 1;
      this.burlo = true;
    }

    // Hacia dónde moverse
    let mover = null;
    const dCentro = Phaser.Math.Distance.Between(yo.x, yo.y, CENTRO.x, CENTRO.y);
    const limite = Math.min(e.zona.radio, e.zona.siguiente ?? Infinity) - 50;
    if (dCentro > limite && (e.zona.dano > 0 || e.zona.siguiente !== null)) {
      mover = this.seguir(CENTRO, t);
    } else if (listo) {
      const prefer = DISTANCIA_PREFERIDA[yo.arma] ?? 260;
      const hacia = new Phaser.Math.Vector2(rival.x - yo.x, rival.y - yo.y).normalize();
      if (t > this.cambioLado) {
        this.lado = Math.random() < 0.5 ? -1 : 1;
        this.cambioLado = t + Phaser.Math.FloatBetween(0.8, 1.8);
      }
      const costado = new Phaser.Math.Vector2(-hacia.y * this.lado, hacia.x * this.lado);
      if (dist > prefer + 60) mover = hacia.clone().scale(0.8).add(costado.clone().scale(0.4));
      else if (dist < prefer - 60) mover = hacia.clone().scale(-0.8).add(costado.clone().scale(0.4));
      else mover = costado;
      r.disparar = dist <= yo.alcance;
    } else {
      const caja = this.cajaCercana();
      const objetivo = caja && (yo.arma === 'pistola' || t < 45) ? caja : rival;
      mover = this.seguir(objetivo, t);
    }

    // Si lleva rato sin avanzar, se escapa hacia un costado
    const at = this.atascado;
    if (t < at.escapeHasta && at.dir) mover = at.dir;
    else if (Phaser.Math.Distance.Between(yo.x, yo.y, at.x, at.y) > 12) {
      at.x = yo.x;
      at.y = yo.y;
      at.desde = t;
    } else if (t - at.desde > 0.7 && mover) {
      const a = Math.random() * Math.PI * 2;
      at.dir = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a));
      at.escapeHasta = t + 0.4;
      at.desde = t;
      this.proximoPlan = 0;
    }

    if (mover && mover.lengthSq() > 0) {
      mover.normalize();
      r.moverX = mover.x;
      r.moverY = mover.y;
    }
    return r;
  }

  cajaCercana() {
    const yo = this.yo;
    let mejor = null;
    let dMejor = Infinity;
    for (const c of this.escena.cajas) {
      if (c.abierta) continue;
      const d = Phaser.Math.Distance.Between(yo.x, yo.y, c.x, c.y);
      if (d < dMejor) { dMejor = d; mejor = c; }
    }
    return mejor;
  }

  // Sigue el camino hacia el objetivo, recalculándolo dos veces por segundo
  seguir(objetivo, t) {
    const yo = this.yo;
    if (this.escena.hayVision(yo.x, yo.y, objetivo.x, objetivo.y)) {
      return new Phaser.Math.Vector2(objetivo.x - yo.x, objetivo.y - yo.y);
    }
    if (t > this.proximoPlan || !this.camino.length) {
      this.camino = this.buscarCamino(yo, objetivo);
      this.proximoPlan = t + 0.5;
    }
    while (this.camino.length && Phaser.Math.Distance.Between(yo.x, yo.y, this.camino[0].x, this.camino[0].y) < 14) this.camino.shift();
    const siguiente = this.camino[0] || objetivo;
    return new Phaser.Math.Vector2(siguiente.x - yo.x, siguiente.y - yo.y);
  }
}
