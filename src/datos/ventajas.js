// Ventajas entre rondas (plan, sección 1.4). Cada una cambia las estadísticas del jugador.
export const VENTAJAS = [
  { id: 'pies', nombre: 'Pies ligeros', texto: '+12 % de velocidad', aplicar: (s) => { s.velocidad *= 1.12; } },
  { id: 'piel', nombre: 'Piel dura', texto: '+20 de vida máxima', aplicar: (s) => { s.vidaMax += 20; } },
  { id: 'vampiro', nombre: 'Vampiro', texto: 'Recuperas 15 % del daño que haces', aplicar: (s) => { s.vampiro += 0.15; } },
  { id: 'bolsillos', nombre: 'Bolsillos grandes', texto: '+50 % de balas por cargador', aplicar: (s) => { s.cargador *= 1.5; } },
  { id: 'manos', nombre: 'Manos rápidas', texto: 'Recargas 35 % más rápido', aplicar: (s) => { s.recarga *= 0.65; } },
  { id: 'doble', nombre: 'Doble rodada', texto: 'Guardas 2 rodadas', aplicar: (s) => { s.cargasRodada = 2; } },
  { id: 'gel', nombre: 'Gel de reserva', texto: 'Empiezas cada ronda con 1 pared de gel', aplicar: (s) => { s.inicio.gel += 1; } },
  { id: 'halcon', nombre: 'Ojo de halcón', texto: 'Balas 25 % más rápidas y 20 % más de alcance', aplicar: (s) => { s.velBala *= 1.25; s.alcance *= 1.2; } },
  { id: 'armado', nombre: 'Arranque armado', texto: 'Empiezas cada ronda con escopeta', aplicar: (s) => { s.inicio.arma = 'escopeta'; } },
  { id: 'botiquin', nombre: 'Botiquín de bolsillo', texto: 'Empiezas cada ronda con 1 botiquín', aplicar: (s) => { s.inicio.botiquin += 1; } },
];

export const MAX_VENTAJAS = 4;

// Las 3 cartas que le salen a cada jugador (sin repetir las que ya tiene)
export function sortearOpciones(partida) {
  return [0, 1].map((i) => {
    const tiene = partida.ventajas[i];
    if (tiene.length >= MAX_VENTAJAS) return [];
    const libres = VENTAJAS.filter((v) => !tiene.includes(v.id)).map((v) => v.id);
    for (let k = libres.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [libres[k], libres[r]] = [libres[r], libres[k]];
    }
    return libres.slice(0, 3);
  });
}

// Estadísticas del jugador i en esta ronda: hándicap + sus ventajas
export function statsDeJugador(partida, i) {
  const s = {
    vidaMax: partida.vida[i],
    velocidad: 220,
    vampiro: 0,
    cargador: 1,
    recarga: 1,
    cargasRodada: 1,
    velBala: 1,
    alcance: 1,
    inicio: { gel: 0, botiquin: 0, arma: null },
  };
  for (const id of partida.ventajas[i]) VENTAJAS.find((v) => v.id === id)?.aplicar(s);
  return s;
}
