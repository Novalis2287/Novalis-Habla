// Lista de pacientes con buscador y alta de pacientes nuevos.
import { useMemo, useState } from 'react';
import { useDatos } from '../lib/almacen.jsx';
import { ir } from '../lib/ruta.js';
import { hoy, sinAcentos } from '../lib/util.js';
import { Campo, Hoja, Icono, Vacio, intentar } from '../componentes.jsx';

const MAX_VISIBLES = 100; // con muchos pacientes se muestran los primeros y se afina con el buscador

export function ListaPacientes({ elegido }) {
  const { pacientes } = useDatos();
  const [busca, setBusca] = useState('');
  const [nuevo, setNuevo] = useState(false);

  const encontrados = useMemo(() => {
    const q = sinAcentos(busca.trim()), cifras = busca.replace(/\D/g, '');
    if (!q) return pacientes;
    return pacientes.filter(p => sinAcentos(p.nombre).includes(q) || (cifras.length >= 3 && p.telefono.replace(/\D/g, '').includes(cifras)));
  }, [pacientes, busca]);

  return (
    <>
      <div className="buscador">
        <input type="search" placeholder="Buscar paciente…" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar paciente" />
        <button className="btn redondo" onClick={() => setNuevo(true)} aria-label="Nuevo paciente"><Icono nombre="mas" /></button>
      </div>
      <div className="card sin-relleno">
        {encontrados.length === 0
          ? <Vacio>{pacientes.length ? 'Ningún paciente coincide con la búsqueda.' : 'Aún no hay pacientes. Pulsa + para añadir el primero.'}</Vacio>
          : <ul className="list pulsable">
              {encontrados.slice(0, MAX_VISIBLES).map(p => (
                <li key={p.id} className={p.id === elegido ? 'on' : ''}>
                  <button onClick={() => ir(`paciente/${p.id}`)}>
                    <span className="grow"><span className="name">{p.nombre}</span><span className="sub">{p.telefono || 'Sin teléfono'}</span></span>
                    <Icono nombre="flecha" tam={18} />
                  </button>
                </li>
              ))}
            </ul>}
      </div>
      {encontrados.length > MAX_VISIBLES && <p className="hint centro">Se muestran {MAX_VISIBLES} de {encontrados.length}. Usa el buscador para encontrar al resto.</p>}
      {nuevo && <NuevoPaciente alCerrar={() => setNuevo(false)} />}
    </>
  );
}

function NuevoPaciente({ alCerrar }) {
  const { guardarPaciente } = useDatos();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [primera, setPrimera] = useState(false);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    const p = await intentar(() => guardarPaciente({
      nombre: nombre.trim(), telefono: telefono.trim(),
      primera_visita: primera ? hoy() : null,
      proxima_revision: null, recordatorio_enviado: null, origen: null, estado_plan: null, volver_a_llamar: null,
    }));
    if (p) { alCerrar(); ir(primera ? `paciente/${p.id}/datos` : `paciente/${p.id}`); }
  }

  return (
    <Hoja titulo="Nuevo paciente" alCerrar={alCerrar}>
      <form onSubmit={crear}>
        <Campo etiqueta="Nombre y apellidos"><input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus autoCapitalize="words" /></Campo>
        <Campo etiqueta="Teléfono móvil"><input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" /></Campo>
        <label className="switch">Hoy es su primera visita
          <input type="checkbox" checked={primera} onChange={e => setPrimera(e.target.checked)} />
        </label>
        <button className="btn" disabled={!nombre.trim()}>Añadir paciente</button>
      </form>
    </Hoja>
  );
}
