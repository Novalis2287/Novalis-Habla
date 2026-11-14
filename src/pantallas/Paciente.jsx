// Pantallas de un paciente: las dos acciones principales, el envío y su ficha de datos.
import { useEffect, useRef, useState } from 'react';
import { useDatos } from '../lib/almacen.jsx';
import { DEMO, DIAS_PAGINA, enlaceDocumento, enlacePagina } from '../lib/datos.js';
import { ir, reemplazar } from '../lib/ruta.js';
import {
  ESTADOS, MESES_REVISION, cuantoFalta, destinoWhatsApp, enMismaPestana, enlaceWhatsApp, enlacesFijos, fecha, fechaHora, primerNombre, reducirFoto, rellenar, telefonoWhatsApp,
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
        <span><b>Enviar documento</b><small>PDF e imágenes de la biblioteca</small></span>
      </button>
      <button className="btn ghost con-icono" onClick={() => ir(`paciente/${paciente.id}/datos`)}>
        <Icono nombre="ficha" tam={20} /> Datos del paciente
      </button>
    </>
  );
}

/* ---------- enviar un mensaje o un PDF por WhatsApp ---------- */
export function Enviar({ paciente, modo }) {
  const { plantillas, documentos, registrarEnvio, borrarPagina } = useDatos();
  const esPdf = modo === 'pdf';
  const opciones = esPdf ? documentos : plantillas.filter(p => p.uso !== 'pdf');
  const [elegida, setElegida] = useState(null); // plantilla o documento; 'blanco' = mensaje sin plantilla
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(null); // página personal creada para este envío
  const nombre = primerNombre(paciente.nombre);
  const variables = { nombre, ...enlacesFijos() };
  // La plantilla «Tras la valoración» pide antes los documentos y las fotos.
  const faltaPagina = elegida?.uso === 'valoracion' && !pagina;
  // Si se sale sin enviar, la página preparada se borra para no dejar fotos sin usar.
  const pendiente = useRef(null);
  pendiente.current = pagina;
  useEffect(() => () => { if (pendiente.current) borrarPagina(pendiente.current).catch(() => {}); }, []);

  function elegir(opcion) {
    // Si se había preparado una página y se cambia de idea, no se deja sin usar con fotos dentro.
    if (pagina) { borrarPagina(pagina).catch(() => {}); setPagina(null); }
    setElegida(opcion);
    if (opcion === 'blanco' || opcion.uso === 'valoracion') return setTexto('');
    if (!esPdf) return setTexto(rellenar(opcion.texto, variables));
    const base = plantillas.find(p => p.uso === 'pdf')?.texto ?? 'Hola {nombre}, te enviamos «{documento}»: {enlace}';
    conEnlace(rellenar(base, { ...variables, documento: opcion.titulo, enlace: enlaceDocumento(opcion) }), enlaceDocumento(opcion));
  }
  // El enlace tiene que ir siempre, aunque alguien lo haya quitado de la plantilla.
  const conEnlace = (mensaje, enlace) => setTexto(mensaje.includes(enlace) ? mensaje : `${mensaje}\n${enlace}`);

  function alCrearPagina(nueva) {
    setPagina(nueva);
    conEnlace(rellenar(elegida.texto, { ...variables, enlaces_documentos: enlacePagina(nueva) }), enlacePagina(nueva));
  }

  async function alAbrirWhatsApp(e) {
    const titulo = elegida === 'blanco' ? 'Mensaje libre' : elegida.titulo;
    const anotar = () => intentar(() => registrarEnvio(paciente, { tipo: modo, titulo, texto, esRecordatorio: elegida.uso === 'revision' }));
    pendiente.current = null; // enviada: la página se queda
    if (enMismaPestana()) {
      // WhatsApp Web sustituye a la app en esta pestaña: antes de salir se anota el envío y se deja
      // preparada la pantalla a la que se vuelve con la flecha Atrás.
      e.preventDefault();
      const destino = e.currentTarget.href;
      await anotar();
      reemplazar(`paciente/${paciente.id}`);
      location.href = destino;
      return;
    }
    anotar();
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
                  {o.uso === 'valoracion' && <small>Con sus fotos intraorales y documentos</small>}
                </button>
              ))}
              {!esPdf && <button className={`opcion${elegida === 'blanco' ? ' on' : ''}`} onClick={() => elegir('blanco')}><b>Mensaje en blanco</b></button>}
            </div>}
      </div>
      {faltaPagina && <PrepararPagina key={elegida.id} paciente={paciente} alCrear={alCrearPagina} />}
      {elegida && !faltaPagina && (
        <div className="card">
          <h2>{pagina ? '3 · Revisa y envía' : '2 · Revisa y envía'}</h2>
          {pagina && <p className="nota bien">Página del paciente preparada: {resumenPagina(pagina)}. Disponible hasta el {fecha(pagina.caduca)}.</p>}
          <textarea className="msg" value={texto} onChange={e => setTexto(e.target.value)} aria-label="Texto del mensaje" placeholder="Escribe el mensaje…" />
          {(esPdf || pagina) && DEMO && <p className="hint">En el modo demostración el enlace no funciona.</p>}
          <p className="hint">Se abrirá WhatsApp con el chat de {nombre} y este texto escrito. Allí solo tienes que pulsar enviar.</p>
          {texto.trim()
            ? <a className="btn wa" href={enlaceWhatsApp(paciente.telefono, texto)} {...destinoWhatsApp()} onClick={alAbrirWhatsApp}>Abrir WhatsApp</a>
            : <button className="btn wa" disabled>Abrir WhatsApp</button>}
        </div>
      )}
    </>
  );
}

const cuenta = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const resumenPagina = p => [p.fotos.length && cuenta(p.fotos.length, 'foto', 'fotos'), p.documentos.length && cuenta(p.documentos.length, 'documento', 'documentos')].filter(Boolean).join(' y ');

/* ---------- elegir los PDF y las fotos de la página personal del paciente ---------- */
const MAX_FOTOS = 12;

function PrepararPagina({ paciente, alCrear }) {
  const { documentos, crearPagina } = useDatos();
  const [docs, setDocs] = useState([]); // ids de los documentos elegidos
  const [fotos, setFotos] = useState([]); // { archivo: JPEG reducido, vista: dirección para la miniatura }
  const [ocupada, setOcupada] = useState('');
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  // Al salir se sueltan las miniaturas de la memoria.
  useEffect(() => () => fotosRef.current.forEach(f => URL.revokeObjectURL(f.vista)), []);

  const alternar = id => setDocs(d => (d.includes(id) ? d.filter(x => x !== id) : [...d, id]));

  async function anadirFotos(e) {
    const archivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length);
    e.target.value = '';
    if (!archivos.length) return;
    setOcupada('Preparando las fotos…');
    const nuevas = [];
    for (const a of archivos) {
      try { const archivo = await reducirFoto(a); nuevas.push({ archivo, vista: URL.createObjectURL(archivo) }); }
      catch { avisar(`No se ha podido leer «${a.name}»`); }
    }
    setFotos(f => [...f, ...nuevas]);
    setOcupada('');
  }
  function quitarFoto(foto) { URL.revokeObjectURL(foto.vista); setFotos(f => f.filter(x => x !== foto)); }

  async function crear() {
    setOcupada('Creando la página…');
    const pagina = await intentar(() => crearPagina(paciente, { documentos: docs, fotos: fotos.map(f => f.archivo) }));
    setOcupada('');
    if (pagina) alCrear(pagina);
  }

  return (
    <div className="card">
      <h2>2 · Elige qué recibe</h2>
      <p className="etiqueta">Documentos de la biblioteca</p>
      {documentos.length === 0 ? <Vacio>La biblioteca está vacía. Añade documentos en Ajustes.</Vacio> : (
        <div className="opciones">
          {documentos.map(d => (
            <button key={d.id} className={`opcion marcable${docs.includes(d.id) ? ' on' : ''}`} aria-pressed={docs.includes(d.id)} onClick={() => alternar(d.id)}>
              <b>{d.titulo}</b>
              {d.descripcion && <small>{d.descripcion}</small>}
            </button>
          ))}
        </div>
      )}
      <p className="etiqueta">Fotos intraorales de {primerNombre(paciente.nombre)}</p>
      {fotos.length > 0 && (
        <div className="fotos">
          {fotos.map((f, i) => (
            <span key={f.vista} className="foto">
              <img src={f.vista} alt={`Foto ${i + 1}`} />
              <button onClick={() => quitarFoto(f)} aria-label={`Quitar la foto ${i + 1}`}>×</button>
            </span>
          ))}
        </div>
      )}
      {fotos.length < MAX_FOTOS && (
        <label className="btn ghost">
          {fotos.length ? 'Añadir más fotos' : 'Añadir fotos'}
          <input type="file" accept="image/*" multiple hidden onChange={anadirFotos} disabled={!!ocupada} />
        </label>
      )}
      <p className="hint">Con lo elegido se crea una página personal y el mensaje lleva un único enlace a ella. Es privada, imposible de adivinar y deja de funcionar a los {DIAS_PAGINA} días. Comprueba que las fotos son de este paciente.</p>
      <button className="btn" onClick={crear} disabled={!!ocupada || (!docs.length && !fotos.length)}>{ocupada || 'Crear la página y seguir'}</button>
    </div>
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
      <Paginas paciente={paciente} />
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

// Páginas personales (fotos y PDF) que siguen disponibles para el paciente, con opción de retirarlas.
function Paginas({ paciente }) {
  const { paginas, borrarPagina } = useDatos();
  const [lista, setLista] = useState([]);
  useEffect(() => { let vivo = true; paginas(paciente.id).then(l => vivo && setLista(l)).catch(() => {}); return () => { vivo = false; }; }, [paciente.id]);
  const vivas = lista.filter(p => p.caduca > new Date().toISOString());
  if (!vivas.length) return null;

  async function retirar(p) {
    if (!confirm('¿Retirar esta página? El enlace enviado al paciente dejará de funcionar y sus fotos se borrarán.')) return;
    const hecho = await intentar(async () => { await borrarPagina(p); return true; }, 'Página retirada');
    if (hecho) setLista(l => l.filter(x => x.id !== p.id));
  }

  return (
    <div className="card">
      <h2>Páginas con sus fotos y documentos</h2>
      <ul className="list">
        {vivas.map(p => (
          <li key={p.id}>
            <Icono nombre="pdf" tam={20} />
            <span className="grow">
              <span className="name">{resumenPagina(p)}</span>
              <span className="sub">Creada el {fecha(p.creado)} · disponible hasta el {fecha(p.caduca)}</span>
              {!DEMO && <a className="sub enlace" href={enlacePagina(p)} target="_blank" rel="noopener noreferrer">Ver cómo la recibe el paciente</a>}
            </span>
            <button className="x" onClick={() => retirar(p)} aria-label="Retirar la página">×</button>
          </li>
        ))}
      </ul>
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
