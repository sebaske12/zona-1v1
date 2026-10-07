// Interfaz encima de la ronda: marcador, tiempo, avisos, paneles de cada jugador,
// flechas hacia lo que está fuera de pantalla y aviso de poca vida.
// Va en una escena aparte para que no tiemble con la sacudida ni se agrande con el zoom.
import Phaser from 'phaser';
import { FUENTE, UI, CENTRO, colorVida } from '../config.js';
import { ARMAS, CHALECO } from '../datos/armas.js';
import { duracionRonda } from '../datos/zona.js';
import { esTactil } from '../entrada/entradas.js';
import { resumenTeclas } from '../entrada/Teclado.js';

const estilo = (tam, color = '#e7eaf2') => ({ fontFamily: FUENTE, fontSize: `${Math.round(tam)}px`, color, fontStyle: 'bold' });
const css = (color) => `#${color.toString(16).padStart(6, '0')}`;

export class HUD extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  init(data) {
    this.claveRonda = data?.ronda || 'Ronda'; // Ronda, RondaEnLinea o RondaInvitado
  }

  create() {
    this.ronda = this.scene.get(this.claveRonda);
    const r = this.ronda;
    this.tactil = esTactil(this);
    const f = (this.f = this.tactil ? 1.3 : 1); // en el celular todo un poco más grande
    this.tamPanel = { ancho: Math.round(260 * f), alto: Math.round(84 * f) };

    this.g = this.add.graphics();
    this.gFlechas = this.add.graphics();
    this.nombreIzq = this.add.text(600, 12, r.jugadores[0].nombre, estilo(20 * f, r.jugadores[0].colorCss)).setOrigin(1, 0).setStroke('#0d111d', 5);
    this.puntaje = this.add.text(640, 6, '', estilo(32 * f)).setOrigin(0.5, 0).setStroke('#0d111d', 6);
    this.nombreDer = this.add.text(680, 12, r.jugadores[1].nombre, estilo(20 * f, r.jugadores[1].colorCss)).setOrigin(0, 0).setStroke('#0d111d', 5);
    this.info = this.add.text(640, 8 + 40 * f, '', estilo(15 * f, '#9ba4ba')).setOrigin(0.5, 0).setStroke('#0d111d', 4);
    this.aviso = this.add.text(640, 58 + 44 * f, '', estilo(24 * f)).setOrigin(0.5).setStroke('#0d111d', 6);
    this.grande = this.add.text(640, 320, '', estilo(76 * f)).setOrigin(0.5).setStroke('#0d111d', 12);
    this.textoPausa = this.add.text(640, 360, '', { ...estilo(26), align: 'center' }).setOrigin(0.5).setStroke('#0d111d', 6);
    this.paneles = r.jugadores.map((j, i) => this.crearPanel(j, i));
    this.etiquetasFlechas = [0, 1, 2].map(() => this.add.text(0, 0, '', estilo(14 * f)).setOrigin(0.5).setStroke('#0d111d', 4).setVisible(false));
    this.crearAyudas();
  }

  // Recordatorio de controles al empezar la ronda
  crearAyudas() {
    const r = this.ronda;
    const f = this.f;
    const ayuda = (x, y, contenido) => this.add.text(x, y, contenido, { ...estilo(13 * f), align: 'center', lineSpacing: 3 })
      .setOrigin(0.5, 0).setStroke('#0d111d', 4);
    this.ayudas = [];
    if (this.tactil) {
      this.ayudas.push(ayuda(640, 400, 'Joystick izquierdo: moverte · Toca la mitad derecha: apuntar y disparar\nRodar esquiva las balas · Usar: botiquín, granada o pared de gel'));
      return;
    }
    // Abajo, en la esquina de cada jugador (arriba taparían al jugador 1, que empieza bajo su panel)
    const enLinea = this.claveRonda !== 'Ronda';
    this.paneles.forEach((panel, i) => {
      if (r.partida.bot && i === 1) return;
      if (enLinea && i !== r.indiceLocal) return;
      const teclas = resumenTeclas(enLinea ? 0 : i) + (enLinea ? '\nRatón: apunta · Clic: dispara' : '');
      this.ayudas.push(ayuda(panel.x + this.tamPanel.ancho / 2, 640, teclas));
    });
  }

  crearPanel(j, i) {
    const f = this.f;
    const { ancho } = this.tamPanel;
    const x = i === 0 ? 12 : 1280 - 12 - ancho;
    const y = 10;
    const nombre = this.add.text(x + 14 * f, y + 8 * f, j.nombre, estilo(16 * f, j.colorCss));
    const arma = this.add.text(x + ancho - 12 * f, y + 10 * f, '', estilo(13 * f)).setOrigin(1, 0);
    const iconos = ['botiquin', 'granada', 'gel'].map((tipo, k) => ({
      tipo,
      img: this.add.image(x + (26 + k * 54) * f, y + 68 * f, `ico-${tipo}`).setScale(0.75 * f),
      n: this.add.text(x + (40 + k * 54) * f, y + 60 * f, '0', estilo(14 * f)),
    }));
    return { x, y, j, nombre, arma, iconos };
  }

  // Posición en pantalla de algo del mapa (la cámara puede estar con zoom o moviéndose)
  aPantalla(x, y) {
    const cam = this.ronda.cameras.main;
    const v = cam.worldView;
    return { x: (x - v.x) * cam.zoom, y: (y - v.y) * cam.zoom };
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

    this.avisoPocaVida(g);
    for (const panel of this.paneles) this.dibujarPanel(panel, g);
    this.dibujarFlechas();

    // La ayuda de controles se ve en la cuenta regresiva y se apaga a los 5 segundos
    const alfaAyuda = r.estado === 'cuenta' ? 1 : Phaser.Math.Clamp(5 - r.reloj, 0, 1);
    for (const a of this.ayudas) a.setAlpha(alfaAyuda);

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

  // Borde rojo que late cuando a tu jugador le queda poca vida
  avisoPocaVida(g) {
    const r = this.ronda;
    if (!r.vistaPropia || r.indiceLocal == null) return;
    const yo = r.jugadores[r.indiceLocal];
    if (!yo || !yo.vivo || yo.vida / yo.vidaMax >= 0.3 || r.estado !== 'jugando') return;
    const alfa = 0.22 + 0.18 * Math.sin(this.game.loop.time / 140);
    g.lineStyle(34 * this.f, 0xff3b30, alfa).strokeRect(0, 0, 1280, 720);
  }

  // Flechas en el borde de la pantalla hacia el rival, el airdrop o la zona cuando no se ven
  dibujarFlechas() {
    const r = this.ronda;
    const g = this.gFlechas;
    g.clear();
    this.etiquetasFlechas.forEach((t) => t.setVisible(false));
    const cam = r.cameras.main;
    if (cam.zoom <= 1.01 || r.indiceLocal == null || r.estado === 'final') return;
    const yo = r.jugadores[r.indiceLocal];
    const rival = r.jugadores[1 - r.indiceLocal];
    const objetivos = [];
    if (rival && rival.vivo) objetivos.push({ x: rival.x, y: rival.y, color: rival.color, texto: rival.nombre });
    const airdrop = (r.cajas || []).find((c) => c.airdrop && !c.abierta);
    if (airdrop) objetivos.push({ x: airdrop.x, y: airdrop.y, color: 0xf2b544, texto: 'Airdrop' });
    if (yo && yo.fueraDeZona) objetivos.push({ x: CENTRO.x, y: CENTRO.y, color: 0x7ea0ff, texto: 'Zona' });
    const f = this.f;
    const margen = 52 * f;
    const arriba = this.tamPanel.alto + 46; // las flechas no se meten debajo de los paneles de arriba
    objetivos.forEach((o, k) => {
      if (cam.worldView.contains(o.x, o.y)) return;
      const s = this.aPantalla(o.x, o.y);
      const a = Math.atan2(s.y - 360, s.x - 640);
      const t = Math.min((640 - margen) / Math.max(1e-6, Math.abs(Math.cos(a))), (360 - margen) / Math.max(1e-6, Math.abs(Math.sin(a))));
      const px = 640 + Math.cos(a) * t;
      const py = Math.max(arriba, 360 + Math.sin(a) * t);
      const tam = 17 * f;
      g.fillStyle(0x0d111d, 0.7).fillCircle(px, py, tam + 4);
      g.fillStyle(o.color, 0.95).fillTriangle(
        px + Math.cos(a) * tam, py + Math.sin(a) * tam,
        px + Math.cos(a + 2.4) * tam, py + Math.sin(a + 2.4) * tam,
        px + Math.cos(a - 2.4) * tam, py + Math.sin(a - 2.4) * tam,
      );
      this.etiquetasFlechas[k].setText(o.texto).setColor(css(o.color)).setVisible(true)
        .setPosition(px - Math.cos(a) * 34 * f, py - Math.sin(a) * 34 * f);
    });
  }

  dibujarPanel(panel, g) {
    const { x, y, j } = panel;
    const f = this.f;
    const { ancho, alto } = this.tamPanel;
    const alerta = j.fueraDeZona && Math.floor(this.game.loop.time / 200) % 2 === 0;
    // Si alguien pasa por debajo del panel, el panel se vuelve casi transparente
    const tapa = this.ronda.jugadores.some((o) => {
      const s = this.aPantalla(o.x, o.y);
      return s.x > x - 20 && s.x < x + ancho + 20 && s.y < y + alto + 30;
    });
    const alfa = tapa ? 0.35 : 1;
    panel.nombre.setAlpha(alfa);
    panel.arma.setAlpha(alfa);
    g.fillStyle(0x0d111d, 0.8 * alfa).fillRoundedRect(x, y, ancho, alto, 10);
    g.lineStyle(2, alerta ? 0xff5a4e : UI.borde, alfa).strokeRoundedRect(x, y, ancho, alto, 10);
    g.fillStyle(j.color, alfa).fillRect(x + 4, y + 12, 3, alto - 24);

    const bx = x + 14 * f;
    const bw = ancho - 28 * f;
    const pv = Phaser.Math.Clamp(j.vida / j.vidaMax, 0, 1);
    g.fillStyle(0x222a3f, alfa).fillRect(bx, y + 33 * f, bw, 12 * f);
    g.fillStyle(colorVida(pv), alfa).fillRect(bx, y + 33 * f, bw * pv, 12 * f);
    g.fillStyle(0x222a3f, alfa).fillRect(bx, y + 48 * f, bw, 5 * f);
    if (j.chaleco > 0) g.fillStyle(UI.chaleco, alfa).fillRect(bx, y + 48 * f, bw * (j.chaleco / CHALECO), 5 * f);

    const d = ARMAS[j.arma];
    let textoArma;
    if (!j.vivo) textoArma = 'Eliminado';
    else if (j.recargandoHasta > 0) textoArma = `${d.nombre} · recargando`;
    else textoArma = `${d.nombre} ${j.municion}/∞`;
    panel.arma.setText(textoArma);

    for (const ic of panel.iconos) {
      const n = j.objetos[ic.tipo];
      ic.n.setText(String(n));
      ic.img.setAlpha((n > 0 ? 1 : 0.3) * alfa);
      ic.n.setAlpha((n > 0 ? 1 : 0.4) * alfa);
      if (j.seleccion === ic.tipo && n > 0) g.lineStyle(2, 0xf2b544, alfa).strokeRoundedRect(ic.img.x - 15 * f, ic.img.y - 13 * f, 46 * f, 26 * f, 6);
    }

    for (let k = 0; k < j.stats.cargasRodada; k++) {
      g.fillStyle(k < j.cargasRodada ? 0x7ea0ff : UI.borde, alfa).fillCircle(x + ancho - (20 + k * 16) * f, y + 68 * f, 5 * f);
    }
  }
}
