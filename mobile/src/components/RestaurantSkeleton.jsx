/**
 * Skeleton de carga para RestaurantCard.
 * Estructura visualmente idéntica a una card real pero con barras brillantes.
 */
export default function RestaurantSkeleton() {
  return (
    <article className="card skeleton-card" aria-hidden="true">
      <div className="skeleton-media" />
      <div className="card-cuerpo">
        <div className="skeleton-bar skeleton-titulo" />
        <div className="skeleton-bar skeleton-nota" />
        <div className="skeleton-bar skeleton-gris" />
        <div className="skeleton-bar skeleton-gris-short" />
        <div className="skeleton-bar skeleton-desc" />
        <div className="skeleton-bar skeleton-desc-short" />
        <div className="skeleton-actions">
          <div className="skeleton-bar skeleton-btn" />
          <div className="skeleton-bar skeleton-btn-secondary" />
        </div>
      </div>
    </article>
  );
}
