/**
 * OpsTrazabilidadSimulada — demo de la trazabilidad del backend (colección `logs`)
 * a partir de los usuarios simulados. Mismo formato que escribe el middleware
 * accessLog: registros agrupados en bloques de 200. Todo en memoria, sin BD.
 */
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { generarLogsSimulados, agruparEnBloques, filtrarLogs, resumenLogs } from './informeUsuarios.js';
import { descargarCSV } from './opsData.js';

const POR_DOC = 200;

export default function OpsTrazabilidadSimulada({ usuarios }) {
  const [uid, setUid] = useState('');
  const [modulo, setModulo] = useState('');
  const [soloErrores, setSoloErrores] = useState(false);
  const [bloqueVisto, setBloqueVisto] = useState(null);

  const registros = useMemo(() => generarLogsSimulados(usuarios), [usuarios]);
  const bloques = useMemo(() => agruparEnBloques(registros, POR_DOC), [registros]);
  const filtrados = useMemo(() => filtrarLogs(registros, { uid, modulo, soloErrores }), [registros, uid, modulo, soloErrores]);
  const res = useMemo(() => resumenLogs(filtrados), [filtrados]);
  const modulos = useMemo(() => [...new Set(registros.map((x) => x.modulo))].sort(), [registros]);

  function exportarCSV() {
    descargarCSV(`logs_simulados_${new Date().toISOString().slice(0, 10)}.csv`,
      ['ts', 'metodo', 'ruta', 'path', 'modulo', 'status', 'ms', 'uid', 'rol', 'anonimo', 'requestId'],
      filtrados.map((x) => [x.ts, x.metodo, x.ruta, x.path, x.modulo, x.status, x.ms, x.uid || '', x.rol || '', x.anonimo ? 'sí' : 'no', x.requestId]));
  }

  return (
    <section className="informe-seccion" aria-label="Trazabilidad simulada">
      <div className="ops-card-head">
        <div>
          <h2>Trazabilidad (simulada)</h2>
          <p className="ops-card-sub">
            Lo que registraría el backend en <code>logs</code> con estos usuarios: {registros.length} peticiones
            → <strong>{bloques.length} documentos</strong> en Firestore (bloques de {POR_DOC}).
          </p>
        </div>
        <button type="button" className="ops-btn soft sm" onClick={exportarCSV} disabled={!filtrados.length}>CSV</button>
      </div>

      <div className="informe-kpis">
        <div><strong>{res.total}</strong><span>peticiones</span></div>
        <div><strong>{res.usuarios}</strong><span>usuarios con sesión</span></div>
        <div><strong>{res.anonimas}</strong><span>anónimas</span></div>
        <div><strong>{res.errores}</strong><span>errores (4xx/5xx)</span></div>
      </div>

      <div className="ops-toolbar informe-filtros" role="search">
        <input className="ops-input" type="search" placeholder="uid (p. ej. sim-007) o «anónimo»" value={uid}
          onChange={(e) => setUid(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <select className="ops-input" value={modulo} onChange={(e) => setModulo(e.target.value)} aria-label="Módulo">
          <option value="">Todos los módulos</option>
          {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label><input type="checkbox" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} /> Solo errores</label>
      </div>

      <div className="informe-graficos">
        <figure>
          <figcaption>Peticiones por módulo</figcaption>
          <BarChart width={340} height={220} data={res.porModulo}>
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip />
            <Bar dataKey="valor" name="Peticiones" fill="#004393" isAnimationActive={false} />
          </BarChart>
        </figure>
        <figure>
          <figcaption>Documentos en <code>logs</code></figcaption>
          <ul className="informe-bloques">
            {bloques.map((b, i) => (
              <li key={b.desde}>
                <button type="button" className="ops-btn soft sm" onClick={() => setBloqueVisto(i)}>
                  Doc {i + 1}
                </button>
                {' '}{b.n} peticiones · {b.uids.length} usuarios · {b.errores} errores · {b.dia}
              </li>
            ))}
          </ul>
        </figure>
      </div>

      <div className="informe-tabla-wrap">
        <table className="informe-tabla">
          <thead>
            <tr><th>Fecha</th><th>Método</th><th>Ruta</th><th>Estado</th><th>ms</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            {filtrados.slice(-200).reverse().map((x) => (
              <tr key={x.requestId}>
                <td>{new Date(x.ts).toLocaleString('es-ES')}</td>
                <td>{x.metodo}</td>
                <td><code>{x.ruta}</code></td>
                <td className={x.status >= 400 ? 'informe-error' : ''}>{x.status}</td>
                <td>{x.ms}</td>
                <td>{x.uid || 'anónimo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length > 200 && <p className="ops-muted">Mostrando las 200 más recientes de {filtrados.length}. El CSV las incluye todas.</p>}
      </div>

      {bloqueVisto != null && (
        <div className="ops-modal-overlay" onClick={() => setBloqueVisto(null)}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="bloque-t">
            <h3 id="bloque-t">logs / documento {bloqueVisto + 1}</h3>
            <pre className="informe-json">{JSON.stringify({ ...bloques[bloqueVisto], registros: [...bloques[bloqueVisto].registros.slice(0, 3), `… ${Math.max(0, bloques[bloqueVisto].n - 3)} más`] }, null, 2)}</pre>
            <div className="ops-modal-actions"><button type="button" className="ops-btn soft sm" onClick={() => setBloqueVisto(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
