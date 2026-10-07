// Convierte el teclado en una "intención" (plan, sección 1.9).
// Control.js hace lo mismo con un control, y el jugador no sabe de dónde vino la orden.
import Phaser from 'phaser';
import { Guardado } from '../sistemas/Guardado.js';

const { JustDown, KeyCodes } = Phaser.Input.Keyboard;

// Teclas de fábrica. Cada jugador puede cambiarlas en Ajustes → Cambiar teclas.
export const TECLAS = [
  { arriba: 'W', abajo: 'S', izquierda: 'A', derecha: 'D', disparar: 'SPACE', rodada: 'SHIFT', usar: 'Q', cambiar: 'E', burla1: 'ONE', burla2: 'TWO', burla3: 'THREE' },
  { arriba: 'UP', abajo: 'DOWN', izquierda: 'LEFT', derecha: 'RIGHT', disparar: 'K', rodada: 'J', usar: 'L', cambiar: 'I', burla1: 'EIGHT', burla2: 'NINE', burla3: 'ZERO' },
];

export const ACCIONES = [
  ['arriba', 'Arriba'], ['abajo', 'Abajo'], ['izquierda', 'Izquierda'], ['derecha', 'Derecha'],
  ['disparar', 'Disparar'], ['rodada', 'Rodada'], ['usar', 'Usar objeto'], ['cambiar', 'Cambiar objeto'],
  ['burla1', 'Burla 1'], ['burla2', 'Burla 2'], ['burla3', 'Burla 3'],
];

// Las teclas que de verdad usa el jugador i: las de fábrica con sus cambios encima
export function teclasDe(i) {
  const cambios = Guardado.leer().ajustes.teclas?.[i] || {};
  const validas = Object.fromEntries(Object.entries(cambios).filter(([, k]) => KeyCodes[k] !== undefined));
  return { ...TECLAS[i], ...validas };
}

const NOMBRES = {
  SPACE: 'Espacio', SHIFT: 'Shift', CTRL: 'Ctrl', ALT: 'Alt', ENTER: 'Enter', TAB: 'Tab', BACKSPACE: 'Borrar',
  UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', CAPS_LOCK: 'Bloq Mayús',
  ZERO: '0', ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9',
  COMMA: ',', PERIOD: '.', FORWARD_SLASH: '/', MINUS: '-', PLUS: '+', SEMICOLON: ';', BACKTICK: 'Ñ',
  OPEN_BRACKET: '[', CLOSED_BRACKET: ']', QUOTES: '´', BACK_SLASH: '\\', INSERT: 'Insert', DELETE: 'Supr',
  HOME: 'Inicio', END: 'Fin', PAGE_UP: 'RePág', PAGE_DOWN: 'AvPág',
};

export function nombreTecla(k) {
  if (NOMBRES[k]) return NOMBRES[k];
  if (k.startsWith('NUMPAD_')) {
    const resto = k.slice(7);
    return `Num ${NOMBRES[resto] || resto}`;
  }
  return k;
}

// Del número de tecla del navegador al nombre que usa Phaser
const POR_CODIGO = {};
for (const [nombre, codigo] of Object.entries(KeyCodes)) if (!(codigo in POR_CODIGO)) POR_CODIGO[codigo] = nombre;
export function nombreDeCodigo(codigo) {
  return POR_CODIGO[codigo] ?? null;
}

// Resumen corto para mostrar en pantalla
export function resumenTeclas(i) {
  const t = teclasDe(i);
  const n = (a) => nombreTecla(t[a]);
  const mover = i === 1 && t.arriba === 'UP' && t.abajo === 'DOWN' && t.izquierda === 'LEFT' && t.derecha === 'RIGHT'
    ? 'Flechas' : `${n('arriba')} ${n('izquierda')} ${n('abajo')} ${n('derecha')}`;
  return `${mover} · ${n('disparar')} dispara · ${n('rodada')} rueda\n${n('usar')} usa objeto · ${n('cambiar')} cambia · ${n('burla1')} ${n('burla2')} ${n('burla3')} burlas`;
}

export class EntradaTeclado {
  constructor(escena, teclas) {
    this.t = escena.input.keyboard.addKeys(teclas);
  }

  leer() {
    const t = this.t;
    return {
      moverX: (t.derecha.isDown ? 1 : 0) - (t.izquierda.isDown ? 1 : 0),
      moverY: (t.abajo.isDown ? 1 : 0) - (t.arriba.isDown ? 1 : 0),
      apuntarX: 0,
      apuntarY: 0, // con teclado el apuntado es asistido
      disparar: t.disparar.isDown,
      rodada: JustDown(t.rodada),
      usar: JustDown(t.usar),
      cambiar: JustDown(t.cambiar),
      burla: JustDown(t.burla1) ? 1 : JustDown(t.burla2) ? 2 : JustDown(t.burla3) ? 3 : 0,
    };
  }
}
