// Pantallas de un paciente: las dos acciones principales, el envío y su ficha de datos.
import { useEffect, useState } from 'react';
import { useDatos } from '../lib/almacen.jsx';
import { DEMO, enlaceDocumento } from '../lib/datos.js';
import { ir, reemplazar } from '../lib/ruta.js';
import {
  ESTADOS, MESES_REVISION, cuantoFalta, enlaceWhatsApp, fecha, fechaHora, primerNombre, rellenar, telefonoWhatsApp,
} from '../lib/util.js';
import { Campo, Icono, Vacio, avisar, intentar } from '../componentes.jsx';

/* ---------- inicio del paciente: solo dos opciones ---------- */
export function PacienteInicio({ paciente }) {
  const sinTelefono = !telefonoWhatsApp(paciente.telefono);
  return (
    <>
      {sinTelefono && <p className="nota mal">Falta un teléfono móvil válido. Añádelo en «Datos del paciente» para poder enviar.</p>}
      <button className="accion" onClick={() => ir(`paciente/${paciente.id}/mensaje`)} disabled={sinTelefono}>
        <Icono nombre="mensaje" tam={34} />
        <span><b>Enviar mensaje</b><small>Recordatorios, indicaciones…</small></span>
      </button>
      <button className="accion" onClick={() => ir(`paciente/${paciente.id}/pdf`)} disabled={sinTelefono}>
        <Icono nombre="pdf" tam={34} />
        <span><b>Enviar PDF</b><small>Documentos de la biblioteca</small></span>
      </button>
      <button className="btn ghost con-icono" onClick={() => ir(`paciente/${paciente.id}/datos`)}>
        <Icono nombre="ficha" tam={20} /> Datos del paciente
      </button>
    </>
  );
}

/* ---------- enviar un mensaje o un PDF por WhatsApp ---------- */
export function Enviar({ paciente, modo }) {
  const { plantillas, documentos, registrarEnvio } = useDatos();
  const esPdf = modo === 'pdf';
  const opciones = esPdf ? documentos : plantillas.filter(p => p.uso !== 'pdf');
  const [elegida, setElegida] = useState(null); // plantilla o documento; 'blanco' = mensaje sin plantilla
  const [texto, setTexto] = useState('');
  const nombre = primerNombre(paciente.nombre);

  function elegir(opcion) {
    setElegida(opcion);
    if (opcion === 'blanco') return setTexto('');
    if (!esPdf) return setTexto(rellenar(opcion.texto, { nombre }));
    const base = plantillas.find(p => p.uso === 'pdf')?.texto ?? 'Hola {nombre}, te enviamos «{documento}»: {enlace}';
    const enlace = enlaceDocumento(opcion);
    const mensaje = rellenar(base, { nombre, documento: opcion.titulo, enlace });
    // El enlace tiene que ir siempre, aunque alguien lo haya quitado de la plantilla.
    setTexto(mensaje.includes(enlace) ? mensaje : `${mensaje}\n${enlace}`);
  }

  function alAbrirWhatsApp() {
    const titulo = elegida === 'blanco' ? 'Mensaje libre' : elegida.titulo;
    intentar(() => registrarEnvio(paciente, { tipo: modo, titulo, texto, esRecordatorio: elegida.uso === 'revision' }));
    // Se espera un momento para que el enlace a WhatsApp se abra antes de cambiar de pantalla.
    setTimeout(() => { avisar('Anotado en el historial'); reemplazar(`paciente/${paciente.id}`); }, 600);
  }

  return (
    <>
      <div className="card">
        <h2>{esPdf ? '1 · Elige el documento' : '1 · Elige el mensaje'}</h2>
        {opciones.length === 0 && esPdf
          ? <Vacio>La biblioteca está vacía. Añade documentos en Ajustes.</Vacio>
          : <div className="opciones">
              {opciones.map(o => (
                <button key={o.id} className={`opcion${elegida === o ? ' on' : ''}`} onClick={() => elegir(o)}>
                  <b>{o.titulo}</b>
                  {esPdf && o.descripcion && <small>{o.descripcion}</small>}
                </button>
              ))}
              {!esPdf && <button className={`opcion${elegida === 'blanco' ? ' on' : ''}`} onClick={() => elegir('blanco')}><b>Mensaje en blanco</b></button>}
            </div>}
      </div>
      {elegida && (
        <div className="card">
          <h2>2 · Revisa y envía</h2>
          <textarea className="msg" value={texto} onChange={e => setTexto(e.target.value)} aria-label="Texto del mensaje" placeholder="Escribe el mensaje…" />
          {esPdf && DEMO && <p className="hint">En el modo demostración el enlace del documento no funciona.</p>}
          <p className="hint">Se abrirá WhatsApp con el chat de {nombre} y este texto escrito. Allí solo tienes que pulsar enviar.</p>
          {texto.trim()
            ? <a className="btn wa" href={enlaceWhatsApp(paciente.telefono, texto)} target="_blank" rel="noopener noreferrer" onClick={alAbrirWhatsApp}>Abrir WhatsApp</a>
            : <button className="btn wa" disabled>Abrir WhatsApp</button>}
        </div>
      )}
    </>
  );
}

/* ---------- datos del paciente ---------- */

// Campo de texto que guarda al salir de él, si ha cambiado.
function TextoGuardado({ valor, alGuardar, ...resto }) {
  const [v, setV] = useState(valor ?? '');
  useEffect(() => { setV(valor ?? ''); }, [valor]);
  return <input {...resto} value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (v.trim() !== (valor ?? '')) alGuardar(v.trim()); }} />;
}

export function DatosPaciente({ paciente }) {
  const { origenes, guardarPaciente, revisionHecha, borrarPaciente } = useDatos();
  const cambiar = cambios => intentar(() => guardarPaciente({ ...paciente, ...cambios }), 'Guardado');
  // Si el paciente tiene un origen que ya no está en la lista, se sigue mostrando.
  const listaOrigenes = paciente.origen && !origenes.includes(paciente.origen) ? [...origenes, paciente.origen] : origenes;

  async function eliminar() {
    if (!confirm(`¿Borrar a ${paciente.nombre} con sus anotaciones y su historial? No se puede deshacer.`)) return;
    await intentar(() => borrarPaciente(paciente.id), 'Paciente borrado');
    reemplazar('pacientes');
  }

  return (
    <>
      <div className="card">
        <h2>Datos</h2>
        <Campo etiqueta="Nombre y apellidos">
          <TextoGuardado valor={paciente.nombre} alGuardar={nombre => nombre && cambiar({ nombre })} autoCapitalize="words" />
        </Campo>
        <Campo etiqueta="Teléfono móvil">
          <TextoGuardado valor={paciente.telefono} alGuardar={telefono => cambiar({ telefono })} type="tel" inputMode="tel" />
        </Campo>
      </div>

      <div className="card">
        <h2>Revisión semestral</h2>
        <Campo etiqueta="Próxima revisión">
          <input type="date" value={paciente.proxima_revision ?? ''} onChange={e => cambiar({ proxima_revision: e.target.value || null, recordatorio_enviado: null })} />
        </Campo>
        {paciente.proxima_revision && <p className="hint arriba">Toca {cuantoFalta(paciente.proxima_revision)}.{paciente.recordatorio_enviado && ` Recordatorio enviado el ${fecha(paciente.recordatorio_enviado)}.`}</p>}
        <button className="btn ghost" onClick={() => intentar(() => revisionHecha(paciente), `Próxima revisión en ${MESES_REVISION} meses`)}>
          Revisión hecha hoy
        </button>
      </div>

      <div className="card">
        <h2>Primera visita y plan de tratamiento</h2>
        <Campo etiqueta="Fecha de la primera visita">
          <input type="date" value={paciente.primera_visita ?? ''} onChange={e => cambiar({ primera_visita: e.target.value || null })} />
        </Campo>
        <Campo etiqueta="Cómo nos ha conocido">
          <select value={paciente.origen ?? ''} onChange={e => cambiar({ origen: e.target.value || null })}>
            <option value="">Sin indicar</option>
            {listaOrigenes.map(o => <option key={o}>{o}</option>)}
          </select>
        </Campo>
        <p className="etiqueta">Estado del plan de tratamiento</p>
        <div className="estados">
          {ESTADOS.map(e => (
            <button key={e.id} className={`estado-btn ${e.id}${paciente.estado_plan === e.id ? ' on' : ''}`} aria-pressed={paciente.estado_plan === e.id}
              onClick={() => cambiar({ estado_plan: paciente.estado_plan === e.id ? null : e.id })}>{e.nombre}</button>
          ))}
        </div>
        <Campo etiqueta="Volver a llamar el día">
          <input type="date" value={paciente.volver_a_llamar ?? ''} onChange={e => cambiar({ volver_a_llamar: e.target.value || null })} />
        </Campo>
      </div>

      <Anotaciones paciente={paciente} />
      <Historial paciente={paciente} />

      <button className="btn danger" onClick={eliminar}>Borrar paciente</button>
    </>
  );
}

function Anotaciones({ paciente }) {
  const { anotaciones, anotar, borrarAnotacion } = useDatos();
  const [lista, setLista] = useState(null);
  const [texto, setTexto] = useState('');
  useEffect(() => { let vivo = true; anotaciones(paciente.id).then(l => vivo && setLista(l)).catch(() => vivo && setLista([])); return () => { vivo = false; }; }, [paciente.id]);

  async function anadir(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    const nueva = await intentar(() => anotar(paciente.id, texto.trim()));
    if (nueva) { setLista(l => [nueva, ...(l ?? [])]); setTexto(''); }
  }
  async function quitar(a) {
    if (!confirm('¿Borrar esta anotación?')) return;
    await intentar(() => borrarAnotacion(a.id));
    setLista(l => l.filter(x => x.id !== a.id));
  }

  return (
    <div className="card">
      <h2>Anotaciones</h2>
      <form onSubmit={anadir}>
        <textarea className="nota-nueva" rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Por ejemplo: llamada, lo está pensando…" aria-label="Nueva anotación" />
        <button className="btn ghost" disabled={!texto.trim()}>Añadir anotación de hoy</button>
      </form>
      {lista && lista.length > 0 && (
        <ul className="list">
          {lista.map(a => (
            <li key={a.id}>
              <span className="grow"><span className="sub">{fechaHora(a.fecha)}{a.autor && ` · ${a.autor}`}</span><span className="texto">{a.texto}</span></span>
              <button className="x" onClick={() => quitar(a)} aria-label="Borrar anotación">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Historial({ paciente }) {
  const { envios } = useDatos();
  const [lista, setLista] = useState(null);
  useEffect(() => { let vivo = true; envios(paciente.id).then(l => vivo && setLista(l)).catch(() => vivo && setLista([])); return () => { vivo = false; }; }, [paciente.id, paciente.recordatorio_enviado]);
  return (
    <div className="card">
      <h2>Historial de envíos</h2>
      {!lista ? <Vacio>Cargando…</Vacio> : lista.length === 0 ? <Vacio>Todavía no se le ha enviado nada.</Vacio> : (
        <ul className="list">
          {lista.map(e => (
            <li key={e.id}>
              <Icono nombre={e.tipo === 'pdf' ? 'pdf' : 'mensaje'} tam={20} />
              <span className="grow"><span className="name">{e.titulo}</span><span className="sub">{fechaHora(e.fecha)}{e.autor && ` · ${e.autor}`}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
