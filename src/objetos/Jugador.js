// Un jugador: cuerpo con física, arma, objetos y cómo reacciona a su intención.
import Phaser from 'phaser';
import { ARMAS, GRANADA, BOTIQUIN, CHALECO, GEL } from '../datos/armas.js';
import { COLORES_JUGADOR, FUENTE, UI, colorVida } from '../config.js';
import { Sonido } from '../sistemas/Sonido.js';
import { conCara } from '../sistemas/Caras.js';

export const RADIO_JUGADOR = 16;
export const RADIO_CABEZA = 27; // la cabeza con foto es mucho más grande que el cuerpo, como un muñeco cabezón
export const RODADA = { multiplicador: 3, dura: 0.15, recarga: 2 };
const ORDEN_OBJETOS = ['botiquin', 'granada', 'gel'];
const MAX_OBJETOS = { botiquin: BOTIQUIN.max, granada: GRANADA.max, gel: GEL.max };

export class Jugador {
  constructor(escena, indice, x, y, perfil, stats) {
    const color = COLORES_JUGADOR[perfil.color] ?? COLORES_JUGADOR[indice];
    this.escena = escena;
    this.indice = indice;
    this.nombre = perfil.nombre;
    this.color = color.valor;
    this.colorCss = color.css;
    this.accesorio = perfil.accesorio || 'ninguno';
    this.stats = stats;

    this.vidaMax = stats.vidaMax;
    this.vida = stats.vidaMax;
    this.chaleco = 0;
    this.vivo = true;
    this.objetos = { botiquin: stats.inicio.botiquin, granada: 0, gel: stats.inicio.gel };
    this.seleccion = this.objetos.botiquin === 0 && this.objetos.gel > 0 ? 'gel' : 'botiquin';
    this.angulo = Phaser.Math.Angle.Between(x, y, escena.scale.width / 2, escena.scale.height / 2);
    this.ultimoMovimiento = new Phaser.Math.Vector2(Math.cos(this.angulo), Math.sin(this.angulo));
    this.proximoDisparo = 0;
    this.recargandoHasta = 0;
    this.apuntandoHasta = 0; // francotirador: láser antes del tiro
    this.curandoDesde = 0;
    this.curandoHasta = 0;
    this.rodandoHasta = 0;
    this.direccionRodada = new Phaser.Math.Vector2();
    this.cargasRodada = stats.cargasRodada;
    this.recargaRodada = 0;
    this.ultimoGolpe = null; // { atacante, arma } para saber quién hizo la baja
    this.fueraDeZona = false;
    this.destello = false;
    this.burlaTexto = null;
    this.burlaHasta = 0;

    // Cuerpo con física (solo el círculo choca)
    this.sprite = escena.physics.add.sprite(x, y, 'cuerpo').setTint(this.color).setDepth(10);
    this.sprite.body.setCircle(RADIO_JUGADOR, this.sprite.width / 2 - RADIO_JUGADOR, this.sprite.height / 2 - RADIO_JUGADOR);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.jugador = this;

    // Partes que solo se dibujan
    this.armaSprite = escena.add.image(x, y, 'arma-pistola').setOrigin(0, 0.5).setDepth(9);
    this.accSprite = this.accesorio !== 'ninguno' ? escena.add.image(x, y, `acc-${this.accesorio}`).setDepth(11) : null;
    // Con foto: cabeza grande de caricatura (más grande que el cuerpo) con un anillo del color del jugador
    this.cabeza = null;
    if (perfil.cara) {
      this.anilloCabeza = escena.add.circle(x, y, RADIO_CABEZA + 3, this.color).setDepth(12);
      this.cabeza = escena.add.image(x, y, 'cuerpo').setDepth(13).setVisible(false);
      conCara(escena, perfil.cara, (clave) => {
        if (!this.cabeza || !this.cabeza.active) return;
        this.cabeza.setTexture(clave).setDisplaySize(RADIO_CABEZA * 2, RADIO_CABEZA * 2).setVisible(true);
        this.escalaCabeza = this.cabeza.scaleX;
        if (!this.vivo) this.cabeza.setTint(0x777777);
      });
      if (this.accSprite) this.accSprite.setVisible(false);
    }
    this.ultX = x;
    this.ultY = y;
    this.boingInicio = -1e9; // cuándo le pegaron (para el "boing" de la cabeza)
    this.festejo = false;
    this.estrellas = null;
    this.etiqueta = escena.add.text(x, y - 36, this.nombre, { fontFamily: FUENTE, fontSize: '14px', color: this.colorCss, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(20).setStroke('#0d111d', 4);
    this.barra = escena.add.graphics().setDepth(20);
    this.anillo = escena.add.graphics().setDepth(21);
    this.laser = escena.add.graphics().setDepth(8);

    this.equipar(stats.inicio.arma || 'pistola');
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get def() { return ARMAS[this.arma]; }
  get alcance() { return this.def.alcance * this.stats.alcance; }
  get cargadorMax() { return Math.max(1, Math.round(this.def.cargador * this.stats.cargador)); }
  get curando() { return this.curandoHasta > 0; }
  get rodando() { return this.escena.reloj < this.rodandoHasta; }

  equipar(arma) {
    this.arma = arma;
    this.municion = this.cargadorMax;
    this.recargandoHasta = 0;
    this.apuntandoHasta = 0;
    this.armaSprite.setTexture(`arma-${arma}`);
  }

  // Le pegaron: la cabeza se aplasta y tambalea
  boing() {
    this.boingInicio = this.escena.game.loop.time;
  }

  // Ganó la ronda: la cabeza salta de felicidad
  festejar() {
    this.festejo = true;
  }

  // El jugador de este aparato: anillo blanco y "(tú)" para encontrarse rápido
  marcarPropio() {
    this.anilloPropio = this.escena.add.graphics().setDepth(9);
    this.etiqueta.setText(`${this.nombre} (tú)`);
  }

  darObjeto(tipo, cantidad = 1) {
    this.objetos[tipo] = Math.min(MAX_OBJETOS[tipo], this.objetos[tipo] + cantidad);
    if (this.objetos[this.seleccion] === 0) this.seleccion = tipo;
  }

  // Se llama en cada cuadro con la intención del jugador
  actualizar(intencion, dt) {
    if (!this.vivo) return;
    const moviendose = this.moverYApuntar(intencion, dt);
    this.actualizarCuracion(moviendose || intencion.disparar);
    this.actualizarArma(intencion);
    if (intencion.cambiar) this.cambiarObjeto();
    if (intencion.usar) this.usarObjeto();
    if (intencion.burla) this.escena.mostrarBurla(this, intencion.burla);
  }

  // Movimiento, rodada y hacia dónde mira. Devuelve si se está moviendo.
  // (En línea, el invitado lo calcula en su propio aparato para que no haya retraso)
  moverYApuntar(intencion, dt) {
    const escena = this.escena;
    const t = escena.reloj;

    // Las rodadas se recargan solas
    if (this.cargasRodada < this.stats.cargasRodada) {
      this.recargaRodada += dt;
      if (this.recargaRodada >= RODADA.recarga) {
        this.cargasRodada++;
        this.recargaRodada = 0;
      }
    }

    const mov = new Phaser.Math.Vector2(intencion.moverX, intencion.moverY);
    if (mov.lengthSq() > 1) mov.normalize(); // en diagonal no se va más rápido
    const moviendose = mov.lengthSq() > 0.04;
    if (moviendose) this.ultimoMovimiento.copy(mov).normalize();

    // Rodada: rápida e invulnerable a las balas
    if (intencion.rodada && this.cargasRodada > 0 && !this.rodando) {
      this.cargasRodada--;
      this.rodandoHasta = t + RODADA.dura;
      this.direccionRodada.copy(moviendose ? mov : this.ultimoMovimiento).normalize();
      this.cancelarCuracion();
      escena.efectoRodada(this);
    }

    this.apuntar(intencion, moviendose ? mov : null);

    let velocidad = this.stats.velocidad * escena.factorTerreno(this.x, this.y);
    if (this.def.velocidad) velocidad *= this.def.velocidad / 220;
    if (this.apuntandoHasta > 0) velocidad *= 0.5;
    if (this.rodando) {
      const v = this.stats.velocidad * RODADA.multiplicador;
      this.sprite.setVelocity(this.direccionRodada.x * v, this.direccionRodada.y * v);
    } else {
      this.sprite.setVelocity(mov.x * velocidad, mov.y * velocidad);
    }
    return moviendose;
  }

  // Curarse: si te mueves o disparas, se cancela
  actualizarCuracion(cancelar) {
    if (!this.curando) return;
    if (cancelar) {
      this.cancelarCuracion();
    } else if (this.escena.reloj >= this.curandoHasta) {
      this.curandoHasta = 0;
      this.objetos.botiquin--;
      this.vida = Math.min(this.vidaMax, this.vida + BOTIQUIN.cura);
      this.escena.efectoCuracion(this);
    }
  }

  // Recarga, apuntado del francotirador y disparos
  actualizarArma(intencion) {
    const t = this.escena.reloj;
    // Terminó la recarga
    if (this.recargandoHasta > 0 && t >= this.recargandoHasta) {
      this.recargandoHasta = 0;
      this.municion = this.cargadorMax;
      Sonido.tocar('recarga');
    }

    // Disparo
    if (this.apuntandoHasta > 0) {
      if (t >= this.apuntandoHasta) {
        this.apuntandoHasta = 0;
        this.disparar();
      }
    } else if (intencion.disparar && !this.curando && !this.rodando && this.recargandoHasta === 0 && t >= this.proximoDisparo) {
      if (this.municion <= 0) {
        this.empezarRecarga();
      } else if (this.def.rayo) {
        this.apuntandoHasta = t + this.def.apuntado;
        Sonido.tocar('apuntar');
      } else {
        this.disparar();
      }
    }
  }

  // Apuntado asistido: mira al rival si lo ve y está a distancia de disparo
  apuntar(intencion, mov) {
    if (intencion.apuntarX * intencion.apuntarX + intencion.apuntarY * intencion.apuntarY > 0.09) {
      this.angulo = Math.atan2(intencion.apuntarY, intencion.apuntarX);
      return;
    }
    const rival = this.escena.rivalDe(this);
    if (rival && rival.vivo) {
      const distancia = Phaser.Math.Distance.Between(this.x, this.y, rival.x, rival.y);
      if (distancia <= this.alcance + 20 && this.escena.hayVision(this.x, this.y, rival.x, rival.y)) {
        this.angulo = Phaser.Math.Angle.Between(this.x, this.y, rival.x, rival.y);
        return;
      }
    }
    if (mov) this.angulo = Math.atan2(mov.y, mov.x);
  }

  disparar() {
    this.municion--;
    this.proximoDisparo = this.escena.reloj + 1 / this.def.porSegundo;
    this.escena.disparo(this, this.angulo, this.def);
    if (this.municion <= 0) this.empezarRecarga();
  }

  empezarRecarga() {
    if (this.recargandoHasta > 0) return;
    this.recargandoHasta = this.escena.reloj + this.def.recarga * this.stats.recarga;
    Sonido.tocar('vacio');
  }

  cambiarObjeto() {
    const i = ORDEN_OBJETOS.indexOf(this.seleccion);
    for (let k = 1; k <= ORDEN_OBJETOS.length; k++) {
      const tipo = ORDEN_OBJETOS[(i + k) % ORDEN_OBJETOS.length];
      if (this.objetos[tipo] > 0) {
        if (tipo !== this.seleccion) Sonido.tocar('click');
        this.seleccion = tipo;
        return;
      }
    }
  }

  usarObjeto() {
    if (this.objetos[this.seleccion] <= 0) this.cambiarObjeto();
    const tipo = this.seleccion;
    if (this.objetos[tipo] <= 0) return;
    if (tipo === 'botiquin') {
      if (this.curando || this.vida >= this.vidaMax) return;
      this.curandoDesde = this.escena.reloj;
      this.curandoHasta = this.escena.reloj + BOTIQUIN.tiempo;
      Sonido.tocar('curar');
    } else if (tipo === 'granada') {
      this.objetos.granada--;
      this.escena.lanzarGranada(this, this.angulo);
    } else if (tipo === 'gel') {
      if (this.escena.ponerGel(this, this.angulo)) this.objetos.gel--;
    }
  }

  cancelarCuracion() {
    this.curandoHasta = 0;
  }

  // Devuelve el daño que de verdad recibió (0 si lo esquivó)
  recibirDano(cantidad, atacante = null, arma = 'zona') {
    if (!this.vivo || this.escena.estado !== 'jugando') return 0;
    if (arma !== 'zona' && this.rodando) return 0;
    let resto = cantidad;
    if (arma !== 'zona' && this.chaleco > 0) {
      const absorbido = Math.min(this.chaleco, resto);
      this.chaleco -= absorbido;
      resto -= absorbido;
    }
    this.vida = Math.max(0, this.vida - resto);
    if (atacante) this.ultimoGolpe = { atacante, arma };
    if (this.vida <= 0) {
      this.causa = arma; // para contar cómo cayó
      this.morir();
    }
    return cantidad;
  }

  morir() {
    this.vivo = false;
    this.cancelarCuracion();
    this.apuntandoHasta = 0;
    this.sprite.setVelocity(0, 0);
    this.sprite.body.enable = false;
    this.sprite.setTintMode(Phaser.TintModes.MULTIPLY).setTint(0x555b6e);
    this.armaSprite.setVisible(false);
    this.etiqueta.setAlpha(0.5);
    if (this.cabeza) {
      // Cara gris y de lado: quedó "noqueado"
      this.cabeza.setTintMode(Phaser.TintModes.MULTIPLY).setTint(0x777777);
      this.anilloCabeza.setFillStyle(0x555b6e);
      this.escena.tweens.add({ targets: [this.cabeza, this.anilloCabeza], angle: 90, alpha: 0.75, duration: 400 });
    }
    this.barra.clear();
    this.anillo.clear();
    this.laser.clear();
    this.escena.tweens.add({ targets: [this.sprite, this.accSprite].filter(Boolean), scale: 0.8, alpha: 0.6, duration: 400 });
  }

  // Coloca las partes que siguen al cuerpo (se llama después de la física)
  dibujar() {
    const { x, y } = this.sprite;
    const escena = this.escena;
    // Con la cabeza grande el arma sale desde el borde de la cara, para que se vea
    const salida = this.cabeza ? RADIO_CABEZA - 9 : 6;
    this.armaSprite.setPosition(x + Math.cos(this.angulo) * salida, y + Math.sin(this.angulo) * salida).setRotation(this.angulo);
    if (this.accSprite) this.accSprite.setPosition(x, y).setRotation(this.angulo);
    const subir = this.cabeza ? RADIO_CABEZA - 13 : 0; // con cabeza grande, el nombre y la barra van más arriba
    this.etiqueta.setPosition(x, y - 38 - subir);
    const ahora = escena.game.loop.time;
    if (this.cabeza) {
      // La cabeza rebota al caminar (se estira y se aplasta un poquito)
      const moviendo = this.vivo && Math.hypot(x - this.ultX, y - this.ultY) > 0.5;
      const rebote = moviendo ? Math.sin(ahora / 55) * 0.08 : 0;
      let sx = 1 + rebote;
      let sy = 1 - rebote;
      let angulo = 0;
      let salto = 0;
      // "Boing" cuando le pegan
      const b = (ahora - this.boingInicio) / 320;
      if (b >= 0 && b < 1) {
        const onda = Math.sin(b * Math.PI) * (1 - b);
        sx += 0.42 * onda;
        sy -= 0.34 * onda;
        angulo = Math.sin(b * Math.PI * 4) * 24 * (1 - b);
      }
      // Saltitos de felicidad del que ganó la ronda
      if (this.festejo && this.vivo) {
        const s = Math.abs(Math.sin(ahora / 110));
        salto = -12 * s;
        sy += 0.16 * s;
        sx -= 0.08 * s;
        angulo = Math.sin(ahora / 90) * 12;
      }
      const e = this.escalaCabeza || 1;
      this.anilloCabeza.setPosition(x, y - 3 + salto);
      this.cabeza.setPosition(x, y - 3 + salto);
      if (this.vivo) {
        this.cabeza.setScale(e * sx, e * sy).setAngle(angulo);
        this.anilloCabeza.setScale(sx, sy);
      }
    }
    // Estrellitas dando vueltas sobre el que cayó
    if (!this.vivo) {
      if (!this.estrellas) {
        this.estrellas = [0, 1, 2].map(() => escena.add.text(x, y, '⭐', { fontSize: '13px' }).setOrigin(0.5).setDepth(22));
      }
      const radio = this.cabeza ? RADIO_CABEZA + 6 : 22;
      this.estrellas.forEach((s, k) => {
        const a = ahora / 260 + (k * Math.PI * 2) / 3;
        s.setPosition(x + Math.cos(a) * radio, y - 8 - subir + Math.sin(a) * 9).setDepth(Math.sin(a) > 0 ? 22 : 8);
      });
    }
    this.ultX = x;
    this.ultY = y;
    const radioMarca = this.cabeza ? RADIO_CABEZA + 7 : 21;
    if (this.anilloPropio) {
      this.anilloPropio.clear();
      if (this.vivo) this.anilloPropio.lineStyle(2, 0xffffff, 0.6).strokeCircle(x, y - (this.cabeza ? 3 : 0), radioMarca);
    }

    this.barra.clear();
    if (this.vivo) {
      const ancho = 40;
      const yb = y - 29 - subir;
      const p = Phaser.Math.Clamp(this.vida / this.vidaMax, 0, 1);
      this.barra.fillStyle(0x0d111d, 0.85).fillRect(x - ancho / 2 - 1, yb, ancho + 2, 7);
      this.barra.fillStyle(colorVida(p), 1).fillRect(x - ancho / 2, yb + 1, ancho * p, 4);
      if (this.chaleco > 0) this.barra.fillStyle(UI.chaleco, 1).fillRect(x - ancho / 2, yb + 5, ancho * (this.chaleco / CHALECO), 2);
    }

    this.anillo.clear();
    if (this.curando) {
      const p = Phaser.Math.Clamp((escena.reloj - this.curandoDesde) / BOTIQUIN.tiempo, 0, 1);
      this.anillo.lineStyle(4, 0x3fd07f, 1);
      this.anillo.beginPath();
      this.anillo.arc(x, y, radioMarca + 1, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      this.anillo.strokePath();
    }

    this.laser.clear();
    if (this.apuntandoHasta > 0 && this.vivo) {
      const fin = escena.impactoRayo(x, y, this.angulo, this.alcance, this);
      this.laser.lineStyle(2, 0xff3b30, 0.85).lineBetween(x, y, fin.x, fin.y);
    }

    if (this.vivo) {
      // Fuera de la zona el jugador parpadea (sin cambiar de color, para no confundirlo con el rival)
      const parpadeo = this.fueraDeZona && Math.floor(escena.game.loop.time / 160) % 2 === 0;
      const alpha = parpadeo ? 0.45 : 1;
      this.sprite.setAlpha(alpha);
      this.armaSprite.setAlpha(alpha);
      if (this.cabeza) {
        this.cabeza.setAlpha(alpha);
        this.anilloCabeza.setAlpha(alpha);
      }
      if (!this.destello) this.sprite.setTint(this.color);
    }

    if (this.burlaTexto) {
      const e = (escena.game.loop.time - this.burlaInicio) / 1500;
      if (e >= 1) {
        this.burlaTexto.destroy();
        this.burlaTexto = null;
      } else {
        this.burlaTexto.setPosition(x, y - 60 - subir - e * 16).setAlpha(e < 0.7 ? 1 : 1 - (e - 0.7) / 0.3);
      }
    }
  }
}
