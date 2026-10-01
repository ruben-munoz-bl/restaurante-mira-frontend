/**
 * Panel de chat del agente MIRA.
 *
 * - Anatomía calcada de FloatingReservation.jsx (overlay + panel + ESC +
 *   click fuera con e.target === e.currentTarget), pero sube el estándar
 *   de accesibilidad del repo: role="dialog", aria-modal, foco atrapado y
 *   devuelto al launcher. Es lo primero del repo con focus trap.
 */
import { useEffect, useRef } from 'react';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import useMiraStore from '../../stores/useMiraStore.js';
import MiraLog from './MiraLog.jsx';
import MiraComposer from './MiraComposer.jsx';
import './mira.css';

const TRADS = { es, ca, en };

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

export default function MiraPanel({ esAdmin, esEmpresa, haySesion }) {
  const t = useT(TRADS);
  const abierto = useMiraStore((s) => s.abierto);
  const mensajes = useMiraStore((s) => s.mensajes);
  const enviando = useMiraStore((s) => s.enviando);
  const error = useMiraStore((s) => s.error);
  const confirmPendiente = useMiraStore((s) => s.confirmPendiente);
  const ultimoFallido = useMiraStore((s) => s.ultimoFallido);

  const cerrar = useMiraStore((s) => s.cerrar);
  const enviar = useMiraStore((s) => s.enviar);
  const confirmar = useMiraStore((s) => s.confirmar);
  const cancelarConfirmacion = useMiraStore((s) => s.cancelarConfirmacion);
  const reintentar = useMiraStore((s) => s.reintentar);
  const parar = useMiraStore((s) => s.parar);
  const limpiar = useMiraStore((s) => s.limpiar);

  const panelRef = useRef(null);
  const focoPrevio = useRef(null);

  // ESC cierra.
  useEffect(() => {
    if (!abierto) return undefined;
    function alTeclar(e) {
      if (e.key === 'Escape') cerrar();
    }
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [abierto, cerrar]);

  // Foco al abrir y devuelto al cerrar.
  useEffect(() => {
    if (abierto) {
      focoPrevio.current = document.activeElement;
      const primero = panelRef.current?.querySelector(FOCUSABLE);
      if (primero) primero.focus();
    } else if (focoPrevio.current?.focus) {
      focoPrevio.current.focus();
      focoPrevio.current = null;
    }
  }, [abierto]);

  // Foco atrapado dentro del panel mientras está abierto.
  useEffect(() => {
    if (!abierto) return undefined;
    function alTabular(e) {
      if (e.key !== 'Tab') return;
      const nodos = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodos || nodos.length === 0) return;
      const primero = nodos[0];
      const ultimo = nodos[nodos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
    window.addEventListener('keydown', alTabular);
    return () => window.removeEventListener('keydown', alTabular);
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="mira-overlay mira-overlay--visible"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        className="mira-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mira-titulo"
      >
        <header className="mira-header">
          <img src="/mira_logo_3_circular_lente.svg" alt="" className="mira-header-logo" />
          <div className="mira-header-txt">
            <span className="mira-header-nombre" id="mira-titulo">
              {t('mira.titulo')}
            </span>
            <span className="mira-header-estado">{t('mira.estado')}</span>
          </div>
          <button
            type="button"
            className="mira-header-btn"
            onClick={limpiar}
            aria-label={t('mira.nuevoChat')}
            title={t('mira.nuevoChat')}
          >
            +
          </button>
          <button
            type="button"
            className="mira-header-btn"
            onClick={cerrar}
            aria-label={t('mira.cerrar')}
            title={t('mira.cerrar')}
          >
            ✕
          </button>
        </header>

        <MiraLog mensajes={mensajes} escribiendo={enviando} alSugerir={enviar} />

        {confirmPendiente && (
          <div className="mira-tarjeta mira-tarjeta-confirmacion" style={{ margin: '0 0.9rem 0.6rem' }}>
            <p className="mira-tarjeta-titulo">{t('mira.confirmar.titulo')}</p>
            <p className="vacio-texto">{confirmPendiente.summary}</p>
            <div className="mira-tarjeta-acciones">
              <button type="button" className="btn-cta btn-peq" onClick={confirmar} disabled={enviando}>
                {t('mira.confirmar.si')}
              </button>
              <button type="button" className="btn-secundario btn-peq" onClick={cancelarConfirmacion} disabled={enviando}>
                {t('mira.confirmar.no')}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mira-error" role="alert">
            <p>{error.mensaje}</p>
            {error.retryAfter && <p className="mira-pie">{t('mira.error.reintentarEn', { n: error.retryAfter })}</p>}
            <div className="mira-error-acciones">
              {error.loginRequerido ? (
                <a className="btn-cta btn-peq" href="#/login">
                  {t('mira.error.iniciarSesion')}
                </a>
              ) : null}
              {error.reintentable && ultimoFallido && (
                <button type="button" className="btn-secundario btn-peq" onClick={reintentar} disabled={enviando}>
                  {t('mira.error.reintentar')}
                </button>
              )}
            </div>
          </div>
        )}

        <MiraComposer
          alEnviar={enviar}
          alParar={parar}
          enviando={enviando}
          esAdmin={esAdmin}
          esEmpresa={esEmpresa}
          haySesion={haySesion}
        />
      </div>
    </div>
  );
}