// Piezas de interfaz que se repiten en los menús.
import { ANCHO, ALTO, FUENTE, UI } from '../config.js';
import { Sonido } from '../sistemas/Sonido.js';
import { conCara } from '../sistemas/Caras.js';

// En el celular la pantalla es chica: los textos pequeños se agrandan un poco para que se lean
export function texto(escena, x, y, contenido, tam = 20, color = UI.texto, extra = {}) {
  const d = escena.sys.game.device;
  const celular = d.input.touch && !d.os.desktop;
  const tamFinal = celular && tam < 20 ? Math.round(tam * 1.25) : tam;
  return escena.add.text(x, y, contenido, { fontFamily: FUENTE, fontSize: `${tamFinal}px`, color, ...extra });
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

// Muestra la cara de caricatura (o la esconde si no hay foto) con un anillo del color del jugador
export function mostrarCara(escena, imagen, anillo, cara, color, tam) {
  if (!cara) {
    imagen.setVisible(false);
    anillo.setVisible(false);
    return;
  }
  anillo.setFillStyle(color).setRadius(tam / 2 + 6).setVisible(true);
  conCara(escena, cara, (clave) => {
    if (imagen.active) imagen.setTexture(clave).setDisplaySize(tam, tam).setVisible(true);
  });
}

// Fondo de los menús. Es más grande que 1280 × 720 para que llene pantallas más anchas,
// y la vista se centra en el contenido.
export function fondoMenu(escena) {
  escena.add.tileSprite(-1000, -600, ANCHO + 2000, ALTO + 1200, 'piso').setOrigin(0);
  escena.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO + 2000, ALTO + 1200, UI.fondo, 0.6);
  centrarVista(escena);
}

// La pantalla puede ser más ancha (o más alta) que 1280 × 720, por ejemplo en un iPhone:
// el contenido queda en el centro, también si la pantalla cambia de tamaño
export function centrarVista(escena, siempre = () => true) {
  const cam = escena.cameras.main;
  const centrar = () => { if (siempre()) cam.centerOn(ANCHO / 2, ALTO / 2); };
  centrar();
  escena.scale.on('resize', centrar);
  escena.events.once('shutdown', () => escena.scale.off('resize', centrar));
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
