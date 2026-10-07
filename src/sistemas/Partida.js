// Estado de una partida completa (al mejor de 5). Vive en el registro de Phaser
// para que todas las escenas lo vean: this.registry.get('partida').
export function nuevaPartida({ perfiles, mapa, modo, vida, apuestas, bot = false }) {
  return {
    bot, // true en el modo entrenamiento: el jugador 2 lo maneja la computadora
    perfiles: perfiles.map((p) => ({ ...p })),
    mapa,
    modo,
    vida: [...vida],
    apuestas: [...apuestas],
    rondas: [0, 0],
    numeroRonda: 1,
    ventajas: [[], []],
    estadisticas: [estadisticasVacias(), estadisticasVacias()],
    ganador: null,
    guardada: false,
  };
}

// Lo que el anfitrión le manda al invitado entre rondas
export function resumenPartida(p) {
  return {
    rondas: [...p.rondas],
    numeroRonda: p.numeroRonda,
    ventajas: p.ventajas.map((v) => [...v]),
    estadisticas: p.estadisticas,
    ganador: p.ganador,
  };
}

function estadisticasVacias() {
  return { bajas: 0, bajasPorArma: {}, dano: 0, disparos: 0, aciertos: 0, rondas: 0, burlas: 0 };
}
