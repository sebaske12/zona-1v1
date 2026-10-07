// Controles táctiles para el iPhone (pantalla horizontal).
// Mitad izquierda: joystick para moverse. Mitad derecha: joystick para apuntar; mientras lo tocas, disparas.
import Phaser from 'phaser';
import { FUENTE } from '../config.js';

// Los botones se miden desde la esquina de abajo a la derecha (dx, dy): así quedan bajo el pulgar
// aunque la pantalla sea más ancha que 1280 (por ejemplo, un iPhone en horizontal)
const BOTONES = [
  { id: 'rodada', dx: 88, dy: 114, r: 54, texto: 'Rodar' },
  { id: 'usar', dx: 212, dy: 60, r: 40, texto: 'Usar' },
  { id: 'cambiar', dx: 74, dy: 248, r: 34, texto: '⇄' },
  { id: 'burla', dx: 196, dy: 174, r: 32, texto: '😂' },
];
const RADIO_JOYSTICK = 64;

// Dónde va cada cosa con el tamaño actual de la pantalla. El botón ⏸ lo dibuja el HUD; aquí se ignoran sus toques.
export function zonasTactiles(escena) {
  const W = escena.scale.width;
  const H = escena.scale.height;
  return {
    botones: BOTONES.map((b) => ({ ...b, x: W - b.dx, y: H - b.dy })),
    reposo: { mover: { x: 170, y: H - 160 }, apuntar: { x: W - 380, y: H - 160 } },
    pausa: { x: W / 2, y: H - 38, r: 34 },
    mitad: W / 2,
  };
}

export class EntradaTactil {
  constructor(escena) {
    this.escena = escena;
    this.toques = new Map(); // id del dedo → qué está haciendo
    this.reiniciarToques();
    this.g = null; // se dibuja en la capa del HUD (sin zoom), cuando esté lista
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
    // Con el menú de pausa abierto, o tocando el botón ⏸, los dedos no mueven ni disparan
    const z = zonasTactiles(this.escena);
    if (this.escena.menuTactil || Phaser.Math.Distance.Between(p.x, p.y, z.pausa.x, z.pausa.y) <= z.pausa.r) return;
    // Este control solo se crea en celulares, así que se acepta cualquier toque
    // (algunos navegadores entregan el dedo como si fuera ratón)
    const b = z.botones.find((x) => Phaser.Math.Distance.Between(p.x, p.y, x.x, x.y) <= x.r + 8);
    if (b) {
      if (b.id === 'burla') this.pendientes.burla = Phaser.Math.Between(1, 3);
      else this.pendientes[b.id] = true;
      this.toques.set(p.id, { tipo: 'boton', id: b.id });
      return;
    }
    const tipo = p.x < z.mitad ? 'mover' : 'apuntar';
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
    if (this.escena.menuTactil) this.toques.clear(); // abrió el menú de pausa: se sueltan los joysticks
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

  // Los joysticks van en la escena del HUD: así no se agrandan ni se mueven con la cámara
  capa() {
    if (this.g && this.g.scene) return true;
    const hud = this.escena.scene.get('HUD');
    if (!hud || !hud.sys.isActive() || !hud.add) return false;
    this.g = hud.add.graphics().setDepth(60);
    zonasTactiles(hud).botones.forEach((b) => hud.add.text(b.x, b.y, b.texto, {
      fontFamily: FUENTE, fontSize: b.id === 'burla' ? '26px' : b.id === 'cambiar' ? '24px' : '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(61).setAlpha(0.9));
    return true;
  }

  dibujar() {
    if (!this.capa()) return;
    const g = this.g;
    const z = zonasTactiles(this.escena);
    g.clear();
    for (const tipo of ['mover', 'apuntar']) {
      const t = [...this.toques.values()].find((x) => x.tipo === tipo);
      const base = t ? { x: t.ox, y: t.oy } : z.reposo[tipo];
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
    for (const b of z.botones) {
      g.fillStyle(0x0d111d, apretados.has(b.id) ? 0.75 : 0.45).fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0xffffff, apretados.has(b.id) ? 0.8 : 0.35).strokeCircle(b.x, b.y, b.r);
    }
  }
}
