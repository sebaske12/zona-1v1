// Junta varias fuentes (teclado, control, ratón, pantalla táctil) en una sola intención por jugador.
import Phaser from 'phaser';
import { EntradaTeclado, teclasDe, teclasExtraDe } from './Teclado.js';
import { EntradaControl } from './Control.js';
import { EntradaRaton } from './Raton.js';
import { EntradaTactil } from './Tactil.js';
import { Guardado } from '../sistemas/Guardado.js';

export class EntradaCombinada {
  constructor(fuentes) {
    this.fuentes = fuentes;
  }

  leer() {
    const r = { moverX: 0, moverY: 0, apuntarX: 0, apuntarY: 0, disparar: false, rodada: false, usar: false, cambiar: false, burla: 0 };
    for (const f of this.fuentes) {
      const e = f.leer();
      r.moverX += e.moverX;
      r.moverY += e.moverY;
      if (e.apuntarX || e.apuntarY) {
        r.apuntarX = e.apuntarX;
        r.apuntarY = e.apuntarY;
      }
      r.disparar = r.disparar || e.disparar;
      r.rodada = r.rodada || e.rodada;
      r.usar = r.usar || e.usar;
      r.cambiar = r.cambiar || e.cambiar;
      if (e.burla) r.burla = e.burla;
    }
    r.moverX = Phaser.Math.Clamp(r.moverX, -1, 1);
    r.moverY = Phaser.Math.Clamp(r.moverY, -1, 1);
    return r;
  }
}

// Qué control le toca a cada jugador (se puede cambiar en Ajustes)
export function indiceDeControl(jugador) {
  const paraJ2 = Guardado.leer().ajustes.controlParaJ2;
  return paraJ2 ? 1 - jugador : jugador;
}

// Celular o tableta: se muestran los joysticks en pantalla
export function esTactil(escena) {
  const d = escena.sys.game.device;
  return d.input.touch && !d.os.desktop;
}

// Mismo PC: J1 con W A S D y J2 con las flechas, cada uno con su control.
// En un celular, el J1 además tiene los joysticks en pantalla (para entrenar contra el bot).
export function crearEntradasLocales(escena) {
  return [0, 1].map((i) => {
    const fuentes = [
      new EntradaTeclado(escena, teclasDe(i), teclasExtraDe(i)),
      new EntradaControl(escena, indiceDeControl(i)),
    ];
    if (i === 0 && esTactil(escena)) fuentes.push(new EntradaTactil(escena));
    return new EntradaCombinada(fuentes);
  });
}

// En línea: quien juega en este aparato usa las teclas del J1, el primer control
// y además el ratón (PC) o los joysticks en pantalla (celular)
export function crearEntradaEnLinea(escena, obtenerJugador) {
  const fuentes = [new EntradaTeclado(escena, teclasDe(0)), new EntradaControl(escena, 0)];
  fuentes.push(esTactil(escena) ? new EntradaTactil(escena) : new EntradaRaton(escena, obtenerJugador));
  return new EntradaCombinada(fuentes);
}
