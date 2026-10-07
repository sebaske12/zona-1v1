// Configuración de Vite (el programa que sirve y empaqueta el juego).
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const paquete = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// Cada vez que se empaqueta el juego recibe un código distinto: así el juego sabe si hay versión nueva
const compilacion = `${paquete.version}-${Date.now().toString(36)}`;

export default defineConfig({
  base: './', // rutas relativas: el juego funciona en cualquier carpeta (GitHub Pages, itch.io)
  define: {
    __VERSION__: JSON.stringify(paquete.version),
    __COMPILACION__: JSON.stringify(compilacion),
  },
  plugins: [
    {
      name: 'version-json',
      // Publica version.json junto al juego; el menú lo consulta para avisar de actualizaciones
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: paquete.version, compilacion }) });
      },
    },
  ],
  server: {
    host: true,         // también se abre desde el iPhone en el mismo WiFi
    allowedHosts: true, // permite túneles HTTPS para jugar desde lejos
  },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1,4 MB: es normal
  },
});
