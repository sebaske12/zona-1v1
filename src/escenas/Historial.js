// Historial de la rivalidad entre los dos nombres guardados.
import Phaser from 'phaser';
import { COLORES_JUGADOR, UI } from '../config.js';
import { nombreArma } from '../datos/armas.js';
import { MAPAS } from '../datos/mapas.js';
import { MODOS } from '../datos/modos.js';
import { Guardado, resumenRivalidad } from '../sistemas/Guardado.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';
import { Musica } from '../sistemas/Musica.js';

export class Historial extends Phaser.Scene {
  constructor() {
    super('Historial');
  }

  create() {
    Musica.poner('menu');
    this.input.keyboard.clearCaptures();
    fondoMenu(this);
    const d = Guardado.leer();
    const [a, b] = d.perfiles;
    const r = resumenRivalidad(d.partidas, a.nombre, b.nombre);
    texto(this, 640, 44, 'Historial de la rivalidad', 38, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);

    if (r.total === 0) {
      texto(this, 640, 300, `Todavía no hay partidas entre ${a.nombre} y ${b.nombre}.\n¡Jueguen la primera!`, 24, UI.suave, { align: 'center' }).setOrigin(0.5);
    } else {
      texto(this, 640, 90, `${r.total} ${r.total === 1 ? 'partida jugada' : 'partidas jugadas'}`, 18, UI.suave).setOrigin(0.5);
      r.jugadores.forEach((s, i) => {
        const cx = i === 0 ? 340 : 940;
        const color = COLORES_JUGADOR[d.perfiles[i].color];
        if (r.lider === i) this.add.image(cx, 124, 'corona').setScale(1.4);
        texto(this, cx, 158, s.nombre, 30, color.css, { fontStyle: 'bold' }).setOrigin(0.5);
        texto(this, cx, 214, String(s.victorias), 64, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
        texto(this, cx, 256, s.victorias === 1 ? 'victoria' : 'victorias', 16, UI.suave).setOrigin(0.5);
        const filas = [
          ['Racha actual', String(s.racha)],
          ['Racha más larga', String(s.rachaMax)],
          ['Rondas ganadas', s.rondasTotales ? `${Math.round((100 * s.rondas) / s.rondasTotales)} %` : '—'],
          ['Arma favorita', nombreArma(s.favorita)],
          ['Bajas con granada', String(s.granada)],
        ];
        filas.forEach(([k, v], f) => {
          texto(this, cx - 150, 284 + f * 30, k, 17, UI.suave);
          texto(this, cx + 150, 284 + f * 30, v, 17, UI.texto, { fontStyle: 'bold' }).setOrigin(1, 0);
        });
      });
      texto(this, 640, 452, 'Últimas partidas', 20, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
      r.ultimas.slice(0, 5).forEach((p, k) => {
        const fecha = new Date(p.fecha);
        const dia = `${fecha.getDate()}/${fecha.getMonth() + 1}`;
        const marcador = `${Math.max(...p.marcador)}–${Math.min(...p.marcador)}`;
        const donde = `${MODOS[p.modo]?.nombre ?? p.modo} en ${MAPAS[p.mapa]?.nombre ?? p.mapa}`;
        const pago = p.apuesta ? ` · Pagó: ${p.apuesta}` : '';
        texto(this, 640, 482 + k * 28, `${dia} · ${p.nombres[p.ganador]} ganó ${marcador} · ${donde}${pago}`, 16, '#c9cfdd').setOrigin(0.5, 0);
      });
    }

    boton(this, r.total > 0 ? 500 : 640, 668, '← Volver', () => this.scene.start('Menu'), { ancho: 220, alto: 50, tam: 20, color: UI.gris });
    if (r.total > 0) {
      let confirmar = false;
      const borrar = boton(this, 790, 668, 'Borrar historial', () => {
        if (!confirmar) {
          confirmar = true;
          borrar.etiqueta.setText('¿Seguro? Toca otra vez');
          return;
        }
        Guardado.actualizar((datos) => { datos.partidas = []; });
        this.scene.restart();
      }, { ancho: 300, alto: 50, tam: 18, color: 0x5a1d1c });
    }
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
  }
}
