/**
 * Ruta /detalle — espejo de '#/detalle' del web (presentación modal, sin AppShell):
 * carga el restaurante por id (memoria/API) y monta RestaurantDetail.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthContext } from '../context/AuthContext';
import { fetchRestaurantePorId } from '../services/restaurantApi.js';
import { completarRestaurante } from '../models/restaurantModel.js';
import { centroDeZona } from '../services/cityCenters.js';
import RestaurantDetail from '../components/RestaurantDetail.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES } from '../theme/tokens';
import { btnCta } from '../theme/ui';

const TRADS = { es, ca, en };

export default function Detalle() {
  const t = useT(TRADS);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { usuario } = useAuthContext();
  const { colores } = useTheme();

  const [restaurante, setRestaurante] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setEstado('cargando');
    setError('');
    try {
      const crudo = await fetchRestaurantePorId(id);
      if (!crudo) {
        setEstado('error');
        setError(t('otros.error'));
        return;
      }
      setRestaurante(completarRestaurante(crudo, centroDeZona(crudo.zona)));
      setEstado('listo');
    } catch (err) {
      setEstado('error');
      setError(err.message || t('otros.error'));
    }
  }, [id, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cerrar() {
    router.back();
  }

  function abrirCarta(r) {
    router.push({ pathname: '/carta', params: { id: String(r.id) } });
  }

  if (estado === 'cargando') {
    return (
      <View style={[styles.centro, { backgroundColor: colores.papel }]}>
        <ActivityIndicator size="large" color={colores.primaryContainer} />
        <Text style={[styles.cargandoTxt, { color: colores.gris }]} accessibilityLiveRegion="polite">
          {t('otros.cargando')}
        </Text>
        <Pressable onPress={cerrar} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
          <Text style={[styles.cerrarTxt, { color: colores.primaryContainer }]}>{t('otros.cerrar')}</Text>
        </Pressable>
      </View>
    );
  }

  if (estado === 'error') {
    return (
      <View style={[styles.centro, { backgroundColor: colores.papel }]}>
        <Text style={[styles.errorTitulo, { color: colores.tinta }]}>{t('otros.error')}</Text>
        <Text style={[styles.errorTxt, { color: colores.gris }]}>{error}</Text>
        <Pressable onPress={cargar} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <Text style={btnCta(colores)}>{t('otros.reintentar')}</Text>
        </Pressable>
        <Pressable onPress={cerrar} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, marginTop: 12 }]}>
          <Text style={[styles.cerrarTxt, { color: colores.primaryContainer }]}>{t('otros.cerrar')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <RestaurantDetail
      restaurant={restaurante}
      usuario={usuario}
      onClose={cerrar}
      onVerCarta={abrirCarta}
    />
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  cargandoTxt: {
    fontSize: 15,
    fontFamily: FUENTES.texto,
  },
  errorTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 22.4,
  },
  errorTxt: {
    fontSize: 15,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginBottom: 12,
  },
  cerrarTxt: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: FUENTES.textoSemi,
  },
});
