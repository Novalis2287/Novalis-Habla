// Estado compartido de la app: los datos de la clínica en memoria y las acciones que los cambian.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as bd from './datos.js';
import { hoy, nuevoId, sumarMeses, MESES_REVISION } from './util.js';

const Contexto = createContext(null);
export const useDatos = () => useContext(Contexto);

const ENLACES_VACIOS = { maps: '', instagram: '', facebook: '' };
const VACIO = { pacientes: [], plantillas: [], documentos: [], usuarios: [], origenes: [], enlaces: ENLACES_VACIOS };

// Primero las plantillas de la clínica, en su orden; después el resto, por antigüedad.
const porOrden = (a, b) => (a.orden ?? 100) - (b.orden ?? 100) || String(a.creado ?? '').localeCompare(String(b.creado ?? ''));

async function cargarTodo() {
  const [pacientes, plantillas, documentos, usuarios, ajustes] = await Promise.all([
    bd.leer('pacientes', { orden: 'nombre' }),
    bd.leer('plantillas', { orden: 'creado' }),
    bd.leer('documentos', { orden: 'titulo' }),
    bd.leer('usuarios', { orden: 'email' }),
    bd.leer('ajustes'),
  ]);
  const ajuste = clave => ajustes.find(a => a.clave === clave)?.valor;
  return { pacientes, plantillas: plantillas.sort(porOrden), documentos, usuarios, origenes: ajuste('origenes') ?? [], enlaces: { ...ENLACES_VACIOS, ...ajuste('enlaces') } };
}

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

// "email" es el de la sesión iniciada (o el de demostración).
export function Almacen({ email, children }) {
  const [d, setD] = useState(VACIO);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error

  const recargar = useCallback(async () => {
    try { setD(await cargarTodo()); setEstado('listo'); }
    catch (e) { console.error(e); setEstado(s => (s === 'listo' ? s : 'error')); }
  }, []);

  useEffect(() => {
    recargar();
    bd.borrarPaginasCaducadas().catch(() => {}); // limpieza de fondo; si falla se reintenta otro día
    // Al volver a la app (por ejemplo, desde WhatsApp) se refrescan los datos por si otro usuario cambió algo.
    const alVolver = () => { if (document.visibilityState === 'visible') recargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [recargar]);

  const yo = useMemo(() => d.usuarios.find(u => u.email === email) ?? null, [d.usuarios, email]);
  const autor = yo?.nombre || email;

  const acciones = useMemo(() => {
    // Sustituye o añade una fila en una de las listas en memoria.
    const poner = (lista, fila, clave = 'id', ordenar) => setD(x => {
      const filas = x[lista].some(f => f[clave] === fila[clave])
        ? x[lista].map(f => (f[clave] === fila[clave] ? fila : f))
        : [...x[lista], fila];
      return { ...x, [lista]: ordenar ? filas.sort(ordenar) : filas };
    });
    const quitar = (lista, valor, clave = 'id') => setD(x => ({ ...x, [lista]: x[lista].filter(f => f[clave] !== valor) }));

    async function guardarPaciente(paciente) {
      const fila = await bd.guardar('pacientes', paciente.id ? paciente : { ...paciente, id: nuevoId(), creado: new Date().toISOString() });
      poner('pacientes', fila, 'id', porNombre);
      return fila;
    }

    return {
      recargar,
      guardarPaciente,
      async borrarPaciente(id) {
        // Antes que el paciente se borran sus páginas, para que no queden fotos suyas en el almacén.
        for (const p of await bd.paginasDe(id)) await bd.borrarPagina(p);
        await bd.borrar('pacientes', id); quitar('pacientes', id);
      },
      // La revisión se ha hecho: la siguiente toca dentro de seis meses.
      revisionHecha(paciente) {
        return guardarPaciente({ ...paciente, proxima_revision: sumarMeses(hoy(), MESES_REVISION), recordatorio_enviado: null });
      },

      // Anota en el historial lo que se acaba de enviar por WhatsApp.
      async registrarEnvio(paciente, { tipo, titulo, texto, esRecordatorio = false }) {
        await bd.guardar('envios', { id: nuevoId(), paciente_id: paciente.id, fecha: new Date().toISOString(), tipo, titulo, texto, autor });
        if (esRecordatorio) await guardarPaciente({ ...paciente, recordatorio_enviado: hoy() });
      },
      envios: pacienteId => bd.leer('envios', { filtro: { paciente_id: pacienteId }, orden: 'fecha', desc: true }),

      anotaciones: pacienteId => bd.leer('anotaciones', { filtro: { paciente_id: pacienteId }, orden: 'fecha', desc: true }),
      anotar: (pacienteId, texto) => bd.guardar('anotaciones', { id: nuevoId(), paciente_id: pacienteId, fecha: new Date().toISOString(), texto, autor }),
      borrarAnotacion: id => bd.borrar('anotaciones', id),

      async guardarPlantilla(plantilla) {
        const fila = await bd.guardar('plantillas', plantilla.id ? plantilla : { ...plantilla, id: nuevoId(), uso: 'general', creado: new Date().toISOString() });
        poner('plantillas', fila, 'id', porOrden);
      },
      async borrarPlantilla(id) { await bd.borrar('plantillas', id); quitar('plantillas', id); },

      async subirDocumento(datos) { poner('documentos', await bd.subirDocumento(datos)); },
      async borrarDocumento(doc) { await bd.borrarDocumento(doc); quitar('documentos', doc.id); },

      crearPagina: (paciente, { documentos, fotos }) => bd.crearPagina({ pacienteId: paciente.id, documentos, fotos, autor }),
      paginas: bd.paginasDe,
      borrarPagina: bd.borrarPagina,

      async guardarEnlaces(enlaces) {
        await bd.guardar('ajustes', { clave: 'enlaces', valor: enlaces }, 'clave');
        setD(x => ({ ...x, enlaces }));
      },

      async guardarOrigenes(origenes) {
        await bd.guardar('ajustes', { clave: 'origenes', valor: origenes }, 'clave');
        setD(x => ({ ...x, origenes }));
      },

      async guardarUsuario(usuario) { poner('usuarios', await bd.guardar('usuarios', usuario, 'email'), 'email'); },
      async borrarUsuario(emailUsuario) { await bd.borrar('usuarios', emailUsuario, 'email'); quitar('usuarios', emailUsuario, 'email'); },
    };
  }, [recargar, autor]);

  return <Contexto.Provider value={{ ...d, estado, yo, email, ...acciones }}>{children}</Contexto.Provider>;
}
