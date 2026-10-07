/**
 * Error boundary del chat.
 *
 * El repo no tiene ninguno y React no lo trae por defecto: si un
 * componente lanza al renderizar, se desmonta TODO el árbol y la web
 * queda en blanco. Con el agente esto era peligroso porque el launcher
 * se oculta al abrir el panel: un fallo dentro del panel dejaba la web
 * sin chat y sin forma de recuperarlo.
 *
 * Como clase porque React no admite error boundaries en hooks: la
 * envuelve una función que sí puede usar useT para el texto del aviso.
 */
import { Component } from 'react';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

class MiraErrorBoundaryInterno extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('MIRA: el panel ha fallado al renderizar:', error, info?.componentStack);
  }

  /** Al reintentar se desmonta el panel y se vuelve a montar desde cero. */
  recargar = () => {
    this.setState({ error: null });
    this.props.onReiniciar?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { t } = this.props;
    return (
      <div className="mira-error" role="alert" style={{ margin: '1rem' }}>
        <p>
          <strong>{t('mira.errorTitulo')}</strong> {t('mira.errorSub')}
        </p>
        <p className="vacio-texto">{String(this.state.error?.message || this.state.error)}</p>
        <div className="mira-error-acciones">
          <button type="button" className="btn-secundario btn-peq" onClick={this.recargar}>
            {t('mira.error.reintentar')}
          </button>
        </div>
      </div>
    );
  }
}

export default function MiraErrorBoundary(props) {
  const t = useT(TRADS);
  return <MiraErrorBoundaryInterno {...props} t={t} />;
}
