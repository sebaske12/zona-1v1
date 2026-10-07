// Convierte el teclado en una "intención" (plan, sección 1.9).
// Control.js hace lo mismo con un control, y el jugador no sabe de dónde vino la orden.
import Phaser from 'phaser';
import { Guardado } from '../sistemas/Guardado.js';

const { KeyCodes } = Phaser.Input.Keyboard;

// Teclas de fábrica. Cada jugador puede cambiarlas en Ajustes → Cambiar teclas.
export const TECLAS = [
  { arriba: 'W', abajo: 'S', izquierda: 'A', derecha: 'D', disparar: 'SPACE', rodada: 'SHIFT', usar: 'Q', cambiar: 'E', burla1: 'ONE', burla2: 'TWO', burla3: 'THREE' },
  { arriba: 'UP', abajo: 'DOWN', izquierda: 'LEFT', derecha: 'RIGHT', disparar: 'K', rodada: 'J', usar: 'L', cambiar: 'I', burla1: 'EIGHT', burla2: 'NINE', burla3: 'ZERO' },
];

// Teclas de repuesto (fijas): sirven si el teclado no detecta la principal junto con las flechas
const TECLAS_EXTRA = [{}, { disparar: ['ENTER', 'NUMPAD_ZERO'] }];

// Solo las de repuesto que el otro jugador no esté usando
export function teclasExtraDe(i) {
  const otro = Object.values(teclasDe(1 - i));
  const propias = Object.values(teclasDe(i));
  const extra = {};
  for (const [accion, lista] of Object.entries(TECLAS_EXTRA[i])) {
    const libres = lista.filter((k) => !otro.includes(k) && !propias.includes(k));
    if (libres.length) extra[accion] = libres;
  }
  return extra;
}

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
  const extra = (teclasExtraDe(i).disparar || []).map(nombreTecla);
  const dispara = [n('disparar'), ...extra].join(' o ');
  return `${mover} · ${dispara} dispara · ${n('rodada')} rueda\n${n('usar')} usa objeto · ${n('cambiar')} cambia · ${n('burla1')} ${n('burla2')} ${n('burla3')} burlas`;
}

// Avisa en el momento exacto en que se aprieta la tecla (aunque se suelte enseguida).
// Revisar "¿está apretada?" una vez por cuadro pierde los toques muy rápidos.
export function alApretar(tecla, fn) {
  tecla.on('down', fn);
}

export class EntradaTeclado {
  constructor(escena, teclas, extra = {}) {
    this.t = escena.input.keyboard.addKeys(teclas);
    this.extraDisparar = (extra.disparar || []).map((k) => escena.input.keyboard.addKey(k));
    this.reiniciar();
    const t = this.t;
    alApretar(t.rodada, () => { this.toques.rodada = true; });
    alApretar(t.usar, () => { this.toques.usar = true; });
    alApretar(t.cambiar, () => { this.toques.cambiar = true; });
    alApretar(t.burla1, () => { this.toques.burla = 1; });
    alApretar(t.burla2, () => { this.toques.burla = 2; });
    alApretar(t.burla3, () => { this.toques.burla = 3; });
    for (const k of [t.disparar, ...this.extraDisparar]) alApretar(k, () => { this.toques.disparo = true; });
  }

  reiniciar() {
    this.toques = { rodada: false, usar: false, cambiar: false, burla: 0, disparo: false };
  }

  leer() {
    const t = this.t;
    const g = this.toques;
    this.reiniciar();
    return {
      moverX: (t.derecha.isDown ? 1 : 0) - (t.izquierda.isDown ? 1 : 0),
      moverY: (t.abajo.isDown ? 1 : 0) - (t.arriba.isDown ? 1 : 0),
      apuntarX: 0,
      apuntarY: 0, // con teclado el apuntado es asistido
      // Mantener dispara seguido; un toque rapidísimo igual cuenta como un disparo
      disparar: t.disparar.isDown || this.extraDisparar.some((k) => k.isDown) || g.disparo,
      rodada: g.rodada,
      usar: g.usar,
      cambiar: g.cambiar,
      burla: g.burla,
    };
  }
}
