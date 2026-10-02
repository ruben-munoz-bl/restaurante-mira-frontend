/**
 * View pura — caja de escritura.
 * Enter envía · Shift+Enter salto de línea · contador del límite del contrato.
 */
import { useState, useRef } from 'react';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { MAX_MENSAJE } from '../../services/aiPayload.js';

const TRADS = { es, ca, en };

/** Chips por rol: el cliente no debería preguntar por paneles de empresa. */
function chipsDe({ esAdmin, esEmpresa, haySesion }) {
  const base = ['mira.chips.recomienda', 'mira.chips.mesaSabado'];
  if (!haySesion) return [...base, 'mira.chips.puntosNecesarios'];
  if (esAdmin) return [...base, 'mira.chips.resumenDia', 'mira.chips.incidencias'];
  if (esEmpresa) return [...base, 'mira.chips.misReservas', 'mira.chips.misPedidos'];
  return [...base, 'mira.chips.misPuntos', 'mira.chips.cancelarMañana'];
}

export default function MiraComposer({ alEnviar, alParar, enviando, esAdmin, esEmpresa, haySesion }) {
  const t = useT(TRADS);
  const [texto, setTexto] = useState('');
  const areaRef = useRef(null);

  const puedeEnviar = texto.trim().length > 0 && !enviando;
  const restantes = MAX_MENSAJE - texto.length;

  function enviar() {
    if (!puedeEnviar) return;
    const limpio = texto.trim();
    setTexto('');
    alEnviar(limpio);
    if (areaRef.current) areaRef.current.style.height = 'auto';
  }

  function alPulsarTecla(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  function alPegar(e) {
    // Recorta al máximo del contrato sin dejar el textarea en un valor inválido.
    const pegado = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (texto.length + pegado.length <= MAX_MENSAJE) return;
    e.preventDefault();
    setTexto((texto + pegado).slice(0, MAX_MENSAJE));
  }

  const chips = chipsDe({ esAdmin, esEmpresa, haySesion });

  return (
    <form
      className="mira-composer"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <div className="mira-chips">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className="mira-chip"
            disabled={enviando}
            onClick={() => alEnviar(t(c))}
          >
            {t(c)}
          </button>
        ))}
      </div>

      <div className="mira-fila-envio">
        <label className="sr-only" htmlFor="mira-input">
          {t('mira.escribe')}
        </label>
        <textarea
          id="mira-input"
          ref={areaRef}
          className="mira-input"
          rows={1}
          value={texto}
          maxLength={MAX_MENSAJE}
          placeholder={t('mira.placeholder')}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alPulsarTecla}
          onPaste={alPegar}
        />
        {enviando ? (
          <button type="button" className="mira-enviar mira-enviar--parar" onClick={alParar} aria-label={t('mira.parar')} title={t('mira.parar')}>
            ■
          </button>
        ) : (
          <button type="submit" className="mira-enviar" disabled={!puedeEnviar} aria-label={t('mira.enviar')} title={t('mira.enviar')}>
            ↑
          </button>
        )}
      </div>

      <p className="mira-pie">
        <span className={restantes < 100 ? 'mira-pie-aviso' : undefined}>
          {restantes < 100 ? `${restantes}` : ''}
        </span>
        <span>{t('mira.pie')}</span>
      </p>
    </form>
  );
}