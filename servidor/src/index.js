// Servidor de salas de Zona 1v1 (Cloudflare Workers + Durable Objects, plan gratis).
// Cada código de sala es un "Durable Object": guarda la conexión del anfitrión y la del invitado
// y pasa los mensajes de uno al otro. Así se juega desde cualquier red, también con datos móviles.
import { DurableObject } from 'cloudflare:workers';

const CODIGO = /^\/sala\/([A-Z2-9]{4})$/;
const aviso = (t) => JSON.stringify({ t });

export class Sala extends DurableObject {
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Se esperaba una conexión WebSocket', { status: 426 });
    }
    const rol = new URL(request.url).searchParams.get('rol') === 'anfitrion' ? 'anfitrion' : 'invitado';
    const anfitriones = this.ctx.getWebSockets('anfitrion');
    const invitados = this.ctx.getWebSockets('invitado');

    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor, [rol]);

    if (rol === 'anfitrion') {
      if (anfitriones.length) {
        servidor.send(aviso('_ocupada')); // ese código ya lo está usando otra sala
        servidor.close(4009, 'ocupada');
      } else {
        servidor.send(aviso('_lista'));
      }
    } else if (!anfitriones.length) {
      servidor.send(aviso('_nohay'));
      servidor.close(4004, 'no existe');
    } else if (invitados.length) {
      servidor.send(aviso('_llena'));
      servidor.close(4003, 'llena');
    } else {
      servidor.send(aviso('_conectado'));
      for (const a of anfitriones) a.send(aviso('_unido'));
    }
    return new Response(null, { status: 101, webSocket: cliente });
  }

  // Todo lo que manda uno le llega al otro, tal cual
  async webSocketMessage(ws, mensaje) {
    const [rol] = this.ctx.getTags(ws);
    const otro = rol === 'anfitrion' ? 'invitado' : 'anfitrion';
    for (const s of this.ctx.getWebSockets(otro)) {
      try { s.send(mensaje); } catch (e) { /* el otro se está yendo */ }
    }
  }

  async webSocketClose(ws, codigo) {
    this.avisarSalida(ws);
    try { ws.close(codigo === 1005 ? 1000 : codigo, 'adios'); } catch (e) { /* ya cerrado */ }
  }

  async webSocketError(ws) {
    this.avisarSalida(ws);
  }

  avisarSalida(ws) {
    const [rol] = this.ctx.getTags(ws);
    const otro = rol === 'anfitrion' ? 'invitado' : 'anfitrion';
    for (const s of this.ctx.getWebSockets(otro)) {
      try { s.send(aviso('_salio')); } catch (e) { /* nada */ }
    }
  }
}

export default {
  async fetch(request, env) {
    const ruta = CODIGO.exec(new URL(request.url).pathname);
    if (!ruta) {
      return new Response('Zona 1v1 · servidor de salas funcionando', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    return env.SALAS.get(env.SALAS.idFromName(ruta[1])).fetch(request);
  },
};
