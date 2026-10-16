/** ¿El gesto táctil del libro de la carta es un pase de página? Horizontal y dominante sobre el vertical (BUG-135). */
export function esPaseDePagina(dx, dy) {
  return Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5;
}
