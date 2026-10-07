// Tabla de controles y ajustes: sonido, a quién le toca el primer control y pantalla completa.
import Phaser from 'phaser';
import { UI } from '../config.js';
import { Guardado } from '../sistemas/Guardado.js';
import { Sonido } from '../sistemas/Sonido.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';

const FILAS = [
  ['Moverse', 'W A S D', 'Flechas', 'Stick izquierdo'],
  ['Disparar (mantener)', 'Espacio', 'K', 'R2 / RT o A'],
  ['Rodada', 'Shift', 'J', 'L2 / LT o B'],
  ['Usar objeto', 'Q', 'L', 'R1 / RB o X'],
  ['Cambiar objeto', 'E', 'I', 'L1 / LB o Y'],
  ['Burlas', '1 · 2 · 3', '8 · 9 · 0', 'Cruceta'],
  ['Pausa', 'Esc', 'Esc', '—'],
];

export class Ajustes extends Phaser.Scene {
  constructor() {
    super('Ajustes');
  }

  create() {
    this.input.keyboard.clearCaptures();
    fondoMenu(this);
    texto(this, 640, 40, 'Controles y ajustes', 38, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);

    const xs = [180, 470, 680, 900];
    ['Acción', 'Jugador 1', 'Jugador 2', 'Control PS / Xbox'].forEach((t, k) => texto(this, xs[k], 92, t, 16, UI.suave, { fontStyle: 'bold' }));
    FILAS.forEach((fila, f) => fila.forEach((t, k) => texto(this, xs[k], 126 + f * 32, t, 19, k === 0 ? UI.suave : UI.texto, { fontStyle: k === 0 ? 'normal' : 'bold' })));
    texto(this, 640, 364, 'Con teclado se apunta solo: tu personaje mira al rival cuando lo ve y está a distancia de disparo.\n'
      + 'Con control apuntas con el stick derecho. Para abrir una caja, quédate encima medio segundo.\n'
      + 'Botiquín: te quedas quieto 2 s. Pared de gel: frena las balas de los dos durante 8 s.', 16, UI.suave, { align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);

    this.btnSonido = boton(this, 640, 470, '', () => this.alternarSonido(), { ancho: 420, color: UI.gris });
    this.btnControl = boton(this, 640, 536, '', () => this.alternarControl(), { ancho: 420, color: UI.gris });
    boton(this, 640, 602, 'Pantalla completa', () => this.scale.toggleFullscreen(), { ancho: 420, color: UI.gris });
    this.conectados = texto(this, 640, 646, '', 15, UI.suave).setOrigin(0.5);
    boton(this, 110, 676, '← Menú', () => this.scene.start('Menu'), { ancho: 160, alto: 46, tam: 18, color: UI.gris });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    this.refrescar();
  }

  refrescar() {
    const a = Guardado.leer().ajustes;
    this.btnSonido.etiqueta.setText(`Sonido: ${a.sonido ? 'sí' : 'no'}`);
    this.btnControl.etiqueta.setText(`Primer control: ${a.controlParaJ2 ? 'Jugador 2' : 'Jugador 1'}`);
  }

  alternarSonido() {
    const d = Guardado.actualizar((x) => { x.ajustes.sonido = !x.ajustes.sonido; });
    Sonido.activo = d.ajustes.sonido;
    this.refrescar();
  }

  alternarControl() {
    Guardado.actualizar((x) => { x.ajustes.controlParaJ2 = !x.ajustes.controlParaJ2; });
    this.refrescar();
  }

  update() {
    const n = this.input.gamepad?.total ?? 0;
    this.conectados.setText(n ? `Controles conectados: ${n}` : 'No hay controles conectados (aprieta un botón del control para que aparezca)');
  }
}
