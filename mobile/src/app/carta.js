/**
 * Ruta /carta — espejo de '#/carta' del web (modal transparente sobre el
 * detalle): carga el restaurante por id y monta el LibroCarta 3D.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, BlurView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthContext } from '../context/AuthContext';
import { fetchRestaurantePorId } from '../services/restaurantApi.js';
import { completarRestaurante } from '../models/restaurantModel.js';
import { centroDeZona } from '../services/cityCenters.js';
import LibroCarta from '../components/LibroCarta.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES } from '../theme/tokens';
import { btnCta } from '../theme/ui';

const TRADS = { es, ca, en };

export default function Carta() {
  const t = useT(TRADS);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { dieta } = useAuthContext();
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

  if (estado !== 'listo' || !restaurante) {
    return (
      <View style={estilos.fondo}>
        <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={estilos.overlay} />
        <View style={[estilos.centro, { backgroundColor: colores.papel, borderRadius: 14 }]}>
          {estado === 'cargando' ? (
            <>
              <ActivityIndicator size="large" color={colores.primaryContainer} />
              <Text style={[estilos.cargandoTxt, { color: colores.gris }]} accessibilityLiveRegion="polite">
                {t('otros.cargando')}
              </Text>
              <Pressable onPress={cerrar} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[estilos.cerrarTxt, { color: colores.primaryContainer }]}>{t('otros.cerrar')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[estilos.errorTitulo, { color: colores.tinta }]}>{t('otros.error')}</Text>
              <Text style={[estilos.errorTxt, { color: colores.gris }]}>{error}</Text>
              <Pressable onPress={cargar} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Text style={btnCta(colores)}>{t('otros.reintentar')}</Text>
              </Pressable>
              <Pressable onPress={cerrar} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, marginTop: 12 }]}>
                <Text style={[estilos.cerrarTxt, { color: colores.primaryContainer }]}>{t('otros.cerrar')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  return <LibroCarta restaurant={restaurante} dieta={dieta} onClose={cerrar} />;
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 34, 24, 0.5)',
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    maxWidth: 430,
    width: '100%',
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
