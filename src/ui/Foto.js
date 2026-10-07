// "Tu cara": tomar o elegir una foto, acomodarla en un círculo y convertirla en caricatura
// (colores fuertes, pocos tonos y contornos oscuros, como de cómic).
// El editor es HTML encima del juego: así funciona igual con el dedo y con el ratón.
const TAM_CARA = 96; // la cara se guarda de 96 × 96 píxeles
const TAM_EDITOR = 340;
let estilosListos = false;

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function ponerEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const s = document.createElement('style');
  s.textContent = `
  #editor-cara { position: fixed; inset: 0; z-index: 30; background: rgba(13,17,29,.97); color: #e7eaf2;
    font: 600 18px "Chakra Petch", system-ui, sans-serif; display: flex; flex-wrap: wrap; align-items: center;
    justify-content: center; gap: 14px 36px; padding: 14px; box-sizing: border-box; touch-action: none;
    -webkit-user-select: none; user-select: none; overflow: auto; }
  #editor-cara canvas.recorte { width: min(78vh, 80vw, 340px); height: min(78vh, 80vw, 340px); border-radius: 50%;
    border: 4px solid #7ea0ff; touch-action: none; cursor: grab; background: #1a2135; }
  #editor-cara .lado { display: flex; flex-direction: column; align-items: center; gap: 10px; max-width: 320px; text-align: center; }
  #editor-cara .resultado { width: 96px; height: 96px; }
  #editor-cara input[type=range] { width: 240px; accent-color: #d8432f; }
  #editor-cara .botones { display: flex; gap: 10px; }
  #editor-cara button { font: inherit; font-size: 17px; padding: 10px 18px; border-radius: 8px; color: #fff;
    border: 2px solid rgba(255,255,255,.2); background: #2a3249; cursor: pointer; }
  #editor-cara button.listo { background: #d8432f; }
  #editor-cara .ayuda { font-size: 14px; color: #9ba4ba; font-weight: 500; }`;
  document.head.appendChild(s);
}

// Abre la cámara o la galería (en el iPhone: "Tomar foto" o "Fototeca"; en el PC: elegir un archivo)
export function elegirFoto(alTerminar) {
  document.querySelectorAll('input.foto-cara').forEach((n) => n.remove());
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.className = 'foto-cara';
  input.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0;';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const archivo = input.files && input.files[0];
    input.remove();
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => abrirEditor(img, url, alTerminar);
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  });
  input.click();
}

function abrirEditor(img, url, alTerminar) {
  ponerEstilos();
  const D = TAM_EDITOR;
  const raiz = document.createElement('div');
  raiz.id = 'editor-cara';
  raiz.innerHTML = `
    <canvas class="recorte" width="${D}" height="${D}"></canvas>
    <div class="lado">
      <div>Acomoda tu cara en el círculo</div>
      <div class="ayuda">Arrástrala para moverla y acércala con la barra (o con dos dedos).</div>
      <input type="range" min="1" max="4" step="0.01" value="1.3" aria-label="Acercar">
      <div class="ayuda">Así vas a quedar en el juego:</div>
      <canvas class="resultado" width="${TAM_CARA}" height="${TAM_CARA}"></canvas>
      <div class="botones"><button class="cancelar" type="button">Cancelar</button><button class="listo" type="button">¡Listo!</button></div>
    </div>`;
  document.body.appendChild(raiz);
  const recorte = raiz.querySelector('canvas.recorte');
  const resultado = raiz.querySelector('canvas.resultado');
  const barra = raiz.querySelector('input');
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const base = D / Math.min(W, H); // escala con la que la foto cubre justo el círculo
  let zoom = 1.3;
  let ox = 0; // dónde está el centro de la foto respecto al centro del círculo
  let oy = 0;
  let espera = null;

  const ajustar = () => {
    const s = base * zoom;
    const mx = Math.max(0, (W * s - D) / 2);
    const my = Math.max(0, (H * s - D) / 2);
    ox = limitar(ox, -mx, mx);
    oy = limitar(oy, -my, my);
  };
  const dibujarEn = (ctx, tam) => {
    const k = tam / D;
    const s = base * zoom * k;
    ctx.clearRect(0, 0, tam, tam);
    ctx.save();
    ctx.beginPath();
    ctx.arc(tam / 2, tam / 2, tam / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, tam / 2 + ox * k - (W * s) / 2, tam / 2 + oy * k - (H * s) / 2, W * s, H * s);
    ctx.restore();
  };
  const pintar = () => {
    ajustar();
    dibujarEn(recorte.getContext('2d'), D);
    clearTimeout(espera);
    espera = setTimeout(() => {
      const c = resultado.getContext('2d', { willReadFrequently: true });
      dibujarEn(c, TAM_CARA);
      caricatura(c, TAM_CARA);
    }, 60);
  };

  // Arrastrar con un dedo, pellizcar con dos
  const dedos = new Map();
  recorte.addEventListener('pointerdown', (e) => {
    recorte.setPointerCapture?.(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  recorte.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId)) return;
    const antes = [...dedos.values()];
    const previo = dedos.get(e.pointerId);
    const ahora = { x: e.clientX, y: e.clientY };
    dedos.set(e.pointerId, ahora);
    const escala = D / recorte.getBoundingClientRect().width;
    if (dedos.size === 1) {
      ox += (ahora.x - previo.x) * escala;
      oy += (ahora.y - previo.y) * escala;
    } else {
      const despues = [...dedos.values()];
      const d0 = distancia(antes[0], antes[1]);
      if (d0 > 0) zoom = limitar((zoom * distancia(despues[0], despues[1])) / d0, 1, 4);
      barra.value = String(zoom);
    }
    pintar();
  });
  const soltar = (e) => dedos.delete(e.pointerId);
  recorte.addEventListener('pointerup', soltar);
  recorte.addEventListener('pointercancel', soltar);
  recorte.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = limitar(zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 4);
    barra.value = String(zoom);
    pintar();
  }, { passive: false });
  barra.addEventListener('input', () => {
    zoom = Number(barra.value);
    pintar();
  });

  const cerrar = () => {
    clearTimeout(espera);
    raiz.remove();
    URL.revokeObjectURL(url);
  };
  raiz.querySelector('.cancelar').addEventListener('click', () => {
    cerrar();
    alTerminar(null);
  });
  raiz.querySelector('.listo').addEventListener('click', () => {
    const c = document.createElement('canvas');
    c.width = TAM_CARA;
    c.height = TAM_CARA;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    dibujarEn(ctx, TAM_CARA);
    caricatura(ctx, TAM_CARA);
    const datos = c.toDataURL('image/png');
    cerrar();
    alTerminar(datos);
  });
  pintar();
}

// El filtro de caricatura: más color y contraste, pocos tonos y bordes oscuros
export function caricatura(ctx, T) {
  const datos = ctx.getImageData(0, 0, T, T);
  const p = datos.data;
  const luz = new Float32Array(T * T);
  const NIVELES = 6;
  const paso = 255 / (NIVELES - 1);
  for (let i = 0, k = 0; i < p.length; i += 4, k++) {
    const r = p[i];
    const g = p[i + 1];
    const b = p[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    luz[k] = l;
    const tono = (c) => {
      const v = ((l + (c - l) * 1.4) - 128) * 1.12 + 136; // más color, más contraste, un poco más claro
      return limitar(Math.round(v / paso) * paso, 0, 255); // pocos tonos, como dibujo animado
    };
    p[i] = tono(r);
    p[i + 1] = tono(g);
    p[i + 2] = tono(b);
  }
  // Se suaviza la luz antes de buscar bordes para que no salgan puntitos
  const s = new Float32Array(T * T);
  for (let y = 1; y < T - 1; y++) {
    for (let x = 1; x < T - 1; x++) {
      let suma = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) suma += luz[(y + dy) * T + x + dx];
      s[y * T + x] = suma / 9;
    }
  }
  // Bordes (filtro de Sobel): donde la luz cambia fuerte se pinta una línea oscura
  for (let y = 2; y < T - 2; y++) {
    for (let x = 2; x < T - 2; x++) {
      const k = y * T + x;
      const i = k * 4;
      if (p[i + 3] < 200) continue;
      const gx = -s[k - T - 1] - 2 * s[k - 1] - s[k + T - 1] + s[k - T + 1] + 2 * s[k + 1] + s[k + T + 1];
      const gy = -s[k - T - 1] - 2 * s[k - T] - s[k - T + 1] + s[k + T - 1] + 2 * s[k + T] + s[k + T + 1];
      const m = Math.hypot(gx, gy);
      if (m > 60) {
        const f = Math.max(0.12, 1 - (m - 60) / 110);
        p[i] *= f;
        p[i + 1] *= f;
        p[i + 2] *= f;
      }
    }
  }
  ctx.putImageData(datos, 0, 0);
  // Contorno grueso alrededor
  ctx.beginPath();
  ctx.arc(T / 2, T / 2, T / 2 - 2, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0d111d';
  ctx.stroke();
}
