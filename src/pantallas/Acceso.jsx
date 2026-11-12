// Inicio de sesión, alta con un correo autorizado y cambio de contraseña.
import { useState } from 'react';
import { sesion, textoError } from '../lib/datos.js';
import { Campo } from '../componentes.jsx';

function Marco({ children }) {
  return (
    <div className="acceso">
      <div className="acceso-cabecera">
        <img src="/icons/logo.png" alt="Novalis" />
        <h1>Novalis Habla</h1>
      </div>
      <div className="card acceso-tarjeta">{children}</div>
    </div>
  );
}

export function Acceso() {
  const [modo, setModo] = useState('entrar'); // entrar | alta
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [mensaje, setMensaje] = useState(null); // { texto, bien }
  const [ocupado, setOcupado] = useState(false);
  const alta = modo === 'alta';

  async function enviar(e) {
    e.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!correo || !clave) return setMensaje({ texto: 'Escribe tu correo y tu contraseña.' });
    setOcupado(true); setMensaje(null);
    try {
      if (alta) {
        const hayQueConfirmar = await sesion.crearCuenta(correo, clave);
        if (hayQueConfirmar) {
          setModo('entrar'); setClave('');
          setMensaje({ bien: true, texto: 'Cuenta creada. Te hemos enviado un correo: abre el enlace para confirmarla y después inicia sesión.' });
        }
      } else await sesion.entrar(correo, clave);
    } catch (err) { setMensaje({ texto: textoError(err) }); }
    setOcupado(false);
  }

  async function olvidada() {
    const correo = email.trim().toLowerCase();
    if (!correo) return setMensaje({ texto: 'Escribe primero tu correo.' });
    try {
      await sesion.recuperar(correo);
      setMensaje({ bien: true, texto: 'Si ese correo tiene cuenta, recibirás un enlace para poner una contraseña nueva.' });
    } catch (err) { setMensaje({ texto: textoError(err) }); }
  }

  return (
    <Marco>
      <form onSubmit={enviar}>
        <h2>{alta ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        {alta && <p className="hint arriba">Solo pueden crear cuenta los correos que el administrador haya autorizado.</p>}
        <Campo etiqueta="Correo electrónico">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" inputMode="email" />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input type="password" value={clave} onChange={e => setClave(e.target.value)} autoComplete={alta ? 'new-password' : 'current-password'} />
        </Campo>
        {mensaje && <p className={mensaje.bien ? 'nota bien' : 'nota mal'} role="alert">{mensaje.texto}</p>}
        <button className="btn" disabled={ocupado}>{alta ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
      <div className="row enlaces">
        <button className="link" onClick={() => { setModo(alta ? 'entrar' : 'alta'); setMensaje(null); }}>
          {alta ? 'Ya tengo cuenta' : 'Crear cuenta'}
        </button>
        {!alta && <button className="link" onClick={olvidada}>He olvidado mi contraseña</button>}
      </div>
    </Marco>
  );
}

// Se muestra al llegar desde el enlace de "he olvidado mi contraseña".
export function NuevaContrasena({ alTerminar }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  async function enviar(e) {
    e.preventDefault();
    try { await sesion.cambiarContrasena(clave); alTerminar(); }
    catch (err) { setError(textoError(err)); }
  }
  return (
    <Marco>
      <form onSubmit={enviar}>
        <h2>Contraseña nueva</h2>
        <Campo etiqueta="Escribe tu contraseña nueva">
          <input type="password" value={clave} onChange={e => setClave(e.target.value)} autoComplete="new-password" />
        </Campo>
        {error && <p className="nota mal" role="alert">{error}</p>}
        <button className="btn">Guardar</button>
      </form>
    </Marco>
  );
}

// La sesión es válida pero el correo no está (o ya no está) en la lista de usuarios.
export function SinAcceso({ email }) {
  return (
    <Marco>
      <h2>Sin acceso</h2>
      <p>El correo <b>{email}</b> no está autorizado para usar la app. Pide al administrador que te dé de alta.</p>
      <button className="btn ghost" onClick={() => sesion.salir()}>Cerrar sesión</button>
    </Marco>
  );
}

export const Cargando = ({ texto = 'Cargando…' }) => <Marco><p className="empty">{texto}</p></Marco>;
