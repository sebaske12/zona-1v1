// Modos de juego (plan, sección 1.6).
import { BOTIN, BOTIN_ESCOPETAS } from './botin.js';
import { FASES_ZONA } from './zona.js';

export const MODOS = {
  clasico: {
    nombre: 'Clásico',
    texto: 'Botín, zona que se cierra y airdrop.',
    botin: BOTIN, cajas: true, airdrop: true, fases: FASES_ZONA,
  },
  escopetas: {
    nombre: 'Solo escopetas',
    texto: 'Las cajas traen escopeta, botiquín o gel. Pura pelea de cerca.',
    botin: BOTIN_ESCOPETAS, cajas: true, airdrop: true, fases: FASES_ZONA,
  },
  untiro: {
    nombre: 'Un tiro',
    texto: '1 de vida, solo pistola y sin cajas. Rondas de 30 segundos.',
    botin: BOTIN, cajas: false, airdrop: false, vida: 1, sinVentajas: true,
    fases: [
      { desde: 10, hasta: 20, tamano: 0.35, dano: 100 },
      { desde: 22, hasta: 30, tamano: 0, dano: 100 },
    ],
  },
  caos: {
    nombre: 'Caos',
    texto: 'Además de las cajas, cada 10 s cae un objeto al lado de cada uno.',
    botin: BOTIN, cajas: true, airdrop: true, caos: 10, fases: FASES_ZONA,
  },
};

export const ORDEN_MODOS = ['clasico', 'escopetas', 'untiro', 'caos'];
