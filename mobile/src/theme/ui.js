/**
 * Estilos de botones compartidos — espejo de .btn-cta / .btn-secundario /
 * .btn-texto / .btn-peq / .btn-grande de App.css (los colores vienen del tema).
 */
import { FUENTES, RADIO } from './tokens';

export function btnCta(colores, { peq = false, grande = false, disabled = false } = {}) {
  return {
    backgroundColor: disabled ? colores.primaryContainer + '80' : colores.primaryContainer,
    color: '#fff',
    fontFamily: FUENTES.textoBold,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 999,
    paddingVertical: peq ? 8 : grande ? 13.6 : 10.4,
    paddingHorizontal: peq ? 17.6 : grande ? 32 : 24,
    fontSize: grande ? 16.8 : peq ? 14.08 : 15,
    opacity: disabled ? 0.45 : 1,
    textAlign: 'center',
  };
}

export function btnSecundario(colores, { peq = false, disabled = false } = {}) {
  return {
    marginTop: 8,
    backgroundColor: colores.papel,
    color: colores.tinta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 999,
    paddingVertical: peq ? 8 : 9.6,
    paddingHorizontal: peq ? 17.6 : 17.6,
    fontFamily: FUENTES.textoSemi,
    fontWeight: '600',
    fontSize: peq ? 14.08 : 15,
    opacity: disabled ? 0.45 : 1,
    textAlign: 'center',
  };
}

export function btnTexto(colores, { size = 14.72 } = {}) {
  return {
    fontFamily: FUENTES.textoSemi,
    fontWeight: '600',
    fontSize: size,
    color: colores.tinta,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  };
}

export const TEXTO_BASE = {
  fontFamily: FUENTES.texto,
  color: '#181c1a',
};

export const TITULO_DISPLAY = {
  fontFamily: FUENTES.display,
  fontWeight: '700',
  letterSpacing: -0.2,
};

export { RADIO };
