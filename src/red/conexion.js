// Elige cómo conectarse: por el servidor de salas (funciona en cualquier red) o directo (PeerJS).
import { Red } from './Red.js';
import { RedNube } from './RedNube.js';
import { SERVIDOR_SALAS } from './servidor.js';

export function crearRed(juego) {
  return SERVIDOR_SALAS ? new RedNube(juego) : new Red(juego);
}
