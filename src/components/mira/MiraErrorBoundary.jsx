/**
 * Error boundary del chat.
 *
 * El repo no tiene ninguno y React no lo trae por defecto: si un
 * componente lanza al renderizar, se desmonta TODO el árbol y la web
 * queda en blanco. Con el agente esto era peligroso porque el launcher
 * se oculta al abrir el panel: un fallo dentro del panel dejaba la web
 * sin chat y sin forma de recuperarlo.
 *
 * Como clase porque React no admite error boundaries en hooks.
 */
import { Component } from 'react';

export default class MiraErrorBoundary extends Component {
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
    return (
      <div className="mira-error" role="alert" style={{ margin: '1rem' }}>
        <p>
          <strong>MIRA no se pudo mostrar.</strong> El resto de la web sigue funcionando.
        </p>
        <p className="vacio-texto">{String(this.state.error?.message || this.state.error)}</p>
        <div className="mira-error-acciones">
          <button type="button" className="btn-secundario btn-peq" onClick={this.recargar}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}