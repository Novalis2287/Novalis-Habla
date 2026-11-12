// Acceso a los datos. Dos modos con las mismas funciones:
//  · Supabase (base de datos real, con inicio de sesión), si están las dos variables de entorno.
//  · Demostración: datos inventados guardados solo en este dispositivo.
import { createClient } from '@supabase/supabase-js';
import { datosDeEjemplo } from './demo.js';
import { idCorto } from './util.js';

const URL_BD = import.meta.env.VITE_SUPABASE_URL;
const CLAVE_BD = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const DEMO = !URL_BD || !CLAVE_BD;
export const supabase = DEMO ? null : createClient(URL_BD, CLAVE_BD);

/* ---------- modo demostración ---------- */
const CLAVE_DEMO = 'novalis-habla-demo-v1';
function leerDemo() {
  try { const d = JSON.parse(localStorage.getItem(CLAVE_DEMO)); if (d) return d; } catch { /* empezar de cero */ }
  return datosDeEjemplo();
}
function escribirDemo(d) { try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(d)); } catch { /* sin espacio */ } }
export function reiniciarDemo() { localStorage.removeItem(CLAVE_DEMO); }

/* ---------- operaciones genéricas ---------- */
const ok = ({ data, error }) => { if (error) throw error; return data; };

// Lee todas las filas (Supabase devuelve como mucho 1000 por petición, así que se pide por tramos).
export async function leer(tabla, { filtro = {}, orden, desc = false } = {}) {
  if (DEMO) {
    let filas = (leerDemo()[tabla] ?? []).filter(f => Object.entries(filtro).every(([c, v]) => f[c] === v));
    if (orden) filas = [...filas].sort((a, b) => String(a[orden] ?? '').localeCompare(String(b[orden] ?? ''), 'es') * (desc ? -1 : 1));
    return filas;
  }
  const TRAMO = 1000, todas = [];
  for (let desde = 0; ; desde += TRAMO) {
    let q = supabase.from(tabla).select('*').range(desde, desde + TRAMO - 1);
    for (const [c, v] of Object.entries(filtro)) q = q.eq(c, v);
    if (orden) q = q.order(orden, { ascending: !desc });
    const filas = ok(await q);
    todas.push(...filas);
    if (filas.length < TRAMO) return todas;
  }
}

// Crea o actualiza una fila (según exista ya su clave) y devuelve cómo ha quedado.
export async function guardar(tabla, fila, clave = 'id') {
  if (DEMO) {
    const d = leerDemo(), filas = d[tabla] ?? (d[tabla] = []);
    const i = filas.findIndex(f => f[clave] === fila[clave]);
    const nueva = i >= 0 ? { ...filas[i], ...fila } : fila;
    if (i >= 0) filas[i] = nueva; else filas.push(nueva);
    escribirDemo(d);
    return nueva;
  }
  return ok(await supabase.from(tabla).upsert(fila, { onConflict: clave }).select().single());
}

export async function borrar(tabla, valor, clave = 'id') {
  if (DEMO) {
    const d = leerDemo();
    d[tabla] = (d[tabla] ?? []).filter(f => f[clave] !== valor);
    // Igual que en la base de datos real: al borrar un paciente se van sus anotaciones y envíos.
    if (tabla === 'pacientes') for (const t of ['anotaciones', 'envios']) d[t] = (d[t] ?? []).filter(f => f.paciente_id !== valor);
    escribirDemo(d);
    return;
  }
  ok(await supabase.from(tabla).delete().eq(clave, valor));
}

/* ---------- documentos PDF ---------- */
export async function subirDocumento({ archivo, titulo, descripcion }) {
  const id = idCorto();
  const fila = { id, titulo, descripcion, ruta: DEMO ? '' : `${id}.pdf`, creado: new Date().toISOString() };
  if (!DEMO) ok(await supabase.storage.from('documentos').upload(fila.ruta, archivo, { contentType: 'application/pdf' }));
  return guardar('documentos', fila);
}
export async function borrarDocumento(doc) {
  if (!DEMO && doc.ruta) ok(await supabase.storage.from('documentos').remove([doc.ruta]));
  await borrar('documentos', doc.id);
}
// Enlace que se manda al paciente: una página con vista previa que abre el PDF.
export const enlaceDocumento = doc => `${location.origin}/d/${doc.id}`;
export const urlPdf = doc => (DEMO || !doc.ruta ? '' : supabase.storage.from('documentos').getPublicUrl(doc.ruta).data.publicUrl);

/* ---------- inicio de sesión ---------- */
const ERRORES = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Aún no has confirmado tu correo. Abre el enlace que te hemos enviado.'],
  [/already registered|already been registered/i, 'Ya existe una cuenta con ese correo. Inicia sesión.'],
  [/database error saving new user|correo_no_autorizado/i, 'Ese correo no está autorizado. Pide al administrador que te dé de alta.'],
  [/password should be at least|weak/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/rate limit|too many/i, 'Demasiados intentos. Espera unos minutos.'],
  [/failed to fetch|network/i, 'Sin conexión. Inténtalo de nuevo.'],
  [/should be different/i, 'La contraseña nueva debe ser distinta de la anterior.'],
];
export const textoError = e => ERRORES.find(([patron]) => patron.test(e?.message ?? ''))?.[1] ?? 'Algo ha fallado. Inténtalo de nuevo.';

export const sesion = {
  // Avisa de la sesión actual y de cada cambio: (sesión | null, esRecuperacionDeContraseña).
  escuchar(aviso) {
    const { data } = supabase.auth.onAuthStateChange((evento, s) => aviso(s, evento === 'PASSWORD_RECOVERY'));
    return () => data.subscription.unsubscribe();
  },
  entrar: async (email, password) => ok(await supabase.auth.signInWithPassword({ email, password })),
  // Devuelve true si hay que confirmar el correo antes de poder entrar.
  async crearCuenta(email, password) {
    const data = ok(await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } }));
    return !data.session;
  },
  recuperar: async email => ok(await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })),
  cambiarContrasena: async password => ok(await supabase.auth.updateUser({ password })),
  salir: () => supabase.auth.signOut(),
};
