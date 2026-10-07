// Jugar en línea: uno crea la sala y recibe un código de 4 letras; el otro lo escribe para unirse.
import Phaser from 'phaser';
import { COLORES_JUGADOR, UI } from '../config.js';
import { MAPAS, ORDEN_MAPAS } from '../datos/mapas.js';
import { MODOS, ORDEN_MODOS } from '../datos/modos.js';
import { Guardado } from '../sistemas/Guardado.js';
import { nuevaPartida } from '../sistemas/Partida.js';
import { Red } from '../red/Red.js';
import { boton, texto, fondoMenu } from '../ui/ui.js';
import { Musica } from '../sistemas/Musica.js';
import { ESTILO_INPUT } from './Preparacion.js';

export class Sala extends Phaser.Scene {
  constructor() {
    super('Sala');
  }

  create() {
    Musica.poner('menu');
    this.input.keyboard.clearCaptures();
    this.registry.get('red')?.cerrar();
    this.registry.set('red', null);
    this.red = null;
    this.estado = 'inicio';
    const datos = Guardado.leer();
    this.perfil = { ...datos.perfiles[0] };
    this.prep = { ...datos.preparacion };
    if (!MAPAS[this.prep.mapa]) this.prep.mapa = 'bodega';
    if (!MODOS[this.prep.modo]) this.prep.modo = 'clasico';

    fondoMenu(this);
    texto(this, 640, 40, 'Jugar en línea', 38, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    texto(this, 640, 82, 'Cada uno en su celular o PC. Funciona mejor si están conectados al mismo WiFi.', 17, UI.suave).setOrigin(0.5);

    // Tu perfil
    const px = 320;
    texto(this, px, 130, 'TU PERFIL', 16, UI.suave, { fontStyle: 'bold' }).setOrigin(0.5);
    this.inNombre = this.add.dom(px, 172, 'input', ESTILO_INPUT);
    this.inNombre.node.value = this.perfil.nombre;
    this.inNombre.node.maxLength = 14;
    this.colores = COLORES_JUGADOR.map((c, k) => {
      const s = this.add.circle(px - 110 + k * 44, 230, 16, c.valor).setInteractive({ useHandCursor: true });
      s.on('pointerup', () => { this.perfil.color = k; this.refrescar(); });
      return s;
    });
    this.prevCuerpo = this.add.image(px, 300, 'cuerpo').setScale(2.2);
    texto(this, px, 362, 'Si ganas, tu pareja paga:', 15, UI.suave).setOrigin(0.5);
    this.inApuesta = this.add.dom(px, 400, 'input', ESTILO_INPUT);
    this.inApuesta.node.value = this.prep.apuestas?.[0] || '';
    this.inApuesta.node.maxLength = 60;
    this.inApuesta.node.placeholder = 'ej.: lava los platos';

    // Crear sala
    const cx = 960;
    texto(this, cx, 130, 'CREAR UNA SALA', 16, UI.suave, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, cx - 130, 174, '<', () => this.cambiar('mapa', -1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.mapaNombre = texto(this, cx, 174, '', 22, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, cx + 130, 174, '>', () => this.cambiar('mapa', 1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    boton(this, cx - 130, 228, '<', () => this.cambiar('modo', -1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.modoNombre = texto(this, cx, 228, '', 22, UI.texto, { fontStyle: 'bold' }).setOrigin(0.5);
    boton(this, cx + 130, 228, '>', () => this.cambiar('modo', 1), { ancho: 44, alto: 40, tam: 22, color: UI.gris });
    this.btnCrear = boton(this, cx, 290, 'Crear sala', () => this.crear(), { ancho: 300, color: UI.rojo });

    // Unirse
    texto(this, cx, 362, 'UNIRSE A UNA SALA', 16, UI.suave, { fontStyle: 'bold' }).setOrigin(0.5);
    this.inCodigo = this.add.dom(cx, 404, 'input', `${ESTILO_INPUT}width:170px;letter-spacing:8px;text-transform:uppercase;`);
    this.inCodigo.node.maxLength = 4;
    this.inCodigo.node.placeholder = 'CÓDIGO';
    this.inCodigo.node.setAttribute('autocapitalize', 'characters');
    this.inCodigo.node.setAttribute('autocomplete', 'off');
    this.btnUnirse = boton(this, cx, 464, 'Unirse', () => this.unirse(), { ancho: 300, color: UI.azul });

    this.codigoTexto = texto(this, 640, 548, '', 72, '#f2b544', { fontStyle: 'bold' }).setOrigin(0.5);
    this.estadoTexto = texto(this, 640, 618, '', 18, UI.texto, { align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5);
    boton(this, 90, 680, '← Menú', () => this.volver(), { ancho: 140, alto: 44, tam: 18, color: UI.gris });
    this.input.keyboard.on('keydown-ESC', () => this.volver());
    this.refrescar();
  }

  refrescar() {
    this.colores.forEach((s, k) => s.setStrokeStyle(k === this.perfil.color ? 4 : 0, 0xffffff));
    this.prevCuerpo.setTint(COLORES_JUGADOR[this.perfil.color].valor);
    this.mapaNombre.setText(MAPAS[this.prep.mapa].nombre);
    this.modoNombre.setText(MODOS[this.prep.modo].nombre);
  }

  cambiar(campo, delta) {
    if (this.estado !== 'inicio') return;
    const orden = campo === 'mapa' ? ORDEN_MAPAS : ORDEN_MODOS;
    const k = orden.indexOf(this.prep[campo]);
    this.prep[campo] = orden[Phaser.Math.Wrap(k + delta, 0, orden.length)];
    this.refrescar();
  }

  miSaludo() {
    return { perfil: { ...this.perfil }, apuesta: this.inApuesta.node.value.trim().slice(0, 60) };
  }

  guardarPerfil() {
    this.perfil.nombre = this.inNombre.node.value.trim().slice(0, 14) || 'Jugador';
    const apuesta = this.inApuesta.node.value.trim().slice(0, 60);
    Guardado.actualizar((d) => {
      d.perfiles[0] = { ...this.perfil };
      d.preparacion.apuestas[0] = apuesta;
      d.preparacion.mapa = this.prep.mapa;
      d.preparacion.modo = this.prep.modo;
    });
  }

  ocupado(si) {
    this.btnCrear.setVisible(!si);
    this.btnUnirse.setVisible(!si);
    this.estadoTexto.setColor(UI.texto);
  }

  crear() {
    if (this.estado !== 'inicio') return;
    this.guardarPerfil();
    this.estado = 'creando';
    this.ocupado(true);
    this.estadoTexto.setText('Creando la sala…');
    this.red = new Red(this.game);
    this.red.manejador = (t, d) => { if (t === 'hola') this.empezarComoAnfitrion(d); };
    this.red.crear({
      alListo: (codigo) => {
        this.codigoTexto.setText(codigo);
        this.estadoTexto.setText('Díselo a tu pareja: que abra Zona 1v1, toque "Jugar en línea" y escriba este código en "Unirse".');
      },
      alUnirse: () => {
        this.estadoTexto.setText('¡Tu pareja se unió! Preparando…');
        this.red.enviar('hola', this.miSaludo());
      },
      alError: (m) => this.fallo(m),
    });
  }

  empezarComoAnfitrion(d) {
    const yo = { ...this.perfil };
    const otro = {
      nombre: String(d?.perfil?.nombre || 'Pareja').slice(0, 14),
      color: Number.isInteger(d?.perfil?.color) ? d.perfil.color : 1,
      accesorio: d?.perfil?.accesorio || 'ninguno',
    };
    if (otro.color === yo.color) otro.color = (yo.color + 1) % COLORES_JUGADOR.length;
    if (otro.nombre.toLowerCase() === yo.nombre.toLowerCase()) otro.nombre += ' 2';
    const config = {
      perfiles: [yo, otro],
      mapa: this.prep.mapa,
      modo: this.prep.modo,
      vida: [100, 100],
      apuestas: [this.miSaludo().apuesta, String(d?.apuesta || '').slice(0, 60)],
    };
    this.red.enviar('inicio', config);
    this.lanzar(config, 'RondaEnLinea');
  }

  unirse() {
    if (this.estado !== 'inicio') return;
    const codigo = this.inCodigo.node.value.trim().toUpperCase();
    if (codigo.length !== 4) {
      this.estadoTexto.setText('El código tiene 4 letras.').setColor('#ff7468');
      return;
    }
    this.guardarPerfil();
    this.estado = 'uniendo';
    this.ocupado(true);
    this.estadoTexto.setText(`Conectando a la sala ${codigo}…`);
    this.red = new Red(this.game);
    this.red.manejador = (t, d) => { if (t === 'inicio') this.lanzar(d, 'RondaInvitado'); };
    this.red.unirse(codigo, {
      alConectar: () => {
        this.estadoTexto.setText('¡Conectados! Empezando…');
        this.red.enviar('hola', this.miSaludo());
      },
      alError: (m) => this.fallo(m),
    });
  }

  lanzar(config, escena) {
    this.registry.set('partida', nuevaPartida(config));
    this.registry.set('red', this.red);
    this.red.manejador = null;
    this.scene.start(escena);
  }

  fallo(mensaje) {
    this.red?.cerrar();
    this.red = null;
    this.estado = 'inicio';
    this.ocupado(false);
    this.codigoTexto.setText('');
    this.estadoTexto.setText(mensaje).setColor('#ff7468');
  }

  volver() {
    this.red?.cerrar();
    this.red = null;
    this.scene.start('Menu');
  }
}
