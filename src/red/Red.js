// Conexión directa entre los dos aparatos con PeerJS (plan, sección 1.10).
// El servidor gratis de PeerJS solo sirve para "presentarlos"; después hablan directo.
import Peer from 'peerjs';

const PREFIJO = 'zona1v1-sala-';
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O, 0, I ni 1 para que no se confundan
const TAM_TROZO = 7000; // caracteres por trozo (con tildes ocupa más bytes; así nunca pasa de 16 KB)

function mensajeError(e) {
  switch (e?.type) {
    case 'peer-unavailable': return 'No existe una sala con ese código. Revisa las letras.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return 'No se pudo hablar con el servidor de salas. Revisa tu internet.';
    case 'browser-incompatible': return 'Este navegador no permite jugar en línea.';
    default: return 'No se pudo conectar. Intenten de nuevo.';
  }
}

export class Red {
  constructor(juego) {
    this.juego = juego;
    this.peer = null;
    this.conn = null;
    this.codigo = '';
    this.esAnfitrion = false;
    this.manejadorActual = null;
    this.pendientes = [];
    this.trozos = {};
    this.cerrando = false;
  }

  // La escena activa recibe los mensajes. Si no hay ninguna, los importantes esperan en fila.
  set manejador(fn) {
    this.manejadorActual = fn;
    if (fn && this.pendientes.length) {
      const fila = this.pendientes;
      this.pendientes = [];
      fila.forEach(([t, d]) => fn(t, d));
    }
  }

  get manejador() {
    return this.manejadorActual;
  }

  crear({ alListo, alUnirse, alError }) {
    this.esAnfitrion = true;
    this.codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
    this.peer = new Peer(PREFIJO + this.codigo, { debug: 0 });
    this.peer.on('open', () => alListo(this.codigo));
    this.peer.on('connection', (conn) => {
      if (this.conn) {
        conn.on('open', () => conn.close()); // la sala es de dos
        return;
      }
      this.preparar(conn);
      conn.on('open', () => alUnirse());
    });
    this.peer.on('error', (e) => {
      if (e.type === 'unavailable-id') {
        this.peer.destroy();
        this.crear({ alListo, alUnirse, alError }); // el código ya existía: se sortea otro
        return;
      }
      if (!this.conn) alError(mensajeError(e));
    });
  }

  unirse(codigo, { alConectar, alError }) {
    this.esAnfitrion = false;
    this.codigo = codigo.trim().toUpperCase();
    this.peer = new Peer({ debug: 0 });
    const limite = setTimeout(() => {
      if (!this.conn?.open) alError('No se pudo conectar. Prueben en el mismo WiFi o intenten de nuevo.');
    }, 15000);
    this.peer.on('open', () => {
      const conn = this.peer.connect(PREFIJO + this.codigo, { reliable: true, serialization: 'json' });
      this.preparar(conn);
      conn.on('open', () => {
        clearTimeout(limite);
        alConectar();
      });
    });
    this.peer.on('error', (e) => {
      clearTimeout(limite);
      if (!this.conn?.open) alError(mensajeError(e));
    });
  }

  preparar(conn) {
    this.conn = conn;
    conn.on('data', (m) => this.recibir(m));
    conn.on('close', () => this.perdida());
    // Un error suelto (por ejemplo, un mensaje rechazado) no corta la partida: de eso se encarga el latido
    conn.on('error', (e) => console.warn('Zona 1v1 · error de conexión:', e?.type || e));
    // Latido: si en 8 s no llega nada del otro aparato, se da por perdida la conexión
    // (cuando alguien cierra el navegador, WebRTC puede tardar mucho en avisar)
    this.ultimoMensaje = performance.now();
    this.latido = setInterval(() => {
      if (!this.conn) return;
      if (this.conn.open) this.enviar('latido');
      if (performance.now() - this.ultimoMensaje > 8000) this.perdida();
    }, 1000);
    this.alSalir = () => this.cerrar();
    window.addEventListener('pagehide', this.alSalir);
  }

  recibir(m) {
    if (!m || typeof m !== 'object') return;
    this.ultimoMensaje = performance.now();
    const { t, d } = m;
    if (t === 'latido') return;
    if (t === 'trozo') {
      // Llegó un pedazo de un mensaje grande: se arma cuando estén todos
      const b = this.trozos[d.id] || (this.trozos[d.id] = { partes: [], llegaron: 0 });
      b.partes[d.i] = d.s;
      b.llegaron++;
      if (b.llegaron === d.n) {
        delete this.trozos[d.id];
        try { this.recibir(JSON.parse(b.partes.join(''))); } catch (e) { /* mensaje dañado */ }
      }
      return;
    }
    if (this.manejadorActual) this.manejadorActual(t, d);
    else if (t !== 'estado' && t !== 'entrada') this.pendientes.push([t, d]);
  }

  // PeerJS no deja mandar mensajes de más de ~16 KB: los grandes (como las fotos) se parten en trozos
  enviar(t, d = null) {
    if (!this.conn || !this.conn.open) return;
    try {
      const texto = JSON.stringify({ t, d });
      if (texto.length <= TAM_TROZO) {
        this.conn.send({ t, d });
        return;
      }
      const id = Math.random().toString(36).slice(2, 9);
      const n = Math.ceil(texto.length / TAM_TROZO);
      for (let i = 0; i < n; i++) this.conn.send({ t: 'trozo', d: { id, i, n, s: texto.slice(i * TAM_TROZO, (i + 1) * TAM_TROZO) } });
    } catch (e) { /* conexión cayéndose */ }
  }

  // Se cayó la conexión: se vuelve al menú con un aviso
  perdida() {
    if (this.cerrando) return;
    this.cerrar();
    const sm = this.juego.scene;
    for (const s of sm.getScenes(true)) if (s.scene.key !== 'Menu') sm.stop(s.scene.key);
    sm.start('Menu', { aviso: 'Se perdió la conexión con tu pareja.' });
    this.juego.registry.set('red', null);
  }

  cerrar() {
    this.cerrando = true;
    clearInterval(this.latido);
    if (this.alSalir) window.removeEventListener('pagehide', this.alSalir);
    try { this.conn?.close(); } catch (e) { /* ya estaba cerrada */ }
    try { this.peer?.destroy(); } catch (e) { /* ya estaba cerrado */ }
    this.conn = null;
    this.peer = null;
    this.manejadorActual = null;
  }
}
