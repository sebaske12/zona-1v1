// Conexión por el servidor de salas (Cloudflare): los dos aparatos se conectan al servidor
// y él pasa los mensajes de uno al otro. Funciona en cualquier red: WiFi, datos móviles, cada uno en su casa.
// Tiene las mismas funciones que Red (la conexión directa), así el resto del juego no cambia.
//
// Para que no haya retraso, apenas se conectan se intenta además un camino DIRECTO entre los dos
// aparatos (WebRTC): no pasa por el servidor (que para Colombia queda en Miami), así que llega mucho más rápido.
// Si el camino directo no se puede (algunas redes de datos lo bloquean) o se cae, todo sigue por el servidor.
import { Red, sortearCodigo } from './Red.js';
import { SERVIDOR_SALAS } from './servidor.js';

const SIN_SERVIDOR = 'No se pudo hablar con el servidor de salas. Revisa tu internet e intenta de nuevo.';
const ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }];
const MAX_DIRECTO = 16000; // los mensajes más grandes (fotos) van por el servidor
const SIN_DIRECTO = 1500; // ms sin nada por el camino directo = se cayó (llegan pings cada medio segundo)
const MAX_INTENTOS = 3;

export class RedNube extends Red {
  constructor(juego) {
    super(juego);
    this.via = 'nube';
    this.pc = null;
    this.canales = {};
    this.intentos = 0;
    this.ultimoDirecto = 0;
    this.ultimoLatidoNube = 0;
  }

  conectada() {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN && this.abierta);
  }

  // Abre la conexión con la sala; los avisos del servidor empiezan con "_"
  abrir(rol, codigo, alAviso, alFalla) {
    let ws;
    try {
      ws = new WebSocket(`${SERVIDOR_SALAS}/sala/${codigo}?rol=${rol}`);
    } catch (e) {
      alFalla();
      return;
    }
    this.ws = ws;
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m && typeof m.t === 'string' && m.t.startsWith('_')) alAviso(m.t);
      else this.entregar(m);
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.cerrando) return;
      if (this.abierta) this.perdida();
      else alFalla();
    };
  }

  crear({ alListo, alUnirse, alError }) {
    this.esAnfitrion = true;
    this.codigo = sortearCodigo();
    let lista = false;
    this.abrir('anfitrion', this.codigo, (aviso) => {
      if (aviso === '_lista') {
        lista = true;
        alListo(this.codigo);
      } else if (aviso === '_ocupada') {
        this.crear({ alListo, alUnirse, alError }); // ese código ya existía: se sortea otro
      } else if (aviso === '_unido') {
        this.abierta = true;
        this.iniciarLatido();
        alUnirse();
        this.iniciarDirecta(); // el anfitrión propone el camino directo
      } else if (aviso === '_salio') {
        this.perdida();
      }
    }, () => alError(lista ? 'Se cortó la conexión con el servidor de salas.' : SIN_SERVIDOR));
  }

  unirse(codigo, { alConectar, alError }) {
    this.esAnfitrion = false;
    this.codigo = codigo.trim().toUpperCase();
    let respondio = false;
    const limite = setTimeout(() => {
      if (respondio) return;
      respondio = true;
      this.cerrar();
      alError(SIN_SERVIDOR);
    }, 12000);
    this.abrir('invitado', this.codigo, (aviso) => {
      respondio = true;
      clearTimeout(limite);
      if (aviso === '_conectado') {
        this.abierta = true;
        this.iniciarLatido();
        alConectar();
      } else if (aviso === '_nohay') {
        alError('No existe una sala con ese código. Revisa las letras (y que tu pareja siga en la sala).');
      } else if (aviso === '_llena') {
        alError('Esa sala ya tiene dos jugadores.');
      } else if (aviso === '_salio') {
        this.perdida();
      }
    }, () => {
      clearTimeout(limite);
      if (!respondio) {
        respondio = true;
        alError(SIN_SERVIDOR);
      }
    });
  }

  // ---------- Enviar ----------

  enviarNube(t, d = null) {
    if (!this.conectada()) return false;
    try {
      this.ws.send(JSON.stringify({ t, d }));
      return true;
    } catch (e) {
      return false; // conexión cayéndose
    }
  }

  // Lo importante (avisos, acciones, efectos): siempre llega y en orden
  enviar(t, d = null) {
    if (!this.conectada()) return;
    const texto = JSON.stringify({ t, d });
    const seguro = this.canales.seguro;
    if (this.via === 'directa' && seguro?.readyState === 'open' && texto.length < MAX_DIRECTO) {
      try {
        seguro.send(texto);
        return;
      } catch (e) { /* se manda por el servidor */ }
    }
    try { this.ws.send(texto); } catch (e) { /* conexión cayéndose */ }
  }

  // Posiciones, muchas veces por segundo: si uno se pierde llega el siguiente.
  // Por el servidor, si la red va atrasada, se salta uno para no hacer fila (la fila es lo que crea el retraso).
  enviarRapido(t, d = null) {
    if (!this.conectada()) return false;
    const rapido = this.canales.rapido;
    if (this.via === 'directa' && rapido?.readyState === 'open') {
      try {
        if (rapido.bufferedAmount < 64000) rapido.send(JSON.stringify({ t, d }));
        return true;
      } catch (e) { /* se manda por el servidor */ }
    }
    if (this.ws.bufferedAmount > 12000) return false;
    try {
      this.ws.send(JSON.stringify({ t, d }));
      return true;
    } catch (e) {
      return false;
    }
  }

  recibir(m) {
    if (m && m.t === 'rtc') {
      this.ultimoMensaje = performance.now();
      this.senal(m.d);
      return;
    }
    super.recibir(m);
  }

  tic() {
    super.tic();
    if (this.cerrando || !this.abierta) return;
    const ahora = performance.now();
    if (this.via === 'directa') {
      if (ahora - this.ultimoDirecto > SIN_DIRECTO) this.directaCaida(this.pc);
      // Un latido de vez en cuando por el servidor, para que no cierre la conexión de respaldo
      if (ahora - this.ultimoLatidoNube > 20000) {
        this.ultimoLatidoNube = ahora;
        this.enviarNube('latido');
      }
    }
  }

  // ---------- Camino directo (WebRTC) ----------

  nuevaConexion() {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc = pc;
    this.canales = {};
    this.candidatos = [];
    pc.onicecandidate = (e) => {
      if (e.candidate && this.pc === pc) this.enviarNube('rtc', { c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.directaCaida(pc);
    };
    pc.ondatachannel = (e) => this.prepararCanal(pc, e.channel);
    // Si en 12 s no se pudo, se queda por el servidor
    clearTimeout(this.limiteDirecta);
    this.limiteDirecta = setTimeout(() => { if (this.pc === pc && this.via !== 'directa') this.directaCaida(pc); }, 12000);
    return pc;
  }

  async iniciarDirecta() {
    if (typeof RTCPeerConnection === 'undefined' || this.cerrando || !this.esAnfitrion) return;
    this.intentos++;
    this.cerrarDirecta();
    try {
      const pc = this.nuevaConexion();
      this.prepararCanal(pc, pc.createDataChannel('rapido', { ordered: false, maxRetransmits: 0 }));
      this.prepararCanal(pc, pc.createDataChannel('seguro', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer());
      if (this.pc === pc) this.enviarNube('rtc', { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription });
    } catch (e) {
      console.warn('Zona 1v1 · camino directo:', e?.message || e);
      this.directaCaida(this.pc);
    }
  }

  async senal(d) {
    if (!d || this.cerrando || typeof RTCPeerConnection === 'undefined') return;
    try {
      if (d.fin) {
        if (this.pc) this.directaCaida(this.pc, true);
      } else if (d.sdp?.type === 'offer' && !this.esAnfitrion) {
        this.cerrarDirecta();
        const pc = this.nuevaConexion();
        await pc.setRemoteDescription(d.sdp);
        await this.ponerCandidatos(pc);
        await pc.setLocalDescription(await pc.createAnswer());
        if (this.pc === pc) this.enviarNube('rtc', { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription });
      } else if (d.sdp?.type === 'answer' && this.pc && this.esAnfitrion) {
        await this.pc.setRemoteDescription(d.sdp);
        await this.ponerCandidatos(this.pc);
      } else if (d.c) {
        if (this.pc?.remoteDescription) await this.pc.addIceCandidate(d.c).catch(() => {});
        else if (this.pc) this.candidatos.push(d.c);
      }
    } catch (e) {
      console.warn('Zona 1v1 · camino directo:', e?.message || e);
    }
  }

  async ponerCandidatos(pc) {
    const lista = this.candidatos || [];
    this.candidatos = [];
    for (const c of lista) await pc.addIceCandidate(c).catch(() => {});
  }

  prepararCanal(pc, canal) {
    this.canales[canal.label] = canal;
    canal.onopen = () => {
      if (this.pc !== pc) return;
      if (this.canales.rapido?.readyState === 'open' && this.canales.seguro?.readyState === 'open') {
        this.via = 'directa';
        this.intentos = 0; // si se vuelve a caer, se puede intentar de nuevo
        this.ultimoDirecto = performance.now();
        this.ultimoLatidoNube = performance.now();
        clearTimeout(this.limiteDirecta);
      }
    };
    canal.onclose = () => { if (this.pc === pc) this.directaCaida(pc); };
    canal.onmessage = (e) => {
      if (this.pc !== pc) return;
      this.ultimoDirecto = performance.now();
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      this.entregar(m);
    };
  }

  // El camino directo no se pudo o se cayó: todo vuelve a ir por el servidor, sin cortar la partida
  directaCaida(pc, avisado = false) {
    if (!pc || this.pc !== pc) return;
    const estaba = this.via === 'directa';
    this.via = 'nube';
    this.cerrarDirecta();
    if (!avisado) this.enviarNube('rtc', { fin: true });
    if (estaba) console.warn('Zona 1v1 · el camino directo se cayó; sigue por el servidor');
    // El anfitrión lo vuelve a intentar un par de veces (por ejemplo, si alguien cambió de WiFi a datos)
    if (this.esAnfitrion && !this.cerrando && this.intentos < MAX_INTENTOS) {
      clearTimeout(this.reintento);
      this.reintento = setTimeout(() => { if (!this.cerrando && this.via !== 'directa') this.iniciarDirecta(); }, 5000);
    }
  }

  cerrarDirecta() {
    clearTimeout(this.limiteDirecta);
    const pc = this.pc;
    this.pc = null;
    for (const canal of Object.values(this.canales)) {
      try { canal.close(); } catch (e) { /* ya cerrado */ }
    }
    this.canales = {};
    try { pc?.close(); } catch (e) { /* ya cerrada */ }
    this.via = 'nube';
  }

  cerrar() {
    super.cerrar();
    this.abierta = false;
    clearTimeout(this.reintento);
    this.cerrarDirecta();
    try { this.ws?.close(1000, 'adios'); } catch (e) { /* ya cerrada */ }
    this.ws = null;
  }
}
