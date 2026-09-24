/**
 * Avatar de cuenta (círculo con inicial) + marco opcional del emblema PNG.
 * Clases independientes por PNG: .emblema-foodie | .emblema-gourmet | .emblema-michelin
 * Engorda el anillo 1px por feMorphology (borde duro) y pinta el PNG original encima.
 */
export default function EmblemaAvatar({ inicial, emblema, size = 'md' }) {
  const clase = size === 'lg' ? 'avatar-wrapper avatar-wrapper--lg' : 'avatar-wrapper';
  return (
    <div className={clase}>
      <svg className="emblema-svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id="emblema-engordar"
            x="-6%"
            y="-6%"
            width="112%"
            height="112%"
            colorInterpolationFilters="sRGB"
          >
            <feMorphology in="SourceGraphic" operator="dilate" radius="1" result="dilated" />
            <feComposite in="SourceGraphic" in2="dilated" operator="over" />
          </filter>
        </defs>
      </svg>
      <p className="cuenta-avatar" aria-hidden="true">{inicial}</p>
      {emblema && (
        <img
          className={`emblema-marco emblema-${emblema.id}`}
          src={emblema.img}
          alt=""
          aria-hidden="true"
        />
      )}
    </div>
  );
}
