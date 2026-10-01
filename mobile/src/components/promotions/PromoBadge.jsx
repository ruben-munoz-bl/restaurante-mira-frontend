/**
 * Badge "Promocionado" — espejo de .promo-badge (degradado naranja, pill).
 * En RN se posiciona absolutamente en la esquina inferior izquierda de la foto.
 */
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FUENTES } from '../../theme/tokens';

export default function PromoBadge({ promoActiva, style }) {
  if (!promoActiva) return null;

  return (
    <LinearGradient
      colors={['#f9a825', '#f57f17']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, style]}
    >
      <Text style={styles.icono}>⭐</Text>
      <Text style={styles.texto}>Promocionado</Text>
      {promoActiva.puntosExtraPorReserva > 0 && (
        <Text style={styles.pts}>+{promoActiva.puntosExtraPorReserva} pts</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.8,
    borderRadius: 999,
    paddingVertical: 4.8,
    paddingHorizontal: 11.2,
  },
  icono: {
    fontSize: 14.4,
  },
  texto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  pts: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4.8,
    opacity: 0.9,
    fontFamily: FUENTES.textoSemi,
  },
});
