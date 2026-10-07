// La zona que se cierra (plan, sección 1.2).
import { ANCHO, ALTO } from '../config.js';

// desde/hasta: segundos · tamano: fracción del radio inicial · dano: vida por segundo afuera
export const FASES_ZONA = [
  { desde: 25, hasta: 40, tamano: 0.6, dano: 5 },
  { desde: 50, hasta: 65, tamano: 0.3, dano: 10 },
  { desde: 75, hasta: 90, tamano: 0, dano: 20 },
];

// Al principio el círculo cubre todo el mapa
export const RADIO_INICIAL = Math.ceil(Math.hypot(ANCHO / 2, ALTO / 2)) + 4;

export const AIRDROP = { aviso: 40, cae: 45 };

// Calcula cómo está la zona en el segundo t
export function estadoZona(t, fases) {
  let radio = RADIO_INICIAL;
  let previo = RADIO_INICIAL;
  let dano = 0;
  let siguiente = null; // hasta dónde se va a cerrar (se dibuja como guía)
  for (const f of fases) {
    const objetivo = f.tamano * RADIO_INICIAL;
    if (t >= f.hasta) {
      radio = previo = objetivo;
      dano = f.dano;
      continue;
    }
    if (t >= f.desde) {
      const p = (t - f.desde) / (f.hasta - f.desde);
      radio = previo + (objetivo - previo) * p;
      dano = f.dano;
      siguiente = objetivo;
    } else if (t >= f.desde - 5) {
      siguiente = objetivo;
    }
    break;
  }
  return { radio, dano, siguiente };
}

export function duracionRonda(fases) {
  return fases[fases.length - 1].hasta;
}
