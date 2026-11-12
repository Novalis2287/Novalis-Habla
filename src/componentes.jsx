// Piezas pequeñas que se repiten en varias pantallas.
import { useEffect, useState } from 'react';
import { nombreEstado } from './lib/util.js';

/* ---------- avisos breves en la parte de abajo ---------- */
let ponerAviso = () => {};
export const avisar = texto => ponerAviso(texto);
export function Aviso() {
  const [texto, setTexto] = useState('');
  useEffect(() => {
    let reloj;
    ponerAviso = t => { setTexto(t); clearTimeout(reloj); reloj = setTimeout(() => setTexto(''), 2600); };
    return () => clearTimeout(reloj);
  }, []);
  return texto ? <div className="toast" role="status">{texto}</div> : null;
}

// Ejecuta una acción que guarda datos y avisa si falla.
export async function intentar(accion, hecho) {
  try { const r = await accion(); if (hecho) avisar(hecho); return r; }
  catch (e) { console.error(e); avisar('No se ha podido guardar. Revisa la conexión.'); return undefined; }
}

/* ---------- hoja que sube desde abajo (formularios cortos) ---------- */
export function Hoja({ titulo, alCerrar, children }) {
  useEffect(() => {
    const tecla = e => { if (e.key === 'Escape') alCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [alCerrar]);
  return (
    <div className="sheet-bg" onClick={e => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="sheet" role="dialog" aria-label={titulo}>
        <div className="row">
          <h3>{titulo}</h3>
          <button className="x" onClick={alCerrar} aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ etiqueta, children }) {
  return <label className="f">{etiqueta}{children}</label>;
}

export function EtiquetaEstado({ estado }) {
  return estado ? <span className={`tag estado ${estado}`}>{nombreEstado(estado)}</span> : null;
}

export const Vacio = ({ children }) => <p className="empty">{children}</p>;

/* ---------- iconos (trazos sencillos, heredan el color del texto) ---------- */
const TRAZOS = {
  pacientes: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0zm15-9a3 3 0 1 0 0-6m1 15h4a6 6 0 0 0-5-5.900',
  revisiones: 'M7 2v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm4 9 2 2 4-4',
  seguimiento: 'M4 20V10m6 10V4m6 16v-7m5 7H2',
  ajustes: 'M4 7h9m4 0h3M4 12h3m4 0h9M4 17h11m4 0h1M15 5v4M9 10v4m8 1v4',
  mensaje: 'M21 12a8 8 0 0 1-11.800 7L4 20l1.100-4.600A8 8 0 1 1 21 12z',
  pdf: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zm0 0v4h4M9 13h6m-6 4h6',
  ficha: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-3 5a3 3 0 0 1 6 0m3-7h3m-3 4h3',
  atras: 'M15 5l-7 7 7 7',
  mas: 'M12 5v14m-7-7h14',
  flecha: 'M9 6l6 6-6 6',
};
export function Icono({ nombre, tam = 24 }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
