// Dirección del servidor de salas (Cloudflare, ver la carpeta "servidor").
// Para probar en el PC con el servidor local se puede cambiar con VITE_SERVIDOR_SALAS=ws://127.0.0.1:8787.
// Si quedara vacía, el juego usaría la conexión directa entre aparatos (PeerJS), que con datos móviles suele fallar.
export const SERVIDOR_SALAS = import.meta.env.VITE_SERVIDOR_SALAS || 'wss://zona1v1-salas.zona1v1-salas.workers.dev';
