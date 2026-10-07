// Caras de los jugadores: se guardan como imagen (data URL) en el perfil
// y se cargan como textura de Phaser cuando hacen falta.
const esperando = new Map();

// Un nombre corto y estable para cada foto (la misma foto reutiliza la misma textura)
function claveCara(datos) {
  let h = 0;
  for (let i = 0; i < datos.length; i += 7) h = (h * 31 + datos.charCodeAt(i)) | 0;
  return `cara-${(h >>> 0).toString(36)}-${datos.length}`;
}

// Llama a listo(clave) cuando la textura esté lista (al momento si ya estaba cargada)
export function conCara(escena, datos, listo) {
  if (!datos) return;
  const clave = claveCara(datos);
  const texturas = escena.textures;
  if (texturas.exists(clave)) {
    listo(clave);
    return;
  }
  if (!esperando.has(clave)) {
    esperando.set(clave, []);
    const img = new Image();
    img.onload = () => {
      if (!texturas.exists(clave)) texturas.addImage(clave, img);
      (esperando.get(clave) || []).forEach((fn) => fn(clave));
      esperando.delete(clave);
    };
    img.onerror = () => esperando.delete(clave);
    img.src = datos;
  }
  esperando.get(clave).push(listo);
}

// Solo se aceptan imágenes reales y no muy pesadas (por ejemplo, las que llegan por la red)
export function caraValida(datos) {
  return typeof datos === 'string' && datos.startsWith('data:image/') && datos.length < 150000 ? datos : null;
}

// Quién dijo "Ahora no" a la foto (se recuerda mientras el juego esté abierto)
export function fotoOmitida(escena, nombre, marcar = false) {
  const omitidas = escena.registry.get('fotosOmitidas') || {};
  const clave = (nombre || '').trim().toLowerCase();
  if (marcar) {
    omitidas[clave] = true;
    escena.registry.set('fotosOmitidas', omitidas);
  }
  return !!omitidas[clave];
}

// Para mandar por la red sin las fotos (cada aparato ya tiene las caras)
export function sinCaras(config) {
  return { ...config, perfiles: config.perfiles.map(({ cara, ...resto }) => resto) };
}
