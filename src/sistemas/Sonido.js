// Sonidos generados con Web Audio: no hay que descargar archivos.
// iOS y los navegadores solo dejan sonar después del primer toque o tecla.
let ctx = null;
let salida = null;
let ruidoBuf = null;
let activo = true;

function crearRuido() {
  const largo = ctx.sampleRate;
  const buf = ctx.createBuffer(1, largo, ctx.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
  return buf;
}

function ruido(t, dura, { vol = 0.5, filtro = 'lowpass', frec = 2000, frecFin = null } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = ruidoBuf;
  const f = ctx.createBiquadFilter();
  f.type = filtro;
  f.frequency.setValueAtTime(frec, t);
  if (frecFin) f.frequency.exponentialRampToValueAtTime(frecFin, t + dura);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dura);
  src.connect(f).connect(g).connect(salida);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dura + 0.02);
}

function tono(t, dura, { frec = 440, frecFin = null, tipo = 'square', vol = 0.2 } = {}) {
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  if (frecFin) o.frequency.exponentialRampToValueAtTime(frecFin, t + dura);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dura);
  o.connect(g).connect(salida);
  o.start(t);
  o.stop(t + dura + 0.02);
}

const SONIDOS = {
  pistola: (t) => { ruido(t, 0.09, { vol: 0.45, filtro: 'highpass', frec: 900 }); tono(t, 0.07, { frec: 260, frecFin: 90, vol: 0.18 }); },
  subfusil: (t) => { ruido(t, 0.06, { vol: 0.35, filtro: 'bandpass', frec: 2200 }); tono(t, 0.05, { frec: 320, frecFin: 120, vol: 0.12 }); },
  rifle: (t) => { ruido(t, 0.1, { vol: 0.5, frec: 3200, frecFin: 600 }); tono(t, 0.08, { frec: 200, frecFin: 60, vol: 0.2 }); },
  escopeta: (t) => { ruido(t, 0.28, { vol: 0.8, frec: 1800, frecFin: 200 }); tono(t, 0.16, { frec: 130, frecFin: 40, tipo: 'sawtooth', vol: 0.3 }); },
  franco: (t) => { ruido(t, 0.4, { vol: 0.9, frec: 4000, frecFin: 150 }); tono(t, 0.3, { frec: 500, frecFin: 45, tipo: 'sawtooth', vol: 0.3 }); },
  cohete: (t) => { ruido(t, 0.4, { vol: 0.45, filtro: 'bandpass', frec: 900, frecFin: 250 }); tono(t, 0.3, { frec: 110, frecFin: 55, tipo: 'sine', vol: 0.35 }); },
  apuntar: (t) => { tono(t, 0.12, { frec: 1200, frecFin: 1800, tipo: 'sine', vol: 0.12 }); },
  golpe: (t) => { tono(t, 0.06, { frec: 900, frecFin: 500, vol: 0.12 }); },
  muerte: (t) => { tono(t, 0.5, { frec: 320, frecFin: 50, tipo: 'sawtooth', vol: 0.25 }); ruido(t, 0.3, { vol: 0.3, frec: 800 }); },
  explosion: (t) => { ruido(t, 0.9, { vol: 1, frec: 900, frecFin: 60 }); tono(t, 0.6, { frec: 90, frecFin: 25, tipo: 'sine', vol: 0.6 }); },
  lanzar: (t) => { ruido(t, 0.15, { vol: 0.15, filtro: 'bandpass', frec: 1500, frecFin: 400 }); },
  recoger: (t) => { tono(t, 0.08, { frec: 620, tipo: 'triangle', vol: 0.2 }); tono(t + 0.08, 0.12, { frec: 930, tipo: 'triangle', vol: 0.2 }); },
  abrir: (t) => { ruido(t, 0.12, { vol: 0.25, filtro: 'bandpass', frec: 700 }); tono(t, 0.1, { frec: 300, frecFin: 520, tipo: 'triangle', vol: 0.12 }); },
  vacio: (t) => { tono(t, 0.03, { frec: 1400, vol: 0.08 }); },
  recarga: (t) => { tono(t, 0.03, { frec: 700, vol: 0.1 }); tono(t + 0.07, 0.04, { frec: 1000, vol: 0.1 }); },
  rodada: (t) => { ruido(t, 0.16, { vol: 0.22, filtro: 'bandpass', frec: 600, frecFin: 2400 }); },
  curar: (t) => { tono(t, 0.25, { frec: 400, frecFin: 600, tipo: 'sine', vol: 0.1 }); },
  curado: (t) => { tono(t, 0.1, { frec: 660, tipo: 'sine', vol: 0.15 }); tono(t + 0.1, 0.2, { frec: 990, tipo: 'sine', vol: 0.15 }); },
  gel: (t) => { tono(t, 0.2, { frec: 180, frecFin: 700, tipo: 'sine', vol: 0.2 }); ruido(t, 0.15, { vol: 0.12, frec: 3000 }); },
  gelRoto: (t) => { ruido(t, 0.25, { vol: 0.3, filtro: 'highpass', frec: 2000 }); },
  zona: (t) => { tono(t, 0.14, { frec: 520, tipo: 'triangle', vol: 0.18 }); tono(t + 0.2, 0.14, { frec: 520, tipo: 'triangle', vol: 0.18 }); },
  zonaDano: (t) => { tono(t, 0.05, { frec: 180, vol: 0.06 }); },
  airdrop: (t) => { tono(t, 0.35, { frec: 500, frecFin: 1000, tipo: 'triangle', vol: 0.18 }); },
  caer: (t) => { ruido(t, 0.35, { vol: 0.5, frec: 500, frecFin: 80 }); },
  burla: (t) => { tono(t, 0.12, { frec: 700, frecFin: 1100, tipo: 'triangle', vol: 0.15 }); },
  cuenta: (t) => { tono(t, 0.12, { frec: 660, vol: 0.12 }); },
  ya: (t) => { tono(t, 0.3, { frec: 990, vol: 0.15 }); },
  ronda: (t) => { [523, 659, 784].forEach((f, i) => tono(t + i * 0.1, 0.18, { frec: f, tipo: 'triangle', vol: 0.18 })); },
  victoria: (t) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono(t + i * 0.12, 0.22, { frec: f, tipo: 'triangle', vol: 0.2 })); },
  click: (t) => { tono(t, 0.03, { frec: 1100, tipo: 'triangle', vol: 0.08 }); },
};

export const Sonido = {
  desbloquear() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        salida = ctx.createGain();
        salida.gain.value = 0.55;
        salida.connect(ctx.destination);
        ruidoBuf = crearRuido();
      }
      // iOS deja el sonido "interrumpido" después de una llamada o de cambiar de app
      if (ctx.state !== 'running') ctx.resume();
    } catch (e) {
      ctx = null;
    }
  },

  tocar(nombre) {
    if (!ctx || !activo || ctx.state !== 'running') return;
    const f = SONIDOS[nombre];
    if (!f) return;
    try { f(ctx.currentTime + 0.005); } catch (e) { /* un sonido fallido no detiene el juego */ }
  },

  get activo() { return activo; },
  set activo(v) { activo = v; },

  // Para la música: el mismo "parlante" de los efectos, solo si ya está sonando
  get contexto() { return ctx && ctx.state === 'running' ? ctx : null; },
};
