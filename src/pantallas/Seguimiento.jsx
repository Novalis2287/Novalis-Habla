// Seguimiento de primeras visitas: a quién hay que llamar y estadísticas por mes.
import { useMemo, useState } from 'react';
import { useDatos } from '../lib/almacen.jsx';
import { ir } from '../lib/ruta.js';
import { ESTADOS, cuantoFalta, diasHasta, fecha, hoy, nombreMes } from '../lib/util.js';
import { EtiquetaEstado, Vacio } from '../componentes.jsx';

export function Seguimiento() {
  const [vista, setVista] = useState('lista');
  return (
    <>
      <div className="seg">
        <button className={vista === 'lista' ? 'on' : ''} onClick={() => setVista('lista')}>Primeras visitas</button>
        <button className={vista === 'cifras' ? 'on' : ''} onClick={() => setVista('cifras')}>Estadísticas</button>
      </div>
      {vista === 'lista' ? <Lista /> : <Estadisticas />}
    </>
  );
}

function Lista() {
  const { pacientes } = useDatos();
  const [filtro, setFiltro] = useState('pensando');
  const visitas = useMemo(() => pacientes.filter(p => p.primera_visita), [pacientes]);
  const cuenta = id => visitas.filter(p => p.estado_plan === id).length;

  const filas = useMemo(() => {
    const lista = filtro === 'todos' ? visitas : visitas.filter(p => p.estado_plan === filtro);
    // Primero quien tiene fecha para llamar (la más cercana arriba); después, por primera visita más reciente.
    return [...lista].sort((a, b) =>
      (a.volver_a_llamar ?? '9999').localeCompare(b.volver_a_llamar ?? '9999') || b.primera_visita.localeCompare(a.primera_visita));
  }, [visitas, filtro]);

  return (
    <>
      <div className="chips filtros">
        {ESTADOS.map(e => (
          <button key={e.id} className={`chip estado-chip ${e.id}${filtro === e.id ? ' on' : ''}`} onClick={() => setFiltro(e.id)}>
            {e.nombre}<small>{cuenta(e.id)}</small>
          </button>
        ))}
        <button className={`chip${filtro === 'todos' ? ' on' : ''}`} onClick={() => setFiltro('todos')}>Todos<small>{visitas.length}</small></button>
      </div>
      <div className="card sin-relleno">
        {filas.length === 0 ? <Vacio>No hay pacientes en este grupo.</Vacio> : (
          <ul className="list pulsable">
            {filas.map(p => {
              const toca = p.volver_a_llamar && diasHasta(p.volver_a_llamar) <= 0;
              return (
                <li key={p.id}>
                  <button onClick={() => ir(`paciente/${p.id}/datos`)}>
                    <span className="grow">
                      <span className="name">{p.nombre}</span>
                      <span className="sub">Primera visita: {fecha(p.primera_visita)}{p.origen && ` · ${p.origen}`}</span>
                      {p.volver_a_llamar && <span className={`tag ${toca ? 'zero' : 'low'}`}>Llamar {cuantoFalta(p.volver_a_llamar)}</span>}
                    </span>
                    <EtiquetaEstado estado={p.estado_plan} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function Barra({ nombre, n, total, clase = '' }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="barra">
      <div className="row"><span>{nombre}</span><b>{n} · {pct}%</b></div>
      <div className="barra-fondo"><i className={clase} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Estadisticas() {
  const { pacientes } = useDatos();
  const [mes, setMes] = useState(hoy().slice(0, 7)); // AAAA-MM
  const mover = n => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };

  const delMes = useMemo(() => pacientes.filter(p => p.primera_visita?.startsWith(mes)), [pacientes, mes]);
  const total = delMes.length;
  const origenes = useMemo(() => {
    const cuenta = new Map();
    for (const p of delMes) cuenta.set(p.origen ?? 'Sin indicar', (cuenta.get(p.origen ?? 'Sin indicar') ?? 0) + 1);
    return [...cuenta].sort((a, b) => b[1] - a[1]);
  }, [delMes]);
  const sinEstado = delMes.filter(p => !p.estado_plan).length;

  return (
    <>
      <div className="mes">
        <button className="btn ghost redondo" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
        <b>{nombreMes(mes)}</b>
        <button className="btn ghost redondo" onClick={() => mover(1)} aria-label="Mes siguiente" disabled={mes >= hoy().slice(0, 7)}>›</button>
      </div>
      <div className="card centro">
        <div className="cifra">{total}</div>
        <div className="sub">{total === 1 ? 'primera visita' : 'primeras visitas'}</div>
      </div>
      {total > 0 && (
        <>
          <div className="card">
            <h2>Plan de tratamiento</h2>
            {ESTADOS.map(e => <Barra key={e.id} nombre={e.nombre} n={delMes.filter(p => p.estado_plan === e.id).length} total={total} clase={e.id} />)}
            {sinEstado > 0 && <Barra nombre="Sin indicar" n={sinEstado} total={total} />}
          </div>
          <div className="card">
            <h2>Cómo nos han conocido</h2>
            {origenes.map(([nombre, n]) => <Barra key={nombre} nombre={nombre} n={n} total={total} clase="marca" />)}
          </div>
        </>
      )}
    </>
  );
}
