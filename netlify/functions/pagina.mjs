// Página personal de un paciente: /p/<id>
// Reúne sus fotografías intraorales y los PDF elegidos para él tras la valoración.
//
// Son datos de salud, así que:
//  · el id es largo y aleatorio (imposible de adivinar) y la página caduca;
//  · la tarjeta de vista previa no lleva ningún dato del paciente;
//  · al robot de WhatsApp solo se le da la tarjeta, nunca el contenido;
//  · la página no se guarda en cachés y las fotos se sirven con enlaces firmados que caducan.
import { ICONOS, URL_BD, bd, esImagen, esRobot, esc, noDisponible, pagina, urlBiblioteca } from '../lib/comun.mjs';

const TARJETA = {
  titulo: 'Tu información – Clínica Novalis',
  descripcion: 'Documentación preparada por nuestro equipo. Enlace personal y confidencial.',
  imagen: 'tarjeta-informacion.png',
};
const fechaLarga = iso => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const caducada = () => noDisponible('Enlace no disponible', 'Este enlace ha caducado o ya no está disponible. Pide a la clínica que te lo envíe de nuevo.', true);

export default async (req, context) => {
  const id = context.params.id ?? '';
  if (!/^[a-z0-9]{32}$/.test(id)) return caducada();

  const origen = new URL(req.url).origin;
  const tarjeta = TARJETA; // sin "og:url": la dirección personal no se repite en la tarjeta
  const portada = `${ICONOS.documento()}<h1>Tu información</h1>`;
  if (esRobot(req)) return pagina({ origen, tarjeta, titulo: 'Novalis Habla', privada: true, cuerpo: `${portada}<p>${esc(TARJETA.descripcion)}</p>` });

  const datos = await bd('rpc/pagina_paciente', { method: 'POST', body: JSON.stringify({ p_id: id }) });
  if (!datos) return caducada();

  const fotos = (datos.fotos ?? []).filter(u => typeof u === 'string' && u.startsWith(`${URL_BD}/storage/`));
  const docs = datos.documentos ?? [];

  return pagina({
    origen, tarjeta, titulo: 'Novalis Habla', privada: true, ancho: true,
    cuerpo: `${portada}
<p>Clínica Novalis ha preparado esta información para ti.</p>
${fotos.length ? `<h2>Tus fotografías intraorales</h2>
<div class="fotos">${fotos.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="Fotografía intraoral ${i + 1}" loading="lazy"></a>`).join('')}</div>` : ''}
${docs.length ? `<h2>Documentos</h2>
<ul class="docs">${docs.map(d => `<li><a href="${esc(urlBiblioteca(d.ruta))}" target="_blank" rel="noopener noreferrer">${esImagen(d.ruta) ? `<img src="${esc(urlBiblioteca(d.ruta))}" alt="" loading="lazy">` : ICONOS.documento()}<span><b>${esc(d.titulo)}</b>${d.descripcion ? `<span>${esc(d.descripcion)}</span>` : ''}</span></a></li>`).join('')}</ul>` : ''}
<h2>Confidencialidad</h2>
<p style="text-align:left;margin:0">Este enlace es personal y confidencial; te pedimos que no lo compartas. Estará disponible hasta el ${esc(fechaLarga(datos.caduca))}.</p>`,
  });
};

export const config = { path: '/p/:id' };
