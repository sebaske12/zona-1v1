// Mapas (plan, sección 1.6). Cada mapa se define a medias y el resto se genera
// girándolo media vuelta: así es simétrico y ninguna esquina tiene ventaja.
import { ANCHO, ALTO } from '../config.js';

const girar = ([x, y, w, h]) => [ANCHO - x - w, ALTO - y - h, w, h];
const girarPunto = ([x, y]) => [ANCHO - x, ALTO - y];

function mapa({ nombre, texto, muros, cajas, agua = [], inicio }) {
  return {
    nombre,
    texto,
    muros: [...muros, ...muros.map(girar)],   // [x, y, ancho, alto]
    cajas: [...cajas, ...cajas.map(girarPunto)], // [x, y] centro de cada caja
    agua: [...agua, ...agua.map(girar)],       // frena 40 %
    inicio: [inicio, girarPunto(inicio)],      // J1 y J2
  };
}

export const MAPAS = {
  bodega: mapa({
    nombre: 'Bodega',
    texto: 'Coberturas cerca de todo. Ideal para empezar.',
    muros: [
      [300, 90, 40, 200], [520, 180, 240, 36], [140, 420, 180, 36],
      [560, 330, 28, 60], [420, 560, 36, 110],
    ],
    cajas: [[220, 220], [440, 120], [120, 600], [640, 110]],
    inicio: [90, 90],
  }),

  pueblo: mapa({
    nombre: 'Pueblo',
    texto: 'Casas con puertas y calles largas. Bueno para el francotirador.',
    muros: [
      // Casa grande
      [180, 140, 220, 20], [180, 140, 20, 160], [380, 140, 20, 160], [180, 280, 80, 20], [320, 280, 80, 20],
      // Casa de arriba
      [700, 60, 200, 20], [700, 60, 20, 140], [880, 60, 20, 140], [700, 180, 70, 20], [830, 180, 70, 20],
      // Cerca y barriles del centro
      [80, 400, 160, 20], [592, 300, 24, 24], [664, 300, 24, 24],
    ],
    cajas: [[290, 220], [800, 130], [120, 640], [560, 250]],
    inicio: [60, 60],
  }),

  isla: mapa({
    nombre: 'Isla',
    texto: 'Un río te frena 40 %. El puente del centro es el camino rápido.',
    muros: [
      [200, 150, 60, 60], [300, 480, 120, 30], [420, 250, 30, 120],
      [560, 292, 160, 8], // baranda del puente
    ],
    agua: [[560, 0, 160, 300]],
    cajas: [[130, 620], [380, 100], [480, 420], [250, 330]],
    inicio: [70, 70],
  }),
};

export const ORDEN_MAPAS = ['bodega', 'pueblo', 'isla'];
