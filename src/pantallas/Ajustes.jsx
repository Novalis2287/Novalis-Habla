// Ajustes: plantillas, biblioteca de PDF, lista "cómo nos han conocido" y usuarios (solo administrador).
import { useState } from 'react';
import { useDatos } from '../lib/almacen.jsx';
import { DEMO, enlaceDocumento, reiniciarDemo, sesion, urlPdf } from '../lib/datos.js';
import { Campo, Hoja, Vacio, avisar, intentar } from '../componentes.jsx';

export function Ajustes() {
  const { yo, email } = useDatos();
  return (
    <>
      <Plantillas />
      <Documentos />
      <Origenes />
      {yo?.admin && <Usuarios />}
      <div className="card">
        <h2>Sesión</h2>
        {DEMO ? (
          <>
            <p className="hint arriba">Modo demostración: los datos son inventados y se guardan solo en este dispositivo.</p>
            <button className="btn ghost" onClick={() => { if (confirm('¿Volver a los datos de ejemplo iniciales?')) { reiniciarDemo(); location.reload(); } }}>Restaurar datos de ejemplo</button>
          </>
        ) : (
          <>
            <p className="hint arriba">Has entrado como <b>{yo?.nombre || email}</b> ({email}).</p>
            <button className="btn ghost" onClick={() => sesion.salir()}>Cerrar sesión</button>
          </>
        )}
      </div>
    </>
  );
}

/* ---------- plantillas de mensajes ---------- */
const AYUDA_USO = {
  revision: 'Es el mensaje que se envía con un toque desde Revisiones.',
  pdf: 'Es el texto que acompaña a cada PDF. {documento} es el título y {enlace} el enlace al documento.',
};

function Plantillas() {
  const { plantillas, guardarPlantilla, borrarPlantilla } = useDatos();
  const [editando, setEditando] = useState(null);

  async function guardar(e) {
    e.preventDefault();
    if (!editando.titulo.trim() || !editando.texto.trim()) return;
    await intentar(() => guardarPlantilla({ ...editando, titulo: editando.titulo.trim() }), 'Plantilla guardada');
    setEditando(null);
  }
  async function eliminar() {
    if (!confirm(`¿Borrar la plantilla «${editando.titulo}»?`)) return;
    await intentar(() => borrarPlantilla(editando.id), 'Plantilla borrada');
    setEditando(null);
  }
  const especial = editando && editando.uso && editando.uso !== 'general';

  return (
    <div className="card">
      <h2>Plantillas de mensajes</h2>
      <ul className="list pulsable">
        {plantillas.map(p => (
          <li key={p.id}><button onClick={() => setEditando(p)}>
            <span className="grow"><span className="name">{p.titulo}</span><span className="sub una-linea">{p.texto}</span></span>
          </button></li>
        ))}
      </ul>
      <button className="btn ghost" onClick={() => setEditando({ titulo: '', texto: 'Hola {nombre}, ' })}>Nueva plantilla</button>
      {editando && (
        <Hoja titulo={editando.id ? 'Editar plantilla' : 'Nueva plantilla'} alCerrar={() => setEditando(null)}>
          <form onSubmit={guardar}>
            <Campo etiqueta="Título"><input value={editando.titulo} onChange={e => setEditando({ ...editando, titulo: e.target.value })} /></Campo>
            <Campo etiqueta="Texto del mensaje">
              <textarea rows={6} value={editando.texto} onChange={e => setEditando({ ...editando, texto: e.target.value })} />
            </Campo>
            <p className="hint arriba">{'{nombre}'} se cambia por el nombre del paciente. {AYUDA_USO[editando.uso] ?? ''}</p>
            <button className="btn" disabled={!editando.titulo.trim() || !editando.texto.trim()}>Guardar</button>
            {editando.id && !especial && <button type="button" className="link bad" onClick={eliminar}>Borrar plantilla</button>}
          </form>
        </Hoja>
      )}
    </div>
  );
}

/* ---------- biblioteca de PDF ---------- */
const MAX_PDF = 10 * 1024 * 1024;

function Documentos() {
  const { documentos, subirDocumento, borrarDocumento } = useDatos();
  const [nuevo, setNuevo] = useState(null); // { archivo, titulo, descripcion }
  const [subiendo, setSubiendo] = useState(false);

  function elegirArchivo(e) {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    if (archivo.type !== 'application/pdf') return avisar('El archivo tiene que ser un PDF');
    if (archivo.size > MAX_PDF) return avisar('El PDF no puede pasar de 10 MB');
    setNuevo({ archivo, titulo: archivo.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '), descripcion: '' });
  }
  async function subir(e) {
    e.preventDefault();
    setSubiendo(true);
    const hecho = await intentar(async () => { await subirDocumento({ ...nuevo, titulo: nuevo.titulo.trim(), descripcion: nuevo.descripcion.trim() }); return true; }, 'Documento añadido');
    setSubiendo(false);
    if (hecho) setNuevo(null);
  }
  async function eliminar(doc) {
    if (!confirm(`¿Borrar «${doc.titulo}»? Los enlaces ya enviados a pacientes dejarán de funcionar.`)) return;
    await intentar(() => borrarDocumento(doc), 'Documento borrado');
  }

  return (
    <div className="card">
      <h2>Biblioteca de PDF</h2>
      {documentos.length === 0 ? <Vacio>Aún no hay documentos.</Vacio> : (
        <ul className="list">
          {documentos.map(d => (
            <li key={d.id}>
              <span className="grow">
                <span className="name">{d.titulo}</span>
                {d.descripcion && <span className="sub">{d.descripcion}</span>}
                {urlPdf(d) && <a className="sub enlace" href={enlaceDocumento(d)} target="_blank" rel="noopener noreferrer">Ver cómo lo recibe el paciente</a>}
              </span>
              <button className="x" onClick={() => eliminar(d)} aria-label={`Borrar ${d.titulo}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <label className="btn ghost">
        Añadir PDF
        <input type="file" accept="application/pdf" hidden onChange={elegirArchivo} />
      </label>
      <p className="hint">Solo documentos generales (indicaciones, cuidados…). Nunca informes con datos de un paciente: el enlace es público.</p>
      {nuevo && (
        <Hoja titulo="Añadir PDF" alCerrar={() => !subiendo && setNuevo(null)}>
          <form onSubmit={subir}>
            <p className="hint arriba">{nuevo.archivo.name}</p>
            <Campo etiqueta="Título (lo verá el paciente)"><input value={nuevo.titulo} onChange={e => setNuevo({ ...nuevo, titulo: e.target.value })} /></Campo>
            <Campo etiqueta="Descripción breve (opcional)"><input value={nuevo.descripcion} onChange={e => setNuevo({ ...nuevo, descripcion: e.target.value })} /></Campo>
            <button className="btn" disabled={subiendo || !nuevo.titulo.trim()}>{subiendo ? 'Subiendo…' : 'Añadir a la biblioteca'}</button>
          </form>
        </Hoja>
      )}
    </div>
  );
}

/* ---------- opciones de "cómo nos ha conocido" ---------- */
function Origenes() {
  const { origenes, guardarOrigenes } = useDatos();
  const [nuevo, setNuevo] = useState('');
  function anadir(e) {
    e.preventDefault();
    const o = nuevo.trim();
    if (!o || origenes.some(x => x.toLowerCase() === o.toLowerCase())) return;
    intentar(() => guardarOrigenes([...origenes, o]));
    setNuevo('');
  }
  return (
    <div className="card">
      <h2>Cómo nos han conocido</h2>
      <div className="chips">
        {origenes.map(o => (
          <span key={o} className="chip quitable">{o}
            <button onClick={() => intentar(() => guardarOrigenes(origenes.filter(x => x !== o)))} aria-label={`Quitar ${o}`}>×</button>
          </span>
        ))}
      </div>
      <form className="en-linea" onSubmit={anadir}>
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="Nueva opción…" aria-label="Nueva opción" />
        <button className="btn ghost" disabled={!nuevo.trim()}>Añadir</button>
      </form>
    </div>
  );
}

/* ---------- usuarios con acceso (solo administrador) ---------- */
function Usuarios() {
  const { usuarios, email: miEmail, guardarUsuario, borrarUsuario } = useDatos();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');

  async function autorizar(e) {
    e.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(correo)) return avisar('El correo no es válido');
    if (usuarios.some(u => u.email === correo)) return avisar('Ese correo ya está autorizado');
    await intentar(() => guardarUsuario({ email: correo, nombre: nombre.trim(), admin: false }), 'Usuario autorizado');
    setNombre(''); setEmail('');
  }
  async function baja(u) {
    if (!confirm(`¿Quitar el acceso a ${u.nombre || u.email}? Dejará de poder entrar al momento.`)) return;
    await intentar(() => borrarUsuario(u.email), 'Acceso retirado');
  }

  return (
    <div className="card">
      <h2>Usuarios con acceso</h2>
      <ul className="list">
        {usuarios.map(u => (
          <li key={u.email}>
            <span className="grow"><span className="name">{u.nombre || u.email}{u.admin && <span className="tag">Administrador</span>}</span><span className="sub">{u.email}</span></span>
            {u.email !== miEmail && !u.admin && <button className="x" onClick={() => baja(u)} aria-label={`Quitar acceso a ${u.email}`}>×</button>}
          </li>
        ))}
      </ul>
      <form onSubmit={autorizar}>
        <Campo etiqueta="Nombre"><input value={nombre} onChange={e => setNombre(e.target.value)} autoCapitalize="words" /></Campo>
        <Campo etiqueta="Correo electrónico"><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" inputMode="email" /></Campo>
        <button className="btn ghost" disabled={!email.trim()}>Autorizar usuario</button>
      </form>
      <p className="hint">La persona autorizada abre la app, pulsa «Crear cuenta» con ese correo y lo confirma con el enlace que recibe.</p>
    </div>
  );
}
