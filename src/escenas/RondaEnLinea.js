// Ronda en línea, en el aparato del ANFITRIÓN (el que creó la sala).
// Es la misma Ronda de siempre, con dos diferencias para que ninguno de los dos sienta retraso:
// - El jugador 2 se mueve y dispara en SU aparato, sin esperar. Aquí llega su posición (suavizada)
//   y sus disparos, que se adelantan lo que tardaron en llegar para que vayan a la par.
// - 20 o 30 veces por segundo se le manda al invitado una "foto" de todo lo que hay en pantalla.
// Lo que pasa de verdad (daño, cajas, zona, quién gana) lo sigue decidiendo este aparato.
import Phaser from 'phaser';
import { Ronda } from './Ronda.js';
import { Sonido } from '../sistemas/Sonido.js';
import { crearEntradaEnLinea } from '../entrada/entradas.js';
import { ARMAS, BOTIQUIN, GEL } from '../datos/armas.js';
import { sortearOpciones } from '../datos/ventajas.js';
import { resumenPartida } from '../sistemas/Partida.js';
import { RODADA, RADIO_JUGADOR } from '../objetos/Jugador.js';
import { Interpolador, Seguidor } from '../red/Interpolacion.js';

export const TIPOS_BALA = ['bala', 'perdigon', 'cohete'];
const OBJETOS = ['botiquin', 'granada', 'gel'];
const QUIETO = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, rodada: false, usar: false, cambiar: false, burla: 0 };
const MAX_ADELANTO = 0.2; // s: lo máximo que se adelanta un disparo que llega tarde
// ms: lo máximo que se "rebobina" al anfitrión para revisar los disparos del invitado
// (él apuntó al anfitrión que veía en su pantalla, que es el de hace un ratito)
const MAX_REBOBINAR = 320;

export class RondaEnLinea extends Ronda {
  constructor() {
    super('RondaEnLinea');
  }

  create() {
    this.red = this.registry.get('red');
    this.salientes = []; // efectos y sonidos que el invitado debe repetir
    this.proximoEnvio = 0;
    this.propio = false; // true mientras se hacen efectos que el invitado ya hizo en su aparato
    this.remoto = { ultima: null, interp: new Interpolador(), seguidor: new Seguidor(), acciones: [], apuntando: false, ultimaAccion: 0 };
    this.historial = []; // dónde estuvo el anfitrión hace un ratito (para revisar los disparos del invitado)
    this.viaVista = this.red.via;
    super.create();

    // El jugador 2 lo mueve el otro aparato: aquí no lo empujan ni los muros ni el jugador 1
    this.jugadores[1].sprite.body.setImmovable(true);

    // Todo sonido, partícula y sacudida también se anota para el invitado
    const tocar = Sonido.tocar;
    Sonido.tocar = (n) => { this.anotar({ e: 'son', n }); tocar.call(Sonido, n); };
    const emisores = { chispas: this.fxChispas, humo: this.fxHumo, fuego: this.fxFuego, casquillos: this.fxCasquillos, golpe0: this.fxGolpe[0], golpe1: this.fxGolpe[1] };
    for (const [n, em] of Object.entries(emisores)) {
      const explotar = em.explode.bind(em);
      em.explode = (c, x, y) => {
        this.anotar({ e: 'fx', n, c, x: Math.round(x), y: Math.round(y) });
        return explotar(c, x, y);
      };
    }
    const cam = this.cameras.main;
    if (!cam.sacudirOriginal) cam.sacudirOriginal = cam.shake.bind(cam);
    cam.shake = (d, i) => { this.anotar({ e: 'shake', d, i }); return cam.sacudirOriginal(d, i); };

    this.red.manejador = (t, d) => this.recibir(t, d);
    this.events.once('shutdown', () => {
      Sonido.tocar = tocar;
      cam.shake = cam.sacudirOriginal;
      if (this.red) this.red.manejador = null;
    });
  }

  // Los efectos que causa el jugador 2 se marcan: su aparato ya los mostró sin esperar
  anotar(e) {
    if (this.propio) e.o = 1;
    this.salientes.push(e);
  }

  conPropio(j, fn) {
    const antes = this.propio;
    this.propio = j?.indice === 1;
    try {
      return fn();
    } finally {
      this.propio = antes;
    }
  }

  recibir(t, d) {
    if (!d || d.r !== this.partida.numeroRonda) return; // es de otra ronda
    if (t === 'entrada') {
      if (this.remoto.interp.agregar(d.ts, d)) this.remoto.ultima = d;
    } else if (t === 'accion') {
      this.remoto.acciones.push(d);
    }
  }

  crearEntradas() {
    // El jugador 2 no tiene entrada aquí: llega ya movido desde su aparato
    return [crearEntradaEnLinea(this, () => this.jugadores[0]), { leer: () => QUIETO }];
  }

  alternarPausa() {
    // En línea no hay pausa: el otro seguiría esperando
  }

  actualizarJugador(j, intencion, dt) {
    if (j.indice === 0) j.actualizar(intencion, dt);
    else this.actualizarRemoto(j, dt);
  }

  // El jugador 2: su posición suavizada y lo que hizo (disparos, rodadas, objetos)
  actualizarRemoto(j, dt) {
    const r = this.remoto;
    for (const a of r.acciones.splice(0)) {
      if (j.vivo) this.accionRemota(j, a);
      r.ultimaAccion = Math.max(r.ultimaAccion, a.n || 0);
    }
    if (!j.vivo) return;
    j.sprite.setVelocity(0, 0);
    const s = r.interp.en(r.interp.hora());
    if (s) {
      const A = s.a.d;
      const B = s.b.d;
      const k = s.k;
      const p = r.seguidor.ir(Phaser.Math.Linear(A.x, B.x, k), Phaser.Math.Linear(A.y, B.y, k), dt);
      j.sprite.setPosition(p.x, p.y);
      j.angulo = A.a + Phaser.Math.Angle.Wrap(B.a - A.a) * Math.min(k, 1);
    }
    const u = r.ultima;
    if (!u) return;
    j.municion = u.m;
    j.recargandoHasta = u.rc ? 1 : 0;
    j.cargasRodada = u.cr;
    if (OBJETOS.includes(u.se)) j.seleccion = u.se;
    const apunta = !!u.ap;
    if (apunta && !r.apuntando) this.conPropio(j, () => Sonido.tocar('apuntar'));
    r.apuntando = apunta;
    j.apuntandoHasta = apunta ? 1 : 0;
    j.actualizarCuracion(u.mx * u.mx + u.my * u.my > 0.04 || !!u.d);
  }

  accionRemota(j, a) {
    switch (a.k) {
      case 'tiro': this.tiroRemoto(j, a); break;
      case 'rodada':
        j.rodandoHasta = this.reloj + RODADA.dura;
        j.cancelarCuracion();
        this.conPropio(j, () => this.efectoRodada(j));
        break;
      case 'usar': this.usarRemoto(j, a); break;
      case 'burla': this.conPropio(j, () => this.mostrarBurla(j, a.b)); break;
      default: break;
    }
  }

  // Cuánto tardó en llegar lo que mandó el invitado (la mitad del ping)
  adelanto() {
    return Math.min(MAX_ADELANTO, (this.red?.rtt || 0) / 2000);
  }

  // Un disparo del invitado: sale de donde él estaba, hacia donde apuntaba,
  // y la bala se adelanta lo que tardó el aviso en llegar
  tiroRemoto(j, a) {
    if (![a.x, a.y, a.a].every(Number.isFinite)) return;
    const arma = ARMAS[a.arma] ? a.arma : j.arma;
    const d = ARMAS[arma];
    this.partida.estadisticas[1].disparos += d.balas;
    const bx = a.x + Math.cos(a.a) * 22;
    const by = a.y + Math.sin(a.a) * 22;
    this.conPropio(j, () => {
      Sonido.tocar(d.sonido);
      this.fxCasquillos.explode(1, a.x, a.y);
    });
    if (d.rayo) {
      const imp = this.conRebobinado(() => this.impactoRayo(a.x, a.y, a.a, d.alcance * j.stats.alcance, j));
      this.conPropio(j, () => {
        this.trazo(bx, by, imp.x, imp.y);
        this.fxChispas.explode(8, imp.x, imp.y);
      });
      if (imp.jugador) this.aplicarDano(imp.jugador, d.dano, j, arma, imp.x, imp.y);
      else if (imp.gel) this.danarGel(imp.gel, d.dano);
      return;
    }
    const velocidad = d.velBala * j.stats.velBala;
    const alcance = d.alcance * j.stats.alcance;
    const angulos = Array.isArray(a.bs) && a.bs.length ? a.bs.slice(0, 12).filter(Number.isFinite) : [a.a];
    const adelanto = this.adelanto();
    for (const ang of angulos) {
      // Se adelanta sin atravesar muros ni paredes de gel: si en el camino hay una, queda justo antes
      let avance = velocidad * adelanto;
      if (avance > 0) avance = Math.max(0, Math.min(avance, this.impactoRayo(bx, by, ang, avance, j, false).d - 2));
      if (!this.crearBala(j, bx + Math.cos(ang) * avance, by + Math.sin(ang) * avance, ang, d, arma, velocidad, alcance - avance)) return;
    }
  }

  // Cuánto atrás está lo que ve el invitado: lo que tardan en llegarle las fotos más su suavizado
  rebobinado() {
    return Math.min(MAX_REBOBINAR, (this.red?.rtt || 0) / 2 + (this.remoto.ultima?.rd || 0));
  }

  // Dónde estaba el anfitrión hace "ms" milisegundos
  posicionAtras(ms) {
    const h = this.historial;
    const yo = this.jugadores[0];
    if (!h.length) return { x: yo.x, y: yo.y };
    const momento = performance.now() - ms;
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= momento) {
        const a = h[i - 1];
        const b = h[i];
        const k = Phaser.Math.Clamp((momento - a.t) / Math.max(1, b.t - a.t), 0, 1);
        return { x: Phaser.Math.Linear(a.x, b.x, k), y: Phaser.Math.Linear(a.y, b.y, k) };
      }
    }
    return { x: h[0].x, y: h[0].y };
  }

  // El invitado apuntó al anfitrión que veía en su pantalla, que es el de hace un ratito:
  // para el francotirador se revisa el golpe contra esa posición
  conRebobinado(fn) {
    const yo = this.jugadores[0];
    if (!yo.vivo) return fn();
    const antes = this.posicionAtras(this.rebobinado());
    const { x, y } = yo.sprite;
    yo.sprite.x = antes.x;
    yo.sprite.y = antes.y;
    try {
      return fn();
    } finally {
      yo.sprite.x = x;
      yo.sprite.y = y;
    }
  }

  // Igual con las balas del invitado: le pegan al anfitrión si en la pantalla del invitado le pegaron.
  // (Las del anfitrión ya le pegan al invitado que se ve aquí, así que es justo para los dos.)
  balaGolpea(bala, victima) {
    if (bala.dueno?.indice === 1 && victima?.indice === 0) return; // se revisa en golpesDelInvitado
    super.balaGolpea(bala, victima);
  }

  golpesDelInvitado() {
    const yo = this.jugadores[0];
    if (!yo.vivo || this.estado !== 'jugando') return;
    const p = this.posicionAtras(this.rebobinado());
    for (const b of this.balas.getChildren()) {
      if (!b.active || b.dueno?.indice !== 1) continue;
      if (Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) <= RADIO_JUGADOR + 3) super.balaGolpea(b, yo);
    }
  }

  usarRemoto(j, a) {
    if (OBJETOS.includes(a.tipo)) j.seleccion = a.tipo;
    const { x, y } = j.sprite;
    // Se usa desde donde estaba el invitado cuando tocó el botón
    if (Number.isFinite(a.x) && Number.isFinite(a.y)) j.sprite.setPosition(a.x, a.y);
    if (Number.isFinite(a.a)) j.angulo = a.a;
    this.conPropio(j, () => j.usarObjeto());
    j.sprite.setPosition(x, y);
  }

  lanzarGranada(j, angulo) {
    super.lanzarGranada(j, angulo);
    if (j.indice !== 1) return;
    // La granada del invitado también se adelanta lo que tardó en llegar el aviso
    const g = this.granadas.getChildren()[this.granadas.getLength() - 1];
    const adelanto = this.adelanto();
    if (!g || !adelanto) return;
    g.explota -= adelanto;
    const v = g.body.velocity;
    const avance = Math.min(v.length() * adelanto, this.impactoRayo(g.x, g.y, Math.atan2(v.y, v.x), v.length() * adelanto + 1, j, false).d - 8);
    if (avance > 0) g.setPosition(g.x + Math.cos(Math.atan2(v.y, v.x)) * avance, g.y + Math.sin(Math.atan2(v.y, v.x)) * avance);
  }

  sacudidaDisparo(j, intensidad) {
    // Cada uno siente solo sus propios disparos
    if (j.indice === 0) this.cameras.main.sacudirOriginal(90, intensidad);
  }

  balaChoca(bala) {
    // Las chispas de las balas del invitado ya salieron en su aparato (los cohetes se marcan en la explosión)
    if (bala.explosivo) super.balaChoca(bala);
    else this.conPropio(bala.dueno, () => super.balaChoca(bala));
  }

  efectosExplosion(x, y, radio, dueno) {
    this.conPropio(dueno, () => super.efectosExplosion(x, y, radio));
  }

  update(time, delta) {
    if (this.red.via !== this.viaVista) {
      this.viaVista = this.red.via;
      this.remoto.interp.olvidarRed();
    }
    super.update(time, delta);
    const yo = this.jugadores[0];
    const ahora = performance.now();
    this.historial.push({ t: ahora, x: yo.x, y: yo.y });
    while (this.historial.length > 2 && ahora - this.historial[0].t > 800) this.historial.shift();
    this.golpesDelInvitado();

    // Por el camino directo cabe una foto cada 33 ms; por el servidor, una cada 50 ms
    const directa = this.red.via === 'directa';
    const cada = 1000 / (directa ? 30 : 20);
    if (this.saliendo || time < this.proximoEnvio) return;
    this.proximoEnvio += cada;
    if (this.proximoEnvio < time) this.proximoEnvio = time + cada;
    const foto = this.foto();
    if (directa) {
      // Los efectos van aparte, por el canal que no pierde mensajes
      if (this.salientes.length) this.red.enviar('ev', { r: this.partida.numeroRonda, l: this.salientes });
      this.salientes = [];
      this.red.enviarRapido('estado', foto);
    } else {
      foto.ev = this.salientes;
      if (this.red.enviarRapido('estado', foto)) this.salientes = [];
    }
  }

  // Todo lo que el invitado necesita para dibujar la ronda (números redondeados para que pese poco)
  foto() {
    const r = Math.round;
    const ahora = this.game.loop.time;
    const msg = this.mensajes[this.mensajes.length - 1];
    return {
      ts: Math.round(performance.now() * 10) / 10,
      t: +this.reloj.toFixed(2),
      e: this.estado,
      cu: +this.cuenta.toFixed(2),
      z: [r(this.zona.radio), this.zona.siguiente === null ? -1 : r(this.zona.siguiente), this.zona.dano],
      j: this.jugadores.map((j) => [
        r(j.x), r(j.y), +j.angulo.toFixed(2), +j.vida.toFixed(1), j.vidaMax, r(j.chaleco), j.vivo ? 1 : 0,
        j.arma, j.municion, j.recargandoHasta > 0 ? 1 : 0,
        j.objetos.botiquin, j.objetos.granada, j.objetos.gel, j.seleccion, j.cargasRodada, j.stats.cargasRodada,
        j.curando ? +((this.reloj - j.curandoDesde) / BOTIQUIN.tiempo).toFixed(2) : -1,
        j.apuntandoHasta > 0 ? 1 : 0, j.fueraDeZona ? 1 : 0, j.rodando ? 1 : 0,
      ]),
      b: this.balas.getChildren().filter((b) => b.active).map((b) => [r(b.x), r(b.y), r(b.body.velocity.x), r(b.body.velocity.y), TIPOS_BALA.indexOf(b.texture.key), b.dueno?.indice ?? 0]),
      g: this.granadas.getChildren().map((g) => [r(g.x), r(g.y), r(g.body.velocity.x), r(g.body.velocity.y), g.dueno?.indice ?? 0]),
      ge: this.geles.getChildren().map((g) => [r(g.x), r(g.y), r(g.width), r(g.height), +Math.max(0, g.vidaGel / GEL.vida).toFixed(2)]),
      c: this.cajas.map((c) => [c.x, c.y, c.airdrop ? 1 : 0, c.abierta ? 1 : 0, +Math.max(...c.progreso.map((p) => p / c.tiempo)).toFixed(2)]),
      rc: this.recogibles.getChildren().map((o) => [r(o.x), r(o.y), o.texture.key]),
      p: [this.partida.rondas, this.partida.numeroRonda],
      ac: this.remoto.ultimaAccion, // hasta qué acción del invitado ya se hizo
      m: msg && ahora < msg.hasta ? 1 : 0,
    };
  }

  // Efectos visuales que el invitado también debe ver
  textoFlotante(x, y, contenido, color, tam) {
    this.anotar({ e: 'txt', x: Math.round(x), y: Math.round(y), texto: contenido, color, tam });
    super.textoFlotante(x, y, contenido, color, tam);
  }

  destello(j) {
    this.anotar({ e: 'flash', i: j.indice });
    super.destello(j);
  }

  verBurla(j, n) {
    this.anotar({ e: 'burla', i: j.indice, n });
    super.verBurla(j, n);
  }

  fantasma(j) {
    this.anotar({ e: 'rodada', i: j.indice });
    super.fantasma(j);
  }

  trazo(x1, y1, x2, y2) {
    this.anotar({ e: 'rayo', x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2) });
    super.trazo(x1, y1, x2, y2);
  }

  destelloExplosion(x, y, radio) {
    this.anotar({ e: 'boom', x: Math.round(x), y: Math.round(y), r: radio });
    super.destelloExplosion(x, y, radio);
  }

  mensaje(contenido, color, dura) {
    this.anotar({ e: 'msg', t: contenido, c: color, d: dura });
    super.mensaje(contenido, color, dura);
  }

  mensajeGrande(contenido, color, dura) {
    this.anotar({ e: 'grande', t: contenido, c: color, d: dura });
    super.mensajeGrande(contenido, color, dura);
  }

  // Al terminar la ronda, el anfitrión decide a dónde van los dos
  irA(campeon) {
    const p = this.partida;
    if (campeon >= 0) {
      p.ganador = campeon;
      this.red.enviar('fin', { partida: resumenPartida(p) });
      this.scene.start('Victoria', { enLinea: true });
      return;
    }
    p.numeroRonda++;
    if (this.ganadorRonda && !this.modo.sinVentajas) {
      const perdedor = 1 - this.ganadorRonda.indice;
      const opciones = sortearOpciones(p);
      this.red.enviar('ventajas', { perdedor, opciones, partida: resumenPartida(p) });
      this.scene.start('Ventajas', { perdedor, opciones, remoto: 1, siguiente: 'RondaEnLinea' });
    } else {
      this.red.enviar('ronda', { partida: resumenPartida(p) });
      this.scene.restart();
    }
  }
}
