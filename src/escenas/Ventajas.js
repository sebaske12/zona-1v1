// Entre rondas: cada uno elige 1 ventaja de 3. El que perdió elige primero
// y el otro no ve sus cartas hasta que le toca (plan, sección 1.4).
import Phaser from 'phaser';
import { COLORES_JUGADOR, UI } from '../config.js';
import { VENTAJAS, MAX_VENTAJAS, sortearOpciones } from '../datos/ventajas.js';
import { indiceDeControl, esTactil } from '../entrada/entradas.js';
import { teclasDe, nombreTecla } from '../entrada/Teclado.js';
import { Sonido } from '../sistemas/Sonido.js';
import { texto, fondoMenu } from '../ui/ui.js';
import { Musica } from '../sistemas/Musica.js';

const { JustDown } = Phaser.Input.Keyboard;

// Las cartas se eligen con las teclas de cada uno: izquierda/derecha para moverse y disparar para elegir
const teclasMenu = (i) => {
  const t = teclasDe(i);
  return { izq: t.izquierda, der: t.derecha, ok: t.disparar };
};
const ayuda = (i) => {
  const t = teclasMenu(i);
  return `${nombreTecla(t.izq)} / ${nombreTecla(t.der)} para moverte · ${nombreTecla(t.ok)} para elegir`;
};

export class Ventajas extends Phaser.Scene {
  constructor() {
    super('Ventajas');
  }

  init(data) {
    this.perdedor = data.perdedor ?? 0;
    this.remoto = data.remoto ?? null; // en línea: qué jugador está en el otro aparato
    this.opcionesDadas = data.opciones ?? null; // en línea las sortea el anfitrión
    this.siguiente = data.siguiente ?? 'Ronda';
  }

  create() {
    Musica.poner('menu');
    this.partida = this.registry.get('partida');
    this.terminado = false;
    this.botPensando = false; // Phaser reutiliza la escena: hay que limpiar lo de la vez anterior
    const p = this.partida;
    this.sorteo = this.opcionesDadas || sortearOpciones(p);
    this.red = this.remoto !== null ? this.registry.get('red') : null;
    fondoMenu(this);
    texto(this, 640, 40, `Marcador ${p.rondas[0]} – ${p.rondas[1]}`, 40, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    texto(this, 640, 86, `${p.perfiles[this.perdedor].nombre} perdió la ronda y elige primero. Las ventajas duran toda la partida.`, 18, UI.suave).setOrigin(0.5);

    this.lados = [0, 1].map((i) => this.crearLado(i));
    this.turno = this.lados[this.perdedor].listo ? 1 - this.perdedor : this.perdedor;
    this.teclas = [this.input.keyboard.addKeys(teclasMenu(0)), this.input.keyboard.addKeys(teclasMenu(1))];
    this.enter = this.input.keyboard.addKey('ENTER');
    this.padAntes = [{}, {}];
    this.refrescar();
    // Se escucha a la red cuando las cartas ya existen: si tu pareja eligió mientras esta pantalla
    // se abría, su elección estaba esperando en fila y se aplica aquí (antes eso trababa al invitado)
    if (this.red) {
      this.red.manejador = (t, d) => { if (t === 'elegida' && d) this.elegir(d.i, null, d.id); };
      this.events.once('shutdown', () => { if (this.red) this.red.manejador = null; });
    }
    if (this.lados.every((l) => l.listo)) this.terminar();
    this.cameras.main.fadeIn(200, 13, 17, 29);
  }

  crearLado(i) {
    const cx = i === 0 ? 320 : 960;
    const p = this.partida;
    const color = COLORES_JUGADOR[p.perfiles[i].color];
    const tiene = p.ventajas[i];
    const opciones = (this.sorteo[i] || []).map((id) => VENTAJAS.find((v) => v.id === id)).filter(Boolean);
    const lado = { i, cx, color, opciones, sel: Math.min(1, opciones.length - 1), elegida: null, cartas: [] };
    lado.listo = tiene.length >= MAX_VENTAJAS || opciones.length === 0;

    texto(this, cx, 140, p.perfiles[i].nombre, 30, color.css, { fontStyle: 'bold' }).setOrigin(0.5);
    lado.estado = texto(this, cx, 180, '', 16, UI.suave).setOrigin(0.5);
    const nombres = tiene.map((id) => VENTAJAS.find((v) => v.id === id)?.nombre).filter(Boolean);
    texto(this, cx, 500, nombres.length ? `Ya tienes: ${nombres.join(', ')}` : 'Todavía no tienes ventajas', 15, UI.suave, { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5, 0);

    opciones.forEach((v, k) => {
      const x = cx + (k - 1) * 192;
      const y = 340;
      const fondo = this.add.rectangle(x, y, 176, 230, UI.panel).setStrokeStyle(3, UI.borde);
      const nombre = texto(this, x, y - 64, v.nombre, 21, UI.texto, { fontStyle: 'bold', align: 'center', wordWrap: { width: 150 } }).setOrigin(0.5);
      const desc = texto(this, x, y + 4, v.texto, 16, '#c9cfdd', { align: 'center', wordWrap: { width: 150 } }).setOrigin(0.5, 0);
      const tapa = this.add.rectangle(x, y, 176, 230, 0x10141f, 1).setStrokeStyle(3, UI.borde);
      const signo = texto(this, x, y, '?', 64, '#2a3249', { fontStyle: 'bold' }).setOrigin(0.5);
      fondo.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (this.turno === i && !lado.listo && this.esLocal(i)) {
          lado.sel = k;
          this.elegir(i);
        }
      });
      lado.cartas.push({ fondo, nombre, desc, tapa, signo });
    });
    return lado;
  }

  esLocal(i) {
    return this.remoto === null || this.remoto !== i;
  }

  refrescar() {
    for (const lado of this.lados) {
      const nombreOtro = this.partida.perfiles[1 - lado.i].nombre;
      const visible = this.turno === lado.i || lado.listo;
      lado.cartas.forEach((c, k) => {
        const activa = this.turno === lado.i && !lado.listo && k === lado.sel;
        const elegida = lado.elegida === k;
        c.tapa.setVisible(!visible);
        c.signo.setVisible(!visible);
        c.nombre.setVisible(visible);
        c.desc.setVisible(visible);
        c.fondo.setStrokeStyle(3, activa || elegida ? lado.color.valor : UI.borde);
        c.fondo.setFillStyle(elegida ? 0x1f2740 : UI.panel);
        const apagada = lado.listo && lado.elegida !== null && !elegida ? 0.35 : 1;
        [c.fondo, c.nombre, c.desc].forEach((o) => o.setAlpha(apagada));
        c.fondo.setScale(activa ? 1.05 : 1);
      });
      let estado;
      if (lado.listo) estado = lado.elegida !== null ? '¡Listo!' : 'Ya tienes el máximo de ventajas';
      else if (this.turno === lado.i) {
        if (!this.esLocal(lado.i)) estado = 'Está eligiendo…';
        else if (esTactil(this)) estado = 'Toca la carta que quieres';
        else estado = this.remoto === null ? ayuda(lado.i) : `Toca una carta o usa ${ayuda(0)}`;
      }
      else estado = `Esperando a que ${nombreOtro} elija…`;
      lado.estado.setText(estado);
    }
  }

  update() {
    if (this.terminado) return;
    const i = this.turno;
    const lado = this.lados[i];
    // Se leen todas las teclas para que no queden apretadas "guardadas"
    const leidas = this.teclas.map((t) => ({ izq: JustDown(t.izq), der: JustDown(t.der), ok: JustDown(t.ok) }));
    const enter = JustDown(this.enter);
    if (lado.listo || !this.esLocal(i)) return;

    // En el entrenamiento, el bot elige solo
    if (this.partida.bot && i === 1) {
      if (!this.botPensando) {
        this.botPensando = true;
        this.time.delayedCall(900, () => {
          lado.sel = Phaser.Math.Between(0, lado.opciones.length - 1);
          this.refrescar();
          this.time.delayedCall(400, () => this.elegir(1));
        });
      }
      return;
    }

    // En línea, quien juega en este aparato usa las teclas del jugador 1
    const t = this.remoto === null ? leidas[i] : leidas[0];
    let mover = (t.der ? 1 : 0) - (t.izq ? 1 : 0);
    let ok = t.ok || enter;
    const pad = this.leerPad(this.remoto === null ? i : 0);
    mover += pad.mover;
    ok = ok || pad.ok;

    if (mover) {
      lado.sel = Phaser.Math.Wrap(lado.sel + Math.sign(mover), 0, lado.opciones.length);
      Sonido.tocar('click');
      this.refrescar();
    }
    if (ok) this.elegir(i);
  }

  leerPad(jugador) {
    const gp = this.input.gamepad;
    const pad = gp && gp.total ? gp.getPad(indiceDeControl(jugador)) : null;
    if (!pad || !pad.connected) return { mover: 0, ok: false };
    const antes = this.padAntes[jugador];
    const izq = pad.leftStick.x < -0.6 || !!pad.buttons[14]?.pressed;
    const der = pad.leftStick.x > 0.6 || !!pad.buttons[15]?.pressed;
    const ok = !!pad.buttons[0]?.pressed || !!pad.buttons[7]?.pressed;
    const r = { mover: (der && !antes.der ? 1 : 0) - (izq && !antes.izq ? 1 : 0), ok: ok && !antes.ok };
    this.padAntes[jugador] = { izq, der, ok };
    return r;
  }

  // id: cuando la elección llega por la red desde el otro aparato
  elegir(i, indiceCarta = null, id = null) {
    const lado = this.lados[i];
    if (!lado || lado.listo || this.turno !== i) return;
    if (id !== null) indiceCarta = lado.opciones.findIndex((v) => v.id === id);
    if (indiceCarta !== null && indiceCarta >= 0) lado.sel = indiceCarta;
    lado.elegida = lado.sel;
    lado.listo = true;
    const elegidaId = lado.opciones[lado.sel].id;
    this.partida.ventajas[i].push(elegidaId);
    Sonido.tocar('recoger');
    if (this.red && this.esLocal(i)) this.red.enviar('elegida', { i, id: elegidaId });
    if (!this.lados[1 - i].listo) this.turno = 1 - i;
    this.refrescar();
    if (this.lados.every((l) => l.listo)) this.terminar();
  }

  terminar() {
    if (this.terminado) return;
    this.terminado = true;
    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(250, 13, 17, 29);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.siguiente));
    });
  }
}
