// Ronda en línea, en el aparato del INVITADO (el que escribió el código).
// No calcula nada del juego: manda sus controles al anfitrión y dibuja las "fotos" que recibe,
// suavizando el movimiento entre una foto y la siguiente.
import Phaser from 'phaser';
import { Ronda } from './Ronda.js';
import { CENTRO } from '../config.js';
import { BOTIQUIN } from '../datos/armas.js';
import { MAPAS } from '../datos/mapas.js';
import { MODOS } from '../datos/modos.js';
import { AIRDROP, estadoZona } from '../datos/zona.js';
import { crearEntradaEnLinea } from '../entrada/entradas.js';
import { Sonido } from '../sistemas/Sonido.js';

const RETRASO = 100; // ms: se dibuja un poquito en el pasado para poder suavizar
const ENVIOS_POR_SEGUNDO = 30;

export class RondaInvitado extends Ronda {
  constructor() {
    super('RondaInvitado');
  }

  create() {
    this.red = this.registry.get('red');
    this.partida = this.registry.get('partida');
    this.mapa = MAPAS[this.partida.mapa];
    this.modo = MODOS[this.partida.modo];
    this.reloj = 0;
    this.escala = 1;
    this.estado = 'cuenta';
    this.cuenta = 2.4;
    this.pausado = false;
    this.saliendo = false;
    this.mensajes = [];
    this.grande = null;
    this.avisos = new Set();
    this.zona = estadoZona(0, this.modo.fases);
    this.fotos = [];
    this.humoAirdrop = null;
    this.humoParado = false;
    this.proximoEnvio = 0;
    this.toquesGuardados = { rodada: false, usar: false, cambiar: false, burla: 0 };
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.cameras.main.setZoom(1).setScroll(0, 0);

    this.crearMapa();
    this.crearEfectos();
    this.cajas = this.modo.cajas ? this.mapa.cajas.map(([x, y]) => this.crearCaja(x, y, false)) : [];
    this.geles = this.add.group();
    this.crearJugadores();
    for (const j of this.jugadores) j.sprite.body.enable = false;
    this.balasVis = [];
    this.granadasVis = [];
    this.recogiblesVis = [];
    this.firmaRecogibles = '';
    this.zonaG = this.add.graphics().setDepth(4);
    this.entrada = crearEntradaEnLinea(this, () => this.jugadores[1]);

    this.events.on('postupdate', this.dibujar, this);
    this.events.once('shutdown', () => {
      this.events.off('postupdate', this.dibujar, this);
      this.scene.stop('HUD');
      if (this.red && this.red.manejador === this.manejador) this.red.manejador = null;
    });
    this.manejador = (t, d) => this.recibir(t, d);
    this.red.manejador = this.manejador;
    this.scene.launch('HUD', { ronda: this.scene.key });
    this.cameras.main.fadeIn(250, 13, 17, 29);
  }

  recibir(t, d) {
    if (t === 'estado') {
      this.fotos.push({ llegada: performance.now(), d });
      if (this.fotos.length > 8) this.fotos.shift();
      this.partida.rondas = d.p[0];
      this.partida.numeroRonda = d.p[1];
      this.reproducir(d.ev);
      return;
    }
    if (t !== 'ventajas' && t !== 'ronda' && t !== 'fin') return;
    // Desde aquí los mensajes esperan en fila hasta que la siguiente escena esté lista
    this.red.manejador = null;
    Object.assign(this.partida, d.partida);
    if (t === 'ventajas') this.salir(() => this.scene.start('Ventajas', { perdedor: d.perdedor, opciones: d.opciones, remoto: 0, siguiente: 'RondaInvitado' }));
    else if (t === 'ronda') this.salir(() => this.scene.restart());
    else this.salir(() => this.scene.start('Victoria', { enLinea: true }));
  }

  salir(fn) {
    if (this.saliendo) return;
    this.saliendo = true;
    this.cameras.main.fadeOut(250, 13, 17, 29);
    this.cameras.main.once('camerafadeoutcomplete', fn);
  }

  alternarPausa() {}

  // Repite los sonidos y efectos que pasaron en el anfitrión
  reproducir(eventos) {
    for (const e of eventos || []) {
      switch (e.e) {
        case 'son': Sonido.tocar(e.n); break;
        case 'fx': this.emisor(e.n)?.explode(e.c, e.x, e.y); break;
        case 'txt': this.textoFlotante(e.x, e.y, e.texto, e.color, e.tam); break;
        case 'flash': this.destello(this.jugadores[e.i]); break;
        case 'burla': this.verBurla(this.jugadores[e.i], e.n); break;
        case 'shake': this.cameras.main.shake(e.d, e.i); break;
        case 'rayo': this.trazo(e.x1, e.y1, e.x2, e.y2); break;
        case 'boom': this.destelloExplosion(e.x, e.y); break;
        case 'rodada': this.fantasma(this.jugadores[e.i]); break;
        case 'msg': this.mensaje(e.t, e.c, e.d); break;
        case 'grande': this.mensajeGrande(e.t, e.c, e.d); break;
        default: break;
      }
    }
  }

  emisor(n) {
    return { chispas: this.fxChispas, humo: this.fxHumo, fuego: this.fxFuego, casquillos: this.fxCasquillos, golpe0: this.fxGolpe[0], golpe1: this.fxGolpe[1] }[n];
  }

  update(time) {
    if (!this.saliendo) this.enviarEntrada(time);
    this.aplicarFotos();
    this.humoDelAirdrop();
  }

  enviarEntrada(time) {
    const e = this.entrada.leer();
    const g = this.toquesGuardados;
    g.rodada = g.rodada || e.rodada;
    g.usar = g.usar || e.usar;
    g.cambiar = g.cambiar || e.cambiar;
    if (e.burla) g.burla = e.burla;
    if (time < this.proximoEnvio) return;
    this.proximoEnvio = time + 1000 / ENVIOS_POR_SEGUNDO;
    const r2 = (v) => Math.round(v * 100) / 100;
    this.red.enviar('entrada', { moverX: r2(e.moverX), moverY: r2(e.moverY), apuntarX: r2(e.apuntarX), apuntarY: r2(e.apuntarY), disparar: e.disparar, ...g });
    this.toquesGuardados = { rodada: false, usar: false, cambiar: false, burla: 0 };
  }

  aplicarFotos() {
    if (!this.fotos.length) return;
    const ahora = performance.now();
    const objetivo = ahora - RETRASO;
    let a = this.fotos[this.fotos.length - 1];
    let b = a;
    for (let i = this.fotos.length - 1; i > 0; i--) {
      if (this.fotos[i - 1].llegada <= objetivo) {
        a = this.fotos[i - 1];
        b = this.fotos[i];
        break;
      }
    }
    const k = a === b ? 1 : Phaser.Math.Clamp((objetivo - a.llegada) / (b.llegada - a.llegada), 0, 1);
    const A = a.d;
    const B = b.d;
    const estadoAntes = this.estado;
    this.reloj = B.t;
    this.estado = B.e;
    this.cuenta = B.cu;
    this.zona = { radio: Phaser.Math.Linear(A.z[0], B.z[0], k), siguiente: B.z[1] < 0 ? null : B.z[1], dano: B.z[2] };
    this.jugadores.forEach((j, i) => this.aplicarJugador(j, A.j[i], B.j[i], k));
    if (this.estado === 'final' && estadoAntes !== 'final') this.camaraFinal();

    const ultima = this.fotos[this.fotos.length - 1];
    const dt = Math.min((ahora - ultima.llegada) / 1000, 0.15);
    this.sincronizarBalas(ultima.d.b, dt);
    this.sincronizarGranadas(ultima.d.g, dt);
    this.sincronizarGeles(B.ge);
    this.sincronizarCajas(B.c);
    this.sincronizarRecogibles(B.rc);
  }

  aplicarJugador(j, A, B, k) {
    j.sprite.setPosition(Phaser.Math.Linear(A[0], B[0], k), Phaser.Math.Linear(A[1], B[1], k));
    j.angulo = A[2] + Phaser.Math.Angle.Wrap(B[2] - A[2]) * k;
    j.vida = B[3];
    j.vidaMax = B[4];
    j.chaleco = B[5];
    if (!B[6] && j.vivo) j.morir();
    if (B[7] !== j.arma) {
      j.arma = B[7];
      j.armaSprite.setTexture(`arma-${B[7]}`);
    }
    j.municion = B[8];
    j.recargandoHasta = B[9] ? 1 : 0;
    j.objetos.botiquin = B[10];
    j.objetos.granada = B[11];
    j.objetos.gel = B[12];
    j.seleccion = B[13];
    j.cargasRodada = B[14];
    j.stats.cargasRodada = B[15];
    if (B[16] >= 0) {
      j.curandoHasta = 1;
      j.curandoDesde = this.reloj - B[16] * BOTIQUIN.tiempo;
    } else {
      j.curandoHasta = 0;
    }
    j.apuntandoHasta = B[17] ? 1 : 0;
    j.fueraDeZona = !!B[18];
  }

  camaraFinal() {
    const caido = this.jugadores.find((j) => !j.vivo);
    if (!caido) return;
    this.cameras.main.pan(caido.x, caido.y, 700, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.25, 700);
  }

  sincronizarBalas(lista, dt) {
    while (this.balasVis.length < lista.length) this.balasVis.push(this.add.image(0, 0, 'bala').setDepth(11));
    this.balasVis.forEach((img, i) => {
      const b = lista[i];
      if (!b) {
        img.setVisible(false);
        return;
      }
      img.setVisible(true).setTexture(b[4] ? 'perdigon' : 'bala')
        .setPosition(b[0] + b[2] * dt, b[1] + b[3] * dt).setRotation(Math.atan2(b[3], b[2]));
    });
  }

  sincronizarGranadas(lista, dt) {
    while (this.granadasVis.length < lista.length) this.granadasVis.push(this.add.image(0, 0, 'granada').setDepth(9));
    this.granadasVis.forEach((img, i) => {
      const g = lista[i];
      if (!g) {
        img.setVisible(false);
        return;
      }
      img.setVisible(true).setPosition(g[0] + g[2] * dt, g[1] + g[3] * dt).setRotation(this.game.loop.time / 120);
    });
  }

  sincronizarGeles(lista) {
    const actuales = this.geles.getChildren();
    while (actuales.length > lista.length) actuales[actuales.length - 1].destroy();
    while (this.geles.getLength() < lista.length) {
      this.geles.add(this.add.rectangle(0, 0, 10, 10, 0x7fe3ff, 0.6).setStrokeStyle(2, 0xd4f6ff).setDepth(7));
    }
    this.geles.getChildren().forEach((rect, i) => {
      const [x, y, w, h, vida] = lista[i];
      if (rect.x !== x || rect.y !== y || rect.width !== w || rect.height !== h) rect.setPosition(x, y).setSize(w, h);
      rect.setFillStyle(0x7fe3ff, 0.35 + 0.25 * vida);
    });
  }

  sincronizarCajas(lista) {
    lista.forEach(([x, y, airdrop, abierta, progreso], i) => {
      let c = this.cajas[i];
      if (!c) {
        c = this.crearCaja(x, y, !!airdrop);
        this.cajas.push(c);
        if (airdrop) {
          c.sprite.setScale(2.4).setAlpha(0);
          this.tweens.add({ targets: c.sprite, scale: 1, alpha: 1, duration: 450, ease: 'Quad.in' });
        }
      }
      if (abierta && !c.abierta) {
        c.abierta = true;
        this.tweens.add({ targets: c.sprite, alpha: 0, scale: 1.4, duration: 200, onComplete: () => c.sprite.destroy() });
      }
      c.anillo.clear();
      if (!c.abierta && progreso > 0) {
        c.anillo.lineStyle(4, 0xf2b544, 1);
        c.anillo.beginPath();
        c.anillo.arc(c.x, c.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, progreso) * Math.PI * 2);
        c.anillo.strokePath();
      }
    });
  }

  sincronizarRecogibles(lista) {
    const firma = JSON.stringify(lista);
    if (firma === this.firmaRecogibles) return;
    this.firmaRecogibles = firma;
    this.recogiblesVis.forEach((o) => o.destroy());
    this.recogiblesVis = lista.map(([x, y, textura]) => this.add.image(x, y, textura).setDepth(5).setScale(1.2));
  }

  humoDelAirdrop() {
    if (!this.modo.airdrop) return;
    if (this.reloj >= AIRDROP.aviso && this.reloj < AIRDROP.cae && !this.humoAirdrop) {
      this.humoAirdrop = this.add.particles(CENTRO.x, CENTRO.y, 'humo', {
        tint: 0xff4a3a, speed: { min: 10, max: 40 }, lifespan: 1600, scale: { start: 0.5, end: 2 }, alpha: { start: 0.5, end: 0 }, frequency: 70,
      }).setDepth(5);
    }
    if (this.reloj >= AIRDROP.cae && this.humoAirdrop && !this.humoParado) {
      this.humoParado = true;
      this.humoAirdrop.stop();
    }
  }
}
