// Datos de ejemplo INVENTADOS para el modo demostración (sin base de datos configurada).
// Ninguno corresponde a un paciente real.
import { hoy, sumarDias, sumarMeses } from './util.js';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export function datosDeEjemplo() {
  const h = hoy();
  const p = (n, nombre, telefono, extra = {}) => ({
    id: id(n), nombre, telefono, proxima_revision: null, recordatorio_enviado: null,
    primera_visita: null, origen: null, estado_plan: null, volver_a_llamar: null,
    creado: new Date().toISOString(), ...extra,
  });
  return {
    usuarios: [{ email: 'demo@ejemplo.com', nombre: 'Demostración', admin: true }],
    pacientes: [
      p(1, 'Lucía Ejemplo Prueba', '600 000 001', { proxima_revision: sumarDias(h, -12) }),
      p(2, 'Marcos Ficticio Demo', '600 000 002', { proxima_revision: sumarDias(h, 9), primera_visita: sumarDias(h, -20), origen: 'Google', estado_plan: 'pensando', volver_a_llamar: sumarDias(h, -1) }),
      p(3, 'Elena Inventada Muestra', '600 000 003', { proxima_revision: sumarMeses(h, 4), primera_visita: sumarDias(h, -8), origen: 'Recomendación', estado_plan: 'aceptado' }),
      p(4, 'Pablo Simulado Test', '600 000 004', { primera_visita: sumarDias(h, -15), origen: 'Redes sociales', estado_plan: 'no_aceptado' }),
      p(5, 'Carmen Modelo Ensayo', '600 000 005', { proxima_revision: sumarDias(h, 25), primera_visita: sumarDias(h, -40), origen: 'Recomendación', estado_plan: 'pensando', volver_a_llamar: sumarDias(h, 5) }),
      p(6, 'Javier Supuesto Ejemplo', '600 000 006', { proxima_revision: sumarDias(h, -45), recordatorio_enviado: sumarDias(h, -3) }),
    ],
    anotaciones: [
      { id: id(101), paciente_id: id(2), fecha: new Date(Date.now() - 6 * 86400000).toISOString(), texto: 'Llamada: lo está pensando, pide que le llamemos la semana que viene.', autor: 'Demostración' },
    ],
    envios: [
      { id: id(201), paciente_id: id(6), fecha: new Date(Date.now() - 3 * 86400000).toISOString(), tipo: 'mensaje', titulo: 'Recordatorio de revisión', texto: 'Hola Javier, te escribimos de Clínica Novalis. Ya toca tu revisión semestral.', autor: 'Demostración' },
    ],
    plantillas: [
      { id: id(311), orden: 1, titulo: 'Bienvenida a Novalis', uso: 'general', texto: '{nombre}, te damos la más cordial bienvenida a Clínica Novalis.\n\nEs un placer contar con tu confianza. Nuestro equipo cuida cada detalle para ofrecerte una atención personalizada y una odontología de la máxima calidad.\n\nQuedamos a tu disposición por este medio para cualquier consulta.\n\n*Clínica Novalis*' },
      { id: id(312), orden: 2, titulo: 'Cómo llegar', uso: 'general', texto: '{nombre}, para facilitarte la llegada, te compartimos nuestra ubicación:\n\n📍 {enlace_maps}\n\nSerá un placer recibirte.\n\n*Clínica Novalis*' },
      { id: id(313), orden: 3, titulo: 'Conócenos', uso: 'general', texto: '{nombre}, te invitamos a conocer Clínica Novalis a través de la experiencia de nuestros pacientes y del trabajo que realizamos cada día:\n\n✨ {enlace_conocenos}\n\n*Clínica Novalis*' },
      { id: id(314), orden: 4, titulo: 'Tras la valoración', uso: 'valoracion', texto: '{nombre}, gracias por tu visita.\n\nTal como te comentamos en la valoración, ponemos a tu disposición tus fotografías intraorales y una selección de documentos sobre salud dental, preparados por nuestro equipo para acompañarte en tu tratamiento:\n\n📄 {enlaces_documentos}\n\nEste enlace es personal y confidencial. Para cualquier duda, estaremos encantados de atenderte.\n\n*Clínica Novalis*' },
      { id: id(301), titulo: 'Recordatorio de revisión', uso: 'revision', texto: 'Hola {nombre}, te escribimos de Clínica Novalis. Ya toca tu revisión semestral. ¿Te viene bien que te demos cita? Puedes responder a este mensaje o llamarnos. ¡Gracias!' },
      { id: id(302), titulo: 'Envío de documento', uso: 'pdf', texto: 'Hola {nombre}, te enviamos desde Clínica Novalis el documento «{documento}»: {enlace}' },
      { id: id(303), titulo: 'Indicaciones tras el tratamiento', uso: 'general', texto: 'Hola {nombre}, esperamos que te encuentres bien tras el tratamiento de hoy. Si tienes cualquier molestia o duda, escríbenos o llámanos. Clínica Novalis.' },
    ],
    documentos: [
      { id: 'ejemplo1', titulo: 'Cuidados tras una extracción', descripcion: 'Indicaciones para las primeras 48 horas', ruta: '', creado: new Date().toISOString() },
      { id: 'ejemplo2', titulo: 'Higiene con ortodoncia', descripcion: 'Cómo cepillarse con brackets', ruta: '', creado: new Date().toISOString() },
    ],
    paginas: [],
    ajustes: [
      { clave: 'origenes', valor: ['Recomendación', 'Google', 'Redes sociales', 'Pasaba por la clínica', 'Otro'] },
      { clave: 'enlaces', valor: { maps: 'https://example.com/mapa', instagram: 'https://example.com/instagram', facebook: 'https://example.com/facebook' } },
    ],
  };
}
