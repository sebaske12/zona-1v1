// Junta varias fuentes (teclado + control) en una sola intención por jugador.
import Phaser from 'phaser';
import { EntradaTeclado, TECLAS } from './Teclado.js';
import { EntradaControl } from './Control.js';
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

export function crearEntradasLocales(escena) {
  return [0, 1].map((i) => new EntradaCombinada([
    new EntradaTeclado(escena, TECLAS[i]),
    new EntradaControl(escena, indiceDeControl(i)),
  ]));
}
