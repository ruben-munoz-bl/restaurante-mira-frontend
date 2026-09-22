/** OpsRestaurantes — red de locales: buscar y ver ficha básica (reutiliza `todos` ya cargados). */
import { useMemo, useState } from 'react';

export default function OpsRestaurantes({ todos = [] }) {
  const [q, setQ] = useState('');
  const [soloTop, setSoloTop] = useState(false);

  const lista = useMemo(() => {
    const nq = q.trim().toLowerCase();
    let l = todos;
    if (nq) {
      l = l.filter((r) =>
        [r.nombre, r.ciudad, r.zona, (r.categorias || []).join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(nq),
      );
    }
    if (soloTop) l = l.filter((r) => (r.valoracion ?? 0) >= 4.5);
    return l.slice(0, 100);
  }, [todos, q, soloTop]);

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Gestión Restaurantes</h2>
          <p className="ops-card-sub">{todos.length} locales en red · mostrando {lista.length}</p>
        </div>
        <span className="ops-pill">+14 altas 7 días</span>
      </div>
      <div className="ops-toolbar" role="search">
        <input className="ops-input" type="search" placeholder="Nombre, ciudad, cocina…" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={soloTop} onChange={(e) => setSoloTop(e.target.checked)} />
          Solo top (≥ 4.5)
        </label>
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr><th>Restaurante &amp; ciudad</th><th>Cocina</th><th style={{ textAlign: 'right' }}>Nota</th><th style={{ textAlign: 'right' }}>Reseñas</th><th style={{ textAlign: 'right' }}>Estado</th></tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan="5" className="ops-empty">Sin resultados.</td></tr>}
            {lista.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="ops-rest-cell">
                    <span className="ops-rest-ini">{(r.nombre || '?').slice(0, 2).toUpperCase()}</span>
                    <span><strong>{r.nombre}</strong><br /><span className="ops-muted">{r.ciudad} · {r.precio || '—'}</span></span>
                  </span>
                </td>
                <td>{r.cocina || (r.categorias || [])[0] || '—'}</td>
                <td className="num">★ {(r.valoracion ?? 0).toLocaleString('es-ES')}</td>
                <td className="num">{(r.totalResenasYelp ?? (r.resenas || []).length ?? 0).toLocaleString('es-ES')}</td>
                <td style={{ textAlign: 'right' }}>
                  {(r.valoracion ?? 0) >= 4.5
                    ? <span className="ops-status-pill">Verificado</span>
                    : <span className="ops-status-pill warn">En red</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
