// Interfaz encima de la ronda: marcador, tiempo, avisos y paneles de cada jugador.
// Va en una escena aparte para que no tiemble con la sacudida de cámara.
import Phaser from 'phaser';
import { FUENTE, UI, colorVida } from '../config.js';
import { ARMAS, CHALECO } from '../datos/armas.js';
import { duracionRonda } from '../datos/zona.js';

const PANEL = { ancho: 260, alto: 84 };

const estilo = (tam, color = '#e7eaf2') => ({ fontFamily: FUENTE, fontSize: `${tam}px`, color, fontStyle: 'bold' });

export class HUD extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    this.ronda = this.scene.get('Ronda');
    const r = this.ronda;
    this.g = this.add.graphics();
    this.nombreIzq = this.add.text(600, 12, r.jugadores[0].nombre, estilo(20, r.jugadores[0].colorCss)).setOrigin(1, 0).setStroke('#0d111d', 5);
    this.puntaje = this.add.text(640, 6, '', estilo(32)).setOrigin(0.5, 0).setStroke('#0d111d', 6);
    this.nombreDer = this.add.text(680, 12, r.jugadores[1].nombre, estilo(20, r.jugadores[1].colorCss)).setOrigin(0, 0).setStroke('#0d111d', 5);
    this.info = this.add.text(640, 48, '', estilo(15, '#9ba4ba')).setOrigin(0.5, 0).setStroke('#0d111d', 4);
    this.aviso = this.add.text(640, 98, '', estilo(24)).setOrigin(0.5).setStroke('#0d111d', 6);
    this.grande = this.add.text(640, 320, '', estilo(76)).setOrigin(0.5).setStroke('#0d111d', 12);
    this.textoPausa = this.add.text(640, 360, '', { ...estilo(26), align: 'center' }).setOrigin(0.5).setStroke('#0d111d', 6);
    this.paneles = r.jugadores.map((j, i) => this.crearPanel(j, i));
  }

  crearPanel(j, i) {
    const x = i === 0 ? 12 : 1280 - 12 - PANEL.ancho;
    const y = 10;
    const nombre = this.add.text(x + 14, y + 8, j.nombre, estilo(16, j.colorCss));
    const arma = this.add.text(x + PANEL.ancho - 12, y + 10, '', estilo(13)).setOrigin(1, 0);
    const iconos = ['botiquin', 'granada', 'gel'].map((tipo, k) => ({
      tipo,
      img: this.add.image(x + 26 + k * 54, y + 68, `ico-${tipo}`).setScale(0.75),
      n: this.add.text(x + 40 + k * 54, y + 60, '0', estilo(14)),
    }));
    return { x, y, j, nombre, arma, iconos };
  }

  update() {
    const r = this.ronda;
    if (!r || !r.jugadores) return;
    const p = r.partida;
    const g = this.g;
    g.clear();

    this.puntaje.setText(`${p.rondas[0]} – ${p.rondas[1]}`);
    this.nombreIzq.x = 640 - this.puntaje.width / 2 - 14;
    this.nombreDer.x = 640 + this.puntaje.width / 2 + 14;
    const restante = Math.max(0, duracionRonda(r.modo.fases) - r.reloj);
    const min = Math.floor(restante / 60);
    const seg = Math.floor(restante % 60);
    this.info.setText(`Ronda ${p.numeroRonda} · ${r.modo.nombre} · ${min}:${String(seg).padStart(2, '0')}`);

    for (const panel of this.paneles) this.dibujarPanel(panel, g);

    const ahora = this.game.loop.time;
    const msg = r.mensajes[r.mensajes.length - 1];
    if (msg && ahora < msg.hasta) this.aviso.setText(msg.texto).setColor(msg.color).setAlpha(Math.min(1, (msg.hasta - ahora) / 400));
    else this.aviso.setText('');

    if (r.estado === 'cuenta') {
      const n = Math.ceil(r.cuenta / 0.8);
      this.grande.setText(n > 0 ? String(n) : '').setColor('#e7eaf2').setScale(1 + (r.cuenta % 0.8) * 0.6);
    } else if (r.grande && ahora < r.grande.hasta) {
      this.grande.setText(r.grande.texto).setColor(r.grande.color).setScale(1);
    } else {
      this.grande.setText('');
    }

    if (r.pausado) {
      g.fillStyle(0x0d111d, 0.65).fillRect(0, 0, 1280, 720);
      this.textoPausa.setText('PAUSA\n\nEsc para seguir · M para ir al menú');
    } else {
      this.textoPausa.setText('');
    }
  }

  dibujarPanel(panel, g) {
    const { x, y, j } = panel;
    const alerta = j.fueraDeZona && Math.floor(this.game.loop.time / 200) % 2 === 0;
    g.fillStyle(0x0d111d, 0.8).fillRoundedRect(x, y, PANEL.ancho, PANEL.alto, 10);
    g.lineStyle(2, alerta ? 0xff5a4e : UI.borde, 1).strokeRoundedRect(x, y, PANEL.ancho, PANEL.alto, 10);
    g.fillStyle(j.color, 1).fillRect(x + 4, y + 12, 3, PANEL.alto - 24);

    const bx = x + 14;
    const bw = PANEL.ancho - 28;
    const pv = Phaser.Math.Clamp(j.vida / j.vidaMax, 0, 1);
    g.fillStyle(0x222a3f, 1).fillRect(bx, y + 33, bw, 12);
    g.fillStyle(colorVida(pv), 1).fillRect(bx, y + 33, bw * pv, 12);
    g.fillStyle(0x222a3f, 1).fillRect(bx, y + 48, bw, 5);
    if (j.chaleco > 0) g.fillStyle(UI.chaleco, 1).fillRect(bx, y + 48, bw * (j.chaleco / CHALECO), 5);

    const d = ARMAS[j.arma];
    let textoArma;
    if (!j.vivo) textoArma = 'Eliminado';
    else if (j.recargandoHasta > 0) textoArma = `${d.nombre} · recargando`;
    else textoArma = `${d.nombre} ${j.municion}/∞`;
    panel.arma.setText(textoArma);

    for (const ic of panel.iconos) {
      const n = j.objetos[ic.tipo];
      ic.n.setText(String(n));
      ic.img.setAlpha(n > 0 ? 1 : 0.3);
      ic.n.setAlpha(n > 0 ? 1 : 0.4);
      if (j.seleccion === ic.tipo && n > 0) g.lineStyle(2, 0xf2b544, 1).strokeRoundedRect(ic.img.x - 15, ic.img.y - 13, 46, 26, 6);
    }

    for (let k = 0; k < j.stats.cargasRodada; k++) {
      g.fillStyle(k < j.cargasRodada ? 0x7ea0ff : UI.borde, 1).fillCircle(x + PANEL.ancho - 20 - k * 16, y + 68, 5);
    }
  }
}
