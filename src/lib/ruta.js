// Navegación sencilla con la parte "#/…" de la dirección, para que el botón Atrás funcione.
import { useEffect, useState } from 'react';

const leer = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

export function useRuta() {
  const [partes, setPartes] = useState(leer);
  useEffect(() => {
    const alCambiar = () => { setPartes(leer()); };
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return partes.length ? partes : ['pacientes'];
}
export const ir = ruta => { location.hash = '#/' + ruta; };
// Sustituye la pantalla actual sin dejarla en el historial (para volver tras un envío).
export const reemplazar = ruta => { history.replaceState(null, '', '#/' + ruta); window.dispatchEvent(new HashChangeEvent('hashchange')); };
