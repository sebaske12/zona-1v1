// Conexión por el servidor de salas (Cloudflare): los dos aparatos se conectan al servidor
// y él pasa los mensajes de uno al otro. Funciona en cualquier red: WiFi, datos móviles, cada uno en su casa.
// Tiene las mismas funciones que Red (la conexión directa), así el resto del juego no cambia.
import { Red, sortearCodigo } from './Red.js';
import { SERVIDOR_SALAS } from './servidor.js';

const SIN_SERVIDOR = 'No se pudo hablar con el servidor de salas. Revisa tu internet e intenta de nuevo.';

export class RedNube extends Red {
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
      else this.recibir(m);
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

  // Por el servidor no hay límite de 16 KB: se manda todo de una vez
  enviar(t, d = null) {
    if (!this.conectada()) return;
    try { this.ws.send(JSON.stringify({ t, d })); } catch (e) { /* conexión cayéndose */ }
  }

  cerrar() {
    super.cerrar();
    this.abierta = false;
    try { this.ws?.close(1000, 'adios'); } catch (e) { /* ya cerrada */ }
    this.ws = null;
  }
}
