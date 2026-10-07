// Dirección del servidor de salas (Cloudflare, ver la carpeta "servidor").
// Para probar en el PC se puede cambiar con la variable VITE_SERVIDOR_SALAS (por ejemplo ws://localhost:8787).
// Si queda vacía, el juego usa la conexión directa entre aparatos (PeerJS), que con datos móviles suele fallar.
export const SERVIDOR_SALAS = import.meta.env.VITE_SERVIDOR_SALAS || '';
