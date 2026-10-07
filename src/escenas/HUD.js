// Interfaz encima de la ronda: marcador, tiempo, avisos, paneles de cada jugador,
// flechas hacia lo que está fuera de pantalla y aviso de poca vida.
// Va en una escena aparte para que no tiemble con la sacudida ni se agrande con el zoom.
// La pantalla puede ser más ancha que 1280 (por ejemplo, un iPhone en horizontal):
// los paneles y los botones se pegan a los bordes reales, y lo del centro queda en el centro.
import Phaser from 'phaser';
import { FUENTE, UI, CENTRO, colorVida } from '../config.js';
import { ARMAS, CHALECO } from '../datos/armas.js';
import { duracionRonda } from '../datos/zona.js';
import { esTactil } from '../entrada/entradas.js';
import { resumenTeclas } from '../entrada/Teclado.js';
import { conCara } from '../sistemas/Caras.js';
import { boton } from '../ui/ui.js';
import { zonasTactiles } from '../entrada/Tactil.js';

const estilo = (tam, color = '#e7eaf2') => ({ fontFamily: FUENTE, fontSize: `${Math.round(tam)}px`, color, fontStyle: 'bold' });
const css = (color) => `#${color.toString(16).padStart(6, '0')}`;

export class HUD extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  init(data) {
    this.claveRonda = data?.ronda || 'Ronda'; // Ronda, RondaEnLinea o RondaInvitado
    this.menuAbierto = !!data?.menuAbierto; // (al reacomodar la pantalla, el menú de pausa sigue abierto)
  }

  create() {
    this.ronda = this.scene.get(this.claveRonda);
    const r = this.ronda;
    this.tactil = esTactil(this);
    // Tamaño real de la pantalla del juego
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.cx = this.W / 2;
    this.cy = this.H / 2;
    const cx = this.cx;
    const f = (this.f = this.tactil ? 1.3 : 1); // en el celular todo un poco más grande
    this.tamPanel = { ancho: Math.round(260 * f), alto: Math.round(84 * f) };

    this.g = this.add.graphics();
    this.gFlechas = this.add.graphics();
    this.nombreIzq = this.add.text(cx - 40, 12, r.jugadores[0].nombre, estilo(20 * f, r.jugadores[0].colorCss)).setOrigin(1, 0).setStroke('#0d111d', 5);
    this.puntaje = this.add.text(cx, 6, '', estilo(32 * f)).setOrigin(0.5, 0).setStroke('#0d111d', 6);
    this.nombreDer = this.add.text(cx + 40, 12, r.jugadores[1].nombre, estilo(20 * f, r.jugadores[1].colorCss)).setOrigin(0, 0).setStroke('#0d111d', 5);
    this.info = this.add.text(cx, 8 + 40 * f, '', estilo(15 * f, '#9ba4ba')).setOrigin(0.5, 0).setStroke('#0d111d', 4);
    this.aviso = this.add.text(cx, 58 + 44 * f, '', estilo(24 * f)).setOrigin(0.5).setStroke('#0d111d', 6);
    this.grande = this.add.text(cx, this.cy - 40, '', estilo(76 * f)).setOrigin(0.5).setStroke('#0d111d', 12);
    this.textoPausa = this.add.text(cx, this.cy, '', { ...estilo(26), align: 'center' }).setOrigin(0.5).setStroke('#0d111d', 6);
    this.paneles = r.jugadores.map((j, i) => this.crearPanel(j, i));
    this.etiquetasFlechas = [0, 1, 2].map(() => this.add.text(0, 0, '', estilo(14 * f)).setOrigin(0.5).setStroke('#0d111d', 4).setVisible(false));
    this.crearAyudas();
    // En línea: el ping y por dónde va la conexión, abajo al centro
    this.red = this.claveRonda !== 'Ronda' ? this.registry.get('red') : null;
    this.senal = this.add.text(cx, this.tactil ? this.H - 68 : this.H - 6, '', estilo(13 * f, '#9ba4ba')).setOrigin(0.5, 1).setStroke('#0d111d', 4);
    this.proximaSenal = 0;
    r.menuTactil = false; // (la ronda se reutiliza: que no quede abierto de la vez anterior)
    if (this.tactil) this.crearMenuTactil();

    // Si cambia el tamaño de la pantalla (girar, barra de Safari…), se vuelve a armar el HUD
    this.alCambiarTamano = () => {
      clearTimeout(this.esperaTamano);
      this.esperaTamano = setTimeout(() => {
        if (this.sys.isActive() && (this.scale.width !== this.W || this.scale.height !== this.H)) {
          this.scene.restart({ ronda: this.claveRonda, menuAbierto: !!this.menu?.visible });
        }
      }, 150);
    };
    this.scale.on('resize', this.alCambiarTamano);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.alCambiarTamano);
      clearTimeout(this.esperaTamano);
    });
  }

  // En el celular no hay tecla Esc: un botón ⏸ para pausar (o salir, si es en línea)
  crearMenuTactil() {
    const enLinea = this.claveRonda !== 'Ronda';
    const { cx, cy } = this;
    const pausa = zonasTactiles(this).pausa;
    this.btnPausa = boton(this, pausa.x, pausa.y, '⏸', () => this.abrirMenu(), { ancho: 56, alto: 44, tam: 22, color: UI.gris });
    this.btnPausa.setAlpha(0.85);
    const fondo = this.add.rectangle(cx, cy, this.W, this.H, 0x0d111d, 0.72).setInteractive();
    const titulo = this.add.text(cx, cy - 98, enLinea ? '¿Salir de la partida?' : 'PAUSA', estilo(38)).setOrigin(0.5).setStroke('#0d111d', 6);
    const sub = this.add.text(cx, cy - 44, enLinea ? 'La ronda sigue mientras decides. Si sales, la partida se termina para los dos.' : 'El juego está en pausa.', estilo(17, '#9ba4ba')).setOrigin(0.5);
    const seguir = boton(this, cx - 145, cy + 50, enLinea ? 'Seguir jugando' : 'Seguir', () => this.cerrarMenu(), { ancho: 250, color: UI.azul });
    const salir = boton(this, cx + 145, cy + 50, 'Salir al menú', () => this.salirAlMenu(), { ancho: 250, color: UI.rojo });
    this.menu = this.add.container(0, 0, [fondo, titulo, sub, seguir, salir]).setDepth(90).setVisible(false);
    if (this.menuAbierto) {
      this.menu.setVisible(true);
      this.ronda.menuTactil = true;
    }
  }

  abrirMenu() {
    const r = this.ronda;
    if (r.saliendo || r.estado === 'final' || this.menu.visible) return;
    r.menuTactil = true;
    if (this.claveRonda === 'Ronda' && !r.pausado) r.alternarPausa();
    this.menu.setVisible(true);
  }

  cerrarMenu() {
    const r = this.ronda;
    r.menuTactil = false;
    if (this.claveRonda === 'Ronda' && r.pausado) r.alternarPausa();
    this.menu.setVisible(false);
  }

  salirAlMenu() {
    const r = this.ronda;
    r.menuTactil = false;
    const red = this.registry.get('red');
    if (red) {
      red.cerrar();
      this.registry.set('red', null);
    }
    r.scene.start('Menu');
  }

  // 📶 45 ms · directo: verde si va rápido, amarillo si va regular, rojo si va lento
  actualizarSenal() {
    const red = this.red;
    if (!red) return;
    const ahora = this.game.loop.time;
    if (ahora < this.proximaSenal) return;
    this.proximaSenal = ahora + 500;
    const ms = red.ping;
    const via = red.via === 'directa' ? 'directo' : 'por servidor';
    if (!ms) {
      this.senal.setText(`📶 midiendo… · ${via}`).setColor('#9ba4ba');
      return;
    }
    const color = ms < 120 ? '#3fd07f' : ms < 300 ? '#f2b544' : '#ff7468';
    this.senal.setText(`📶 ${ms} ms · ${via}`).setColor(color);
  }

  // Recordatorio de controles al empezar la ronda
  crearAyudas() {
    const r = this.ronda;
    const f = this.f;
    const ayuda = (x, y, contenido) => this.add.text(x, y, contenido, { ...estilo(13 * f), align: 'center', lineSpacing: 3 })
      .setOrigin(0.5, 0).setStroke('#0d111d', 4);
    this.ayudas = [];
    if (this.tactil) {
      this.ayudas.push(ayuda(this.cx, this.cy + 40, 'Joystick izquierdo: moverte · Toca la mitad derecha: apuntar y disparar\nRodar esquiva las balas · Usar: botiquín, granada o pared de gel'));
      return;
    }
    // Abajo, en la esquina de cada jugador (arriba taparían al jugador 1, que empieza bajo su panel)
    const enLinea = this.claveRonda !== 'Ronda';
    this.paneles.forEach((panel, i) => {
      if (r.partida.bot && i === 1) return;
      if (enLinea && i !== r.indiceLocal) return;
      const teclas = resumenTeclas(enLinea ? 0 : i) + (enLinea ? '\nRatón: apunta · Clic: dispara' : '');
      this.ayudas.push(ayuda(panel.x + panel.ancho / 2, this.H - 80, teclas));
    });
  }

  crearPanel(j, i) {
    const f = this.f;
    // Con foto, la cara va a la izquierda del panel
    const perfil = this.ronda.partida.perfiles[j.indice];
    const extra = perfil?.cara ? Math.round(52 * f) : 0;
    const ancho = this.tamPanel.ancho + extra;
    const x = i === 0 ? 12 : this.W - 12 - ancho;
    const y = 10;
    const izq = x + extra; // donde empieza lo demás
    let cara = null;
    if (extra) {
      const cx = x + 6 + 24 * f;
      const cy = y + this.tamPanel.alto / 2;
      const anillo = this.add.circle(cx, cy, 24 * f, j.color);
      const img = this.add.image(cx, cy, 'cuerpo').setVisible(false);
      conCara(this, perfil.cara, (clave) => {
        if (img.active) img.setTexture(clave).setDisplaySize(44 * f, 44 * f).setVisible(true);
      });
      cara = { anillo, img, gris: false };
    }
    const nombre = this.add.text(izq + 14 * f, y + 8 * f, j.nombre, estilo(16 * f, j.colorCss));
    const arma = this.add.text(x + ancho - 12 * f, y + 10 * f, '', estilo(13 * f)).setOrigin(1, 0);
    const iconos = ['botiquin', 'granada', 'gel'].map((tipo, k) => ({
      tipo,
      img: this.add.image(izq + (26 + k * 54) * f, y + 68 * f, `ico-${tipo}`).setScale(0.75 * f),
      n: this.add.text(izq + (40 + k * 54) * f, y + 60 * f, '0', estilo(14 * f)),
    }));
    return { x, y, ancho, izq, j, nombre, arma, iconos, cara };
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
    const { W, H, cx } = this;
    g.clear();

    this.puntaje.setText(`${p.rondas[0]} – ${p.rondas[1]}`);
    this.nombreIzq.x = cx - this.puntaje.width / 2 - 14;
    this.nombreDer.x = cx + this.puntaje.width / 2 + 14;
    // Con nombres largos (y caras en los paneles) el nombre se achica para no taparlos
    const [pi, pd] = this.paneles;
    const libreIzq = this.nombreIzq.x - (pi.x + pi.ancho + 10);
    const libreDer = pd.x - 10 - this.nombreDer.x;
    this.nombreIzq.setScale(Phaser.Math.Clamp(libreIzq / Math.max(1, this.nombreIzq.width), 0.5, 1));
    this.nombreDer.setScale(Phaser.Math.Clamp(libreDer / Math.max(1, this.nombreDer.width), 0.5, 1));
    const restante = Math.max(0, duracionRonda(r.modo.fases) - r.reloj);
    const min = Math.floor(restante / 60);
    const seg = Math.floor(restante % 60);
    this.info.setText(`Ronda ${p.numeroRonda} · ${r.modo.nombre} · ${min}:${String(seg).padStart(2, '0')}`);

    this.avisoPocaVida(g);
    for (const panel of this.paneles) this.dibujarPanel(panel, g);
    this.dibujarFlechas();
    this.actualizarSenal();

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

    const red = this.red;
    if (r.pausado && this.tactil) {
      this.textoPausa.setText(''); // en el celular se ve el menú de pausa con botones
    } else if (r.pausado) {
      g.fillStyle(0x0d111d, 0.65).fillRect(0, 0, W, H);
      this.textoPausa.setText('PAUSA\n\nEsc para seguir · M para ir al menú');
    } else if (red && red.parejaAusente) {
      // Tu pareja salió de la app (por ejemplo, a contestar un mensaje): la ronda espera
      g.fillStyle(0x0d111d, 0.6).fillRect(0, 0, W, H);
      this.textoPausa.setText('⏸ Tu pareja salió de la app\n\nLa ronda sigue cuando vuelva');
    } else if (red && red.silencio > 1500) {
      g.fillStyle(0x0d111d, 0.45).fillRect(0, 0, W, H);
      this.textoPausa.setText('📶 Esperando a tu pareja…\n\nLa conexión está lenta');
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
    g.lineStyle(34 * this.f, 0xff3b30, alfa).strokeRect(0, 0, this.W, this.H);
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
    const { cx, cy, f } = this;
    const margen = 52 * f;
    const arriba = this.tamPanel.alto + 46; // las flechas no se meten debajo de los paneles de arriba
    const abajo = this.tactil ? cy + 70 : this.H - margen; // ni encima de los joysticks y botones del celular
    objetivos.forEach((o, k) => {
      if (cam.worldView.contains(o.x, o.y)) return;
      const s = this.aPantalla(o.x, o.y);
      const a = Math.atan2(s.y - cy, s.x - cx);
      const seno = Math.sin(a);
      const t = Math.min(
        (cx - margen) / Math.max(1e-6, Math.abs(Math.cos(a))),
        seno > 0 ? (abajo - cy) / Math.max(1e-6, seno) : (cy - arriba) / Math.max(1e-6, -seno),
      );
      const px = cx + Math.cos(a) * t;
      const py = cy + seno * t;
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
    const { x, y, j, ancho, izq } = panel;
    const f = this.f;
    const { alto } = this.tamPanel;
    const alerta = j.fueraDeZona && Math.floor(this.game.loop.time / 200) % 2 === 0;
    // Si alguien pasa por debajo del panel, el panel se vuelve casi transparente
    const tapa = this.ronda.jugadores.some((o) => {
      const s = this.aPantalla(o.x, o.y);
      return s.x > x - 20 && s.x < x + ancho + 20 && s.y < y + alto + 30;
    });
    const alfa = tapa ? 0.35 : 1;
    panel.nombre.setAlpha(alfa);
    panel.arma.setAlpha(alfa);
    if (panel.cara) {
      panel.cara.anillo.setAlpha(alfa);
      panel.cara.img.setAlpha(alfa);
      // Si cayó, la cara se pone gris
      if (!j.vivo && !panel.cara.gris) {
        panel.cara.gris = true;
        panel.cara.img.setTint(0x777777);
        panel.cara.anillo.setFillStyle(0x555b6e);
      }
    }
    g.fillStyle(0x0d111d, 0.8 * alfa).fillRoundedRect(x, y, ancho, alto, 10);
    g.lineStyle(2, alerta ? 0xff5a4e : UI.borde, alfa).strokeRoundedRect(x, y, ancho, alto, 10);
    if (!panel.cara) g.fillStyle(j.color, alfa).fillRect(x + 4, y + 12, 3, alto - 24);

    const bx = izq + 14 * f;
    const bw = x + ancho - bx - 14 * f;
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
