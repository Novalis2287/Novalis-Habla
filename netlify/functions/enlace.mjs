// Páginas de los enlaces fijos de la clínica, cada una con su tarjeta de vista previa:
//   /ubicacion  → «Cómo llegar a Clínica Novalis», lleva a Google Maps
//   /conocenos  → «Conoce Clínica Novalis», con los botones de Instagram y Facebook
//   /instagram, /facebook → llevan directamente a cada red
// Las direcciones de destino no están en el código: el administrador las pone en Ajustes.
import { ICONOS, enlacesClinica, esc, noDisponible, pagina } from '../lib/comun.mjs';

// Página que muestra la tarjeta a WhatsApp y lleva a la persona a su destino.
function redirigir({ origen, ruta, destino, tarjeta, icono, boton }) {
  if (!destino) return noDisponible();
  return pagina({
    origen,
    tarjeta: { ...tarjeta, url: `${origen}/${ruta}` },
    cabecera: `<meta http-equiv="refresh" content="0;url=${esc(destino)}">`,
    cuerpo: `${icono}<h1>${esc(tarjeta.titulo)}</h1><p>${esc(tarjeta.descripcion)}</p><a class="boton" href="${esc(destino)}">${esc(boton)}</a>`,
  });
}

const CONOCENOS = {
  titulo: 'Conoce Clínica Novalis',
  descripcion: 'La experiencia de nuestros pacientes y el trabajo que realizamos cada día.',
  imagen: 'tarjeta-conocenos.png',
};

export default async req => {
  const { origin: origen, pathname } = new URL(req.url);
  const ruta = pathname.replace(/^\/+|\/+$/g, '');
  const enlaces = await enlacesClinica();

  if (ruta === 'ubicacion') {
    return redirigir({
      origen, ruta, destino: enlaces.maps, icono: ICONOS.ubicacion(), boton: 'Abrir en Google Maps',
      tarjeta: { titulo: 'Cómo llegar a Clínica Novalis', descripcion: 'Toca para ver nuestra ubicación y la ruta en Google Maps.', imagen: 'tarjeta-ubicacion.png' },
    });
  }
  if (ruta === 'instagram' || ruta === 'facebook') {
    const red = ruta === 'instagram' ? 'Instagram' : 'Facebook';
    return redirigir({
      origen, ruta, destino: enlaces[ruta], icono: ICONOS.estrella(), boton: `Abrir ${red}`,
      tarjeta: { ...CONOCENOS, titulo: `Clínica Novalis en ${red}` },
    });
  }

  // /conocenos
  if (!enlaces.instagram && !enlaces.facebook) return noDisponible();
  return pagina({
    origen,
    tarjeta: { ...CONOCENOS, url: `${origen}/conocenos` },
    cuerpo: `${ICONOS.estrella()}<h1>${esc(CONOCENOS.titulo)}</h1><p>${esc(CONOCENOS.descripcion)}</p>
${enlaces.instagram ? `<a class="boton instagram" href="${esc(enlaces.instagram)}">${ICONOS.instagram()} Instagram</a>` : ''}
${enlaces.facebook ? `<a class="boton facebook" href="${esc(enlaces.facebook)}">${ICONOS.facebook()} Facebook</a>` : ''}`,
  });
};

export const config = { path: ['/ubicacion', '/conocenos', '/instagram', '/facebook'] };
