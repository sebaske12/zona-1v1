# Zona 1v1

Duelo 2D para dos: botín, zona que se cierra, pared de gel y airdrop. Rondas de 60 a 90 segundos, al mejor de 5.
Hecho con Phaser 4 y JavaScript.

**Jugar ahora:** https://sebaske12.github.io/zona-1v1/

## Cómo abrirlo

- **Doble clic en `Jugar.bat`** (o en el acceso "Zona 1v1" del escritorio). Se abre el navegador solo.
  No cierres la ventana negra mientras juegan: es el servidor del juego.
- O, desde la terminal de VS Code en esta carpeta: `npm run dev`.

La primera vez, Windows puede preguntar si Node.js puede usar la red: acepta para **redes privadas**
(sin eso, los iPhone no pueden entrar).

## Jugar los dos en este PC

| Acción | Jugador 1 | Jugador 2 | Control PS / Xbox |
|---|---|---|---|
| Moverse | W A S D | Flechas | Stick izquierdo |
| Disparar (mantener) | Espacio | K | R2 / RT o A |
| Rodada (esquiva balas) | Shift | J | L2 / LT o B |
| Usar objeto | Q | L | R1 / RB o X |
| Cambiar objeto | E | I | L1 / LB o Y |
| Burlas | 1 · 2 · 3 | 8 · 9 · 0 | Cruceta |
| Pausa | Esc | Esc | — |

Con teclado se apunta solo: tu personaje mira al rival cuando lo ve. Con control se apunta con el stick derecho.
Para abrir una caja, quédate encima medio segundo.

## Jugar cada uno en su iPhone (misma casa, mismo WiFi)

1. En el PC, abre `Jugar.bat`. En la ventana negra aparece una dirección `Network`, por ejemplo `http://192.168.1.8:5173`.
2. En cada iPhone, abre esa dirección en Safari.
3. Recomendado: Compartir → **Agregar a pantalla de inicio**. Así abre en pantalla completa, como una app.
4. Uno toca **Jugar en línea → Crear sala** y le dice el código de 4 letras al otro.
5. El otro toca **Jugar en línea**, escribe el código en **Unirse** y toca **Unirse**.

En el iPhone: joystick izquierdo para moverte; con el dedo en la mitad derecha apuntas y disparas.
Botones: Rodar, Usar, ⇄ (cambiar objeto) y 😂 (burla).
En línea también se puede jugar desde un PC: W A S D, el ratón apunta y el clic dispara.

## Jugar desde lejos (cada uno en su casa)

Hay que publicar el juego en internet (gratis, con GitHub Pages). Los pasos están abajo, en "Publicar".
Después, cada uno abre el link `https://TU-USUARIO.github.io/zona-1v1/` y usa **Jugar en línea**.

## Qué trae

- **Modos:** Clásico, Solo escopetas, Francotiradores, Un tiro (1 de vida, 30 s) y Caos (caen objetos cada 10 s).
- **Mapas:** Bodega, Pueblo (casas con puertas), Isla (un río que te frena y un puente) y Mercado (puestos y pasillos).
- **Armas:** pistola, subfusil, escopeta, rifle, francotirador (con láser de aviso), lanzacohetes (el cohete es lento
  y explota en un área) y rifle dorado (solo en el airdrop).
- **Tu cara en el muñeco:** en la preparación (o en la sala en línea) toca **📷 Tu cara**, toma o elige una foto,
  acomódala en el círculo y se convierte en caricatura. En el juego tu muñeco tiene cabeza grande con tu cara.
- **En el celular** la cámara sigue a tu jugador con zoom, y unas flechas en el borde señalan al rival, al airdrop y a la zona.
- **Actualizaciones:** cuando se publica una versión nueva, el menú muestra "¡Hay una versión nueva!" para actualizar con un toque.
  La versión está abajo a la derecha del menú.
- **Música** que se acelera cuando la zona se cierra del todo. Se apaga en Ajustes.
- **Cambiar teclas:** Ajustes → Cambiar teclas. Si eliges una tecla que ya usaba otra acción, se intercambian.
- **Objetos:** botiquín (2 s quieto), chaleco, granada y pared de gel.
- **Ventajas entre rondas:** el que perdió elige primero y no ve las cartas del otro.
- **Lo de pareja:** apuesta (el que pierde paga lo que escribió el ganador), historial con rachas y corona,
  burlas, hándicap de vida y cámara lenta en la baja final.
- **Entrenar contra el bot:** para practicar solo. Con + y − cambias la vida del bot (dificultad).

## Publicar en GitHub Pages (una sola vez)

1. Crea una cuenta en https://github.com.
2. Crea un repositorio nuevo, vacío, llamado `zona-1v1`.
3. En la terminal de VS Code, en esta carpeta:
   ```
   git remote add origin https://github.com/TU-USUARIO/zona-1v1.git
   git push -u origin main
   ```
4. En GitHub, en el repositorio: **Settings → Pages → Source: GitHub Actions**.
5. Espera 1 o 2 minutos. El juego queda en `https://TU-USUARIO.github.io/zona-1v1/`.

Cada vez que guardes cambios y hagas `git push`, se vuelve a publicar solo.

## Problemas comunes

- **El iPhone no abre la dirección:** los dos deben estar en el mismo WiFi que el PC y `Jugar.bat` abierto.
  Si cambió la dirección, mírala otra vez en la ventana negra.
- **No suena en el iPhone:** quita el modo silencio (el interruptor del costado). Toca la pantalla una vez.
- **En línea:** desde la versión 1.3 las salas pasan por un servidor propio en Cloudflare, así que funciona
  con WiFi, con datos móviles y cada uno en su casa. Si no conecta, revisen que los dos tengan internet
  y la misma versión (abajo a la derecha del menú).
- **Con un solo teclado no responden las teclas de los dos:** algunos teclados no aguantan muchas teclas a la vez.
  Conecta un control USB o Bluetooth para uno de los dos.

## Carpetas

- `src/main.js`: configuración de Phaser y lista de escenas.
- `src/datos/`: armas, botín, zona, mapas, modos y ventajas. **Para balancear el juego se cambian números aquí.**
- `src/escenas/`: las pantallas (menú, preparación, ronda, HUD, ventajas, victoria, historial, sala en línea…).
- `src/objetos/Jugador.js`: el personaje.
- `src/entrada/`: teclado, control, ratón, pantalla táctil, red y bot. Todos producen la misma "intención".
- `src/red/`: la conexión en línea. `RedNube.js` usa el servidor de salas; `Red.js` es la conexión directa (PeerJS) de respaldo.
- `servidor/`: el servidor de salas (Cloudflare Workers, plan gratis). Para publicarlo de nuevo:
  `cd servidor` y `npx wrangler deploy`. Su dirección está en `src/red/servidor.js`.
- `src/sistemas/`: sonidos (generados con código), guardado e historial.
