// Página de vista previa de un documento: /d/<id>
//
// WhatsApp lee las etiquetas "og:" de esta página para mostrar una tarjeta con
// título, descripción e imagen de documento. Cuando el paciente la toca, se abre el PDF.

const URL_BD = process.env.VITE_SUPABASE_URL;
const CLAVE_BD = process.env.VITE_SUPABASE_ANON_KEY;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pagina = (cuerpo, cabecera = '', estado = 200) => new Response(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${cabecera}
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f2f5f5; color: #14201f;
         font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { width: min(420px, calc(100% - 32px)); background: #fff; border: 1px solid #dde5e4; border-radius: 16px; padding: 28px 22px; text-align: center; }
  svg { color: #0580b5; }
  h1 { font-size: 21px; margin: 12px 0 6px; }
  p { color: #647471; margin: 0 0 20px; }
  a { display: block; padding: 14px; border-radius: 12px; background: #0580b5; color: #fff; font-weight: 700; text-decoration: none; }
  small { display: block; margin-top: 18px; color: #647471; }
</style>
</head>
<body><main>${cuerpo}<small>Clínica Novalis</small></main></body>
</html>`, { status: estado, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });

const ICONO = '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zm0 0v4h4M9 13h6m-6 4h6"/></svg>';
const noDisponible = () => pagina(`${ICONO}<h1>Documento no disponible</h1><p>Este enlace ya no funciona. Pide a la clínica que te lo envíe de nuevo.</p>`, '<title>Documento no disponible</title>', 404);

export default async (req, context) => {
  const id = context.params.id ?? '';
  if (!URL_BD || !CLAVE_BD || !/^[a-z0-9]{4,20}$/.test(id)) return noDisponible();

  let doc;
  try {
    const res = await fetch(`${URL_BD}/rest/v1/documentos?id=eq.${id}&select=titulo,descripcion,ruta`, {
      headers: { apikey: CLAVE_BD, authorization: `Bearer ${CLAVE_BD}` },
    });
    [doc] = res.ok ? await res.json() : [];
  } catch { /* sin conexión con la base de datos */ }
  if (!doc) return noDisponible();

  const origen = new URL(req.url).origin;
  const pdf = `${URL_BD}/storage/v1/object/public/documentos/${encodeURIComponent(doc.ruta)}`;
  const descripcion = doc.descripcion || 'Documento PDF de Clínica Novalis. Toca para abrirlo.';

  return pagina(
    `${ICONO}<h1>${esc(doc.titulo)}</h1><p>${esc(descripcion)}</p><a href="${esc(pdf)}">Abrir documento (PDF)</a>`,
    `<title>${esc(doc.titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Clínica Novalis">
<meta property="og:title" content="${esc(doc.titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(`${origen}/d/${id}`)}">
<meta property="og:image" content="${origen}/documento.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">`,
  );
};

export const config = { path: '/d/:id' };
