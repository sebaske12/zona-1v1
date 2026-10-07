// Fin de la partida: ganador, apuesta, estadísticas y revancha.
import Phaser from 'phaser';
import { COLORES_JUGADOR, UI } from '../config.js';
import { nombreArma } from '../datos/armas.js';
import { Guardado, registroDePartida } from '../sistemas/Guardado.js';
import { nuevaPartida } from '../sistemas/Partida.js';
import { Sonido } from '../sistemas/Sonido.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';
import { esTactil } from '../entrada/entradas.js';
import { sinCaras } from '../sistemas/Caras.js';
import { mostrarCara } from '../ui/ui.js';
import { Musica } from '../sistemas/Musica.js';

export class Victoria extends Phaser.Scene {
  constructor() {
    super('Victoria');
  }

  init(data) {
    this.enLinea = data?.enLinea ?? false;
  }

  create() {
    Musica.poner('menu');
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

    // La cara del ganador baila al lado del título
    if (p.perfiles[g].cara) {
      const anillo = this.add.circle(0, 0, 0, 0xffffff);
      const cara = this.add.image(0, 0, 'cuerpo');
      const caja = this.add.container(320, 100, [anillo, cara]);
      mostrarCara(this, cara, anillo, p.perfiles[g].cara, cg.valor, 120);
      this.tweens.add({ targets: caja, angle: { from: -10, to: 10 }, scale: { from: 0.95, to: 1.08 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    let y = 206;
    const apuesta = (p.apuestas[g] || '').trim();
    if (apuesta) {
      this.add.rectangle(640, 228, 780, 64, 0x2a1416).setStrokeStyle(2, 0xff7468);
      texto(this, 640, 228, `${p.perfiles[per].nombre} paga: ${apuesta}`, 26, '#ffd7d2', { fontStyle: 'bold', align: 'center', wordWrap: { width: 740 } }).setOrigin(0.5);
      y = 282;
    }
    // La cara del que perdió, chiquita y gris, temblando al lado de lo que tiene que pagar
    if (p.perfiles[per].cara) {
      const anillo = this.add.circle(0, 0, 0, 0xffffff);
      const cara = this.add.image(0, 0, 'cuerpo').setTint(0xb0b0b0);
      const caja = this.add.container(apuesta ? 196 : 640, apuesta ? 228 : 240, [anillo, cara]);
      mostrarCara(this, cara, anillo, p.perfiles[per].cara, 0x555b6e, 60);
      this.tweens.add({ targets: caja, x: caja.x + 3, duration: 60, yoyo: true, repeat: -1 });
      if (!apuesta) y = 290;
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
            // La revancha llega sin fotos: se usan las caras que ya tenía esta partida
            const anterior = this.registry.get('partida');
            const config = { ...d, perfiles: d.perfiles.map((pf, i) => ({ ...pf, cara: anterior.perfiles[i]?.cara || null })) };
            this.registry.set('partida', nuevaPartida(config));
            this.scene.start('RondaInvitado');
          }
        };
        this.events.once('shutdown', () => { red.manejador = null; });
      }
    } else {
      const celular = esTactil(this); // en el celular no hay teclas que mostrar
      boton(this, 500, 660, celular ? 'Revancha' : 'Revancha (Enter)', () => this.revancha(), { ancho: 280, color: UI.rojo });
      boton(this, 790, 660, celular ? 'Menú' : 'Menú (Esc)', () => this.scene.start('Menu'), { ancho: 220, color: UI.gris });
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
      red.enviar('inicio', sinCaras(config));
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
