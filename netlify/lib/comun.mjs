// Piezas comunes de las páginas que abre el paciente desde WhatsApp.
//
// WhatsApp lee las etiquetas "og:" de cada página para mostrar una tarjeta con
// imagen, título y descripción. Solo muestra la tarjeta del primer enlace de un
// mensaje, así que cada mensaje lleva un único enlace, y todos pasan por aquí.

export const URL_BD = process.env.VITE_SUPABASE_URL;
export const CLAVE_BD = process.env.VITE_SUPABASE_ANON_KEY;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Solo se aceptan direcciones web normales (nunca "javascript:" ni parecidas).
export function urlSegura(u) {
  try { const x = new URL(String(u ?? '').trim()); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; }
  catch { return ''; }
}

// Petición a la base de datos con la clave pública: solo llega a lo que las reglas dejan ver sin sesión.
export async function bd(ruta, opciones = {}) {
  if (!URL_BD || !CLAVE_BD) return null;
  try {
    const res = await fetch(`${URL_BD}/rest/v1/${ruta}`, {
      ...opciones,
      headers: { apikey: CLAVE_BD, authorization: `Bearer ${CLAVE_BD}`, 'content-type': 'application/json', ...opciones.headers },
    });
    return res.ok ? await res.json() : null;
  } catch { return null; } // sin conexión con la base de datos
}

export async function enlacesClinica() {
  const filas = await bd('ajustes?clave=eq.enlaces&select=valor');
  const v = filas?.[0]?.valor ?? {};
  return { maps: urlSegura(v.maps), instagram: urlSegura(v.instagram), facebook: urlSegura(v.facebook) };
}

const trazo = (d, tam = 56) => `<svg class="ico" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
export const ICONOS = {
  documento: tam => trazo('M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zm0 0v4h4M9 13h6m-6 4h6', tam),
  ubicacion: tam => trazo('M12 21s-7-6.200-7-11.500a7 7 0 0 1 14 0C19 14.800 12 21 12 21zm0-8.500a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', tam),
  estrella: tam => trazo('M12 3l2.600 5.600 6.100.700-4.500 4.200 1.200 6-5.400-3-5.400 3 1.200-6L3.300 9.300l6.100-.700z', tam),
  instagram: (tam = 28) => `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.200" cy="6.800" r=".6" fill="currentColor"/></svg>`,
  facebook: (tam = 28) => `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.500 21v-7.500h2.600l.400-3.100h-3V8.500c0-.900.300-1.500 1.600-1.500h1.600V4.200c-.300 0-1.200-.100-2.300-.100-2.300 0-3.900 1.400-3.900 4v2.300H7.900v3.100h2.600V21z"/></svg>`,
};

const APP = 'Novalis Habla';

const ESTILO = `
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #f2f5f5; color: #14201f;
         font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  header { background: #058bc0; color: #fff; padding: 20px 16px 54px; display: flex; align-items: center; justify-content: center; gap: 12px;
           font-size: 22px; font-weight: 700; letter-spacing: -.2px; }
  header img { width: 46px; height: 46px; display: block; border-radius: 12px; box-shadow: 0 0 0 1.5px rgba(255, 255, 255, .55); }
  main { width: min(460px, calc(100% - 32px)); margin: -34px auto 0; background: #fff; border: 1px solid #dde5e4;
         border-radius: 18px; padding: 28px 22px 24px; text-align: center; box-shadow: 0 6px 24px rgba(5, 80, 110, .08); }
  main.ancho { width: min(720px, calc(100% - 32px)); }
  .ico { color: #0580b5; background: #e2f1f8; border-radius: 22px; padding: 14px; width: 84px; height: 84px; }
  h1 { font-size: 22px; line-height: 1.25; margin: 14px 0 6px; }
  h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #647471; margin: 26px 0 10px; text-align: left; }
  p { color: #647471; margin: 0 0 20px; }
  a.boton { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; padding: 14px;
            border-radius: 14px; background: #0580b5; color: #fff; font-weight: 700; font-size: 17px; text-decoration: none; margin-top: 12px; }
  a.boton.instagram { background: linear-gradient(45deg, #f9a23b, #e2336b 45%, #a233b8 75%, #5b51d8); }
  a.boton.facebook { background: #1877f2; }
  .fotos { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .fotos a { display: block; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden; background: #e2f1f8; }
  .fotos img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .docs { list-style: none; margin: 0; padding: 0; text-align: left; }
  .docs a { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #dde5e4; border-radius: 14px;
            margin-top: 8px; color: inherit; text-decoration: none; }
  .docs .ico { width: 48px; height: 48px; padding: 9px; border-radius: 12px; flex: none; }
  .docs img { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; flex: none; background: #e2f1f8; }
  .docs b { display: block; }
  img.vista { display: block; max-width: 100%; max-height: 60vh; margin: 0 auto 4px; border-radius: 12px; }
  .docs span span { display: block; font-size: 14px; color: #647471; }
  footer { text-align: center; color: #647471; font-size: 13px; padding: 18px 16px 28px; }
`;

// Página completa. "tarjeta" son los datos de la vista previa de WhatsApp: { titulo, descripcion, imagen, url }.
// "url" es opcional: si se indica, tiene que ser una dirección que funcione, porque algunos robots
// van a buscar la tarjeta a esa dirección en vez de a la del enlace. "titulo" es el nombre de la pestaña.
// Las páginas privadas no se guardan en ninguna caché ni dejan rastro de su dirección al salir de ellas.
export function pagina({ cuerpo, tarjeta, origen, titulo, estado = 200, cabecera = '', privada = false, ancho = false }) {
  const propia = /^https?:\/\//.test(tarjeta?.imagen ?? ''); // imagen con dirección completa (no una de las tarjetas de la app)
  const og = tarjeta ? `<title>${esc(titulo ?? `${tarjeta.titulo} · ${APP}`)}</title>
<meta name="description" content="${esc(tarjeta.descripcion)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${APP}">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(tarjeta.titulo)}">
<meta property="og:description" content="${esc(tarjeta.descripcion)}">
${tarjeta.url ? `<meta property="og:url" content="${esc(tarjeta.url)}">` : ''}
<meta property="og:image" content="${esc(propia ? tarjeta.imagen : `${origen}/${tarjeta.imagen}`)}">
${propia ? '' : `<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`}
<meta property="og:image:alt" content="${esc(tarjeta.titulo)}">
<meta name="twitter:card" content="summary_large_image">` : '';
  return new Response(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#058bc0">
<meta name="application-name" content="${APP}">
<meta name="apple-mobile-web-app-title" content="${APP}">
<link rel="icon" type="image/png" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
${og}
${cabecera}
<style>${ESTILO}</style>
</head>
<body>
<header><img src="/icons/icon-192.png" alt=""> ${APP}</header>
<main${ancho ? ' class="ancho"' : ''}>${cuerpo}</main>
<footer>Clínica Novalis</footer>
</body>
</html>`, {
    status: estado,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': privada ? 'private, no-store' : 'public, max-age=300',
      'x-robots-tag': 'noindex',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

// Los archivos de la biblioteca son PDF o imágenes (PNG, JPG); se distinguen por la extensión.
export const esImagen = ruta => /\.(png|jpe?g)$/i.test(ruta ?? '');
export const urlBiblioteca = ruta => `${URL_BD}/storage/v1/object/public/documentos/${encodeURIComponent(ruta)}`;

export const noDisponible = (titulo = 'Enlace no disponible', texto = 'Este enlace ya no funciona. Pide a la clínica que te lo envíe de nuevo.', privada = false) =>
  pagina({ cuerpo: `${ICONOS.documento()}<h1>${esc(titulo)}</h1><p>${esc(texto)}</p>`, cabecera: `<title>${esc(titulo)}</title>`, estado: 404, privada });

// ¿Es el robot de WhatsApp/Meta que viene a por la tarjeta de vista previa?
export const esRobot = req => /whatsapp|facebookexternalhit|facebot|meta-externalagent/i.test(req.headers.get('user-agent') ?? '');
