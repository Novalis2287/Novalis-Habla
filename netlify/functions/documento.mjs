// Página de vista previa de un documento de la biblioteca: /d/<id>
// WhatsApp muestra una tarjeta con aspecto de documento; al tocarla se abre el PDF.
import { ICONOS, URL_BD, bd, esc, noDisponible, pagina } from '../lib/comun.mjs';

export default async (req, context) => {
  const id = context.params.id ?? '';
  if (!/^[a-z0-9]{4,20}$/.test(id)) return noDisponible('Documento no disponible');

  const [doc] = (await bd(`documentos?id=eq.${id}&select=titulo,descripcion,ruta`)) ?? [];
  if (!doc) return noDisponible('Documento no disponible');

  const origen = new URL(req.url).origin;
  const pdf = `${URL_BD}/storage/v1/object/public/documentos/${encodeURIComponent(doc.ruta)}`;
  const descripcion = doc.descripcion || 'Documento PDF de Clínica Novalis. Toca para abrirlo.';

  return pagina({
    origen,
    tarjeta: { titulo: doc.titulo, descripcion, imagen: 'documento.png', url: `${origen}/d/${id}` },
    cuerpo: `${ICONOS.documento()}<h1>${esc(doc.titulo)}</h1><p>${esc(descripcion)}</p><a class="boton" href="${esc(pdf)}">Abrir documento (PDF)</a>`,
  });
};

export const config = { path: '/d/:id' };
