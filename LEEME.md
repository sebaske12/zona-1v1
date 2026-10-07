# Zona 1v1

Duelo 2D para dos jugadores, hecho con Phaser 4.

## Cómo abrir el juego

1. Abre una terminal en esta carpeta (en VS Code: menú Terminal → Nueva terminal).
2. Escribe `npm run dev` y presiona Enter.
3. Abre en el navegador la dirección que aparece en `Local:` (normalmente http://localhost:5173).
4. Para jugar desde el iPhone, conectado al mismo WiFi, abre en Safari la dirección que aparece en `Network:`.

Cada vez que guardas un archivo, el juego se recarga solo. Para apagarlo, presiona `Ctrl + C` en la terminal.

## Carpetas

- `src/main.js`: configuración de Phaser.
- `src/escenas/`: las pantallas del juego (por ahora solo `Ronda.js`).
- `src/entrada/`: convierte teclado, control o pantalla táctil en una "intención".
