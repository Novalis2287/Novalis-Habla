// Página de vista previa de un archivo de la biblioteca (PDF o imagen): /d/<id>
// WhatsApp muestra una tarjeta: con aspecto de documento si es un PDF, o con la propia imagen.
import { ICONOS, bd, esImagen, esc, noDisponible, pagina, urlBiblioteca } from '../lib/comun.mjs';

export default async (req, context) => {
  const id = context.params.id ?? '';
  if (!/^[a-z0-9]{4,20}$/.test(id)) return noDisponible('Documento no disponible');

  const [doc] = (await bd(`documentos?id=eq.${id}&select=titulo,descripcion,ruta`)) ?? [];
  if (!doc) return noDisponible('Documento no disponible');

  const origen = new URL(req.url).origin;
  const archivo = urlBiblioteca(doc.ruta), imagen = esImagen(doc.ruta);
  const descripcion = doc.descripcion || (imagen ? 'Imagen de Clínica Novalis. Toca para abrirla.' : 'Documento PDF de Clínica Novalis. Toca para abrirlo.');

  return pagina({
    origen,
    tarjeta: { titulo: doc.titulo, descripcion, imagen: imagen ? archivo : 'documento.png', url: `${origen}/d/${id}` },
    cuerpo: imagen
      ? `<a href="${esc(archivo)}"><img class="vista" src="${esc(archivo)}" alt="${esc(doc.titulo)}"></a><h1>${esc(doc.titulo)}</h1><p>${esc(descripcion)}</p><a class="boton" href="${esc(archivo)}">Abrir imagen</a>`
      : `${ICONOS.documento()}<h1>${esc(doc.titulo)}</h1><p>${esc(descripcion)}</p><a class="boton" href="${esc(archivo)}">Abrir documento (PDF)</a>`,
  });
};

export const config = { path: '/d/:id' };
