// Tabla de controles y ajustes: sonido, música, a quién le toca el primer control,
// cambiar teclas y pantalla completa.
import Phaser from 'phaser';
import { UI } from '../config.js';
import { Guardado } from '../sistemas/Guardado.js';
import { Sonido } from '../sistemas/Sonido.js';
import { Musica } from '../sistemas/Musica.js';
import { teclasDe, nombreTecla } from '../entrada/Teclado.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';

function filas() {
  const t = [teclasDe(0), teclasDe(1)];
  const n = (i, a) => nombreTecla(t[i][a]);
  const mover = (i) => `${n(i, 'arriba')} ${n(i, 'izquierda')} ${n(i, 'abajo')} ${n(i, 'derecha')}`;
  return [
    ['Moverse', mover(0), mover(1), 'Stick izquierdo'],
    ['Disparar (mantener)', n(0, 'disparar'), n(1, 'disparar'), 'R2 / RT o A'],
    ['Rodada', n(0, 'rodada'), n(1, 'rodada'), 'L2 / LT o B'],
    ['Usar objeto', n(0, 'usar'), n(1, 'usar'), 'R1 / RB o X'],
    ['Cambiar objeto', n(0, 'cambiar'), n(1, 'cambiar'), 'L1 / LB o Y'],
    ['Burlas', `${n(0, 'burla1')} · ${n(0, 'burla2')} · ${n(0, 'burla3')}`, `${n(1, 'burla1')} · ${n(1, 'burla2')} · ${n(1, 'burla3')}`, 'Cruceta'],
    ['Pausa', 'Esc', 'Esc', '—'],
  ];
}

export class Ajustes extends Phaser.Scene {
  constructor() {
    super('Ajustes');
  }

  create() {
    Musica.poner('menu');
    this.input.keyboard.clearCaptures();
    fondoMenu(this);
    texto(this, 640, 40, 'Controles y ajustes', 38, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);

    const xs = [180, 450, 680, 900];
    ['Acción', 'Jugador 1', 'Jugador 2', 'Control PS / Xbox'].forEach((t, k) => texto(this, xs[k], 92, t, 16, UI.suave, { fontStyle: 'bold' }));
    filas().forEach((fila, f) => fila.forEach((t, k) => texto(this, xs[k], 124 + f * 31, t, 19, k === 0 ? UI.suave : UI.texto, { fontStyle: k === 0 ? 'normal' : 'bold' })));
    texto(this, 640, 352, 'Con teclado se apunta solo: tu personaje mira al rival cuando lo ve y está a distancia de disparo.\n'
      + 'Con control apuntas con el stick derecho. Para abrir una caja, quédate encima medio segundo.\n'
      + 'Botiquín: te quedas quieto 2 s. Pared de gel: frena las balas de los dos durante 8 s.', 16, UI.suave, { align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);

    this.btnSonido = boton(this, 450, 462, '', () => this.alternar('sonido'), { ancho: 360, color: UI.gris });
    this.btnMusica = boton(this, 830, 462, '', () => this.alternar('musica'), { ancho: 360, color: UI.gris });
    this.btnControl = boton(this, 450, 528, '', () => this.alternar('controlParaJ2'), { ancho: 360, color: UI.gris });
    boton(this, 830, 528, 'Cambiar teclas', () => this.scene.start('Teclas'), { ancho: 360, color: UI.azul });
    boton(this, 640, 594, 'Pantalla completa', () => this.scale.toggleFullscreen(), { ancho: 360, color: UI.gris });
    this.conectados = texto(this, 640, 640, '', 15, UI.suave).setOrigin(0.5);
    boton(this, 110, 676, '← Menú', () => this.scene.start('Menu'), { ancho: 160, alto: 46, tam: 18, color: UI.gris });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    this.refrescar();
  }

  refrescar() {
    const a = Guardado.leer().ajustes;
    this.btnSonido.etiqueta.setText(`Sonido: ${a.sonido ? 'sí' : 'no'}`);
    this.btnMusica.etiqueta.setText(`Música: ${a.musica ? 'sí' : 'no'}`);
    this.btnControl.etiqueta.setText(`Primer control: ${a.controlParaJ2 ? 'Jugador 2' : 'Jugador 1'}`);
  }

  alternar(clave) {
    const d = Guardado.actualizar((x) => { x.ajustes[clave] = !x.ajustes[clave]; });
    Sonido.activo = d.ajustes.sonido;
    Musica.activa = d.ajustes.musica;
    this.refrescar();
  }

  update() {
    const n = this.input.gamepad?.total ?? 0;
    this.conectados.setText(n ? `Controles conectados: ${n}` : 'No hay controles conectados (aprieta un botón del control para que aparezca)');
  }
}
