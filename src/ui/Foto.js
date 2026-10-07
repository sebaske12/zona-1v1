// Cabina de fotos: la cámara frontal en vivo con un estilo chistoso (cabezón, ojos saltones,
// bigotón, payaso, alien…), cuenta regresiva y flash. También se puede elegir una foto de la galería.
// El resultado es una cara redonda de caricatura de 96 × 96 que se guarda en el perfil.
import { Sonido } from '../sistemas/Sonido.js';

const TAM_CARA = 96; // así se guarda
const T = 160; // así se procesa (más grande = más detalle)
const D = 340; // tamaño interno de la vista

export const ESTILOS = [
  { id: 'cabezon', nombre: '🤪 Cabezón' },
  { id: 'ojos', nombre: '👀 Ojos saltones' },
  { id: 'bigote', nombre: '🥸 Bigotón' },
  { id: 'payaso', nombre: '🤡 Payaso' },
  { id: 'alien', nombre: '👽 Alien' },
  { id: 'normal', nombre: '🙂 Normal' },
];

let estilosListos = false;
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function ponerEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const s = document.createElement('style');
  s.textContent = `
  #cabina { position: fixed; inset: 0; z-index: 30; background: rgba(13,17,29,.97); color: #e7eaf2;
    font: 600 17px "Chakra Petch", system-ui, sans-serif; display: flex; flex-wrap: wrap; align-items: center;
    justify-content: center; gap: 12px 28px; padding: 12px; box-sizing: border-box; touch-action: none;
    -webkit-user-select: none; user-select: none; overflow: auto; }
  #cabina [hidden] { display: none !important; }
  #cabina .marco { position: relative; width: min(80vh, 82vw, 340px); height: min(80vh, 82vw, 340px); }
  #cabina canvas.vista { width: 100%; height: 100%; border-radius: 50%; border: 5px solid #f2b544;
    box-sizing: border-box; touch-action: none; background: #1a2135; }
  #cabina .cuenta { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 130px; font-weight: 700; color: #fff; text-shadow: 0 4px 0 #0d111d, 0 0 30px rgba(0,0,0,.6); pointer-events: none; }
  #cabina .flash { position: absolute; inset: 0; border-radius: 50%; background: #fff; opacity: 0; pointer-events: none; transition: opacity .35s ease-out; }
  #cabina .lado { display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 360px; text-align: center; }
  #cabina .titulo { font-size: 24px; font-weight: 700; color: #f2b544; }
  #cabina .ayuda { font-size: 14px; color: #9ba4ba; font-weight: 500; max-width: 340px; }
  #cabina .estilos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
  #cabina .estilos button { font-size: 14px; padding: 7px 4px; }
  #cabina .estilos button.activo { background: #d8432f; border-color: #fff; }
  #cabina input[type=range] { width: 240px; accent-color: #f2b544; }
  #cabina .botones { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  #cabina button { font: inherit; font-size: 16px; padding: 9px 16px; border-radius: 8px; color: #fff;
    border: 2px solid rgba(255,255,255,.2); background: #2a3249; cursor: pointer; }
  #cabina button.principal { background: #d8432f; font-size: 19px; padding: 10px 22px; }
  #cabina button.saltar { background: transparent; border-color: transparent; color: #9ba4ba; font-size: 14px; padding: 4px 10px; }
  #cabina button:disabled { opacity: .4; }`;
  document.head.appendChild(s);
}

// ---------- Efectos ----------

// Agranda o encoge zonas de la cara (como un espejo de feria)
function deformar(ctx, zonas) {
  const fuente = ctx.getImageData(0, 0, T, T);
  const a = fuente.data;
  const salida = ctx.createImageData(T, T);
  const b = salida.data;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      let sx = x + 0.5;
      let sy = y + 0.5;
      for (const z of zonas) {
        const cx = z.x * T;
        const cy = z.y * T;
        const R = z.r * T;
        const dx = sx - cx;
        const dy = sy - cy;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < R) {
          const k = Math.pow(d / R, z.p - 1); // p > 1: agranda el centro de la zona
          sx = cx + dx * k;
          sy = cy + dy * k;
        }
      }
      // Muestreo bilineal (más suave)
      const fx = limitar(sx - 0.5, 0, T - 1.001);
      const fy = limitar(sy - 0.5, 0, T - 1.001);
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const i00 = (y0 * T + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + T * 4;
      const i11 = i01 + 4;
      const o = (y * T + x) * 4;
      for (let c = 0; c < 4; c++) {
        const arriba = a[i00 + c] * (1 - tx) + a[i10 + c] * tx;
        const abajo = a[i01 + c] * (1 - tx) + a[i11 + c] * tx;
        b[o + c] = arriba * (1 - ty) + abajo * ty;
      }
    }
  }
  ctx.putImageData(salida, 0, 0);
}

// Filtro de caricatura: más color y contraste, pocos tonos y bordes oscuros de cómic
export function caricatura(ctx, tam = T, tinte = null) {
  const datos = ctx.getImageData(0, 0, tam, tam);
  const p = datos.data;
  const luz = new Float32Array(tam * tam);
  const paso = 255 / 5; // 6 tonos por color
  for (let i = 0, k = 0; i < p.length; i += 4, k++) {
    let r = p[i];
    let g = p[i + 1];
    let b = p[i + 2];
    if (tinte === 'alien') {
      r *= 0.55;
      g = g * 1.05 + 28;
      b *= 0.6;
    }
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    luz[k] = l;
    const tono = (c) => limitar(Math.round((((l + (c - l) * 1.4) - 128) * 1.12 + 136) / paso) * paso, 0, 255);
    p[i] = tono(r);
    p[i + 1] = tono(g);
    p[i + 2] = tono(b);
  }
  const s = new Float32Array(tam * tam);
  for (let y = 1; y < tam - 1; y++) {
    for (let x = 1; x < tam - 1; x++) {
      let suma = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) suma += luz[(y + dy) * tam + x + dx];
      s[y * tam + x] = suma / 9;
    }
  }
  for (let y = 2; y < tam - 2; y++) {
    for (let x = 2; x < tam - 2; x++) {
      const k = y * tam + x;
      const i = k * 4;
      if (p[i + 3] < 200) continue;
      const gx = -s[k - tam - 1] - 2 * s[k - 1] - s[k + tam - 1] + s[k - tam + 1] + 2 * s[k + 1] + s[k + tam + 1];
      const gy = -s[k - tam - 1] - 2 * s[k - tam] - s[k - tam + 1] + s[k + tam - 1] + 2 * s[k + tam] + s[k + tam + 1];
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
}

function contorno(ctx, tam) {
  ctx.beginPath();
  ctx.arc(tam / 2, tam / 2, tam / 2 - tam / 48, 0, Math.PI * 2);
  ctx.lineWidth = tam / 24;
  ctx.strokeStyle = '#0d111d';
  ctx.stroke();
}

function circulo(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Adornos dibujados encima (la guía ovalada hace que caigan en su lugar)
function adornos(ctx, estilo) {
  const u = T / 100;
  ctx.save();
  ctx.beginPath();
  ctx.arc(T / 2, T / 2, T / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineCap = 'round';
  if (estilo === 'bigote') {
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 6 * u;
    ctx.beginPath(); ctx.moveTo(25 * u, 34 * u); ctx.lineTo(42 * u, 29 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(58 * u, 29 * u); ctx.lineTo(75 * u, 34 * u); ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.moveTo(50 * u, 60 * u);
    ctx.bezierCurveTo(42 * u, 53 * u, 26 * u, 55 * u, 18 * u, 68 * u);
    ctx.bezierCurveTo(28 * u, 63 * u, 38 * u, 70 * u, 50 * u, 65 * u);
    ctx.bezierCurveTo(62 * u, 70 * u, 72 * u, 63 * u, 82 * u, 68 * u);
    ctx.bezierCurveTo(74 * u, 55 * u, 58 * u, 53 * u, 50 * u, 60 * u);
    ctx.fill();
  } else if (estilo === 'payaso') {
    circulo(ctx, 27 * u, 64 * u, 10 * u, 'rgba(255,90,140,.5)');
    circulo(ctx, 73 * u, 64 * u, 10 * u, 'rgba(255,90,140,.5)');
    circulo(ctx, 12 * u, 24 * u, 17 * u, '#ff8a1f');
    circulo(ctx, 24 * u, 9 * u, 13 * u, '#f2c230');
    circulo(ctx, 88 * u, 24 * u, 17 * u, '#3b6cff');
    circulo(ctx, 76 * u, 9 * u, 13 * u, '#2fbf71');
    circulo(ctx, 50 * u, 57 * u, 9 * u, '#e3262f');
    circulo(ctx, 47 * u, 54 * u, 2.8 * u, '#ffffff');
  } else if (estilo === 'alien') {
    ctx.strokeStyle = '#3fd07f';
    ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.moveTo(40 * u, 16 * u); ctx.lineTo(31 * u, 3 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60 * u, 16 * u); ctx.lineTo(69 * u, 3 * u); ctx.stroke();
    circulo(ctx, 31 * u, 4 * u, 4.5 * u, '#c6ff5a');
    circulo(ctx, 69 * u, 4 * u, 4.5 * u, '#c6ff5a');
  }
  ctx.restore();
}

function aplicarEstilo(ctx, estilo) {
  if (estilo === 'cabezon') deformar(ctx, [{ x: 0.5, y: 0.56, r: 0.46, p: 1.55 }]);
  if (estilo === 'ojos' || estilo === 'alien') deformar(ctx, [{ x: 0.36, y: 0.43, r: 0.17, p: 1.9 }, { x: 0.64, y: 0.43, r: 0.17, p: 1.9 }]);
  if (estilo === 'payaso') deformar(ctx, [{ x: 0.5, y: 0.57, r: 0.2, p: 1.4 }]);
  caricatura(ctx, T, estilo === 'alien' ? 'alien' : null);
  adornos(ctx, estilo);
  contorno(ctx, T);
}

// ---------- La cabina ----------

export function abrirCabina({ titulo = '¡Hora de la foto!', alTerminar }) {
  ponerEstilos();
  document.getElementById('cabina')?.remove();
  const raiz = document.createElement('div');
  raiz.id = 'cabina';
  raiz.innerHTML = `
    <div class="marco">
      <canvas class="vista" width="${D}" height="${D}"></canvas>
      <div class="cuenta"></div>
      <div class="flash"></div>
    </div>
    <div class="lado">
      <div class="titulo"></div>
      <div class="ayuda">Pon tu cara dentro del óvalo, con los ojos en los puntitos, y elige tu estilo.</div>
      <div class="estilos">${ESTILOS.map((e) => `<button type="button" data-estilo="${e.id}">${e.nombre}</button>`).join('')}</div>
      <input type="range" min="1" max="3" step="0.01" value="1.15" aria-label="Acercar">
      <div class="botones vivo">
        <button type="button" class="principal disparar">📸 ¡Foto!</button>
        <button type="button" class="galeria">🖼️ Galería</button>
      </div>
      <div class="botones listo" hidden>
        <button type="button" class="otra">Otra vez</button>
        <button type="button" class="principal usar">¡Me gusta!</button>
      </div>
      <button type="button" class="saltar">Ahora no</button>
    </div>`;
  document.body.appendChild(raiz);
  raiz.querySelector('.titulo').textContent = titulo;

  const vista = raiz.querySelector('canvas.vista');
  const v = vista.getContext('2d');
  const trabajo = document.createElement('canvas');
  trabajo.width = T;
  trabajo.height = T;
  const t = trabajo.getContext('2d', { willReadFrequently: true });
  const ayuda = raiz.querySelector('.ayuda');
  const cuenta = raiz.querySelector('.cuenta');
  const flash = raiz.querySelector('.flash');
  const barra = raiz.querySelector('input');
  const btnFoto = raiz.querySelector('.disparar');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');

  let estilo = 'cabezon';
  let modo = 'vivo'; // vivo: cámara en vivo · quieta: foto tomada o de la galería
  let fuente = null; // { el, w, h, espejo }
  let zoom = 1.15;
  let ox = 0;
  let oy = 0;
  let stream = null;
  let cerrado = false;
  let sucio = true;
  let contando = false;

  const marcarEstilo = () => {
    raiz.querySelectorAll('.estilos button').forEach((b) => b.classList.toggle('activo', b.dataset.estilo === estilo));
    sucio = true;
  };

  const ajustar = () => {
    if (!fuente || modo !== 'quieta') {
      ox = 0;
      oy = 0;
      return;
    }
    const s = (D / Math.min(fuente.w, fuente.h)) * zoom;
    ox = limitar(ox, -Math.max(0, (fuente.w * s - D) / 2), Math.max(0, (fuente.w * s - D) / 2));
    oy = limitar(oy, -Math.max(0, (fuente.h * s - D) / 2), Math.max(0, (fuente.h * s - D) / 2));
  };

  const dibujarFuente = () => {
    t.clearRect(0, 0, T, T);
    if (!fuente) return false;
    const k = T / D;
    const s = (T / Math.min(fuente.w, fuente.h)) * zoom;
    t.save();
    t.beginPath();
    t.arc(T / 2, T / 2, T / 2, 0, Math.PI * 2);
    t.clip();
    if (fuente.espejo) {
      t.translate(T, 0);
      t.scale(-1, 1); // como un espejo: así es más fácil acomodarse
    }
    t.drawImage(fuente.el, T / 2 + ox * k - (fuente.w * s) / 2, T / 2 + oy * k - (fuente.h * s) / 2, fuente.w * s, fuente.h * s);
    t.restore();
    return true;
  };

  const guia = () => {
    v.save();
    v.setLineDash([12, 9]);
    v.lineWidth = 3;
    v.strokeStyle = 'rgba(255,255,255,.75)';
    v.beginPath();
    v.ellipse(D / 2, D * 0.52, D * 0.3, D * 0.38, 0, 0, Math.PI * 2);
    v.stroke();
    v.setLineDash([]);
    v.fillStyle = 'rgba(255,255,255,.6)';
    for (const x of [0.36, 0.64]) {
      v.beginPath();
      v.arc(D * x, D * 0.43, 5, 0, Math.PI * 2);
      v.fill();
    }
    v.restore();
  };

  const pintar = () => {
    v.clearRect(0, 0, D, D);
    if (!dibujarFuente()) {
      if (modo === 'vivo') guia();
      return;
    }
    aplicarEstilo(t, estilo);
    v.save();
    v.beginPath();
    v.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2);
    v.clip();
    v.imageSmoothingEnabled = true;
    v.drawImage(trabajo, 0, 0, D, D);
    v.restore();
    if (modo === 'vivo') guia();
  };

  const bucle = () => {
    if (cerrado) return;
    if (modo === 'vivo' && video.readyState >= 2) pintar();
    else if (sucio) pintar();
    sucio = false;
    requestAnimationFrame(bucle);
  };

  const apagarCamara = () => {
    stream?.getTracks().forEach((pista) => pista.stop());
    stream = null;
  };

  const encenderCamara = async (intento = 1) => {
    modo = 'vivo';
    raiz.querySelector('.vivo').hidden = false;
    raiz.querySelector('.listo').hidden = true;
    ayuda.textContent = 'Pon tu cara dentro del óvalo, con los ojos en los puntitos, y elige tu estilo.';
    btnFoto.disabled = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('este navegador no tiene cámara');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        if (e?.name === 'NotAllowedError') throw e;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); // cualquier cámara que haya
      }
      if (cerrado) {
        apagarCamara();
        return;
      }
      video.srcObject = stream;
      await video.play();
      // Espera a que lleguen las primeras imágenes de la cámara
      for (let k = 0; k < 40 && (video.readyState < 2 || !video.videoWidth); k++) await new Promise((r) => setTimeout(r, 50));
      fuente = { el: video, w: video.videoWidth || 640, h: video.videoHeight || 480, espejo: true };
      btnFoto.disabled = false;
    } catch (e) {
      console.warn('Zona 1v1 · cámara:', e?.name, e?.message);
      apagarCamara();
      if (intento < 3 && !cerrado && e?.name !== 'NotAllowedError') {
        // A veces la cámara tarda en soltarse después de la foto anterior: se reintenta
        setTimeout(() => encenderCamara(intento + 1), 400 * intento);
        return;
      }
      fuente = null;
      ayuda.textContent = e?.name === 'NotAllowedError'
        ? 'La cámara no tiene permiso. Dale permiso en el navegador, o elige una foto de la galería.'
        : 'No se pudo abrir la cámara. Puedes elegir una foto de la galería.';
      sucio = true;
    }
  };

  const mostrarListo = (texto) => {
    modo = 'quieta';
    raiz.querySelector('.vivo').hidden = true;
    raiz.querySelector('.listo').hidden = false;
    ayuda.textContent = texto;
    sucio = true;
  };

  // 📸 con cuenta regresiva
  btnFoto.addEventListener('click', () => {
    if (contando || !fuente) return;
    contando = true;
    let n = 3;
    const paso = () => {
      if (cerrado) return;
      if (n > 0) {
        cuenta.textContent = String(n);
        Sonido.tocar('cuenta');
        n--;
        setTimeout(paso, 650);
        return;
      }
      cuenta.textContent = '';
      // Se congela la imagen (ya volteada como espejo)
      const w = video.videoWidth;
      const h = video.videoHeight;
      const congelada = document.createElement('canvas');
      congelada.width = w;
      congelada.height = h;
      const c = congelada.getContext('2d');
      c.translate(w, 0);
      c.scale(-1, 1);
      c.drawImage(video, 0, 0, w, h);
      fuente = { el: congelada, w, h, espejo: false };
      apagarCamara();
      Sonido.tocar('foto');
      flash.style.transition = 'none';
      flash.style.opacity = '1';
      requestAnimationFrame(() => {
        flash.style.transition = 'opacity .45s ease-out';
        flash.style.opacity = '0';
      });
      contando = false;
      mostrarListo('¿Te gusta? Puedes cambiar el estilo, arrastrar para acomodarte o tomarla otra vez.');
    };
    paso();
  });

  // 🖼️ Galería
  raiz.querySelector('.galeria').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0;';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const archivo = input.files && input.files[0];
      input.remove();
      if (!archivo) return;
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        apagarCamara();
        fuente = { el: img, w: img.naturalWidth, h: img.naturalHeight, espejo: false };
        zoom = 1.2;
        barra.value = String(zoom);
        mostrarListo('Arrastra y acerca para acomodar tu cara. Prueba los estilos.');
      };
      img.src = url;
    });
    input.click();
  });

  raiz.querySelector('.estilos').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-estilo]');
    if (!b) return;
    estilo = b.dataset.estilo;
    Sonido.tocar('click');
    marcarEstilo();
  });

  barra.addEventListener('input', () => {
    zoom = Number(barra.value);
    ajustar();
    sucio = true;
  });

  // Arrastrar y pellizcar (con la foto ya tomada o de la galería)
  const dedos = new Map();
  vista.addEventListener('pointerdown', (e) => {
    vista.setPointerCapture?.(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  vista.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId) || modo !== 'quieta') return;
    const antes = [...dedos.values()];
    const previo = dedos.get(e.pointerId);
    const ahora = { x: e.clientX, y: e.clientY };
    dedos.set(e.pointerId, ahora);
    const escala = D / vista.getBoundingClientRect().width;
    if (dedos.size === 1) {
      ox += (ahora.x - previo.x) * escala;
      oy += (ahora.y - previo.y) * escala;
    } else {
      const despues = [...dedos.values()];
      const d0 = distancia(antes[0], antes[1]);
      if (d0 > 0) zoom = limitar((zoom * distancia(despues[0], despues[1])) / d0, 1, 3);
      barra.value = String(zoom);
    }
    ajustar();
    sucio = true;
  });
  const soltar = (e) => dedos.delete(e.pointerId);
  vista.addEventListener('pointerup', soltar);
  vista.addEventListener('pointercancel', soltar);
  vista.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = limitar(zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 3);
    barra.value = String(zoom);
    ajustar();
    sucio = true;
  }, { passive: false });

  const cerrar = (datos) => {
    if (cerrado) return;
    cerrado = true;
    apagarCamara();
    window.removeEventListener('keydown', teclas, true);
    raiz.remove();
    alTerminar(datos);
  };
  const teclas = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrar(null);
    }
  };
  window.addEventListener('keydown', teclas, true);

  raiz.querySelector('.otra').addEventListener('click', () => {
    zoom = 1.15;
    barra.value = String(zoom);
    encenderCamara();
  });
  raiz.querySelector('.usar').addEventListener('click', () => {
    pintar();
    const c = document.createElement('canvas');
    c.width = TAM_CARA;
    c.height = TAM_CARA;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(trabajo, 0, 0, TAM_CARA, TAM_CARA);
    Sonido.tocar('recoger');
    cerrar(c.toDataURL('image/png'));
  });
  raiz.querySelector('.saltar').addEventListener('click', () => cerrar(null));

  marcarEstilo();
  encenderCamara();
  bucle();
}
