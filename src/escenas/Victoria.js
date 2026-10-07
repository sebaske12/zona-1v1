// Fin de la partida: ganador, apuesta, estadísticas y revancha.
import Phaser from 'phaser';
import { COLORES_JUGADOR, UI } from '../config.js';
import { nombreArma } from '../datos/armas.js';
import { Guardado, registroDePartida } from '../sistemas/Guardado.js';
import { nuevaPartida } from '../sistemas/Partida.js';
import { Sonido } from '../sistemas/Sonido.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';

export class Victoria extends Phaser.Scene {
  constructor() {
    super('Victoria');
  }

  init(data) {
    this.enLinea = data?.enLinea ?? false;
  }

  create() {
    this.input.keyboard.clearCaptures();
    const p = this.registry.get('partida');
    const g = p.ganador;
    const per = 1 - g;
    const cg = COLORES_JUGADOR[p.perfiles[g].color];

    if (!p.guardada) {
      p.guardada = true;
      Guardado.actualizar((d) => {
        d.partidas.push(registroDePartida(p));
        if (d.partidas.length > 300) d.partidas.splice(0, d.partidas.length - 300);
      });
    }

    fondoMenu(this);
    const confeti = this.add.particles(0, -10, 'chispa', {
      x: { min: 0, max: 1280 }, speedY: { min: 120, max: 260 }, speedX: { min: -40, max: 40 },
      lifespan: 4000, scale: { min: 1.2, max: 2.4 }, rotate: { min: 0, max: 360 },
      tint: [cg.valor, 0xf2b544, 0xffffff], frequency: 25, quantity: 2,
    });
    this.time.delayedCall(2600, () => confeti.stop());

    texto(this, 640, 82, '¡VICTORIA!', 76, cg.css, { fontStyle: 'bold' }).setOrigin(0.5).setStroke('#0d111d', 10);
    texto(this, 640, 152, `${p.perfiles[g].nombre} gana ${p.rondas[g]} – ${p.rondas[per]}`, 30, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);

    let y = 206;
    const apuesta = (p.apuestas[g] || '').trim();
    if (apuesta) {
      this.add.rectangle(640, 228, 780, 64, 0x2a1416).setStrokeStyle(2, 0xff7468);
      texto(this, 640, 228, `${p.perfiles[per].nombre} paga: ${apuesta}`, 26, '#ffd7d2', { fontStyle: 'bold', align: 'center', wordWrap: { width: 740 } }).setOrigin(0.5);
      y = 282;
    }

    const favorita = (e) => Object.entries(e.bajasPorArma).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const filas = [
      ['Rondas ganadas', (e) => e.rondas],
      ['Bajas', (e) => e.bajas],
      ['Daño hecho', (e) => Math.round(e.dano)],
      ['Precisión', (e) => (e.disparos ? `${Math.min(100, Math.round((100 * e.aciertos) / e.disparos))} %` : '—')],
      ['Arma favorita', (e) => nombreArma(favorita(e))],
      ['Burlas', (e) => e.burlas],
    ];
    const columnas = [800, 1000];
    p.perfiles.forEach((perfil, i) => {
      texto(this, columnas[i], y + 16, perfil.nombre, 20, COLORES_JUGADOR[perfil.color].css, { fontStyle: 'bold' }).setOrigin(0.5);
    });
    filas.forEach(([nombre, valor], f) => {
      const fy = y + 56 + f * 34;
      texto(this, 300, fy, nombre, 19, UI.suave).setOrigin(0, 0.5);
      p.estadisticas.forEach((e, i) => texto(this, columnas[i], fy, String(valor(e)), 20, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5));
    });

    if (this.enLinea) {
      const red = this.registry.get('red');
      this.btnRevancha = boton(this, 500, 660, 'Revancha', () => this.revanchaEnLinea(), { ancho: 280, color: UI.rojo });
      boton(this, 790, 660, 'Menú', () => this.salirEnLinea(), { ancho: 220, color: UI.gris });
      if (red) {
        // El invitado pide la revancha; el anfitrión la arranca para los dos
        red.manejador = (t, d) => {
          if (t === 'revancha' && red.esAnfitrion) this.revanchaEnLinea();
          if (t === 'inicio' && !red.esAnfitrion) {
            this.registry.set('partida', nuevaPartida(d));
            this.scene.start('RondaInvitado');
          }
        };
        this.events.once('shutdown', () => { red.manejador = null; });
      }
    } else {
      boton(this, 500, 660, 'Revancha (Enter)', () => this.revancha(), { ancho: 280, color: UI.rojo });
      boton(this, 790, 660, 'Menú (Esc)', () => this.scene.start('Menu'), { ancho: 220, color: UI.gris });
      this.input.keyboard.on('keydown-ENTER', () => this.revancha());
      this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    }
    Sonido.tocar('victoria');
  }

  revancha() {
    const p = this.registry.get('partida');
    this.registry.set('partida', nuevaPartida(p));
    this.scene.start('Ronda');
  }

  revanchaEnLinea() {
    const red = this.registry.get('red');
    if (!red) return;
    if (red.esAnfitrion) {
      const p = this.registry.get('partida');
      const config = { perfiles: p.perfiles, mapa: p.mapa, modo: p.modo, vida: p.vida, apuestas: p.apuestas };
      red.enviar('inicio', config);
      this.registry.set('partida', nuevaPartida(config));
      this.scene.start('RondaEnLinea');
    } else {
      red.enviar('revancha');
      this.btnRevancha.etiqueta.setText('Esperando…');
    }
  }

  salirEnLinea() {
    this.registry.get('red')?.cerrar();
    this.registry.set('red', null);
    this.scene.start('Menu');
  }
}
