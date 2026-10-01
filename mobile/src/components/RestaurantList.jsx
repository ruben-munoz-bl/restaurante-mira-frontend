/**
 * Rejilla de resultados — espejo de .grid (1/2/3 columnas) + estado vacío.
 * El scroll infinito lo dispara AppShell (onCercaFinal ≈ rootMargin 600px).
 */
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import RestaurantCard from './RestaurantCard.jsx';
import RestaurantSkeleton, { altoMedia } from './RestaurantSkeleton.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';
import { btnCta } from '../theme/ui';

const TRADS = { es, ca, en };
const GAP = 20; // 1.25rem
const SKELETONS_CARGANDO_MAS = 3;

export function columnasDe(width) {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

/** Renderiza cualquier lista de items como filas de `cols` columnas. */
export function Rejilla({ cols, items, renderItem }) {
  const filas = [];
  for (let i = 0; i < items.length; i += cols) filas.push(items.slice(i, i + cols));
  return (
    <View style={styles.grid}>
      {filas.map((fila, fi) => (
        <View key={`fila-${fi}`} style={styles.fila}>
          {fila.map((item, ci) => (
            <View key={item.key} style={[styles.celda, { marginRight: ci === fila.length - 1 ? 0 : GAP }]}>
              {renderItem(item)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function RestaurantList({
  restaurants,
  filtros,
  onClear,
  onSelect,
  hayMas,
  cargandoMas,
  esFavorito,
  onToggleFavorito,
  onVerCarta,
  cargandoInicial,
}) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { width } = useWindowDimensions();
  const cols = columnasDe(width);

  if (restaurants.length === 0 && !hayMas && !cargandoInicial) {
    const hayBusqueda = filtros?.q?.trim();
    return (
      <View
        style={[styles.vacio, { backgroundColor: colores.fondoSuave, borderColor: colores.borde }]}
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.vacioTitulo, { color: colores.tinta }]}>{t('lista.noResultados')}</Text>
        <Text style={[styles.vacioTexto, { color: colores.gris }]}>
          {hayBusqueda ? t('lista.sinResultados', { q: filtros.q }) : t('lista.pruebaOtra')}
        </Text>
        <Pressable onPress={onClear} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8 }]}>
          <Text style={btnCta(colores)}>{t('lista.limpiarFiltros')}</Text>
        </Pressable>
      </View>
    );
  }

  const items = [
    ...restaurants.map((r) => ({ key: `r-${r.id}`, tipo: 'card', r })),
    ...(cargandoMas
      ? Array.from({ length: SKELETONS_CARGANDO_MAS }, (_, i) => ({ key: `sk-${i}`, tipo: 'sk' }))
      : []),
  ];

  return (
    <Rejilla
      cols={cols}
      items={items}
      renderItem={(item) =>
        item.tipo === 'sk' ? (
          <RestaurantSkeleton />
        ) : (
          <RestaurantCard
            restaurant={item.r}
            filtros={filtros}
            onSelect={onSelect}
            esFavorito={esFavorito ? esFavorito(item.r.id) : false}
            onToggleFavorito={onToggleFavorito}
            onVerCarta={onVerCarta}
            altoMedia={altoMedia(width)}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: GAP,
    width: '100%',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
  },
  celda: {
    flex: 1,
    minWidth: 0,
  },
  vacio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADIO.xl,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  vacioTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 22.4,
    marginBottom: 6.4,
    textAlign: 'center',
  },
  vacioTexto: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
  },
});
