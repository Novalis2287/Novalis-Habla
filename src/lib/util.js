// Utilidades de fechas, teléfonos y mensajes. Las fechas "de día" van como texto AAAA-MM-DD.

const dos = n => String(n).padStart(2, '0');
export const aISO = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const hoy = () => aISO(new Date());
const aFecha = iso => { const [a, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };

export function sumarMeses(iso, meses) {
  const d = aFecha(iso), dia = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + meses);
  // 31 de agosto + 6 meses → último día de febrero, no 3 de marzo.
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return aISO(d);
}
export function sumarDias(iso, dias) { const d = aFecha(iso); d.setDate(d.getDate() + dias); return aISO(d); }
export const diasHasta = iso => Math.round((aFecha(iso) - aFecha(hoy())) / 86400000);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export function fecha(iso) {
  if (!iso) return '';
  const d = aFecha(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
export function fechaHora(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}
export const nombreMes = clave => { const [a, m] = clave.split('-').map(Number); return `${MESES_LARGOS[m - 1]} ${a}`; };
export function cuantoFalta(iso) {
  const n = diasHasta(iso);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

export const sinAcentos = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Teléfono tal como lo quiere WhatsApp: solo cifras, con prefijo de país (34 si es un número español de 9 cifras).
export function telefonoWhatsApp(telefono) {
  let n = String(telefono ?? '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 9) n = '34' + n;
  return n.length >= 10 ? n : '';
}

// En un ordenador se puede elegir (en Ajustes, y solo para ese equipo) con qué se abre WhatsApp:
//  · 'web': WhatsApp Web. El navegador abre una pestaña nueva en cada envío; WhatsApp Web se aísla
//    de la página que lo abre y no hay forma de reutilizar una pestaña suya ya abierta.
//  · 'misma': WhatsApp Web en la propia pestaña de la app. No se abre ninguna pestaña; después de
//    enviar se vuelve a la app con la flecha Atrás del navegador.
//  · 'app': la aplicación de escritorio de WhatsApp. Todos los envíos van a la misma ventana.
const CLAVE_WHATSAPP = 'novalis-habla-whatsapp';
export const esOrdenador = () => !(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
export function modoWhatsApp() { try { const m = localStorage.getItem(CLAVE_WHATSAPP); return m === 'app' || m === 'misma' ? m : 'web'; } catch { return 'web'; } }
export function ponerModoWhatsApp(modo) { try { localStorage.setItem(CLAVE_WHATSAPP, modo); } catch { /* sin almacenamiento: se queda en 'web' */ } }
const conApp = () => esOrdenador() && modoWhatsApp() === 'app';
export const enMismaPestana = () => esOrdenador() && modoWhatsApp() === 'misma';

export function enlaceWhatsApp(telefono, texto) {
  const numero = telefonoWhatsApp(telefono), mensaje = encodeURIComponent(texto);
  if (conApp()) return `whatsapp://send?phone=${numero}&text=${mensaje}`;
  // En el ordenador se va directo a WhatsApp Web, sin la página intermedia de wa.me.
  return esOrdenador() ? `https://web.whatsapp.com/send?phone=${numero}&text=${mensaje}` : `https://wa.me/${numero}?text=${mensaje}`;
}
// Atributos del enlace: solo el modo 'web' abre una pestaña nueva.
export const destinoWhatsApp = () => (conApp() || enMismaPestana() ? {} : { target: '_blank', rel: 'noopener noreferrer' });

// Enlaces fijos de la clínica. Los mensajes no llevan la dirección final sino una página
// de la app, que es la que enseña la tarjeta de vista previa en WhatsApp y lleva al destino.
export const enlacesFijos = () => ({
  enlace_maps: `${location.origin}/ubicacion`,
  enlace_conocenos: `${location.origin}/conocenos`,
  enlace_instagram: `${location.origin}/instagram`,
  enlace_facebook: `${location.origin}/facebook`,
});

// Reduce una foto del móvil a un JPEG ligero (y sin los datos ocultos de la cámara) antes de subirla.
export async function reducirFoto(archivo, lado = 1600) {
  const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close?.();
  const foto = await new Promise(hecho => lienzo.toBlob(hecho, 'image/jpeg', 0.85));
  if (!foto) throw new Error('foto_no_valida');
  return foto;
}

// Sustituye {nombre}, {documento}, {enlace}… en una plantilla.
export function rellenar(texto, datos) {
  return String(texto ?? '').replace(/\{(\w+)\}/g, (todo, clave) => (clave in datos ? datos[clave] : todo));
}
export const primerNombre = nombre => String(nombre ?? '').trim().split(/\s+/)[0] || '';

export const ESTADOS = [
  { id: 'aceptado', nombre: 'Aceptado' },
  { id: 'pensando', nombre: 'Pensando' },
  { id: 'no_aceptado', nombre: 'No aceptado' },
];
export const nombreEstado = id => ESTADOS.find(e => e.id === id)?.nombre ?? '';

export const MESES_REVISION = 6;
export const DIAS_AVISO = 30; // una revisión es "próxima" si falta este número de días o menos

// Id aleatorio. Con 8 caracteres sirve para documentos; con 32 es imposible de adivinar (páginas de pacientes).
export const idCorto = (largo = 8) => Array.from(crypto.getRandomValues(new Uint8Array(largo)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
export const nuevoId = () => crypto.randomUUID();
