import { useEffect, useMemo, useState } from 'react';
import { Almacen, useDatos } from './lib/almacen.jsx';
import { DEMO, sesion } from './lib/datos.js';
import { ir, reemplazar, useRuta } from './lib/ruta.js';
import { Aviso, Icono, Vacio } from './componentes.jsx';
import { Acceso, Cargando, NuevaContrasena, SinAcceso } from './pantallas/Acceso.jsx';
import { ListaPacientes } from './pantallas/Pacientes.jsx';
import { DatosPaciente, Enviar, PacienteInicio } from './pantallas/Paciente.jsx';
import { Revisiones, clasificarRevisiones } from './pantallas/Revisiones.jsx';
import { Seguimiento } from './pantallas/Seguimiento.jsx';
import { Ajustes } from './pantallas/Ajustes.jsx';

export default function App() {
  return (
    <>
      {DEMO ? <Almacen email="demo@ejemplo.com"><Interior /></Almacen> : <ConSesion />}
      <Aviso />
    </>
  );
}

function ConSesion() {
  const [s, setS] = useState(undefined); // undefined = comprobando, null = sin sesión
  const [recuperando, setRecuperando] = useState(false);
  useEffect(() => sesion.escuchar((nueva, esRecuperacion) => { setS(nueva); if (esRecuperacion) setRecuperando(true); }), []);

  if (s === undefined) return <Cargando />;
  if (!s) return <Acceso />;
  if (recuperando) return <NuevaContrasena alTerminar={() => setRecuperando(false)} />;
  const email = s.user.email.toLowerCase();
  return <Almacen key={email} email={email}><Interior /></Almacen>;
}

const SECCIONES = [
  { id: 'pacientes', nombre: 'Pacientes', sub: '' },
  { id: 'revisiones', nombre: 'Revisiones', sub: 'Revisiones semestrales' },
  { id: 'seguimiento', nombre: 'Seguimiento', sub: 'Primeras visitas y planes de tratamiento' },
  { id: 'ajustes', nombre: 'Ajustes', sub: '' },
];
const TITULOS_PACIENTE = { mensaje: 'Enviar mensaje', pdf: 'Enviar PDF', datos: 'Datos del paciente' };

function Interior() {
  const { estado, yo, email, pacientes, recargar } = useDatos();
  const [seccion, id, sub] = useRuta();
  const enPaciente = seccion === 'paciente';
  const paciente = enPaciente ? pacientes.find(p => p.id === id) : null;
  const pendientes = useMemo(() => clasificarRevisiones(pacientes).vencidas.filter(p => !p.recordatorio_enviado).length, [pacientes]);

  // Si el paciente ya no existe (lo ha borrado otro usuario), se vuelve a la lista.
  useEffect(() => { if (estado === 'listo' && enPaciente && !paciente) reemplazar('pacientes'); }, [estado, enPaciente, paciente]);
  // Cada pantalla empieza arriba.
  useEffect(() => { window.scrollTo(0, 0); }, [seccion, id, sub]);

  if (estado === 'cargando') return <Cargando />;
  if (estado === 'error') return <Cargando texto={<>No se han podido cargar los datos. Revisa la conexión.<br /><button className="link" onClick={recargar}>Reintentar</button></>} />;
  if (!yo) return <SinAcceso email={email} />;

  const actual = SECCIONES.find(x => x.id === seccion) ?? SECCIONES[0];
  const pestana = enPaciente ? 'pacientes' : actual.id;
  const titulo = paciente ? paciente.nombre : actual.nombre;
  const subtitulo = paciente ? (TITULOS_PACIENTE[sub] ?? paciente.telefono)
    : actual.id === 'pacientes' ? `${pacientes.length} ${pacientes.length === 1 ? 'paciente' : 'pacientes'}` : actual.sub;

  return (
    <div className="marco">
      <header className="top">
        {paciente
          ? <button className="atras" onClick={() => ir(sub ? `paciente/${paciente.id}` : 'pacientes')} aria-label="Volver"><Icono nombre="atras" /></button>
          : <img className="logo" src="/icons/logo.png" alt="Novalis" />}
        <div className="titles"><h1>{titulo}</h1>{subtitulo && <p>{subtitulo}</p>}</div>
      </header>
      {DEMO && <p className="demo">Modo demostración · datos inventados</p>}

      {pestana === 'pacientes' ? (
        <main className={`dos${paciente ? ' con-paciente' : ''}`}>
          <section className="col-lista"><ListaPacientes elegido={paciente?.id} /></section>
          <section className="col-detalle">
            {!paciente ? <Vacio>Elige un paciente de la lista.</Vacio>
              : sub === 'mensaje' || sub === 'pdf' ? <Enviar key={`${paciente.id}-${sub}`} paciente={paciente} modo={sub} />
              : sub === 'datos' ? <DatosPaciente key={paciente.id} paciente={paciente} />
              : <PacienteInicio paciente={paciente} />}
          </section>
        </main>
      ) : (
        <main>
          {pestana === 'revisiones' && <Revisiones />}
          {pestana === 'seguimiento' && <Seguimiento />}
          {pestana === 'ajustes' && <Ajustes />}
        </main>
      )}

      <nav className="tabs">
        {SECCIONES.map(x => (
          <button key={x.id} className={x.id === pestana ? 'on' : ''} onClick={() => ir(x.id)} aria-current={x.id === pestana ? 'page' : undefined}>
            <Icono nombre={x.id} />
            <span>{x.nombre}</span>
            {x.id === 'revisiones' && pendientes > 0 && <b>{pendientes}</b>}
          </button>
        ))}
      </nav>
    </div>
  );
}
