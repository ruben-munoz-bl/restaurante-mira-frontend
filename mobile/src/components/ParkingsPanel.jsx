/**
 * Panel de parkings cercanos — espejo de .parkings-panel (título con contador,
 * skeletons, vacío y tarjetas seleccionables).
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { formatoDistancia } from '../services/parkingApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';

const TRADS = { es, ca, en };

function SkeletonCard({ colores }) {
  return (
    <View style={[styles.sk, { borderColor: colores.glassBorder }]} accessibilityElementsHidden>
      <View style={[styles.skBar, { width: '60%', height: 14.4, backgroundColor: colores.fondoSuave }]} />
      <View style={[styles.skBar, { width: '80%', height: 11.2, backgroundColor: colores.fondoSuave }]} />
      <View style={[styles.skBar, { width: '45%', height: 11.2, backgroundColor: colores.fondoSuave }]} />
    </View>
  );
}

export default function ParkingsPanel({ parkings, cargando, onSeleccionarParking }) {
  const t = useT(TRADS);
  const { colores } = useTheme();

  return (
    <View
      style={[styles.panel, { backgroundColor: colores.papel, borderColor: colores.glassBorder }]}
      accessibilityLabel={t('parkings.titulo')}
    >
      <View style={styles.tituloFila}>
        <Text style={[styles.titulo, { color: colores.tinta }]}>{t('parkings.titulo')}</Text>
        {!cargando && (
          <View style={[styles.cuenta, { backgroundColor: colores.primaryContainer }]}>
            <Text style={styles.cuentaTxt}>{parkings.length}</Text>
          </View>
        )}
      </View>

      {cargando && (
        <View style={styles.lista}>
          <SkeletonCard colores={colores} />
          <SkeletonCard colores={colores} />
          <SkeletonCard colores={colores} />
        </View>
      )}

      {!cargando && parkings.length === 0 && (
        <Text style={[styles.vacio, { color: colores.gris }]}>{t('parkings.sinParkings')}</Text>
      )}

      {!cargando && parkings.length > 0 && (
        <View style={styles.lista}>
          {parkings.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => onSeleccionarParking?.(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir a ${p.nombre}, ${formatoDistancia(p.distanciaMetros)}`}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colores.fondoSuave,
                  borderColor: pressed ? colores.primaryContainer : colores.glassBorder,
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.cardNombre, { color: colores.tinta }]}>
                {p.nombre}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardDistancia, { color: colores.tinta }]}>
                  {formatoDistancia(p.distanciaMetros)}
                </Text>
                <Text style={[styles.sep, { color: colores.borde }]}>·</Text>
                <Text style={[styles.metaTxt, { color: colores.gris }]}>
                  {p.gratuito === 'yes' ? `💰 ${t('parkings.gratis')}` : `💰 ${t('parkings.pago')}`}
                </Text>
                <Text style={[styles.sep, { color: colores.borde }]}>·</Text>
                <Text style={[styles.metaTxt, { color: colores.gris }]}>
                  {p.accesible === 'Sí' ? `♿ ${t('otros.si')}` : '♿ —'}
                </Text>
                <Text style={[styles.sep, { color: colores.borde }]}>·</Text>
                <Text style={[styles.metaTxt, { color: colores.gris }]}>
                  {p.tipo !== '—' ? `🏢 ${p.tipo}` : '🏢 —'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 12.8,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.4,
    marginBottom: 9.6,
  },
  titulo: {
    fontSize: 15.2,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  cuenta: {
    minWidth: 22.4,
    height: 22.4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4.8,
  },
  cuentaTxt: {
    color: '#fff',
    fontSize: 11.52,
    fontWeight: '800',
    fontFamily: FUENTES.textoExtra,
  },
  vacio: {
    fontSize: 14.08,
    paddingVertical: 16,
    textAlign: 'center',
    fontFamily: FUENTES.texto,
  },
  lista: {
    gap: 6.4,
  },
  card: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 8.8,
    paddingHorizontal: 9.6,
    width: '100%',
  },
  cardNombre: {
    fontWeight: '700',
    fontSize: 14.08,
    marginBottom: 3.2,
    fontFamily: FUENTES.textoBold,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2.4,
  },
  cardDistancia: {
    fontWeight: '700',
    fontSize: 12.48,
    fontFamily: FUENTES.textoBold,
  },
  sep: {
    fontSize: 12.48,
  },
  metaTxt: {
    fontSize: 12.48,
    fontFamily: FUENTES.texto,
  },
  sk: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 9.6,
    gap: 5.6,
  },
  skBar: {
    borderRadius: 4,
  },
});
