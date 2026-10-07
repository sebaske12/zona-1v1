// Piezas de interfaz que se repiten en los menús.
import { ANCHO, ALTO, FUENTE, UI } from '../config.js';
import { Sonido } from '../sistemas/Sonido.js';

export function texto(escena, x, y, contenido, tam = 20, color = UI.texto, extra = {}) {
  return escena.add.text(x, y, contenido, { fontFamily: FUENTE, fontSize: `${tam}px`, color, ...extra });
}

export function boton(escena, x, y, contenido, alPulsar, { ancho = 280, alto = 56, color = UI.azul, tam = 22 } = {}) {
  const fondo = escena.add.rectangle(0, 0, ancho, alto, color).setStrokeStyle(2, 0xffffff, 0.18);
  const etiqueta = texto(escena, 0, 0, contenido, tam, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5);
  const c = escena.add.container(x, y, [fondo, etiqueta]);
  fondo.setInteractive({ useHandCursor: true });
  fondo.on('pointerover', () => { fondo.setStrokeStyle(2, 0xffffff, 0.75); c.setScale(1.03); });
  fondo.on('pointerout', () => { fondo.setStrokeStyle(2, 0xffffff, 0.18); c.setScale(1); });
  fondo.on('pointerup', () => { Sonido.desbloquear(); Sonido.tocar('click'); alPulsar(); });
  c.fondo = fondo;
  c.etiqueta = etiqueta;
  return c;
}

export function fondoMenu(escena) {
  escena.add.tileSprite(0, 0, ANCHO, ALTO, 'piso').setOrigin(0);
  escena.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO, ALTO, UI.fondo, 0.6);
}

// Círculo punteado como el borde de la zona
export function circuloPunteado(g, x, y, r, segmentos = 40, relleno = 0.55) {
  const paso = (Math.PI * 2) / segmentos;
  for (let i = 0; i < segmentos; i++) {
    g.beginPath();
    g.arc(x, y, r, i * paso, i * paso + paso * relleno);
    g.strokePath();
  }
}

export function dibujarMiniMapa(g, mapa, x, y, escala, colores = [0x3b6cff, 0xff4f8b]) {
  const e = escala;
  g.fillStyle(0x1a2135, 1).fillRect(x, y, ANCHO * e, ALTO * e);
  g.lineStyle(2, UI.borde, 1).strokeRect(x, y, ANCHO * e, ALTO * e);
  g.fillStyle(0x1d4f8f, 1);
  for (const [ax, ay, w, h] of mapa.agua) g.fillRect(x + ax * e, y + ay * e, w * e, h * e);
  g.fillStyle(0x6c789a, 1);
  for (const [mx, my, w, h] of mapa.muros) g.fillRect(x + mx * e, y + my * e, Math.max(2, w * e), Math.max(2, h * e));
  g.fillStyle(0xd99a1c, 1);
  for (const [cx, cy] of mapa.cajas) g.fillRect(x + cx * e - 3, y + cy * e - 3, 6, 6);
  mapa.inicio.forEach(([ix, iy], i) => g.fillStyle(colores[i], 1).fillCircle(x + ix * e, y + iy * e, 5));
}
