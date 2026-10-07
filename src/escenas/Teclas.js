// Cambiar teclas: tocas una casilla y presionas la tecla nueva.
// Si esa tecla ya la usaba otra acción, las dos se intercambian.
import Phaser from 'phaser';
import { COLORES_JUGADOR, UI } from '../config.js';
import { Guardado } from '../sistemas/Guardado.js';
import { Sonido } from '../sistemas/Sonido.js';
import { ACCIONES, teclasDe, nombreTecla, nombreDeCodigo } from '../entrada/Teclado.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';
import { Musica } from '../sistemas/Musica.js';

const ESC = 27;
const COLUMNAS = [660, 900];

export class Teclas extends Phaser.Scene {
  constructor() {
    super('Teclas');
  }

  create() {
    Musica.poner('menu');
    this.input.keyboard.clearCaptures();
    this.esperando = null;
    fondoMenu(this);
    texto(this, 640, 40, 'Cambiar teclas', 38, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    texto(this, 640, 88, 'Toca una casilla y presiona la tecla nueva (Esc cancela; Esc es la pausa y no se puede usar).\n'
      + 'Probador: mantengan apretadas sus teclas al mismo tiempo. Las que se encienden en verde, el teclado sí las detecta.\n'
      + 'Si una no se enciende mientras aprietan otras, cámbienla por otra tecla.', 15, UI.suave, { align: 'center', lineSpacing: 4 }).setOrigin(0.5);

    const perfiles = Guardado.leer().perfiles;
    perfiles.forEach((p, i) => {
      texto(this, COLUMNAS[i], 144, `Jugador ${i + 1} · ${p.nombre}`, 17, COLORES_JUGADOR[p.color]?.css ?? UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    });
    this.botones = [[], []];
    ACCIONES.forEach(([accion, nombre], f) => {
      const y = 176 + f * 40;
      texto(this, 380, y, nombre, 19, UI.suave).setOrigin(0, 0.5);
      for (let i = 0; i < 2; i++) {
        const b = boton(this, COLUMNAS[i], y, '', () => this.elegir(i, accion), { ancho: 190, alto: 34, tam: 17, color: UI.gris });
        this.botones[i].push({ accion, b });
      }
    });

    boton(this, 500, 676, 'Restaurar teclas', () => this.restaurar(), { ancho: 260, alto: 50, tam: 19, color: 0x5a1d1c });
    boton(this, 780, 676, '← Volver', () => this.scene.start('Ajustes'), { ancho: 220, alto: 50, tam: 19, color: UI.gris });
    this.input.keyboard.on('keydown', (e) => this.tecla(e));
    this.refrescar();
  }

  elegir(i, accion) {
    this.esperando = { i, accion };
    this.refrescar();
  }

  tecla(e) {
    if (!this.esperando) {
      if (e.keyCode === ESC) this.scene.start('Ajustes');
      return;
    }
    const nombre = nombreDeCodigo(e.keyCode);
    if (e.keyCode === ESC || !nombre) {
      this.esperando = null;
      this.refrescar();
      return;
    }
    e.preventDefault?.();
    const { i, accion } = this.esperando;
    const actuales = [teclasDe(0), teclasDe(1)];
    const anterior = actuales[i][accion];
    Guardado.actualizar((d) => {
      d.ajustes.teclas = d.ajustes.teclas || [{}, {}];
      for (let j = 0; j < 2; j++) {
        for (const [a] of ACCIONES) {
          if (actuales[j][a] === nombre && !(j === i && a === accion)) {
            d.ajustes.teclas[j] = { ...d.ajustes.teclas[j], [a]: anterior }; // se intercambian
          }
        }
      }
      d.ajustes.teclas[i] = { ...d.ajustes.teclas[i], [accion]: nombre };
    });
    this.esperando = null;
    Sonido.tocar('click');
    this.refrescar();
  }

  refrescar() {
    const t = [teclasDe(0), teclasDe(1)];
    // Teclas "vivas" para el probador (sin bloquear nada del navegador)
    this.input.keyboard.removeAllKeys(true);
    this.botones.forEach((lista, i) => lista.forEach((celda) => {
      const { accion, b } = celda;
      const activa = this.esperando && this.esperando.i === i && this.esperando.accion === accion;
      b.etiqueta.setText(activa ? 'Presiona una tecla…' : nombreTecla(t[i][accion]));
      b.fondo.setFillStyle(activa ? UI.azul : UI.gris);
      celda.activa = activa;
      celda.tecla = this.input.keyboard.addKey(t[i][accion], false);
    }));
  }

  update() {
    for (const lista of this.botones) {
      for (const celda of lista) {
        if (celda.activa || !celda.tecla) continue;
        celda.b.fondo.setFillStyle(celda.tecla.isDown ? 0x1f8a52 : UI.gris);
      }
    }
  }

  restaurar() {
    Guardado.actualizar((d) => { d.ajustes.teclas = [{}, {}]; });
    this.esperando = null;
    this.refrescar();
  }
}
