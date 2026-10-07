// Música de fondo generada con código (sin archivos). Tres ánimos:
// menu (tranquila), ronda (con bombo) y tension (más rápida, cuando la zona se cierra del todo).
import { Sonido } from './Sonido.js';

const TEMPO = { menu: 92, ronda: 122, tension: 140 };
const BAJO = [45, 45, 48, 45, 43, 45, 40, 43, 45, 45, 48, 50, 52, 50, 48, 43]; // notas MIDI (La menor)
const VOLUMEN = 0.13;

let modo = null;
let activa = true;
let siguiente = 0;
let paso = 0;
let ctxActual = null;
let salida = null;
let ruido = null;

const frecuencia = (midi) => 440 * 2 ** ((midi - 69) / 12);

function preparar(ctx) {
  ctxActual = ctx;
  salida = ctx.createGain();
  salida.gain.value = VOLUMEN;
  salida.connect(ctx.destination);
  ruido = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function envolvente(ctx, t, dura, vol) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
  g.connect(salida);
  return g;
}

function bajo(ctx, t, nota, dura) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = frecuencia(nota);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(modo === 'tension' ? 900 : 600, t);
  f.frequency.exponentialRampToValueAtTime(180, t + dura);
  o.connect(f).connect(envolvente(ctx, t, dura, 0.5));
  o.start(t);
  o.stop(t + dura + 0.02);
}

function bombo(ctx, t) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  o.connect(envolvente(ctx, t, 0.22, 0.9));
  o.start(t);
  o.stop(t + 0.25);
}

function platillo(ctx, t, vol) {
  const s = ctx.createBufferSource();
  s.buffer = ruido;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  s.connect(f).connect(envolvente(ctx, t, 0.05, vol));
  s.start(t, Math.random() * 0.3);
  s.stop(t + 0.07);
}

function caja(ctx, t) {
  const s = ctx.createBufferSource();
  s.buffer = ruido;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  s.connect(f).connect(envolvente(ctx, t, 0.14, 0.5));
  s.start(t, Math.random() * 0.3);
  s.stop(t + 0.16);
}

function campana(ctx, t, nota) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = frecuencia(nota);
  o.connect(envolvente(ctx, t, 0.6, 0.18));
  o.start(t);
  o.stop(t + 0.65);
}

function tocarPaso(ctx, p, t, corchea) {
  const nota = BAJO[p];
  if (modo === 'menu') {
    if (p % 2 === 0) bajo(ctx, t, nota, corchea * 1.8);
    if (p % 4 === 0) campana(ctx, t, nota + 24);
    return;
  }
  bajo(ctx, t, nota, corchea * 0.9);
  if (p % 4 === 0) bombo(ctx, t);
  if (p % 2 === 1) platillo(ctx, t, 0.12);
  if (modo === 'tension') {
    if (p % 4 === 2) caja(ctx, t);
    platillo(ctx, t, 0.06);
  }
}

// Se revisa cada 50 ms y se programan las notas que vienen (así la música no se traba)
setInterval(() => {
  const ctx = Sonido.contexto;
  if (!ctx || !modo || !activa || !Sonido.activo) {
    siguiente = 0;
    return;
  }
  if (ctx !== ctxActual) preparar(ctx);
  if (siguiente < ctx.currentTime) siguiente = ctx.currentTime + 0.05;
  const corchea = 60 / TEMPO[modo] / 2;
  while (siguiente < ctx.currentTime + 0.15) {
    tocarPaso(ctx, paso, siguiente, corchea);
    siguiente += corchea;
    paso = (paso + 1) % BAJO.length;
  }
}, 50);

export const Musica = {
  poner(nuevo) {
    modo = nuevo;
  },
  parar() {
    modo = null;
  },
  get activa() { return activa; },
  set activa(v) { activa = v; },
};
