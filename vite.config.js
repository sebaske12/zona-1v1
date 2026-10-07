// Configuración de Vite (el programa que sirve y empaqueta el juego).
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // rutas relativas: el juego funciona en cualquier carpeta (GitHub Pages, itch.io)
  server: {
    host: true,         // también se abre desde el iPhone en el mismo WiFi
    allowedHosts: true, // permite túneles HTTPS para jugar desde lejos
  },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1,4 MB: es normal
  },
});
