/** Mapa de assets — rutas del `public/` web → requires de Metro.
 * Los componentes usan IMG.xxx en vez de `<img src="/...">`.
 */
/** Los SVG (svgr) compilan a `exports.default`: require() devuelve { default }. */
const svg = (mod) => (mod && mod.__esModule && mod.default ? mod.default : mod);

export const IMG = {
  logo: require('../../assets/images/logo.png'),
  logotipo: require('../../assets/images/logotipo.png'),
  heroDining: require('../../assets/images/hero-dining.jpg'),
  heroGastrobar: require('../../assets/images/hero-gastrobar.jpg'),
  moneda: require('../../assets/images/moneda-mira.png'),
  rachaFuego: require('../../assets/images/racha-fuego.png'),
  mascotaRacha: require('../../assets/images/mascota-racha.png'),
  logoWordmark: svg(require('../../assets/images/mira_logo_2_wordmark_pupila.svg')),
  logoCircular: svg(require('../../assets/images/mira_logo_3_circular_lente.svg')),
  emblemaFoodie: require('../../assets/images/emblemas/foodie.png'),
  emblemaGourmet: require('../../assets/images/emblemas/gourmet.png'),
  emblemaMichelin: require('../../assets/images/emblemas/michelin.png'),
};

/** Resuelve rutas tipo '/emblemas/foodie.png' (usadas en datos) a assets RN. */
const POR_RUTA = {
  '/logo.png': IMG.logo,
  '/logotipo.png': IMG.logotipo,
  '/moneda-mira.png': IMG.moneda,
  '/racha-fuego.png': IMG.rachaFuego,
  '/mascota-racha.png': IMG.mascotaRacha,
  '/hero-dining.jpg': IMG.heroDining,
  '/hero-gastrobar.jpg': IMG.heroGastrobar,
  '/emblemas/foodie.png': IMG.emblemaFoodie,
  '/emblemas/gourmet.png': IMG.emblemaGourmet,
  '/emblemas/michelin.png': IMG.emblemaMichelin,
  '/mira_logo_2_wordmark_pupila.svg': IMG.logoWordmark,
  '/mira_logo_3_circular_lente.svg': IMG.logoCircular,
};

export function asset(ruta) {
  return POR_RUTA[ruta] || null;
}
