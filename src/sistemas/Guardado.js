// Guarda perfiles, ajustes e historial en el navegador (localStorage).
// El número de versión permite cambiar el formato después sin perder la rivalidad.
const CLAVE = 'zona1v1-datos';

const base = () => ({
  version: 1,
  perfiles: [
    { nombre: 'Jugador 1', color: 0, accesorio: 'ninguno' },
    { nombre: 'Jugador 2', color: 1, accesorio: 'ninguno' },
  ],
  preparacion: { mapa: 'bodega', modo: 'clasico', vida: [100, 100], apuestas: ['', ''] },
  ajustes: { sonido: true, musica: true, controlParaJ2: false, teclas: [{}, {}] },
  partidas: [],
});

export const Guardado = {
  leer() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE));
      if (d && d.version === 1) {
        const b = base();
        return { ...b, ...d, preparacion: { ...b.preparacion, ...d.preparacion }, ajustes: { ...b.ajustes, ...d.ajustes } };
      }
    } catch (e) { /* datos dañados o navegador privado: se empieza de cero */ }
    return base();
  },

  escribir(datos) {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin espacio o bloqueado */ }
  },

  actualizar(fn) {
    const d = this.leer();
    fn(d);
    this.escribir(d);
    return d;
  },
};

// Lo que se guarda de cada partida terminada
export function registroDePartida(p) {
  return {
    fecha: new Date().toISOString(),
    nombres: p.perfiles.map((x) => x.nombre),
    ganador: p.ganador,
    marcador: [...p.rondas],
    modo: p.modo,
    mapa: p.mapa,
    apuesta: (p.apuestas[p.ganador] || '').trim(),
    stats: p.estadisticas.map((e) => ({ bajas: e.bajas, dano: Math.round(e.dano), bajasPorArma: e.bajasPorArma })),
  };
}

// Resume la rivalidad entre dos nombres a partir del historial
export function resumenRivalidad(partidas, nombreA, nombreB) {
  const norm = (s) => (s || '').trim().toLowerCase();
  const A = norm(nombreA);
  const B = norm(nombreB);
  const lista = partidas.filter((p) => {
    const n = p.nombres.map(norm);
    return (n[0] === A && n[1] === B) || (n[0] === B && n[1] === A);
  });
  const vacio = () => ({ victorias: 0, racha: 0, rachaMax: 0, rondas: 0, rondasTotales: 0, armas: {}, granada: 0 });
  const r = { [A]: vacio(), [B]: vacio() };
  for (const p of lista) {
    const ganador = norm(p.nombres[p.ganador]);
    p.nombres.forEach((n, i) => {
      const s = r[norm(n)];
      if (!s) return;
      s.rondas += p.marcador[i];
      s.rondasTotales += p.marcador[0] + p.marcador[1];
      const armas = p.stats?.[i]?.bajasPorArma || {};
      for (const [arma, k] of Object.entries(armas)) s.armas[arma] = (s.armas[arma] || 0) + k;
      s.granada += armas.granada || 0;
      if (norm(n) === ganador) {
        s.victorias++;
        s.racha++;
        s.rachaMax = Math.max(s.rachaMax, s.racha);
      } else {
        s.racha = 0;
      }
    });
  }
  const favorita = (s) => Object.entries(s.armas).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
  const jugadores = [nombreA, nombreB].map((n) => {
    const s = r[norm(n)];
    return { nombre: n, ...s, favorita: favorita(s) };
  });
  const v0 = jugadores[0].victorias;
  const v1 = jugadores[1].victorias;
  return { total: lista.length, jugadores, lider: v0 === v1 ? null : v0 > v1 ? 0 : 1, ultimas: lista.slice(-8).reverse() };
}
