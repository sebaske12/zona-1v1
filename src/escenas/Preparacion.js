// Antes de jugar: nombres, colores, accesorios, mapa, modo, hándicap y apuesta.
import Phaser from 'phaser';
import { COLORES_JUGADOR, ACCESORIOS, UI } from '../config.js';
import { MAPAS, ORDEN_MAPAS } from '../datos/mapas.js';
import { MODOS, ORDEN_MODOS } from '../datos/modos.js';
import { Guardado } from '../sistemas/Guardado.js';
import { nuevaPartida } from '../sistemas/Partida.js';
import { Sonido } from '../sistemas/Sonido.js';
import { boton, texto, fondoMenu, dibujarMiniMapa } from '../ui/ui.js';
import { resumenTeclas } from '../entrada/Teclado.js';
import { esTactil } from '../entrada/entradas.js';
import { abrirCabina } from '../ui/Foto.js';
import { fotoOmitida } from '../sistemas/Caras.js';
import { mostrarCara } from '../ui/ui.js';
import { Musica } from '../sistemas/Musica.js';

export const ESTILO_INPUT = 'width:300px;padding:8px 12px;font:600 20px "Chakra Petch",sans-serif;border-radius:8px;'
  + 'border:2px solid #2a3249;background:#0d111d;color:#e7eaf2;outline:none;text-align:center;';

export class Preparacion extends Phaser.Scene {
  constructor() {
    super('Preparacion');
  }

  init(data) {
    this.bot = !!data?.bot; // modo entrenamiento: el jugador 2 es la computadora
  }

  create() {
    Musica.poner('menu');
    this.input.keyboard.clearCaptures();
    this.saliendo = false;
    this.cabinaAbierta = false;
    this.fotosRevisadas = false;
    const datos = Guardado.leer();
    this.perfiles = datos.perfiles.map((p) => ({ ...p }));
    this.prep = { ...datos.preparacion, vida: [...datos.preparacion.vida], apuestas: [...datos.preparacion.apuestas] };
    if (!MAPAS[this.prep.mapa]) this.prep.mapa = 'bodega';
    if (!MODOS[this.prep.modo]) this.prep.modo = 'clasico';
    if (this.bot) {
      this.perfiles[1] = { nombre: 'Bot', color: this.perfiles[1].color, accesorio: 'casco' };
      this.prep.vida[1] = 80; // empieza fácil; se sube con +
    }

    fondoMenu(this);
    texto(this, 640, 38, this.bot ? 'Entrenamiento contra el bot' : 'Preparen el duelo', 38, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    this.columnas = [0, 1].map((i) => this.crearColumna(i, i === 0 ? 220 : 1060));
    this.crearCentro();

    boton(this, 640, 664, '¡A jugar!', () => this.empezar(), { ancho: 300, alto: 64, tam: 28, color: UI.rojo });
    boton(this, 90, 680, '← Menú', () => this.scene.start('Menu'), { ancho: 140, alto: 44, tam: 18, color: UI.gris });
    this.input.keyboard.on('keydown-ENTER', () => this.empezar());
    this.input.keyboard.on('keydown-ESC', () => { if (!this.cabinaAbierta) this.scene.start('Menu'); });
    this.refrescar();
  }

  crearColumna(i, cx) {
    const perfil = this.perfiles[i];
    const col = { cx };
    col.titulo = texto(this, cx, 96, `JUGADOR ${i + 1}`, 18, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);

    col.nombre = this.add.dom(cx, 136, 'input', ESTILO_INPUT);
    col.nombre.node.value = perfil.nombre;
    col.nombre.node.maxLength = 14;
    col.nombre.node.placeholder = `Jugador ${i + 1}`;
    col.nombre.node.addEventListener('input', () => this.refrescar());

    col.colores = COLORES_JUGADOR.map((c, k) => {
      const s = this.add.circle(cx - 110 + k * 44, 194, 16, c.valor).setInteractive({ useHandCursor: true });
      s.on('pointerup', () => this.elegirColor(i, k));
      return s;
    });

    col.accesorios = ACCESORIOS.map((a, k) => boton(this, cx - 132 + k * 88, 246, a.nombre, () => {
      perfil.accesorio = a.id;
      this.refrescar();
    }, { ancho: 82, alto: 34, tam: 15, color: UI.gris }));

    col.prevArma = this.add.image(cx + 6 * 2.4, 326, 'arma-pistola').setOrigin(0, 0.5).setScale(2.4);
    col.prevCuerpo = this.add.image(cx, 326, 'cuerpo').setScale(2.4);
    col.prevAcc = this.add.image(cx, 326, 'acc-gorra').setScale(2.4);
    // Con foto: la cabeza grande de caricatura encima del cuerpo
    col.prevAnillo = this.add.circle(cx, 318, 52, 0xffffff).setVisible(false);
    col.prevCara = this.add.image(cx, 318, 'cuerpo').setVisible(false);
    if (!this.esBot(i)) {
      col.btnFoto = boton(this, cx + 142, 306, '📷 Tu cara', () => this.foto(i), { ancho: 124, alto: 38, tam: 16, color: UI.azul });
      col.btnQuitar = boton(this, cx + 142, 350, 'Quitar foto', () => { perfil.cara = null; this.refrescar(); }, { ancho: 124, alto: 32, tam: 14, color: UI.gris });
    }

    texto(this, cx, 390, this.esBot(i) ? 'Vida del bot (dificultad)' : 'Vida inicial (hándicap)', 15, UI.suave).setOrigin(0.5);
    boton(this, cx - 80, 422, '−', () => this.cambiarVida(i, -10), { ancho: 44, alto: 38, tam: 24, color: UI.gris });
    col.vida = texto(this, cx, 422, '', 24, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, cx + 80, 422, '+', () => this.cambiarVida(i, 10), { ancho: 44, alto: 38, tam: 24, color: UI.gris });

    col.apuestaTitulo = texto(this, cx, 474, '', 15, UI.suave, { align: 'center', wordWrap: { width: 360 } }).setOrigin(0.5);
    col.apuesta = this.add.dom(cx, 512, 'input', ESTILO_INPUT);
    col.apuesta.node.value = this.prep.apuestas[i] || '';
    col.apuesta.node.maxLength = 60;
    col.apuesta.node.placeholder = i === 0 ? 'ej.: lava los platos' : 'ej.: invita el helado';

    let controles = resumenTeclas(i);
    if (this.esBot(i)) controles = 'La computadora maneja este jugador.';
    else if (esTactil(this)) controles = 'Joystick izquierdo: moverte\nDedo en la mitad derecha: apuntar y disparar';
    texto(this, cx, 560, controles, 14, UI.suave, { align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0);
    if (this.esBot(i)) col.nombre.node.disabled = true;
    if (this.bot) {
      // Contra el bot no hay apuesta
      col.apuesta.setVisible(false);
      col.apuestaTitulo.setVisible(false);
    }
    return col;
  }

  esBot(i) {
    return this.bot && i === 1;
  }

  crearCentro() {
    texto(this, 640, 96, 'MAPA', 16, UI.suave, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, 516, 134, '<', () => this.cambiar('mapa', -1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.mapaNombre = texto(this, 640, 134, '', 26, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, 764, 134, '>', () => this.cambiar('mapa', 1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.miniMapa = this.add.graphics();
    this.mapaTexto = texto(this, 640, 320, '', 15, UI.suave, { align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5, 0);

    texto(this, 640, 392, 'MODO', 16, UI.suave, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, 516, 430, '<', () => this.cambiar('modo', -1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.modoNombre = texto(this, 640, 430, '', 24, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, 764, 430, '>', () => this.cambiar('modo', 1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.modoTexto = texto(this, 640, 460, '', 15, UI.suave, { align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5, 0);

    if (!this.bot) texto(this, 640, 556, 'Al final, el que pierda paga\nlo que escribió el ganador.', 15, UI.suave, { align: 'center' }).setOrigin(0.5, 0);
  }

  nombre(i) {
    return (this.columnas?.[i]?.nombre.node.value || '').trim() || `Jugador ${i + 1}`;
  }

  refrescar() {
    this.perfiles.forEach((perfil, i) => {
      const col = this.columnas[i];
      const color = COLORES_JUGADOR[perfil.color];
      col.titulo.setColor(color.css);
      col.colores.forEach((s, k) => {
        s.setStrokeStyle(k === perfil.color ? 4 : 0, 0xffffff);
        s.setAlpha(k === this.perfiles[1 - i].color ? 0.3 : 1);
      });
      col.accesorios.forEach((b, k) => b.fondo.setFillStyle(ACCESORIOS[k].id === perfil.accesorio ? color.valor : UI.gris));
      col.prevCuerpo.setTint(color.valor);
      const acc = perfil.accesorio;
      col.prevAcc.setVisible(acc !== 'ninguno' && !perfil.cara);
      if (acc !== 'ninguno') col.prevAcc.setTexture(`acc-${acc}`);
      mostrarCara(this, col.prevCara, col.prevAnillo, perfil.cara, color.valor, 92);
      col.btnQuitar?.setVisible(!!perfil.cara);
      col.vida.setText(String(this.prep.vida[i]));
      if (!this.bot) col.apuestaTitulo.setText(`Si gana ${this.nombre(i)}, ${this.nombre(1 - i)} paga:`);
    });
    const mapa = MAPAS[this.prep.mapa];
    this.mapaNombre.setText(mapa.nombre);
    this.mapaTexto.setText(mapa.texto);
    this.miniMapa.clear();
    dibujarMiniMapa(this.miniMapa, mapa, 512, 166, 0.2, this.perfiles.map((p) => COLORES_JUGADOR[p.color].valor));
    const modo = MODOS[this.prep.modo];
    this.modoNombre.setText(modo.nombre);
    this.modoTexto.setText(modo.texto);
  }

  foto(i, alTerminar = null) {
    if (this.cabinaAbierta) return;
    this.cabinaAbierta = true;
    abrirCabina({
      titulo: `¡Foto de ${this.nombre(i)}!`,
      alTerminar: (datos) => {
        this.cabinaAbierta = false;
        if (!this.scene.isActive()) return;
        if (datos) this.perfiles[i].cara = datos;
        else fotoOmitida(this, this.nombre(i), true); // tocó "Ahora no": no se vuelve a preguntar hoy
        this.refrescar();
        if (alTerminar) alTerminar();
      },
    });
  }

  // Al empezar a jugar, la cabina de fotos se abre para quien todavía no tiene cara
  pedirFotosFaltantes(alTerminar) {
    const faltan = [0, 1].filter((i) => !this.esBot(i) && !this.perfiles[i].cara && !fotoOmitida(this, this.nombre(i)));
    if (!faltan.length) {
      alTerminar();
      return;
    }
    this.foto(faltan[0], () => this.pedirFotosFaltantes(alTerminar));
  }

  elegirColor(i, k) {
    const otro = this.perfiles[1 - i];
    if (otro.color === k) otro.color = this.perfiles[i].color; // si ya lo tiene el otro, se cambian
    this.perfiles[i].color = k;
    this.refrescar();
  }

  cambiarVida(i, delta) {
    this.prep.vida[i] = Phaser.Math.Clamp(this.prep.vida[i] + delta, this.esBot(i) ? 40 : 100, 150);
    this.refrescar();
  }

  cambiar(campo, delta) {
    const orden = campo === 'mapa' ? ORDEN_MAPAS : ORDEN_MODOS;
    const k = orden.indexOf(this.prep[campo]);
    this.prep[campo] = orden[Phaser.Math.Wrap(k + delta, 0, orden.length)];
    this.refrescar();
  }

  empezar() {
    if (this.saliendo || this.cabinaAbierta) return;
    if (!this.fotosRevisadas) {
      this.fotosRevisadas = true;
      this.pedirFotosFaltantes(() => this.empezar());
      return;
    }
    this.saliendo = true;
    this.perfiles.forEach((p, i) => {
      p.nombre = this.nombre(i).slice(0, 14);
      this.prep.apuestas[i] = this.columnas[i].apuesta.node.value.trim().slice(0, 60);
    });
    if (this.perfiles[0].nombre.toLowerCase() === this.perfiles[1].nombre.toLowerCase()) this.perfiles[1].nombre += ' 2';
    Guardado.actualizar((d) => {
      if (this.bot) {
        // En el entrenamiento no se toca el perfil ni la apuesta de tu pareja
        d.perfiles[0] = this.perfiles[0];
        d.preparacion.vida[0] = this.prep.vida[0];
        d.preparacion.mapa = this.prep.mapa;
        d.preparacion.modo = this.prep.modo;
      } else {
        d.perfiles = this.perfiles;
        d.preparacion = this.prep;
      }
    });
    this.registry.set('partida', nuevaPartida({
      perfiles: this.perfiles,
      mapa: this.prep.mapa,
      modo: this.prep.modo,
      vida: this.prep.vida,
      apuestas: this.bot ? ['', ''] : this.prep.apuestas,
      bot: this.bot,
    }));
    Sonido.desbloquear();
    this.scene.start('Ronda');
  }
}
