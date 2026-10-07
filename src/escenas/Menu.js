// Pantalla de título.
import Phaser from 'phaser';
import { UI } from '../config.js';
import { Guardado, resumenRivalidad } from '../sistemas/Guardado.js';
import { boton, texto, fondoMenu, circuloPunteado } from '../ui/ui.js';
import { esTactil } from '../entrada/entradas.js';
import { Musica } from '../sistemas/Musica.js';

export class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.aviso = data?.aviso || null; // por ejemplo, si se cayó la conexión en línea
  }

  create() {
    Musica.poner('menu');
    this.input.keyboard.clearCaptures();
    const d = Guardado.leer();
    fondoMenu(this);
    if (this.aviso) texto(this, 640, 312, this.aviso, 18, '#ff7468', { fontStyle: 'bold' }).setOrigin(0.5);

    const deco = this.add.graphics({ x: 640, y: 200 });
    deco.lineStyle(4, 0x7ea0ff, 0.3);
    circuloPunteado(deco, 0, 0, 185, 44);
    deco.lineStyle(4, 0xff7468, 0.28);
    circuloPunteado(deco, 0, 0, 125, 32);
    this.tweens.add({ targets: deco, angle: 360, duration: 60000, repeat: -1 });

    texto(this, 640, 200, 'ZONA 1v1', 116, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5).setStroke('#0d111d', 12);
    texto(this, 640, 280, 'Duelo en la zona · para dos', 24, UI.suave).setOrigin(0.5);

    const [a, b] = d.perfiles;
    const riv = resumenRivalidad(d.partidas, a.nombre, b.nombre);
    if (riv.total > 0) {
      const t = texto(this, 640, 340, `${a.nombre}  ${riv.jugadores[0].victorias} – ${riv.jugadores[1].victorias}  ${b.nombre}`, 26, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
      if (riv.lider !== null) {
        const x = riv.lider === 0 ? t.x - t.width / 2 - 26 : t.x + t.width / 2 + 26;
        this.add.image(x, 336, 'corona').setScale(1.1);
      }
    }

    if (esTactil(this)) {
      // En el celular no se puede jugar de a dos en la misma pantalla: primero en línea y el bot
      boton(this, 640, 420, 'Jugar en línea', () => this.scene.start('Sala'), { ancho: 340, alto: 64, tam: 28, color: UI.rojo });
      boton(this, 640, 494, 'Entrenar contra el bot', () => this.scene.start('Preparacion', { bot: true }), { ancho: 340, color: UI.azul });
      boton(this, 554, 560, 'Historial', () => this.scene.start('Historial'), { ancho: 166, color: UI.gris, tam: 20 });
      boton(this, 726, 560, 'Ajustes', () => this.scene.start('Ajustes'), { ancho: 166, color: UI.gris, tam: 20 });
      texto(this, 640, 630, 'Para jugar los dos en un mismo aparato, usen el PC con teclado o controles.', 16, UI.suave).setOrigin(0.5);
      return;
    }
    boton(this, 640, 420, 'Jugar', () => this.scene.start('Preparacion'), { ancho: 340, alto: 64, tam: 28, color: UI.rojo });
    boton(this, 640, 494, 'Jugar en línea', () => this.scene.start('Sala'), { ancho: 340, color: UI.azul });
    boton(this, 640, 560, 'Entrenar contra el bot', () => this.scene.start('Preparacion', { bot: true }), { ancho: 340, color: UI.gris });
    boton(this, 554, 626, 'Historial', () => this.scene.start('Historial'), { ancho: 166, color: UI.gris, tam: 20 });
    boton(this, 726, 626, 'Ajustes', () => this.scene.start('Ajustes'), { ancho: 166, color: UI.gris, tam: 20 });
    texto(this, 640, 690, 'Enter para jugar en este PC', 15, UI.suave).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.scene.start('Preparacion'));
  }
}
