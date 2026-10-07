// Controles táctiles para el iPhone (pantalla horizontal).
// Mitad izquierda: joystick para moverse. Mitad derecha: joystick para apuntar; mientras lo tocas, disparas.
import Phaser from 'phaser';
import { FUENTE } from '../config.js';

const BOTONES = [
  { id: 'rodada', x: 1192, y: 606, r: 54, texto: 'Rodar' },
  { id: 'usar', x: 1068, y: 660, r: 40, texto: 'Usar' },
  { id: 'cambiar', x: 1206, y: 472, r: 34, texto: '⇄' },
  { id: 'burla', x: 1084, y: 546, r: 32, texto: '😂' },
];
const RADIO_JOYSTICK = 64;
const REPOSO = { mover: { x: 170, y: 560 }, apuntar: { x: 900, y: 560 } };

export class EntradaTactil {
  constructor(escena) {
    this.escena = escena;
    this.toques = new Map(); // id del dedo → qué está haciendo
    this.reiniciarToques();
    this.g = escena.add.graphics().setDepth(60).setScrollFactor(0);
    this.etiquetas = BOTONES.map((b) => escena.add.text(b.x, b.y, b.texto, {
      fontFamily: FUENTE, fontSize: b.id === 'burla' ? '26px' : b.id === 'cambiar' ? '24px' : '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(61).setScrollFactor(0).setAlpha(0.9));
    escena.input.addPointer(3);
    escena.input.on('pointerdown', this.abajo, this);
    escena.input.on('pointermove', this.mover, this);
    escena.input.on('pointerup', this.arriba, this);
    escena.input.on('pointerupoutside', this.arriba, this);
  }

  reiniciarToques() {
    this.pendientes = { rodada: false, usar: false, cambiar: false, burla: 0 };
  }

  abajo(p) {
    // Este control solo se crea en celulares, así que se acepta cualquier toque
    // (algunos navegadores entregan el dedo como si fuera ratón)
    const b = BOTONES.find((x) => Phaser.Math.Distance.Between(p.x, p.y, x.x, x.y) <= x.r + 8);
    if (b) {
      if (b.id === 'burla') this.pendientes.burla = Phaser.Math.Between(1, 3);
      else this.pendientes[b.id] = true;
      this.toques.set(p.id, { tipo: 'boton', id: b.id });
      return;
    }
    const tipo = p.x < 640 ? 'mover' : 'apuntar';
    for (const t of this.toques.values()) if (t.tipo === tipo) return; // un dedo por joystick
    this.toques.set(p.id, { tipo, ox: p.x, oy: p.y, x: p.x, y: p.y });
  }

  mover(p) {
    const t = this.toques.get(p.id);
    if (t && t.tipo !== 'boton') {
      t.x = p.x;
      t.y = p.y;
    }
  }

  arriba(p) {
    this.toques.delete(p.id);
  }

  leer() {
    const r = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, ...this.pendientes };
    this.reiniciarToques();
    for (const t of this.toques.values()) {
      if (t.tipo === 'mover') {
        let dx = (t.x - t.ox) / RADIO_JOYSTICK;
        let dy = (t.y - t.oy) / RADIO_JOYSTICK;
        const largo = Math.hypot(dx, dy);
        if (largo > 1) { dx /= largo; dy /= largo; }
        if (largo > 0.15) { r.moverX = dx; r.moverY = dy; }
      } else if (t.tipo === 'apuntar') {
        const dx = t.x - t.ox;
        const dy = t.y - t.oy;
        const largo = Math.hypot(dx, dy);
        if (largo > 18) { r.apuntarX = dx / largo; r.apuntarY = dy / largo; }
        r.disparar = true; // sin arrastrar: dispara con apuntado asistido
      }
    }
    this.dibujar();
    return r;
  }

  dibujar() {
    const g = this.g;
    g.clear();
    for (const tipo of ['mover', 'apuntar']) {
      const t = [...this.toques.values()].find((x) => x.tipo === tipo);
      const base = t ? { x: t.ox, y: t.oy } : REPOSO[tipo];
      g.lineStyle(3, 0xffffff, t ? 0.45 : 0.18).strokeCircle(base.x, base.y, RADIO_JOYSTICK);
      let kx = base.x;
      let ky = base.y;
      if (t) {
        const dx = t.x - t.ox;
        const dy = t.y - t.oy;
        const largo = Math.hypot(dx, dy);
        const f = largo > RADIO_JOYSTICK ? RADIO_JOYSTICK / largo : 1;
        kx += dx * f;
        ky += dy * f;
      }
      g.fillStyle(tipo === 'apuntar' ? 0xff7468 : 0x7ea0ff, t ? 0.6 : 0.22).fillCircle(kx, ky, 26);
    }
    const apretados = new Set([...this.toques.values()].filter((t) => t.tipo === 'boton').map((t) => t.id));
    for (const b of BOTONES) {
      g.fillStyle(0x0d111d, apretados.has(b.id) ? 0.75 : 0.45).fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0xffffff, apretados.has(b.id) ? 0.8 : 0.35).strokeCircle(b.x, b.y, b.r);
    }
  }
}
