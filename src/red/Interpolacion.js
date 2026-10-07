// Suavizado de lo que llega por la red.
// Cada muestra trae la hora del aparato que la mandó. Así se sabe cuánto tardó en llegar y cuánto
// varía la red, y se dibuja apenas un poquito en el pasado: lo justo para que un paquete atrasado
// no haga saltar ni congelar a nadie. Con buena señal el retraso baja solo; con mala, sube solo.
const VENTANA = 3000; // ms de historia para medir la red
const ADIVINAR = 200; // si se atrasan los paquetes, se sigue el movimiento hasta 200 ms "adivinando"

// Sigue la posición calculada muy de cerca (unos 25 ms): en movimiento normal casi no se nota,
// pero si un paquete llegó tarde y hay que corregir, el muñeco se desliza en vez de saltar.
export class Seguidor {
  constructor() {
    this.x = null;
    this.y = null;
  }

  ir(x, y, dt) {
    if (this.x === null || Math.hypot(x - this.x, y - this.y) > 120) {
      this.x = x; // muy lejos (empezó la ronda, rodada larga…): directo
      this.y = y;
    } else {
      const k = 1 - Math.exp(-dt / 0.025);
      this.x += (x - this.x) * k;
      this.y += (y - this.y) * k;
    }
    return this;
  }
}

export class Interpolador {
  constructor() {
    this.muestras = [];
    this.llegadas = [];
    this.minimo = null;
    this.intervalo = 40;
    this.objetivo = 80;
    this.retraso = 80;
  }

  // ts: hora del que manda (ms). Devuelve false si llegó una más vieja que la última (se descarta).
  agregar(ts, datos, ahora = performance.now()) {
    if (!Number.isFinite(ts)) return false;
    const n = this.muestras.length;
    const ultima = this.muestras[n - 1];
    if (ultima && ts <= ultima.ts) return false;
    if (ultima) this.intervalo = this.intervalo * 0.9 + Math.min(200, ts - ultima.ts) * 0.1;
    this.muestras.push({ ts, d: datos });
    if (this.muestras.length > 60) this.muestras.shift();

    this.llegadas.push({ en: ahora, desfase: ahora - ts });
    while (this.llegadas.length > 1 && ahora - this.llegadas[0].en > VENTANA) this.llegadas.shift();
    // El paquete más rápido marca la diferencia entre los relojes; lo demás es lo que varía la red
    let min = Infinity;
    for (const l of this.llegadas) min = Math.min(min, l.desfase);
    const primera = this.minimo === null;
    this.minimo = min;
    // Se espera lo justo para 9 de cada 10 paquetes; el que se atrase más se cubre "adivinando"
    const variacion = this.llegadas.map((l) => l.desfase - min).sort((a, b) => a - b);
    const p90 = variacion[Math.floor((variacion.length - 1) * 0.9)] || 0;
    this.objetivo = Math.min(300, Math.max(this.intervalo + 12, this.intervalo + p90 + 10));
    if (primera) this.retraso = this.objetivo;
    return true;
  }

  // La conexión cambió de camino (directo ↔ servidor): se vuelve a medir la red desde cero
  olvidarRed() {
    this.llegadas = [];
    this.minimo = null;
  }

  // La hora (en el reloj del que manda) que toca dibujar ahora
  hora(ahora = performance.now()) {
    if (this.minimo === null) return null;
    // El retraso se acomoda despacio para que no se note el cambio
    this.retraso += (this.objetivo - this.retraso) * (this.objetivo > this.retraso ? 0.08 : 0.02);
    return ahora - this.minimo - this.retraso;
  }

  // Las dos muestras alrededor de la hora t y cuánto avanzar entre ellas.
  // k > 1 quiere decir que se está adivinando hacia adelante (siguiendo el último movimiento).
  en(t) {
    const m = this.muestras;
    const n = m.length;
    if (!n || t === null) return null;
    const ultima = m[n - 1];
    if (t >= ultima.ts) {
      if (n < 2) return { a: ultima, b: ultima, k: 1 };
      const a = m[n - 2];
      return { a, b: ultima, k: 1 + Math.min(t - ultima.ts, ADIVINAR) / Math.max(1, ultima.ts - a.ts) };
    }
    for (let i = n - 1; i > 0; i--) {
      if (m[i - 1].ts <= t) return { a: m[i - 1], b: m[i], k: (t - m[i - 1].ts) / Math.max(1, m[i].ts - m[i - 1].ts) };
    }
    return { a: m[0], b: m[0], k: 0 };
  }

  // La muestra más nueva que ya se debería ver a la hora t (para lo que no se suaviza)
  ultimaHasta(t) {
    const m = this.muestras;
    for (let i = m.length - 1; i >= 0; i--) if (m[i].ts <= t) return m[i];
    return m[0] || null;
  }
}
