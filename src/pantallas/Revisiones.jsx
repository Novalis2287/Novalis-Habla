// Revisiones semestrales: quién la tiene vencida o próxima, con recordatorio a un toque.
import { useMemo } from 'react';
import { useDatos } from '../lib/almacen.jsx';
import { ir } from '../lib/ruta.js';
import {
  DIAS_AVISO, MESES_REVISION, cuantoFalta, destinoWhatsApp, diasHasta, enMismaPestana, enlaceWhatsApp, fecha, primerNombre, rellenar, telefonoWhatsApp,
} from '../lib/util.js';
import { Vacio, avisar, intentar } from '../componentes.jsx';

// Reparte los pacientes con fecha de revisión en vencidas, próximas y más adelante.
export function clasificarRevisiones(pacientes) {
  const grupos = { vencidas: [], proximas: [], futuras: [] };
  for (const p of pacientes) {
    if (!p.proxima_revision) continue;
    const dias = diasHasta(p.proxima_revision);
    (dias < 0 ? grupos.vencidas : dias <= DIAS_AVISO ? grupos.proximas : grupos.futuras).push(p);
  }
  for (const g of Object.values(grupos)) g.sort((a, b) => a.proxima_revision.localeCompare(b.proxima_revision));
  return grupos;
}

export function Revisiones() {
  const { pacientes, plantillas, registrarEnvio, revisionHecha } = useDatos();
  const { vencidas, proximas, futuras } = useMemo(() => clasificarRevisiones(pacientes), [pacientes]);
  const plantilla = plantillas.find(p => p.uso === 'revision');

  function Fila({ p }) {
    const texto = rellenar(plantilla?.texto ?? 'Hola {nombre}, ya toca tu revisión en Clínica Novalis.', { nombre: primerNombre(p.nombre) });
    const puede = !!telefonoWhatsApp(p.telefono);
    const anotar = () => intentar(() => registrarEnvio(p, { tipo: 'mensaje', titulo: plantilla?.titulo ?? 'Recordatorio de revisión', texto, esRecordatorio: true }), 'Recordatorio anotado');
    async function recordar(e) {
      if (!enMismaPestana()) return anotar();
      // WhatsApp Web se abre en esta misma pestaña: primero se anota y luego se sale de la app.
      e.preventDefault();
      const destino = e.currentTarget.href;
      await anotar();
      location.href = destino;
    }
    const hecha = () => { if (confirm(`¿Marcar la revisión de ${p.nombre} como hecha? La siguiente quedará para dentro de ${MESES_REVISION} meses.`)) intentar(() => revisionHecha(p), 'Revisión hecha'); };
    return (
      <li className="columna">
        <button className="fila-nombre" onClick={() => ir(`paciente/${p.id}`)}>
          <span className="name">{p.nombre}</span>
          <span className="sub">{fecha(p.proxima_revision)} · {cuantoFalta(p.proxima_revision)}</span>
          {p.recordatorio_enviado && <span className="tag">Recordatorio enviado el {fecha(p.recordatorio_enviado)}</span>}
        </button>
        <div className="btns">
          {puede
            ? <a className="btn wa" href={enlaceWhatsApp(p.telefono, texto)} {...destinoWhatsApp()} onClick={recordar}>Recordar</a>
            : <button className="btn wa" disabled onClick={() => avisar('Falta el teléfono')}>Sin teléfono</button>}
          <button className="btn ghost" onClick={hecha}>Revisión hecha</button>
        </div>
      </li>
    );
  }

  if (!vencidas.length && !proximas.length && !futuras.length) {
    return <div className="card"><Vacio>Ningún paciente tiene fecha de revisión. Se pone en «Datos del paciente».</Vacio></div>;
  }
  return (
    <>
      <div className="card">
        <h2 className="mal">Vencidas ({vencidas.length})</h2>
        {vencidas.length ? <ul className="list">{vencidas.map(p => <Fila key={p.id} p={p} />)}</ul> : <Vacio>Ninguna revisión vencida.</Vacio>}
      </div>
      <div className="card">
        <h2>Próximos {DIAS_AVISO} días ({proximas.length})</h2>
        {proximas.length ? <ul className="list">{proximas.map(p => <Fila key={p.id} p={p} />)}</ul> : <Vacio>Ninguna revisión en los próximos {DIAS_AVISO} días.</Vacio>}
      </div>
      {futuras.length > 0 && (
        <details className="card">
          <summary>Más adelante ({futuras.length})</summary>
          <ul className="list pulsable">
            {futuras.map(p => (
              <li key={p.id}><button onClick={() => ir(`paciente/${p.id}`)}>
                <span className="grow"><span className="name">{p.nombre}</span><span className="sub">{fecha(p.proxima_revision)}</span></span>
              </button></li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
