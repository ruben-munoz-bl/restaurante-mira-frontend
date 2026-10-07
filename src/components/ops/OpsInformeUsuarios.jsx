/**
 * OpsInformeUsuarios — informe de comensales con gráficos y exportación PDF/CSV.
 * Recibe la lista ya cargada por OpsUsuarios: NO hace llamadas
 * a la API ni a la BD. Con "Datos simulados" usa 100 usuarios ficticios.
 */
import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import useInformeUsuariosStore from '../../stores/useInformeUsuariosStore.js';
import {
  COLUMNAS, PLATAFORMAS, TIPOS, PASOS_FLUJO, filtrarUsuarios, ordenarUsuarios, agregados,
  csvUsuarios, valorCelda, generarUsuariosSimulados, diaDe,
} from './informeUsuarios.js';
import { descargarCSV } from './opsData.js';

const COLORES = ['#0e6b47', '#004393', '#6bfe9c', '#005ac0', '#ba1a1a', '#6f7a72'];

function resumenFiltros(f) {
  const partes = [];
  if (f.q) partes.push(`texto "${f.q}"`);
  if (f.tipo) partes.push(`tipo ${f.tipo}`);
  if (f.plataforma) partes.push(`plataforma ${f.plataforma}`);
  if (f.desde || f.hasta) partes.push(`login ${f.desde || '…'} → ${f.hasta || '…'}`);
  return partes.join(' · ') || 'sin filtros';
}

function Graficos({ ag, ancho = 340 }) {
  return (
    <div className="informe-graficos">
      <figure>
        <figcaption>Usuarios por plataforma</figcaption>
        <PieChart width={ancho} height={220}>
          <Pie data={ag.porPlataforma} dataKey="valor" nameKey="nombre" outerRadius={80} innerRadius={45}
            label={({ nombre, valor }) => `${nombre} (${valor})`} isAnimationActive={false}>
            {ag.porPlataforma.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </figure>
      <figure>
        <figcaption>Usuarios por tipo</figcaption>
        <BarChart width={ancho} height={220} data={ag.porTipo}>
          <XAxis dataKey="nombre" /><YAxis allowDecimals={false} /><Tooltip />
          <Bar dataKey="valor" name="Usuarios" fill="#004393" isAnimationActive={false} />
        </BarChart>
      </figure>
      <figure>
        <figcaption>Altas por semana</figcaption>
        <LineChart width={ancho} height={220} data={ag.altasSemana} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nombre" padding={{ left: 8, right: 8 }} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip />
          <Line type="monotone" dataKey="valor" name="Altas" stroke="#0e6b47" strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </figure>
      {ag.embudo.length > 0 && (
        <figure>
          <figcaption>Flujo operativo (embudo)</figcaption>
          <BarChart width={ancho} height={220} data={ag.embudo} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="valor" name="Usuarios" fill="#0e6b47" isAnimationActive={false} />
          </BarChart>
        </figure>
      )}
    </div>
  );
}

export default function OpsInformeUsuarios({ lista }) {
  const st = useInformeUsuariosStore();
  const { filtros, columnas, orden, enmascarar, simulado } = st;
  const [semilla, setSemilla] = useState(2026);
  const [traza, setTraza] = useState(null); // usuario simulado cuya traza se ve
  const [imprimir, setImprimir] = useState(null); // { fecha, filtros, filas, origen }

  const simulados = useMemo(() => generarUsuariosSimulados(100, semilla), [semilla]);
  const base = simulado ? simulados : lista;
  const datos = useMemo(
    () => ordenarUsuarios(filtrarUsuarios(base, filtros), orden.campo, orden.asc),
    [base, filtros, orden],
  );
  const ag = useMemo(() => agregados(datos), [datos]);
  const cols = COLUMNAS.filter((c) => columnas.includes(c.id));

  function exportar(formato) {
    const fecha = new Date().toISOString();
    if (formato === 'csv') {
      const { cabeceras, filas } = csvUsuarios(datos, columnas, { enmascarar });
      descargarCSV(`usuarios_${fecha.slice(0, 10)}.csv`, cabeceras, filas);
    } else {
      setImprimir({ fecha, filtros: resumenFiltros(filtros), filas: datos.length, origen: simulado ? 'simulado' : 'real' });
      document.body.classList.add('imprimiendo-informe');
      const fin = () => {
        document.body.classList.remove('imprimiendo-informe');
        setImprimir(null);
        window.removeEventListener('afterprint', fin);
      };
      window.addEventListener('afterprint', fin);
      setTimeout(() => window.print(), 150);
    }
  }

  return (
    <div className="ops-card informe-usuarios">
      <div className="ops-card-head">
        <div>
          <h2>Informe de clientes ({datos.length}{simulado ? ' · simulados' : ''})</h2>
          <p className="ops-card-sub">Filtra, revisa los gráficos y exporta. Sin consultas extra a la base de datos.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ops-btn soft sm" onClick={() => exportar('csv')} disabled={!datos.length}>CSV</button>
          <button type="button" className="ops-btn primary sm" onClick={() => exportar('pdf')} disabled={!datos.length}>PDF</button>
        </div>
      </div>

          <div className="ops-toolbar informe-filtros" role="search">
            <input className="ops-input" type="search" placeholder="Nombre, email, preferencia…" value={filtros.q}
              onChange={(e) => st.setFiltro('q', e.target.value)} style={{ flex: 1, minWidth: 180 }} />
            <select className="ops-input" value={filtros.tipo} onChange={(e) => st.setFiltro('tipo', e.target.value)} aria-label="Tipo">
              <option value="">Todos los tipos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="ops-input" value={filtros.plataforma} onChange={(e) => st.setFiltro('plataforma', e.target.value)} aria-label="Plataforma">
              <option value="">Todas las plataformas</option>
              {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="ops-muted">Login desde <input className="ops-input" type="date" value={filtros.desde} onChange={(e) => st.setFiltro('desde', e.target.value)} /></label>
            <label className="ops-muted">hasta <input className="ops-input" type="date" value={filtros.hasta} onChange={(e) => st.setFiltro('hasta', e.target.value)} /></label>
          </div>
          <div className="ops-toolbar informe-opciones">
            <label><input type="checkbox" checked={simulado} onChange={(e) => st.setPref('simulado', e.target.checked)} /> Datos simulados (100 usuarios)</label>
            {simulado && (
              <button type="button" className="ops-btn soft sm" onClick={() => setSemilla((s) => s + 1)}>Regenerar simulación</button>
            )}
            <label><input type="checkbox" checked={enmascarar} onChange={(e) => st.setPref('enmascarar', e.target.checked)} /> Enmascarar emails al exportar (RGPD)</label>
            <button type="button" className="ops-btn soft sm" onClick={st.restablecer}>Restablecer preferencias</button>
          </div>
          <details className="informe-columnas">
            <summary>Columnas ({cols.length})</summary>
            {COLUMNAS.map((c) => (
              <label key={c.id}><input type="checkbox" checked={columnas.includes(c.id)} onChange={() => st.toggleColumna(c.id)} /> {c.nombre}</label>
            ))}
          </details>

          <Graficos ag={ag} />

          <div className="informe-tabla-wrap">
            <table className="informe-tabla">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.id} onClick={() => st.setOrden(c.id)} style={{ cursor: 'pointer' }}
                      aria-sort={orden.campo === c.id ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                      {c.nombre}{orden.campo === c.id ? (orden.asc ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  {simulado && <th>Traza</th>}
                </tr>
              </thead>
              <tbody>
                {datos.slice(0, 200).map((u) => (
                  <tr key={u.uid}>
                    {cols.map((c) => <td key={c.id}>{String(valorCelda(u, c.id)) || '—'}</td>)}
                    {simulado && <td><button type="button" className="ops-btn soft sm" onClick={() => setTraza(u)}>Ver</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

      {traza && (
        <div className="ops-modal-overlay" onClick={() => setTraza(null)}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="traza-t">
            <h3 id="traza-t">Flujo de {traza.nombre}</h3>
            <p className="ops-muted">{traza.email} · {traza.plataforma}</p>
            <ol className="informe-traza">
              {PASOS_FLUJO.map((p) => {
                const ev = traza.eventos.find((e) => e.paso === p.id);
                return <li key={p.id} className={ev ? 'hecho' : ''}>{p.nombre}: {ev ? new Date(ev.fecha).toLocaleString('es-ES') : 'no alcanzado'}</li>;
              })}
            </ol>
            <div className="ops-modal-actions"><button type="button" className="ops-btn soft sm" onClick={() => setTraza(null)}>Cerrar</button></div>
          </div>
        </div>
      )}

      {imprimir && (
        <div className="informe-imprimible">
          <header>
            <h1>Informe de clientes — MIRA</h1>
            <p>
              Generado el {new Date(imprimir.fecha).toLocaleString('es-ES')}
              <br />Filtros: {imprimir.filtros} · {imprimir.filas} usuarios · origen {imprimir.origen}
            </p>
          </header>
          <p>Total puntos en circulación: {ag.puntos}</p>
          <Graficos ag={ag} ancho={320} />
          <table className="informe-tabla">
            <thead><tr>{cols.map((c) => <th key={c.id}>{c.nombre}</th>)}</tr></thead>
            <tbody>
              {datos.map((u) => (
                <tr key={u.uid}>{cols.map((c) => <td key={c.id}>{String(valorCelda(u, c.id, { enmascarar })) || '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <footer>Informe de clientes · {diaDe(imprimir.fecha)}</footer>
        </div>
      )}
    </div>
  );
}
