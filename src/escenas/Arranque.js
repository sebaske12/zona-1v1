// Primera escena: dibuja todas las imágenes del juego con código (no hay que descargar nada).
import Phaser from 'phaser';
import { Guardado } from '../sistemas/Guardado.js';
import { Sonido } from '../sistemas/Sonido.js';
import { Musica } from '../sistemas/Musica.js';

export class Arranque extends Phaser.Scene {
  constructor() {
    super('Arranque');
  }

  create() {
    const ajustes = Guardado.leer().ajustes;
    Sonido.activo = ajustes.sonido;
    Musica.activa = ajustes.musica;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const tex = (clave, w, h, dibujo) => {
      g.clear();
      dibujo(g);
      g.generateTexture(clave, w, h);
    };

    // Jugador: blanco para poder pintarlo del color de cada uno
    tex('cuerpo', 32, 32, (d) => {
      d.fillStyle(0xffffff, 1).fillCircle(16, 16, 14);
      d.lineStyle(3, 0x8a8a8a, 1).strokeCircle(16, 16, 13);
      d.fillStyle(0xc8c8c8, 1).fillCircle(22, 16, 4); // "nariz": muestra hacia dónde mira
    });

    // Armas: salen desde el centro del jugador hacia la derecha
    const arma = (clave, largo, alto, color, extra) => tex(clave, largo, 12, (d) => {
      d.fillStyle(0x0d111d, 1).fillRoundedRect(0, 6 - alto / 2 - 1, largo, alto + 2, 2);
      d.fillStyle(color, 1).fillRoundedRect(1, 6 - alto / 2, largo - 2, alto, 2);
      if (extra) extra(d);
    });
    arma('arma-pistola', 22, 6, 0x4a5266);
    arma('arma-subfusil', 28, 7, 0x3a4152, (d) => d.fillStyle(0x161a24, 1).fillRect(12, 9, 4, 3));
    arma('arma-escopeta', 32, 7, 0x8a5c33, (d) => d.fillStyle(0x2b2f3a, 1).fillRect(15, 4, 17, 4));
    arma('arma-rifle', 36, 6, 0x4d5d48, (d) => d.fillStyle(0x161a24, 1).fillRect(15, 9, 5, 3));
    arma('arma-franco', 46, 5, 0x34406a, (d) => d.fillStyle(0x7ea0ff, 1).fillRect(16, 2, 9, 3));
    arma('arma-dorado', 36, 6, 0xf2c230, (d) => d.fillStyle(0xfff1a8, 1).fillRect(3, 5, 28, 1));
    arma('arma-cohetes', 42, 9, 0x55603a, (d) => d.fillStyle(0xd8432f, 1).fillRect(36, 3, 5, 6).fillStyle(0x2b2f3a, 1).fillRect(12, 9, 5, 3));
    tex('cohete', 18, 8, (d) => {
      d.fillStyle(0xffb347, 1).fillTriangle(0, 4, 5, 1, 5, 7); // fuego
      d.fillStyle(0xdfe3ea, 1).fillRect(5, 1, 9, 6);
      d.fillStyle(0xd8432f, 1).fillTriangle(14, 1, 18, 4, 14, 7); // punta
    });

    tex('bala', 12, 4, (d) => d.fillStyle(0xfff3b0, 1).fillRoundedRect(0, 0, 12, 4, 2));
    tex('perdigon', 6, 6, (d) => d.fillStyle(0xffe08a, 1).fillCircle(3, 3, 3));
    tex('casquillo', 5, 3, (d) => d.fillStyle(0xd9a441, 1).fillRect(0, 0, 5, 3));
    tex('chispa', 4, 4, (d) => d.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4));
    tex('humo', 24, 24, (d) => {
      for (let r = 12; r > 0; r -= 2) d.fillStyle(0xffffff, 0.08).fillCircle(12, 12, r);
    });
    tex('granada', 14, 14, (d) => {
      d.fillStyle(0x1d2a14, 1).fillCircle(7, 7, 7);
      d.fillStyle(0x4c6b34, 1).fillCircle(7, 7, 5);
      d.fillStyle(0xcfcfcf, 1).fillRect(6, 0, 3, 3);
    });

    tex('caja', 32, 32, (d) => {
      d.fillStyle(0x5e3d1c, 1).fillRect(0, 0, 32, 32);
      d.fillStyle(0x9a6a35, 1).fillRect(3, 3, 26, 26);
      d.lineStyle(3, 0x7a5228, 1).lineBetween(4, 4, 28, 28).lineBetween(28, 4, 4, 28);
      d.lineStyle(2, 0x5e3d1c, 1).strokeRect(3, 3, 26, 26);
    });
    tex('airdrop', 44, 44, (d) => {
      d.fillStyle(0x7a1d14, 1).fillRect(0, 0, 44, 44);
      d.fillStyle(0xd8432f, 1).fillRect(3, 3, 38, 38);
      d.fillStyle(0xf2b544, 1).fillRect(19, 3, 6, 38).fillRect(3, 19, 38, 6);
      d.fillStyle(0xfff1a8, 1).fillCircle(22, 22, 5);
    });

    tex('piso', 64, 64, (d) => {
      d.fillStyle(0x1a2135, 1).fillRect(0, 0, 64, 64);
      d.lineStyle(1, 0x222b44, 1).strokeRect(0, 0, 64, 64);
      d.fillStyle(0x222b44, 1).fillRect(31, 31, 2, 2);
    });
    tex('agua', 64, 64, (d) => {
      d.fillStyle(0x1b4a86, 1).fillRect(0, 0, 64, 64);
      d.lineStyle(2, 0x2f6cb8, 1);
      d.beginPath(); d.arc(16, 20, 8, Math.PI, 0); d.strokePath();
      d.beginPath(); d.arc(48, 46, 8, Math.PI, 0); d.strokePath();
    });

    // Íconos de objetos
    tex('ico-botiquin', 24, 24, (d) => {
      d.fillStyle(0xffffff, 1).fillRoundedRect(1, 3, 22, 18, 4);
      d.fillStyle(0xe5383b, 1).fillRect(10, 6, 4, 12).fillRect(6, 10, 12, 4);
    });
    tex('ico-granada', 24, 24, (d) => {
      d.fillStyle(0x1d2a14, 1).fillCircle(12, 14, 9);
      d.fillStyle(0x4c6b34, 1).fillCircle(12, 14, 7);
      d.fillStyle(0xcfcfcf, 1).fillRect(10, 2, 5, 5);
    });
    tex('ico-gel', 24, 24, (d) => {
      d.fillStyle(0x7fe3ff, 1).fillRoundedRect(1, 7, 22, 10, 3);
      d.lineStyle(2, 0xd4f6ff, 1).strokeRoundedRect(1, 7, 22, 10, 3);
    });
    tex('ico-chaleco', 24, 24, (d) => {
      d.fillStyle(0x3f6fd8, 1).fillRoundedRect(3, 3, 18, 19, 4);
      d.fillStyle(0x0d111d, 1).fillTriangle(8, 3, 16, 3, 12, 10);
      d.lineStyle(2, 0x9ec0ff, 1).strokeRoundedRect(3, 3, 18, 19, 4);
    });

    // Accesorios (miran hacia la derecha, giran con el jugador)
    tex('acc-gorra', 32, 32, (d) => {
      d.fillStyle(0x22262f, 1).fillCircle(15, 16, 10);
      d.fillStyle(0xf2f2f2, 1).fillRoundedRect(20, 10, 9, 12, 3);
      d.fillStyle(0xd8432f, 1).fillCircle(13, 16, 3);
    });
    tex('acc-casco', 32, 32, (d) => {
      d.fillStyle(0x56683a, 1).fillCircle(16, 16, 11);
      d.lineStyle(2, 0x3a4727, 1).strokeCircle(16, 16, 11);
      d.fillStyle(0x3a4727, 1).fillRect(6, 15, 20, 2);
    });
    tex('acc-mono', 32, 32, (d) => {
      d.fillStyle(0xff5fa2, 1).fillTriangle(6, 8, 6, 24, 13, 16).fillTriangle(1, 8, 1, 24, 6, 16);
      d.fillStyle(0xffa3c8, 1).fillCircle(6, 16, 3);
    });

    tex('corona', 30, 22, (d) => {
      d.fillStyle(0xf2b544, 1).fillPoints([{ x: 2, y: 20 }, { x: 2, y: 6 }, { x: 9, y: 12 }, { x: 15, y: 2 }, { x: 21, y: 12 }, { x: 28, y: 6 }, { x: 28, y: 20 }], true);
      d.fillStyle(0xd8432f, 1).fillCircle(15, 15, 2.5);
    });

    g.destroy();
    this.scene.start('Menu');
  }
}
