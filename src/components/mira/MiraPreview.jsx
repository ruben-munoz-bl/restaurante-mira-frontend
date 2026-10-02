/**
 * Previsualización de un restaurante dentro del chat.
 *
 * La ficha a pantalla completa (RestaurantDetail) ya trae la carta, así
 * que aquí solo se muestra una miniatura con foto, nombre y datos, y dos
 * acciones: abrir la ficha completa (donde está la carta) o seguir
 * preguntando al agente.
 */
export default function MiraPreview({ item, onAbrirFicha, alPreguntar, pregunta, t }) {
  if (!item || !item.nombre) return null;

  const cocina = item.cocina || (Array.isArray(item.categorias) ? item.categorias[0] : item.categorias) || '';
  const donde = item.zona || item.ciudad || '';
  const direccion = item.direccion || '';

  return (
    <article className="mira-preview">
      {item.imagen && (
        <img className="mira-preview-img" src={item.imagen} alt="" loading="lazy" />
      )}

      <div className="mira-preview-cuerpo">
        <p className="mira-preview-nombre">{item.nombre}</p>
        <p className="mira-preview-meta">
          {[
            item.valoracion ? `${item.valoracion}★` : null,
            cocina,
            donde,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {direccion && <p className="mira-preview-dir">{direccion}</p>}

        <div className="mira-preview-acciones">
          <button
            type="button"
            className="btn-cta btn-peq"
            onClick={() => onAbrirFicha?.(item.id, item.nombre)}
            disabled={!onAbrirFicha || !item.id}
          >
            {t('mira.card.verFichaYCarta')}
          </button>
          <button
            type="button"
            className="btn-secundario btn-peq"
            onClick={() => alPreguntar(pregunta(item.nombre))}
          >
            {t('mira.card.preguntarMas')}
          </button>
        </div>
      </div>
    </article>
  );
}