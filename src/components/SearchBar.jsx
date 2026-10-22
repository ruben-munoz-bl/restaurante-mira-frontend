/**
 * View pura: barra de búsqueda con filtros tipo pills + búsqueda por texto.
 */
import { useEffect, useState } from 'react';
import { DIAS, FRANJAS, familiaCocina } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

const SERVICIOS_FILTRO = [
  { campo: 'menuInfantil', icono: '🧒' },
  { campo: 'tronas', icono: '🪑' },
  { campo: 'terraza', icono: '☀️' },
  { campo: 'entornoTranquilo', icono: '🤫' },
];

export default function SearchBar({ filtros, opciones, hayFiltrosActivos, onChange, onClear, abiertoInicial = false, onBuscar }) {
  const t = useT(TRADS);
  const [qLocal, setQLocal] = useState(filtros.q);
  // Plegados siempre al montar: solo se abren si el padre lo pide.
  const [plegado, setPlegado] = useState(() => !abiertoInicial);

  // Etiquetas por valor estable: el texto de los modelos va en español.
  const CLAVES_FRANJA = { '': 'cualquierHora', desayuno: 'desayuno', comida: 'comida', cena: 'cena' };
  const CLAVES_DISTANCIA = { '': 'cualquierDistancia', 1: 'menos1km', 3: 'menos3km', 5: 'menos5km', 10: 'menos10km' };
  const CLAVES_ORDEN = { Relevancia: 'relevancia', 'Valoración': 'valoracion', Distancia: 'distanciaOrden', Precio: 'precioOrden' };
  const CLAVES_DIA = { Lunes: 'lunes', Martes: 'martes', 'Miércoles': 'miercoles', Jueves: 'jueves', Viernes: 'viernes', 'Sábado': 'sabado', Domingo: 'domingo' };

  function traducirFranja(f) {
    const clave = CLAVES_FRANJA[f.value];
    return clave ? t(`busqueda.${clave}`) : f.label;
  }
  function traducirDistancia(d) {
    const clave = CLAVES_DISTANCIA[d.value];
    return clave ? t(`busqueda.${clave}`) : d.label;
  }
  function traducirOrden(o) {
    return CLAVES_ORDEN[o] ? t(`busqueda.${CLAVES_ORDEN[o]}`) : o;
  }
  function traducirDia(d) {
    return CLAVES_DIA[d] ? t(`modelos.${CLAVES_DIA[d]}`) : d;
  }
  useEffect(() => setQLocal(filtros.q), [filtros.q]);
  // Los filtros de la URL llegan después del primer render: se abren al aplicarse.
  useEffect(() => {
    if (abiertoInicial) setPlegado(false);
  }, [abiertoInicial]);

  function buscarSiEnter(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (qLocal !== filtros.q) {
        onChange('q', qLocal);
        onBuscar?.({ ...filtros, q: qLocal });
      }
    }
  }

  function manejarEnvio(e) {
    e.preventDefault();
    // El texto puede ir por delante del estado: se envía el valor visible.
    const enviados = qLocal !== filtros.q ? { ...filtros, q: qLocal } : filtros;
    onBuscar?.(enviados);
  }

  return (
    <form role="search" aria-label={t('hero.buscar')} className={`searchbar${plegado ? ' plegada' : ''}`} onSubmit={manejarEnvio}>
      <div className="campo campo-texto">
        <label htmlFor="f-q">{t('busqueda.placeholder')}</label>
        <div style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gris)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            id="f-q"
            name="q"
            type="search"
            placeholder={t('busqueda.placeholder') + '…'}
            autoComplete="off"
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            onKeyDown={buscarSiEnter}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>
      </div>

      <button
        type="button"
        className="filtros-toggle"
        aria-expanded={!plegado}
        aria-controls="filtros-plegables"
        onClick={() => setPlegado((v) => !v)}
      >
        {plegado ? t('busqueda.mostrarFiltros') : t('busqueda.ocultarFiltros')}
      </button>

      <div className="filtros-plegables" id="filtros-plegables">
        <div className="campo">
          <label htmlFor="f-precio">{t('busqueda.precio')}</label>
          <select id="f-precio" name="precio" value={filtros.precio} onChange={(e) => onChange('precio', e.target.value)}>
            <option value="">{t('busqueda.cualquiera')}</option>
            {opciones.precios.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-cocina">{t('busqueda.cocina')}</label>
          <select id="f-cocina" name="cocina" value={filtros.cocina} onChange={(e) => onChange('cocina', e.target.value)}>
            <option value="">{t('busqueda.todas')}</option>
            {opciones.cocinas
              .map((c) => {
                const clave = `cocinaFamilia.${familiaCocina(c)}`;
                const etiqueta = t(clave);
                return { c, etiqueta: etiqueta === clave ? c : etiqueta };
              })
              .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta))
              .map(({ c, etiqueta }) => <option key={c} value={c}>{etiqueta}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-zona">{t('busqueda.zona')}</label>
          <select id="f-zona" name="zona" value={filtros.zona} onChange={(e) => onChange('zona', e.target.value)}>
            <option value="">{t('busqueda.todaCataluna')}</option>
            {opciones.zonas.map((z) => (
              <option key={z} value={z}>{z.replace(', Spain', '')}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-distancia">{t('busqueda.distancia')}</label>
          <select
            id="f-distancia"
            name="distanciaMax"
            value={filtros.distanciaMax}
            onChange={(e) => onChange('distanciaMax', e.target.value)}
          >
            {opciones.distancias.map((d) => (
              <option key={String(d.value)} value={d.value}>{traducirDistancia(d)}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-dia">{t('busqueda.dia')}</label>
          <select id="f-dia" name="dia" value={filtros.dia} onChange={(e) => onChange('dia', e.target.value)}>
            <option value="">{t('busqueda.cualquierDia')}</option>
            {DIAS.filter(Boolean).map(d => <option key={d} value={d}>{traducirDia(d)}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-franja">{t('busqueda.franjaHoraria')}</label>
          <select id="f-franja" name="franja" value={filtros.franja} onChange={(e) => onChange('franja', e.target.value)}>
            {FRANJAS.map(f => <option key={f.value} value={f.value}>{traducirFranja(f)}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="f-hora">{t('busqueda.hora')}</label>
          <input id="f-hora" type="time" value={filtros.hora} onChange={(e) => onChange('hora', e.target.value)} />
        </div>

        <div className="campo">
          <label htmlFor="f-orden">{t('busqueda.ordenarPor')}</label>
          <select id="f-orden" name="orden" value={filtros.orden} onChange={(e) => onChange('orden', e.target.value)}>
            {opciones.ordenes.map((o) => (
              <option key={o} value={o}>{traducirOrden(o)}</option>
            ))}
          </select>
        </div>
        <fieldset className="campo filtro-servicios">
          <legend>{t('busqueda.servicios')}</legend>
          <div className="filtro-servicios-chips">
            {SERVICIOS_FILTRO.map(({ campo, icono }) => {
              const activo = (filtros.servicios || []).includes(campo);
              return (
                <button
                  key={campo}
                  type="button"
                  className={`filtro-chip${activo ? ' activo' : ''}`}
                  aria-pressed={activo}
                  onClick={() => {
                    const actual = filtros.servicios || [];
                    onChange('servicios', activo ? actual.filter((c) => c !== campo) : [...actual, campo]);
                  }}
                >
                  <span aria-hidden="true">{icono}</span> {t(`busqueda.servicio.${campo}`)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="campo campo-acciones">
        {/* Solo la landing navega al enviar: aquí hace falta un botón explícito. */}
        {onBuscar && (
          <button type="submit" className="btn-cta">{t('hero.buscar')}</button>
        )}
        <button type="button" className="btn-secundario" onClick={onClear} disabled={!hayFiltrosActivos}>
          {t('busqueda.limpiar')}
        </button>
      </div>
    </form>
  );
}
