// Caras de los jugadores: se guardan como imagen (data URL) en el perfil
// y se cargan como textura de Phaser cuando hacen falta.
const esperando = new Map();

// Un nombre corto y estable para cada foto (la misma foto reutiliza la misma textura)
function claveCara(datos) {
  let h = 0;
  for (let i = 0; i < datos.length; i += 7) h = (h * 31 + datos.charCodeAt(i)) | 0;
  return `cara-${(h >>> 0).toString(36)}-${datos.length}`;
}

// La foto recortada en círculo (las fotos nuevas son JPG cuadrados; las viejas, PNG ya redondos).
// Se deja en un tamaño potencia de 2 para que se vea suave al achicarla en el juego.
function redonda(img) {
  const lado = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const tam = lado >= 200 ? 256 : 128;
  const c = document.createElement('canvas');
  c.width = tam;
  c.height = tam;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.beginPath();
  ctx.arc(tam / 2, tam / 2, tam / 2, 0, Math.PI * 2);
  ctx.clip();
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  ctx.drawImage(img, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, tam, tam);
  return c;
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
      if (!texturas.exists(clave)) texturas.addCanvas(clave, redonda(img));
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
  return typeof datos === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(datos) && datos.length < 200000 ? datos : null;
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
