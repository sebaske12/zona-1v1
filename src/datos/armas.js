// Tabla de armas y objetos (plan, sección 1.3). Cambia un número aquí y cambia el juego.
// dano: por bala · porSegundo: disparos por segundo · recarga: segundos
// alcance: píxeles · abertura: grados de dispersión · velBala: píxeles por segundo
export const ARMAS = {
  pistola:  { nombre: 'Pistola',       dano: 15, porSegundo: 3,   cargador: 12, recarga: 1.0, alcance: 450,  abertura: 3,  balas: 1, velBala: 900,  sonido: 'pistola' },
  subfusil: { nombre: 'Subfusil',      dano: 8,  porSegundo: 10,  cargador: 30, recarga: 1.5, alcance: 350,  abertura: 8,  balas: 1, velBala: 900,  sonido: 'subfusil' },
  escopeta: { nombre: 'Escopeta',      dano: 10, porSegundo: 1,   cargador: 5,  recarga: 2.5, alcance: 220,  abertura: 25, balas: 6, velBala: 900,  sonido: 'escopeta', sacudida: 0.006, retroceso: 6 },
  rifle:    { nombre: 'Rifle',         dano: 14, porSegundo: 6,   cargador: 25, recarga: 1.8, alcance: 600,  abertura: 4,  balas: 1, velBala: 1000, sonido: 'rifle' },
  franco:   { nombre: 'Francotirador', dano: 75, porSegundo: 0.6, cargador: 3,  recarga: 2.5, alcance: 1500, abertura: 0,  balas: 1, rayo: true, apuntado: 0.4, velocidad: 190, sonido: 'franco', sacudida: 0.01 },
  dorado:   { nombre: 'Rifle dorado',  dano: 18, porSegundo: 6,   cargador: 40, recarga: 1.5, alcance: 600,  abertura: 4,  balas: 1, velBala: 1000, sonido: 'rifle' },
  // El cohete no hace daño al tocar: explota (al chocar o al llegar a su alcance) y daña en un área
  cohetes:  { nombre: 'Lanzacohetes',  dano: 0,  porSegundo: 0.5, cargador: 1,  recarga: 2.2, alcance: 700,  abertura: 0,  balas: 1, velBala: 520,  sonido: 'cohete', textura: 'cohete', explosivo: { dano: 55, radio: 90 }, velocidad: 200, sacudida: 0.004 },
};

// radio en píxeles · mecha en segundos · danoPropio: fracción del daño si te agarra a ti
export const GRANADA = { dano: 50, radio: 80, mecha: 1.5, velocidad: 900, max: 2, danoPropio: 0.5 };
export const BOTIQUIN = { cura: 40, tiempo: 2, max: 3 };
export const CHALECO = 50;
export const GEL = { largo: 80, grueso: 16, vida: 150, dura: 8, max: 3, distancia: 34 };

export function nombreArma(clave) {
  if (!clave) return '—';
  if (clave === 'granada') return 'Granada';
  return ARMAS[clave]?.nombre ?? '—';
}
