// Ronda en línea, en el aparato del INVITADO (el que escribió el código).
// Para que no se sienta retraso, TU jugador se mueve, apunta, rueda y dispara aquí mismo, al instante,
// y se le avisa al anfitrión. Lo demás (el rival, la zona, las cajas, el daño) llega en "fotos"
// del anfitrión, que se dibujan suavizadas.
import Phaser from 'phaser';
import { Ronda } from './Ronda.js';
import { TIPOS_BALA } from './RondaEnLinea.js';
import { CENTRO } from '../config.js';
import { BOTIQUIN, GRANADA } from '../datos/armas.js';
import { MAPAS } from '../datos/mapas.js';
import { MODOS } from '../datos/modos.js';
import { AIRDROP, estadoZona } from '../datos/zona.js';
import { crearEntradaEnLinea } from '../entrada/entradas.js';
import { Sonido } from '../sistemas/Sonido.js';
import { Interpolador, Seguidor } from '../red/Interpolacion.js';

const OBJETOS = ['botiquin', 'granada', 'gel'];
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

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
    this.estado = 'cuenta'; // lo que se ve (un poquito en el pasado, suavizado)
    this.estadoAnfitrion = 'cuenta'; // lo último que dijo el anfitrión: con 'jugando' ya te puedes mover
    this.cuenta = 2.4;
    this.pausado = false;
    this.saliendo = false;
    this.mensajes = [];
    this.grande = null;
    this.avisos = new Set();
    this.zona = estadoZona(0, this.modo.fases);
    this.interp = new Interpolador();
    this.seguidor = new Seguidor();
    this.viaVista = this.red.via;
    this.ultimaFoto = null;
    this.humoAirdrop = null;
    this.humoParado = false;
    this.proximoEnvio = 0;
    this.numeroAccion = 0;
    this.pendientes = []; // granadas y geles que usaste y el anfitrión todavía no ha descontado
    this.physics.world.timeScale = 1;
    this.physics.resume();
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.cameras.main.setZoom(1).setScroll(0, 0);

    this.crearMapa();
    this.crearEfectos();
    this.cajas = this.modo.cajas ? this.mapa.cajas.map(([x, y]) => this.crearCaja(x, y, false)) : [];
    this.geles = this.physics.add.staticGroup(); // las del anfitrión y las que acabas de poner
    this.gelesAnfitrion = [];
    this.gelesPropios = [];
    this.balas = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 150 }); // tus balas
    this.granadas = this.physics.add.group(); // tus granadas
    this.crearJugadores();
    this.indiceLocal = 1; // el invitado siempre es el jugador 2
    this.vistaPropia = true;
    this.crearColisionesPropias();
    this.prepararVista();
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

  // Tu jugador choca con los muros, las paredes de gel y el rival; tus balas, con muros, geles y el rival
  crearColisionesPropias() {
    const [rival, yo] = this.jugadores;
    rival.sprite.body.setImmovable(true); // al rival lo mueve el anfitrión
    this.physics.add.collider(yo.sprite, this.muros);
    this.physics.add.collider(yo.sprite, this.geles);
    this.physics.add.collider(yo.sprite, rival.sprite);
    this.physics.add.collider(this.granadas, this.muros);
    this.physics.add.collider(this.granadas, this.geles);
    this.physics.add.overlap(this.balas, this.muros, (a, b) => this.balaChoca(a.esBala ? a : b));
    this.physics.add.overlap(this.balas, this.geles, (a, b) => this.balaChoca(a.esBala ? a : b));
    this.physics.add.overlap(this.balas, rival.sprite, (a, b) => {
      const bala = a.esBala ? a : b;
      if (!bala.active || !rival.vivo || rival.rodandoRed) return;
      if (bala.explosivo) this.detonar(bala);
      else bala.disableBody(true, true); // el daño (y los números) los manda el anfitrión
    });
  }

  // ---------- Lo que llega del anfitrión ----------

  recibir(t, d) {
    if (t === 'estado') {
      if (!d || !d.p || d.p[1] !== this.partida.numeroRonda) return; // es de otra ronda
      if (this.interp.agregar(d.ts, d)) {
        this.ultimaFoto = d;
        this.estadoAnfitrion = d.e;
        this.partida.rondas = d.p[0];
        this.aplicarPropio(d);
      }
      this.reproducir(d.ev);
      return;
    }
    if (t === 'ev') {
      if (d?.r === this.partida.numeroRonda) this.reproducir(d.l);
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
    this.jugadores[1].sprite.setVelocity(0, 0);
    this.cameras.main.fadeOut(250, 13, 17, 29);
    this.cameras.main.once('camerafadeoutcomplete', fn);
  }

  alternarPausa() {}

  // Repite los sonidos y efectos que pasaron en el anfitrión
  // (los marcados con "o" los causaste tú y ya se vieron aquí, sin esperar)
  reproducir(eventos) {
    for (const e of eventos || []) {
      if (e.o) continue;
      switch (e.e) {
        case 'son': Sonido.tocar(e.n); break;
        case 'fx': this.emisor(e.n)?.explode(e.c, e.x, e.y); break;
        case 'txt': this.textoFlotante(e.x, e.y, e.texto, e.color, e.tam); break;
        case 'flash': this.destello(this.jugadores[e.i]); break;
        case 'burla': this.verBurla(this.jugadores[e.i], e.n); break;
        case 'shake': this.cameras.main.shake(e.d, e.i); break;
        case 'rayo': this.trazo(e.x1, e.y1, e.x2, e.y2); break;
        case 'boom': this.destelloExplosion(e.x, e.y, e.r); break;
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

  // Lo que manda el anfitrión sobre TU jugador: vida, si caíste, el arma que recogiste y los objetos
  aplicarPropio(d) {
    const yo = this.jugadores[1];
    const B = d.j[1];
    yo.vida = B[3];
    yo.vidaMax = B[4];
    yo.chaleco = B[5];
    if (!B[6] && yo.vivo) yo.morir();
    if (B[7] !== yo.arma) yo.equipar(B[7]); // recogiste un arma (llega con el cargador lleno)
    this.pendientes = this.pendientes.filter((p) => p.n > (d.ac || 0));
    OBJETOS.forEach((tipo, i) => {
      const usados = this.pendientes.reduce((s, p) => s + (p.tipo === tipo ? p.cuantos : 0), 0);
      yo.objetos[tipo] = Math.max(0, B[10 + i] - usados);
    });
    if (!yo.objetos[yo.seleccion]) yo.seleccion = OBJETOS.find((t) => yo.objetos[t] > 0) || yo.seleccion;
    yo.stats.cargasRodada = B[15];
    yo.fueraDeZona = !!B[18];
  }

  // ---------- Cada cuadro ----------

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const e = this.entrada.leer();
    const yo = this.jugadores[1];
    if (this.red.via !== this.viaVista) {
      this.viaVista = this.red.via;
      this.interp.olvidarRed();
    }
    this.aplicarFotos(dt);
    // Si el anfitrión salió de la app, la ronda está en pausa: tu jugador espera quieto
    if (!this.saliendo && this.estadoAnfitrion === 'jugando' && yo.vivo && !this.red.parejaAusente) {
      this.reloj += dt;
      this.jugarPropio(yo, e, dt);
    } else if (yo.vivo) {
      yo.sprite.setVelocity(0, 0);
    }
    this.actualizarBalas(dt);
    this.actualizarGranadas();
    if (!this.saliendo) this.enviarPropio(time, e);
    this.humoDelAirdrop();
  }

  // Tu jugador, aquí mismo y sin esperar a nadie
  jugarPropio(yo, e, dt) {
    const moviendose = yo.moverYApuntar(e, dt);
    if (yo.curando) {
      if (moviendose || e.disparar) yo.cancelarCuracion();
      else if (this.reloj >= yo.curandoHasta) yo.curandoHasta = 0; // la vida la suma el anfitrión
    }
    yo.actualizarArma(e);
    if (e.cambiar) yo.cambiarObjeto();
    if (e.usar) this.usarPropio(yo);
    if (e.burla) this.mostrarBurla(yo, e.burla);
  }

  // Dónde estás y qué haces, 20 o 30 veces por segundo
  enviarPropio(time, e) {
    if (time < this.proximoEnvio) return;
    const cada = 1000 / (this.red.via === 'directa' ? 30 : 20);
    this.proximoEnvio += cada;
    if (this.proximoEnvio < time) this.proximoEnvio = time + cada;
    const yo = this.jugadores[1];
    this.red.enviarRapido('entrada', {
      r: this.partida.numeroRonda,
      ts: Math.round(performance.now() * 10) / 10,
      x: r1(yo.x), y: r1(yo.y), a: r3(yo.angulo),
      mx: r2(e.moverX), my: r2(e.moverY), d: e.disparar ? 1 : 0,
      m: yo.municion, rc: yo.recargandoHasta > 0 ? 1 : 0, ap: yo.apuntandoHasta > 0 ? 1 : 0,
      cr: yo.cargasRodada, se: yo.seleccion, rd: Math.round(this.interp.retraso),
    });
  }

  // Lo que hiciste (disparos, rodadas, objetos, burlas): llega siempre y en orden
  accion(k, datos = {}) {
    this.numeroAccion++;
    this.red.enviar('accion', { r: this.partida.numeroRonda, n: this.numeroAccion, k, ...datos });
    return this.numeroAccion;
  }

  disparo(j, angulo, d) {
    const { x, y } = j;
    const bx = x + Math.cos(angulo) * 22;
    const by = y + Math.sin(angulo) * 22;
    Sonido.tocar(d.sonido);
    if (d.sacudida) this.cameras.main.shake(90, d.sacudida);
    if (d.retroceso) {
      j.sprite.x -= Math.cos(angulo) * d.retroceso;
      j.sprite.y -= Math.sin(angulo) * d.retroceso;
    }
    this.fxCasquillos.explode(1, x, y);
    if (d.rayo) {
      const imp = this.impactoRayo(x, y, angulo, j.alcance, j);
      this.trazo(bx, by, imp.x, imp.y);
      this.fxChispas.explode(8, imp.x, imp.y);
      this.accion('tiro', { x: r1(x), y: r1(y), a: r3(angulo), arma: j.arma });
      return;
    }
    const velocidad = d.velBala * j.stats.velBala;
    const angulos = [];
    for (let i = 0; i < d.balas; i++) {
      const a = r3(angulo + Phaser.Math.DegToRad((Math.random() - 0.5) * d.abertura));
      angulos.push(a);
      this.crearBala(j, bx, by, a, d, j.arma, velocidad, j.alcance);
    }
    this.accion('tiro', { x: r1(x), y: r1(y), a: r3(angulo), bs: angulos, arma: j.arma });
  }

  efectoRodada(j) {
    super.efectoRodada(j);
    if (j.indice === 1) this.accion('rodada');
  }

  mostrarBurla(j, n) {
    const antes = j.burlaHasta;
    super.mostrarBurla(j, n);
    if (j.indice === 1 && j.burlaHasta !== antes) this.accion('burla', { b: n });
  }

  usarPropio(yo) {
    const antes = { ...yo.objetos };
    yo.usarObjeto(); // el botiquín, la granada o la pared se ven al instante
    const n = this.accion('usar', { tipo: yo.seleccion, a: r3(yo.angulo), x: r1(yo.x), y: r1(yo.y) });
    for (const tipo of OBJETOS) {
      if (yo.objetos[tipo] < antes[tipo]) this.pendientes.push({ n, tipo, cuantos: antes[tipo] - yo.objetos[tipo] });
    }
  }

  // Tu pared de gel aparece ya; cuando llega la del anfitrión, se cambia por esa
  ponerGel(j, angulo) {
    const ok = super.ponerGel(j, angulo);
    const pared = this.geles.getChildren()[this.geles.getLength() - 1];
    if (pared) {
      pared.vence = performance.now() + 2500;
      this.gelesPropios.push(pared);
    }
    return ok;
  }

  // Tus balas, cohetes y granadas solo se ven aquí: el daño lo decide el anfitrión
  detonar(bala) {
    const { x, y, explosivo } = bala;
    bala.disableBody(true, true);
    this.efectosExplosion(x, y, explosivo.radio);
  }

  explotar(g) {
    const { x, y } = g;
    g.destroy();
    this.efectosExplosion(x, y, GRANADA.radio);
  }

  // ---------- Lo demás, suavizado ----------

  aplicarFotos(dtCuadro = 1 / 60) {
    const u = this.ultimaFoto;
    if (!u) return;
    const t = this.interp.hora();
    const s = this.interp.en(t);
    if (!s) return;
    const A = s.a.d;
    const B = s.b.d;
    const k = s.k;
    const kk = Phaser.Math.Clamp(k, 0, 1);
    const estadoAntes = this.estado;
    this.estado = B.e;
    this.cuenta = Phaser.Math.Linear(A.cu, B.cu, kk);
    this.zona = { radio: Phaser.Math.Linear(A.z[0], B.z[0], kk), siguiente: B.z[1] < 0 ? null : B.z[1], dano: B.z[2] };
    this.aplicarRival(this.jugadores[0], A.j[0], B.j[0], k, dtCuadro);
    if (this.estado === 'final' && estadoAntes !== 'final') this.camaraFinal();

    // Balas y granadas del rival: desde la foto de ese momento, avanzadas hasta el instante exacto
    const base = this.interp.ultimaHasta(t);
    const dt = Phaser.Math.Clamp((t - base.ts) / 1000, 0, 0.15);
    this.sincronizarBalas(base.d.b, dt);
    this.sincronizarGranadas(base.d.g, dt);
    // Paredes, cajas y objetos del suelo: lo más nuevo (para que choques con lo que de verdad hay)
    this.sincronizarGeles(u.ge);
    this.sincronizarCajas(u.c);
    this.sincronizarRecogibles(u.rc);
  }

  aplicarRival(j, A, B, k, dt) {
    // k > 1: el paquete se atrasó y se sigue el movimiento un poquito para que no se congele
    const p = this.seguidor.ir(Phaser.Math.Linear(A[0], B[0], k), Phaser.Math.Linear(A[1], B[1], k), dt);
    j.sprite.setPosition(p.x, p.y);
    j.angulo = A[2] + Phaser.Math.Angle.Wrap(B[2] - A[2]) * Math.min(k, 1);
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
    j.rodandoRed = !!B[19];
  }

  camaraFinal() {
    const caido = this.jugadores.find((j) => !j.vivo);
    if (!caido) return;
    this.jugadores.find((j) => j.vivo)?.festejar();
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(caido.x, caido.y, 700, 'Sine.easeInOut');
    cam.zoomTo(Math.max(1.25, cam.zoom * 1.15), 700);
  }

  sincronizarBalas(lista, dt) {
    const delRival = (lista || []).filter((b) => b[5] !== 1); // las tuyas ya se ven, sin esperar
    while (this.balasVis.length < delRival.length) this.balasVis.push(this.add.image(0, 0, 'bala').setDepth(11));
    this.balasVis.forEach((img, i) => {
      const b = delRival[i];
      if (!b) {
        img.setVisible(false);
        return;
      }
      img.setVisible(true).setTexture(TIPOS_BALA[b[4]] || 'bala')
        .setPosition(b[0] + b[2] * dt, b[1] + b[3] * dt).setRotation(Math.atan2(b[3], b[2]));
    });
  }

  sincronizarGranadas(lista, dt) {
    const delRival = (lista || []).filter((g) => g[4] !== 1);
    while (this.granadasVis.length < delRival.length) this.granadasVis.push(this.add.image(0, 0, 'granada').setDepth(9));
    this.granadasVis.forEach((img, i) => {
      const g = delRival[i];
      if (!g) {
        img.setVisible(false);
        return;
      }
      img.setVisible(true).setPosition(g[0] + g[2] * dt, g[1] + g[3] * dt).setRotation(this.game.loop.time / 120);
    });
  }

  sincronizarGeles(lista = []) {
    const lista2 = lista || [];
    const anfitrion = this.gelesAnfitrion;
    while (anfitrion.length > lista2.length) anfitrion.pop().destroy();
    while (anfitrion.length < lista2.length) {
      const rect = this.add.rectangle(0, 0, 10, 10, 0x7fe3ff, 0.6).setStrokeStyle(2, 0xd4f6ff).setDepth(7);
      this.geles.add(rect);
      anfitrion.push(rect);
    }
    anfitrion.forEach((rect, i) => {
      const [x, y, w, h, vida] = lista2[i];
      if (rect.x !== x || rect.y !== y || rect.width !== w || rect.height !== h) {
        rect.setPosition(x, y).setSize(w, h);
        rect.body?.updateFromGameObject();
      }
      rect.setFillStyle(0x7fe3ff, 0.35 + 0.25 * vida);
    });
    // Tu pared provisional se quita cuando llega la de verdad (o si el anfitrión no la puso)
    const ahora = performance.now();
    this.gelesPropios = this.gelesPropios.filter((p) => {
      if (!p.active) return false;
      const llego = lista2.some(([x, y, w]) => Math.abs(x - p.x) < 10 && Math.abs(y - p.y) < 10 && Math.abs(w - p.width) < 2);
      if (llego || ahora > p.vence) {
        p.destroy();
        return false;
      }
      return true;
    });
  }

  sincronizarCajas(lista) {
    (lista || []).forEach(([x, y, airdrop, abierta, progreso], i) => {
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

  sincronizarRecogibles(lista = []) {
    const firma = JSON.stringify(lista);
    if (firma === this.firmaRecogibles) return;
    this.firmaRecogibles = firma;
    this.recogiblesVis.forEach((o) => o.destroy());
    this.recogiblesVis = (lista || []).map(([x, y, textura]) => this.add.image(x, y, textura).setDepth(5).setScale(1.2));
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
