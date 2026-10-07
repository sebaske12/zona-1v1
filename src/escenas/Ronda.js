// La escena donde se juega una ronda: mapa, jugadores, balas, cajas, zona y airdrop.
import Phaser from 'phaser';
import { ANCHO, ALTO, CENTRO, FUENTE, BURLAS, RONDAS_PARA_GANAR, ZOOM_CELULAR } from '../config.js';
import { ARMAS, GRANADA, GEL, CHALECO, nombreArma } from '../datos/armas.js';
import { MAPAS } from '../datos/mapas.js';
import { MODOS } from '../datos/modos.js';
import { BOTIN_AIRDROP, sortear } from '../datos/botin.js';
import { estadoZona, RADIO_INICIAL, AIRDROP } from '../datos/zona.js';
import { statsDeJugador } from '../datos/ventajas.js';
import { Jugador, RADIO_JUGADOR } from '../objetos/Jugador.js';
import { crearEntradasLocales, esTactil } from '../entrada/entradas.js';
import { EntradaBot } from '../entrada/Bot.js';
import { Sonido } from '../sistemas/Sonido.js';
import { Musica } from '../sistemas/Musica.js';

const CUENTA = 2.4; // segundos de "3, 2, 1"

// "Sebas cayó por la escopeta de Ana", "Ana cayó en la zona"…
const ARTICULO = { pistola: 'la', subfusil: 'el', escopeta: 'la', rifle: 'el', franco: 'el', dorado: 'el', cohetes: 'el', granada: 'la' };
function comoCayo(j) {
  if (j.causa === 'zona') return `${j.nombre} cayó en la zona`;
  const golpe = j.ultimoGolpe;
  if (!golpe) return `${j.nombre} cayó`;
  if (golpe.atacante === j) return `${j.nombre} cayó por su propia explosión`;
  const arma = j.causa || golpe.arma;
  return `${j.nombre} cayó por ${ARTICULO[arma] ?? 'el'} ${nombreArma(arma).toLowerCase()} de ${golpe.atacante.nombre}`;
}
const CAMARA_LENTA = { escala: 0.3, dura: 1.6 };

export class Ronda extends Phaser.Scene {
  constructor(clave = 'Ronda') {
    super(clave); // RondaEnLinea y RondaInvitado reutilizan esta clase con otro nombre
  }

  create() {
    this.partida = this.registry.get('partida');
    this.mapa = MAPAS[this.partida.mapa];
    this.modo = MODOS[this.partida.modo];
    this.reloj = 0; // segundos de juego (más lentos en cámara lenta)
    this.escala = 1;
    this.estado = 'cuenta'; // cuenta → jugando → final
    this.cuenta = CUENTA;
    this.pausado = false;
    this.saliendo = false;
    this.avisos = new Set();
    this.mensajes = [];
    this.grande = null;
    this.danoZonaAcum = [0, 0];
    this.humoAirdrop = null;
    this.ganadorRonda = null;
    this.proximoCaos = this.modo.caos || 0;
    this.zona = estadoZona(0, this.modo.fases);

    // Por si la ronda anterior terminó en cámara lenta o en pausa
    this.physics.world.timeScale = 1;
    this.physics.resume();
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.cameras.main.setZoom(1).setScroll(0, 0);

    this.crearMapa();
    this.crearEfectos();
    this.crearGrupos();
    this.crearJugadores();
    this.crearColisiones();

    this.zonaG = this.add.graphics().setDepth(4);
    this.entradas = this.crearEntradas();
    this.indiceLocal = this.scene.key === 'RondaInvitado' ? 1 : 0; // quién juega en este aparato
    this.vistaPropia = this.scene.key !== 'Ronda' || this.partida.bot || esTactil(this);
    this.prepararVista();

    this.events.on('postupdate', this.dibujar, this);
    this.events.once('shutdown', () => {
      this.events.off('postupdate', this.dibujar, this);
      this.scene.stop('HUD');
    });

    this.input.keyboard.on('keydown-ESC', () => this.alternarPausa());
    this.input.keyboard.on('keydown-M', () => { if (this.pausado) this.scene.start('Menu'); });

    this.scene.launch('HUD', { ronda: this.scene.key });
    this.cameras.main.fadeIn(250, 13, 17, 29);
  }

  // En el celular la cámara sigue a tu jugador con zoom: en pantalla chica todo se ve más grande.
  // Cuando hay un solo jugador en este aparato, se le marca con un anillo y "(tú)".
  prepararVista() {
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.removeBounds?.();
    cam.setZoom(1).setScroll(0, 0);
    const propio = this.jugadores[this.indiceLocal];
    if (this.vistaPropia) propio.marcarPropio();
    if (esTactil(this)) {
      // La cámara puede pasarse un poco del borde del mapa: así tu jugador queda cerca del centro
      // y nunca debajo de los botones táctiles
      cam.setBounds(-300, -220, ANCHO + 600, ALTO + 440);
      cam.setZoom(ZOOM_CELULAR);
      cam.startFollow(propio.sprite, false, 0.15, 0.15);
      cam.centerOn(propio.x, propio.y);
    }
  }

  // RondaEnLinea la reemplaza: allá el jugador 2 llega por la red
  crearEntradas() {
    const entradas = crearEntradasLocales(this);
    if (this.partida.bot) entradas[1] = new EntradaBot(this, 1); // modo entrenamiento
    return entradas;
  }

  // ---------- Construcción ----------

  crearMapa() {
    this.add.tileSprite(0, 0, ANCHO, ALTO, 'piso').setOrigin(0).setDepth(0);
    this.aguas = this.mapa.agua.map(([x, y, w, h]) => {
      this.add.tileSprite(x, y, w, h, 'agua').setOrigin(0).setDepth(1).setAlpha(0.9);
      return new Phaser.Geom.Rectangle(x, y, w, h);
    });
    this.muros = this.physics.add.staticGroup();
    this.rectMuros = [];
    for (const [x, y, w, h] of this.mapa.muros) {
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x4d5877).setStrokeStyle(2, 0x2a3249).setDepth(2);
      this.muros.add(r);
      if (h >= 12) this.add.rectangle(x + w / 2, y + 4, w - 6, 3, 0x6f7b9c).setDepth(2);
      this.rectMuros.push(new Phaser.Geom.Rectangle(x, y, w, h));
    }
    this.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO - 4, ALTO - 4).setStrokeStyle(4, 0x2a3249).setDepth(2);
  }

  crearEfectos() {
    this.fxChispas = this.add.particles(0, 0, 'chispa', {
      speed: { min: 60, max: 220 }, lifespan: { min: 150, max: 350 }, scale: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(13);
    this.fxHumo = this.add.particles(0, 0, 'humo', {
      speed: { min: 20, max: 120 }, lifespan: { min: 400, max: 900 }, scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.5, end: 0 }, emitting: false,
    }).setDepth(13);
    this.fxFuego = this.add.particles(0, 0, 'chispa', {
      speed: { min: 100, max: 320 }, lifespan: { min: 200, max: 500 }, scale: { start: 2.5, end: 0 }, tint: [0xffd166, 0xff8a1f, 0xff4a3a], blendMode: 'ADD', emitting: false,
    }).setDepth(13);
    this.fxCasquillos = this.add.particles(0, 0, 'casquillo', {
      speed: { min: 40, max: 90 }, lifespan: 500, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(6);
  }

  crearGrupos() {
    this.balas = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 250 });
    this.geles = this.physics.add.staticGroup();
    this.granadas = this.physics.add.group();
    this.recogibles = this.physics.add.group();
    this.cajas = this.modo.cajas ? this.mapa.cajas.map(([x, y]) => this.crearCaja(x, y, false)) : [];
  }

  crearCaja(x, y, airdrop) {
    const sprite = this.add.image(x, y, airdrop ? 'airdrop' : 'caja').setDepth(3);
    const anillo = this.add.graphics().setDepth(14);
    return { x, y, sprite, anillo, airdrop, abierta: false, progreso: [0, 0], tiempo: airdrop ? 1 : 0.5 };
  }

  crearJugadores() {
    this.jugadores = this.partida.perfiles.map((perfil, i) => {
      const [x, y] = this.mapa.inicio[i];
      const j = new Jugador(this, i, x, y, perfil, statsDeJugador(this.partida, i));
      if (this.modo.vida) j.vidaMax = j.vida = this.modo.vida;
      return j;
    });
    this.fxGolpe = this.jugadores.map((j) => this.add.particles(0, 0, 'chispa', {
      speed: { min: 50, max: 180 }, lifespan: 320, scale: { start: 1.6, end: 0 }, tint: j.color, emitting: false,
    }).setDepth(13));
  }

  crearColisiones() {
    const cuerpos = this.jugadores.map((j) => j.sprite);
    this.physics.add.collider(cuerpos, this.muros);
    this.physics.add.collider(cuerpos, this.geles);
    this.physics.add.collider(cuerpos[0], cuerpos[1]);
    this.physics.add.collider(this.granadas, this.muros);
    this.physics.add.collider(this.granadas, this.geles);
    // Phaser puede entregar los dos objetos en cualquier orden: por eso se revisa cuál es la bala
    this.physics.add.overlap(this.balas, this.muros, (a, b) => this.balaChoca(a.esBala ? a : b));
    this.physics.add.overlap(this.balas, this.geles, (a, b) => {
      const [bala, gel] = a.esBala ? [a, b] : [b, a];
      if (!bala.active) return;
      this.danarGel(gel, bala.dano);
      this.balaChoca(bala);
    });
    this.physics.add.overlap(this.balas, cuerpos, (a, b) => {
      const [bala, cuerpo] = a.esBala ? [a, b] : [b, a];
      this.balaGolpea(bala, cuerpo.jugador);
    });
    this.physics.add.overlap(cuerpos, this.recogibles, (a, b) => {
      const [cuerpo, obj] = a.jugador ? [a, b] : [b, a];
      this.recoger(cuerpo.jugador, obj);
    });
  }

  // ---------- Bucle ----------

  update(time, delta) {
    const realDt = Math.min(delta, 50) / 1000;
    const leidas = this.entradas.map((e) => e.leer());

    if (this.pausado) return;

    if (this.estado === 'cuenta') {
      const antes = Math.ceil(this.cuenta / 0.8);
      this.cuenta -= realDt;
      const ahora = Math.ceil(this.cuenta / 0.8);
      if (ahora !== antes && ahora > 0) Sonido.tocar('cuenta');
      if (this.cuenta <= 0) {
        this.estado = 'jugando';
        Sonido.tocar('ya');
        this.mensajeGrande('¡YA!', '#ffffff', 600);
      }
      return;
    }

    const dt = realDt * this.escala;
    this.reloj += dt;

    if (this.estado === 'jugando') {
      leidas.forEach((intencion, i) => this.jugadores[i].actualizar(intencion, dt));
    } else {
      this.jugadores.forEach((j) => j.vivo && j.sprite.setVelocity(0, 0));
    }

    this.actualizarZona(dt);
    this.actualizarCajas(dt);
    this.actualizarAirdrop();
    this.actualizarCaos();
    this.actualizarBalas(dt);
    this.actualizarGranadas();
    this.actualizarGeles();

    if (this.estado === 'jugando') {
      const vivos = this.jugadores.filter((j) => j.vivo);
      if (vivos.length < 2) this.terminarRonda(vivos[0] || null);
    } else if (this.estado === 'final') {
      this.finalRestante -= realDt;
      if (this.finalRestante <= 0) this.siguiente();
    }
  }

  dibujar() {
    for (const j of this.jugadores) j.dibujar();
    this.dibujarZona();
    // La música se acelera cuando la zona entra en su última fase
    const ultima = this.modo.fases[this.modo.fases.length - 1];
    Musica.poner(this.zona.dano > 0 && this.zona.dano >= ultima.dano ? 'tension' : 'ronda');
  }

  alternarPausa() {
    if (this.estado === 'final' || this.saliendo) return;
    this.pausado = !this.pausado;
    if (this.pausado) this.physics.pause();
    else this.physics.resume();
  }

  // ---------- Zona ----------

  actualizarZona(dt) {
    const fases = this.modo.fases;
    this.zona = estadoZona(this.reloj, fases);
    if (this.reloj >= fases[0].desde - 5 && !this.avisos.has('aviso-zona')) {
      this.avisos.add('aviso-zona');
      this.mensaje('La zona se cierra en 5 s', '#7ea0ff');
      Sonido.tocar('zona');
    }
    fases.forEach((f, i) => {
      const clave = `fase-${i}`;
      if (this.reloj >= f.desde && !this.avisos.has(clave)) {
        this.avisos.add(clave);
        this.mensaje(i === fases.length - 1 ? '¡La zona se cierra del todo!' : '¡La zona se está cerrando!', '#ff7468');
        Sonido.tocar('zona');
      }
    });

    for (const j of this.jugadores) {
      if (!j.vivo) continue;
      const fuera = Phaser.Math.Distance.Between(j.x, j.y, CENTRO.x, CENTRO.y) > this.zona.radio;
      j.fueraDeZona = fuera && this.zona.dano > 0;
      if (!j.fueraDeZona || this.estado !== 'jugando') continue;
      const dano = this.zona.dano * dt;
      j.recibirDano(dano, null, 'zona');
      this.danoZonaAcum[j.indice] += dano;
      if (this.danoZonaAcum[j.indice] >= 5) {
        this.textoFlotante(j.x, j.y - 22, `-${Math.round(this.danoZonaAcum[j.indice])}`, '#ff7468', 14);
        this.danoZonaAcum[j.indice] = 0;
        Sonido.tocar('zonaDano');
      }
      if (!j.vivo) this.alMorir(j);
    }
  }

  dibujarZona() {
    const g = this.zonaG;
    g.clear();
    const r = Math.max(0, this.zona.radio);
    if (r < RADIO_INICIAL - 1) {
      // Todo lo que está fuera del círculo se oscurece en rojo: un anillo hecho de trapecios
      const fuera = 1600;
      const lados = 72;
      g.fillStyle(0x6a1020, 0.34);
      for (let i = 0; i < lados; i++) {
        const a0 = (i / lados) * Math.PI * 2;
        const a1 = ((i + 1) / lados) * Math.PI * 2;
        g.fillPoints([
          { x: CENTRO.x + Math.cos(a0) * r, y: CENTRO.y + Math.sin(a0) * r },
          { x: CENTRO.x + Math.cos(a0) * fuera, y: CENTRO.y + Math.sin(a0) * fuera },
          { x: CENTRO.x + Math.cos(a1) * fuera, y: CENTRO.y + Math.sin(a1) * fuera },
          { x: CENTRO.x + Math.cos(a1) * r, y: CENTRO.y + Math.sin(a1) * r },
        ], true);
      }
      if (r > 0) g.lineStyle(4, 0x7ea0ff, 0.95).strokeCircle(CENTRO.x, CENTRO.y, r);
    }
    if (this.zona.siguiente !== null && this.zona.siguiente > 0) {
      g.lineStyle(2, 0xffffff, 0.35).strokeCircle(CENTRO.x, CENTRO.y, this.zona.siguiente);
    }
  }

  // ---------- Cajas, airdrop y caos ----------

  actualizarCajas(dt) {
    for (const c of this.cajas) {
      if (c.abierta) continue;
      let progreso = 0;
      this.jugadores.forEach((j, i) => {
        const cerca = j.vivo && this.estado === 'jugando' && Phaser.Math.Distance.Between(j.x, j.y, c.x, c.y) < (c.airdrop ? 34 : 28);
        c.progreso[i] = cerca ? c.progreso[i] + dt : 0;
        if (c.progreso[i] >= c.tiempo && !c.abierta) this.abrirCaja(c, j);
        progreso = Math.max(progreso, c.progreso[i] / c.tiempo);
      });
      c.anillo.clear();
      if (!c.abierta && progreso > 0) {
        c.anillo.lineStyle(4, 0xf2b544, 1);
        c.anillo.beginPath();
        c.anillo.arc(c.x, c.y, 26, -Math.PI / 2, -Math.PI / 2 + progreso * Math.PI * 2);
        c.anillo.strokePath();
      }
    }
  }

  abrirCaja(c, j) {
    c.abierta = true;
    c.anillo.clear();
    this.tweens.add({ targets: c.sprite, alpha: 0, scale: 1.4, duration: 200, onComplete: () => c.sprite.destroy() });
    this.fxChispas.explode(10, c.x, c.y);
    Sonido.tocar('abrir');
    this.entregar(j, sortear(c.airdrop ? BOTIN_AIRDROP : this.modo.botin), c.x, c.y);
  }

  entregar(j, contenido, x, y) {
    let nombre = '';
    switch (contenido.tipo) {
      case 'arma':
        j.equipar(contenido.arma);
        nombre = ARMAS[contenido.arma].nombre;
        break;
      case 'botiquin':
        j.darObjeto('botiquin', 1);
        nombre = 'Botiquín';
        break;
      case 'chaleco':
        j.chaleco = CHALECO;
        nombre = 'Chaleco';
        break;
      case 'granada':
        j.darObjeto('granada', 1);
        nombre = 'Granada';
        break;
      case 'gel':
        j.darObjeto('gel', contenido.cantidad || 1);
        nombre = (contenido.cantidad || 1) > 1 ? `${contenido.cantidad} paredes de gel` : 'Pared de gel';
        break;
    }
    this.textoFlotante(x, y - 30, nombre, j.colorCss, 18);
    Sonido.tocar('recoger');
  }

  actualizarAirdrop() {
    if (!this.modo.airdrop) return;
    if (this.reloj >= AIRDROP.aviso && !this.avisos.has('airdrop-aviso')) {
      this.avisos.add('airdrop-aviso');
      this.humoAirdrop = this.add.particles(CENTRO.x, CENTRO.y, 'humo', {
        tint: 0xff4a3a, speed: { min: 10, max: 40 }, lifespan: 1600, scale: { start: 0.5, end: 2 }, alpha: { start: 0.5, end: 0 }, frequency: 70,
      }).setDepth(5);
      this.mensaje('Airdrop en el centro en 5 s', '#ff9d45');
      Sonido.tocar('airdrop');
    }
    if (this.reloj >= AIRDROP.cae && !this.avisos.has('airdrop')) {
      this.avisos.add('airdrop');
      this.humoAirdrop?.stop();
      const c = this.crearCaja(CENTRO.x, CENTRO.y, true);
      c.sprite.setScale(2.4).setAlpha(0);
      this.tweens.add({
        targets: c.sprite, scale: 1, alpha: 1, duration: 450, ease: 'Quad.in',
        onComplete: () => {
          this.cameras.main.shake(150, 0.006);
          this.fxHumo.explode(12, CENTRO.x, CENTRO.y);
          Sonido.tocar('caer');
        },
      });
      this.cajas.push(c);
    }
  }

  actualizarCaos() {
    if (!this.modo.caos || this.estado !== 'jugando' || this.reloj < this.proximoCaos) return;
    this.proximoCaos += this.modo.caos;
    for (const j of this.jugadores) {
      if (!j.vivo) continue;
      for (let intento = 0; intento < 10; intento++) {
        const a = Math.random() * Math.PI * 2;
        const x = Phaser.Math.Clamp(j.x + Math.cos(a) * 70, 30, ANCHO - 30);
        const y = Phaser.Math.Clamp(j.y + Math.sin(a) * 70, 30, ALTO - 30);
        if (this.rectMuros.some((r) => Phaser.Geom.Rectangle.Contains(Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(r), 14, 14), x, y))) continue;
        this.soltarRecogible(x, y, sortear(this.modo.botin));
        break;
      }
    }
    this.mensaje('¡Caos! Cayeron objetos', '#f2b544', 1500);
  }

  soltarRecogible(x, y, contenido) {
    const textura = contenido.tipo === 'arma' ? `arma-${contenido.arma}` : `ico-${contenido.tipo}`;
    const obj = this.recogibles.create(x, y, textura).setDepth(5);
    obj.contenido = contenido;
    obj.body.setSize(28, 28);
    obj.setScale(0);
    this.tweens.add({ targets: obj, scale: 1.2, duration: 250, ease: 'Back.out' });
    this.fxChispas.explode(6, x, y);
  }

  recoger(j, obj) {
    if (!obj.active || !j.vivo || this.estado !== 'jugando') return;
    this.entregar(j, obj.contenido, obj.x, obj.y);
    obj.destroy();
  }

  // ---------- Disparos ----------

  disparo(j, angulo, d) {
    const est = this.partida.estadisticas[j.indice];
    est.disparos += d.balas;
    const bx = j.x + Math.cos(angulo) * 22;
    const by = j.y + Math.sin(angulo) * 22;
    Sonido.tocar(d.sonido);
    if (d.sacudida) this.cameras.main.shake(90, d.sacudida);
    if (d.retroceso) {
      j.sprite.x -= Math.cos(angulo) * d.retroceso;
      j.sprite.y -= Math.sin(angulo) * d.retroceso;
    }
    this.fxCasquillos.explode(1, j.x, j.y);

    if (d.rayo) {
      this.dispararRayo(j, angulo, d, bx, by);
      return;
    }
    const alcance = j.alcance;
    const velocidad = d.velBala * j.stats.velBala;
    for (let i = 0; i < d.balas; i++) {
      const a = angulo + Phaser.Math.DegToRad((Math.random() - 0.5) * d.abertura);
      const bala = this.balas.get(bx, by, 'bala');
      if (!bala) return;
      bala.enableBody(true, bx, by, true, true);
      bala.esBala = true;
      bala.setTexture(d.textura || (d.balas > 1 ? 'perdigon' : 'bala')).setRotation(a).setDepth(11);
      bala.body.setCircle(3, bala.width / 2 - 3, bala.height / 2 - 3);
      bala.dueno = j;
      bala.dano = d.dano;
      bala.arma = j.arma;
      bala.restante = alcance;
      bala.explosivo = d.explosivo || null; // los cohetes explotan
      this.physics.velocityFromRotation(a, velocidad, bala.body.velocity);
    }
  }

  dispararRayo(j, angulo, d, bx, by) {
    const imp = this.impactoRayo(j.x, j.y, angulo, j.alcance, j);
    this.trazo(bx, by, imp.x, imp.y);
    this.fxChispas.explode(8, imp.x, imp.y);
    if (imp.jugador) this.aplicarDano(imp.jugador, d.dano, j, j.arma, imp.x, imp.y);
    else if (imp.gel) this.danarGel(imp.gel, d.dano);
  }

  // Dónde termina un rayo: el primer muro, pared de gel o jugador que toca
  impactoRayo(x, y, angulo, alcance, ignorar) {
    const fx = x + Math.cos(angulo) * alcance;
    const fy = y + Math.sin(angulo) * alcance;
    const linea = new Phaser.Geom.Line(x, y, fx, fy);
    let mejor = { x: fx, y: fy, d: alcance, jugador: null, gel: null };
    const probar = (puntos, extra) => {
      for (const p of puntos) {
        const dd = Phaser.Math.Distance.Between(x, y, p.x, p.y);
        if (dd < mejor.d) mejor = { x: p.x, y: p.y, d: dd, jugador: null, gel: null, ...extra };
      }
    };
    for (const r of this.rectMuros) probar(Phaser.Geom.Intersects.GetLineToRectangle(linea, r), {});
    for (const gel of this.geles.getChildren()) probar(Phaser.Geom.Intersects.GetLineToRectangle(linea, gel.getBounds()), { gel });
    for (const j of this.jugadores) {
      if (j === ignorar || !j.vivo || j.rodando) continue;
      probar(Phaser.Geom.Intersects.GetLineToCircle(linea, new Phaser.Geom.Circle(j.x, j.y, RADIO_JUGADOR)), { jugador: j });
    }
    return mejor;
  }

  hayVision(ax, ay, bx, by) {
    const linea = new Phaser.Geom.Line(ax, ay, bx, by);
    for (const r of this.rectMuros) if (Phaser.Geom.Intersects.LineToRectangle(linea, r)) return false;
    for (const gel of this.geles.getChildren()) if (Phaser.Geom.Intersects.LineToRectangle(linea, gel.getBounds())) return false;
    return true;
  }

  actualizarBalas(dt) {
    for (const b of this.balas.getChildren()) {
      if (!b.active) continue;
      b.restante -= b.body.speed * dt;
      if (b.restante <= 0 && b.explosivo) this.detonar(b);
      else if (b.restante <= 0 || b.x < -40 || b.x > ANCHO + 40 || b.y < -40 || b.y > ALTO + 40) b.disableBody(true, true);
    }
  }

  balaChoca(bala) {
    if (!bala.active) return;
    if (bala.explosivo) {
      this.detonar(bala);
      return;
    }
    this.fxChispas.explode(4, bala.x, bala.y);
    bala.disableBody(true, true);
  }

  balaGolpea(bala, victima) {
    if (!bala.active || !victima || !victima.vivo || bala.dueno === victima) return;
    if (victima.rodando) return; // la rodada esquiva: la bala sigue de largo
    if (bala.explosivo) {
      this.detonar(bala);
      return;
    }
    bala.disableBody(true, true);
    this.aplicarDano(victima, bala.dano, bala.dueno, bala.arma, bala.x, bala.y);
  }

  detonar(bala) {
    const { x, y, dueno, explosivo, arma } = bala;
    bala.disableBody(true, true);
    this.explosion(x, y, dueno, explosivo.dano, explosivo.radio, arma);
  }

  aplicarDano(victima, cantidad, atacante, arma, x, y) {
    const hecho = victima.recibirDano(cantidad, atacante, arma);
    if (hecho <= 0) return;
    if (atacante && atacante !== victima) {
      const est = this.partida.estadisticas[atacante.indice];
      est.dano += hecho;
      est.aciertos++;
      if (atacante.stats.vampiro > 0 && atacante.vivo) {
        atacante.vida = Math.min(atacante.vidaMax, atacante.vida + hecho * atacante.stats.vampiro);
      }
      Sonido.tocar('golpe');
    }
    this.textoFlotante(victima.x + Phaser.Math.Between(-8, 8), victima.y - 22, String(Math.round(hecho)), '#ffffff', 15);
    this.destello(victima);
    this.fxGolpe[victima.indice].explode(6, x ?? victima.x, y ?? victima.y);
    if (!victima.vivo) this.alMorir(victima);
  }

  alMorir(victima) {
    if (victima.contada) return;
    victima.contada = true;
    Sonido.tocar('muerte');
    this.fxHumo.explode(10, victima.x, victima.y);
    const golpe = victima.ultimoGolpe;
    if (golpe && golpe.atacante && golpe.atacante !== victima) {
      const est = this.partida.estadisticas[golpe.atacante.indice];
      est.bajas++;
      est.bajasPorArma[golpe.arma] = (est.bajasPorArma[golpe.arma] || 0) + 1;
    }
  }

  // ---------- Granadas y paredes de gel ----------

  lanzarGranada(j, angulo) {
    const g = this.granadas.create(j.x + Math.cos(angulo) * 18, j.y + Math.sin(angulo) * 18, 'granada').setDepth(9);
    g.body.setCircle(7);
    g.setBounce(0.5).setCollideWorldBounds(true).setDamping(true).setDrag(0.05).setAngularVelocity(420);
    this.physics.velocityFromRotation(angulo, GRANADA.velocidad, g.body.velocity);
    g.dueno = j;
    g.explota = this.reloj + GRANADA.mecha;
    Sonido.tocar('lanzar');
  }

  actualizarGranadas() {
    for (const g of [...this.granadas.getChildren()]) {
      if (this.reloj >= g.explota) this.explotar(g);
    }
  }

  explotar(g) {
    const { x, y } = g;
    const dueno = g.dueno;
    g.destroy();
    this.explosion(x, y, dueno, GRANADA.dano, GRANADA.radio, 'granada');
  }

  // Granadas y cohetes: daño en un círculo. Al que la causó le hace la mitad.
  explosion(x, y, dueno, dano, radio, arma) {
    Sonido.tocar('explosion');
    this.cameras.main.shake(220, 0.012);
    this.fxFuego.explode(30, x, y);
    this.fxHumo.explode(14, x, y);
    this.destelloExplosion(x, y, radio);
    for (const j of this.jugadores) {
      if (!j.vivo) continue;
      if (Phaser.Math.Distance.Between(x, y, j.x, j.y) <= radio + RADIO_JUGADOR) {
        this.aplicarDano(j, j === dueno ? dano * GRANADA.danoPropio : dano, dueno, arma, j.x, j.y);
      }
    }
    for (const gel of [...this.geles.getChildren()]) {
      if (Phaser.Math.Distance.Between(x, y, gel.x, gel.y) <= radio + 40) this.danarGel(gel, dano);
    }
  }

  ponerGel(j, angulo) {
    // Las paredes quedan rectas: horizontales si apuntas arriba o abajo, verticales si apuntas a los lados
    const horizontal = Math.abs(Math.sin(angulo)) > Math.abs(Math.cos(angulo));
    const w = horizontal ? GEL.largo : GEL.grueso;
    const h = horizontal ? GEL.grueso : GEL.largo;
    const x = Phaser.Math.Clamp(j.x + Math.cos(angulo) * GEL.distancia, w / 2, ANCHO - w / 2);
    const y = Phaser.Math.Clamp(j.y + Math.sin(angulo) * GEL.distancia, h / 2, ALTO - h / 2);
    const pared = this.add.rectangle(x, y, w, h, 0x7fe3ff, 0.6).setStrokeStyle(2, 0xd4f6ff).setDepth(7);
    this.geles.add(pared);
    pared.vidaGel = GEL.vida;
    pared.expira = this.reloj + GEL.dura;
    pared.setAlpha(0);
    this.tweens.add({ targets: pared, alpha: 1, duration: 120 });
    this.fxChispas.explode(8, x, y);
    Sonido.tocar('gel');
    return true;
  }

  danarGel(gel, cantidad) {
    if (!gel.active) return;
    gel.vidaGel -= cantidad;
    gel.setFillStyle(0xffffff, 0.8);
    this.time.delayedCall(60, () => gel.active && gel.setFillStyle(0x7fe3ff, 0.35 + 0.25 * Math.max(0, gel.vidaGel / GEL.vida)));
    if (gel.vidaGel <= 0) this.romperGel(gel);
  }

  romperGel(gel) {
    this.fxChispas.explode(14, gel.x, gel.y);
    Sonido.tocar('gelRoto');
    gel.destroy();
  }

  actualizarGeles() {
    for (const gel of [...this.geles.getChildren()]) {
      if (this.reloj >= gel.expira) this.romperGel(gel);
    }
  }

  // ---------- Fin de la ronda ----------

  terminarRonda(ganador) {
    this.estado = 'final';
    this.ganadorRonda = ganador;
    this.escala = CAMARA_LENTA.escala;
    this.physics.world.timeScale = 1 / this.escala;
    this.tweens.timeScale = this.escala;
    this.time.timeScale = this.escala;
    this.finalRestante = CAMARA_LENTA.dura;

    const caido = this.jugadores.find((j) => !j.vivo) || null;
    const cam = this.cameras.main;
    if (caido) {
      cam.stopFollow();
      cam.pan(caido.x, caido.y, 700, 'Sine.easeInOut');
      cam.zoomTo(Math.max(1.25, cam.zoom * 1.15), 700);
    }
    const p = this.partida;
    if (ganador) {
      ganador.festejar();
      p.rondas[ganador.indice]++;
      p.estadisticas[ganador.indice].rondas++;
      Sonido.tocar('ronda');
      this.mensajeGrande(`¡Ronda para ${ganador.nombre}!`, ganador.colorCss, 2500);
      if (caido) this.mensaje(comoCayo(caido), '#e7eaf2', 2500);
    } else {
      this.mensajeGrande('¡Empate! Se repite la ronda', '#e7eaf2', 2500);
    }
  }

  siguiente() {
    if (this.saliendo) return;
    this.saliendo = true;
    const p = this.partida;
    const campeon = p.rondas.findIndex((r) => r >= RONDAS_PARA_GANAR);
    this.cameras.main.fadeOut(300, 13, 17, 29);
    this.cameras.main.once('camerafadeoutcomplete', () => this.irA(campeon));
  }

  irA(campeon) {
    const p = this.partida;
    if (campeon >= 0) {
      p.ganador = campeon;
      this.scene.start('Victoria');
      return;
    }
    p.numeroRonda++;
    if (this.ganadorRonda && !this.modo.sinVentajas) this.scene.start('Ventajas', { perdedor: 1 - this.ganadorRonda.indice });
    else this.scene.restart();
  }

  // ---------- Efectos ----------

  rivalDe(j) {
    return this.jugadores[1 - j.indice];
  }

  factorTerreno(x, y) {
    return this.aguas.some((r) => r.contains(x, y)) ? 0.6 : 1;
  }

  destello(j) {
    if (!j.vivo) return;
    j.destello = true;
    j.boing();
    j.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    j.cabeza?.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => {
      j.destello = false;
      j.sprite.setTintMode(Phaser.TintModes.MULTIPLY).setTint(j.vivo ? j.color : 0x555b6e);
      if (j.cabeza) {
        j.cabeza.setTintMode(Phaser.TintModes.MULTIPLY);
        if (j.vivo) j.cabeza.clearTint();
        else j.cabeza.setTint(0x777777);
      }
    });
  }

  efectoRodada(j) {
    Sonido.tocar('rodada');
    this.fantasma(j);
  }

  // Los efectos solo visuales van aparte para que el modo en línea los pueda repetir
  fantasma(j) {
    const sombra = this.add.image(j.x, j.y, 'cuerpo').setTint(j.color).setAlpha(0.5).setDepth(9);
    this.tweens.add({ targets: sombra, alpha: 0, scale: 1.3, duration: 220, onComplete: () => sombra.destroy() });
  }

  trazo(x1, y1, x2, y2) {
    const g = this.add.graphics().setDepth(12);
    g.lineStyle(3, 0xfff3b0, 1).lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  destelloExplosion(x, y, radio = GRANADA.radio) {
    const flash = this.add.circle(x, y, radio, 0xffd166, 0.45).setDepth(12);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.3, duration: 260, onComplete: () => flash.destroy() });
  }

  efectoCuracion(j) {
    Sonido.tocar('curado');
    this.textoFlotante(j.x, j.y - 30, '+40', '#3fd07f', 18);
  }

  mostrarBurla(j, n) {
    const ahora = this.game.loop.time;
    if (ahora < j.burlaHasta) return;
    j.burlaHasta = ahora + 1200;
    this.verBurla(j, n);
    this.partida.estadisticas[j.indice].burlas++;
    Sonido.tocar('burla');
  }

  verBurla(j, n) {
    if (j.burlaTexto) j.burlaTexto.destroy();
    j.burlaTexto = this.add.text(j.x, j.y - 60, BURLAS[n - 1] || BURLAS[0], { fontSize: '34px' }).setOrigin(0.5).setDepth(22);
    j.burlaInicio = this.game.loop.time;
  }

  textoFlotante(x, y, contenido, color = '#ffffff', tam = 16) {
    const t = this.add.text(x, y, contenido, { fontFamily: FUENTE, fontSize: `${tam}px`, color, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(25).setStroke('#0d111d', 4);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  mensaje(contenido, color = '#e7eaf2', dura = 2600) {
    this.mensajes.push({ texto: contenido, color, hasta: this.game.loop.time + dura });
  }

  mensajeGrande(contenido, color = '#e7eaf2', dura = 1800) {
    this.grande = { texto: contenido, color, hasta: this.game.loop.time + dura };
  }
}
