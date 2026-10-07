// Constantes que usa todo el juego.
export const ANCHO = 1280;
export const ALTO = 720;
export const CENTRO = { x: ANCHO / 2, y: ALTO / 2 };

export const FUENTE = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';

// Colores que puede elegir cada jugador
export const COLORES_JUGADOR = [
  { nombre: 'Azul', valor: 0x3b6cff, css: '#5b84ff' },
  { nombre: 'Rosa', valor: 0xff4f8b, css: '#ff6b9d' },
  { nombre: 'Verde', valor: 0x2fbf71, css: '#3fd07f' },
  { nombre: 'Naranja', valor: 0xff8a1f, css: '#ff9d45' },
  { nombre: 'Morado', valor: 0x9b5cff, css: '#ae7bff' },
  { nombre: 'Amarillo', valor: 0xf2c230, css: '#f2c230' },
];

export const ACCESORIOS = [
  { id: 'ninguno', nombre: 'Nada' },
  { id: 'gorra', nombre: 'Gorra' },
  { id: 'casco', nombre: 'Casco' },
  { id: 'mono', nombre: 'Moño' },
];

export const BURLAS = ['😂', '🫵', '💀'];

export const RONDAS_PARA_GANAR = 3;

// Colores de la interfaz
export const UI = {
  texto: '#e7eaf2',
  suave: '#9ba4ba',
  borde: 0x2a3249,
  panel: 0x151a29,
  fondo: 0x0d111d,
  azul: 0x2453d4,
  rojo: 0xd8432f,
  gris: 0x2a3249,
  chaleco: 0x5aa0ff,
};

export function colorVida(p) {
  return p > 0.6 ? 0x3fd07f : p > 0.3 ? 0xf2c230 : 0xff5a4e;
}
