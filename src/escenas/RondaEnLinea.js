// Ronda en línea, en el aparato del ANFITRIÓN (el que creó la sala).
// Es la misma Ronda de siempre, pero el jugador 2 llega por la red y, 20 veces por segundo,
// se le manda al invitado una "foto" de todo lo que hay en pantalla.
import { Ronda } from './Ronda.js';
import { Sonido } from '../sistemas/Sonido.js';
import { EntradaRed } from '../entrada/Red.js';
import { crearEntradaEnLinea } from '../entrada/entradas.js';
import { BOTIQUIN, GEL } from '../datos/armas.js';
import { sortearOpciones } from '../datos/ventajas.js';
import { resumenPartida } from '../sistemas/Partida.js';

const ENVIOS_POR_SEGUNDO = 20;

export class RondaEnLinea extends Ronda {
  constructor() {
    super('RondaEnLinea');
  }

  create() {
    this.red = this.registry.get('red');
    this.salientes = []; // efectos y sonidos que el invitado debe repetir
    this.proximoEnvio = 0;
    super.create();

    // Todo sonido, partícula y sacudida también se anota para el invitado
    const anotar = (e) => this.salientes.push(e);
    const tocar = Sonido.tocar;
    Sonido.tocar = (n) => { anotar({ e: 'son', n }); tocar.call(Sonido, n); };
    const emisores = { chispas: this.fxChispas, humo: this.fxHumo, fuego: this.fxFuego, casquillos: this.fxCasquillos, golpe0: this.fxGolpe[0], golpe1: this.fxGolpe[1] };
    for (const [n, em] of Object.entries(emisores)) {
      const explotar = em.explode.bind(em);
      em.explode = (c, x, y) => {
        anotar({ e: 'fx', n, c, x: Math.round(x), y: Math.round(y) });
        return explotar(c, x, y);
      };
    }
    const cam = this.cameras.main;
    if (!cam.sacudirOriginal) cam.sacudirOriginal = cam.shake.bind(cam);
    cam.shake = (d, i) => { anotar({ e: 'shake', d, i }); return cam.sacudirOriginal(d, i); };

    this.red.manejador = (t, d) => { if (t === 'entrada') this.entradaRemota.recibir(d); };
    this.events.once('shutdown', () => {
      Sonido.tocar = tocar;
      cam.shake = cam.sacudirOriginal;
      if (this.red) this.red.manejador = null;
    });
  }

  crearEntradas() {
    this.entradaRemota = new EntradaRed();
    return [crearEntradaEnLinea(this, () => this.jugadores[0]), this.entradaRemota];
  }

  alternarPausa() {
    // En línea no hay pausa: el otro seguiría esperando
  }

  update(time, delta) {
    super.update(time, delta);
    if (!this.saliendo && time >= this.proximoEnvio) {
      this.proximoEnvio = time + 1000 / ENVIOS_POR_SEGUNDO;
      this.red.enviar('estado', this.foto());
      this.salientes = [];
    }
  }

  // Todo lo que el invitado necesita para dibujar la ronda (números redondeados para que pese poco)
  foto() {
    const r = Math.round;
    const ahora = this.game.loop.time;
    const msg = this.mensajes[this.mensajes.length - 1];
    return {
      t: +this.reloj.toFixed(2),
      e: this.estado,
      cu: +this.cuenta.toFixed(2),
      z: [r(this.zona.radio), this.zona.siguiente === null ? -1 : r(this.zona.siguiente), this.zona.dano],
      j: this.jugadores.map((j) => [
        r(j.x), r(j.y), +j.angulo.toFixed(2), +j.vida.toFixed(1), j.vidaMax, r(j.chaleco), j.vivo ? 1 : 0,
        j.arma, j.municion, j.recargandoHasta > 0 ? 1 : 0,
        j.objetos.botiquin, j.objetos.granada, j.objetos.gel, j.seleccion, j.cargasRodada, j.stats.cargasRodada,
        j.curando ? +((this.reloj - j.curandoDesde) / BOTIQUIN.tiempo).toFixed(2) : -1,
        j.apuntandoHasta > 0 ? 1 : 0, j.fueraDeZona ? 1 : 0,
      ]),
      b: this.balas.getChildren().filter((b) => b.active).map((b) => [r(b.x), r(b.y), r(b.body.velocity.x), r(b.body.velocity.y), b.texture.key === 'perdigon' ? 1 : 0]),
      g: this.granadas.getChildren().map((g) => [r(g.x), r(g.y), r(g.body.velocity.x), r(g.body.velocity.y)]),
      ge: this.geles.getChildren().map((g) => [r(g.x), r(g.y), r(g.width), r(g.height), +Math.max(0, g.vidaGel / GEL.vida).toFixed(2)]),
      c: this.cajas.map((c) => [c.x, c.y, c.airdrop ? 1 : 0, c.abierta ? 1 : 0, +Math.max(...c.progreso.map((p) => p / c.tiempo)).toFixed(2)]),
      rc: this.recogibles.getChildren().map((o) => [r(o.x), r(o.y), o.texture.key]),
      p: [this.partida.rondas, this.partida.numeroRonda],
      ev: this.salientes,
      m: msg && ahora < msg.hasta ? 1 : 0,
    };
  }

  // Efectos visuales que el invitado también debe ver
  textoFlotante(x, y, contenido, color, tam) {
    this.salientes.push({ e: 'txt', x: Math.round(x), y: Math.round(y), texto: contenido, color, tam });
    super.textoFlotante(x, y, contenido, color, tam);
  }

  destello(j) {
    this.salientes.push({ e: 'flash', i: j.indice });
    super.destello(j);
  }

  verBurla(j, n) {
    this.salientes.push({ e: 'burla', i: j.indice, n });
    super.verBurla(j, n);
  }

  fantasma(j) {
    this.salientes.push({ e: 'rodada', i: j.indice });
    super.fantasma(j);
  }

  trazo(x1, y1, x2, y2) {
    this.salientes.push({ e: 'rayo', x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2) });
    super.trazo(x1, y1, x2, y2);
  }

  destelloExplosion(x, y) {
    this.salientes.push({ e: 'boom', x: Math.round(x), y: Math.round(y) });
    super.destelloExplosion(x, y);
  }

  mensaje(contenido, color, dura) {
    this.salientes.push({ e: 'msg', t: contenido, c: color, d: dura });
    super.mensaje(contenido, color, dura);
  }

  mensajeGrande(contenido, color, dura) {
    this.salientes.push({ e: 'grande', t: contenido, c: color, d: dura });
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
