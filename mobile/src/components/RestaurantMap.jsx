/**
 * Mapa del restaurante + parkings — espejo de .restaurant-map (react-leaflet):
 * marcador rojo local, azules parkings, seleccionado con borde dorado,
 * fitBounds con padding 40 y tiles OpenStreetMap.
 */
import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { UrlTile, Marker, Callout } from 'react-native-maps';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';

const TRADS = { es, ca, en };

function coordsValidas(coords) {
  return (
    Boolean(coords) && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng))
  );
}

function Circulo({ color, tam = 28, seleccionado = false }) {
  return (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: tam / 2,
        backgroundColor: color,
        borderWidth: seleccionado ? 3 : 2,
        borderColor: seleccionado ? '#f59e0b' : '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: seleccionado ? 12 : 10,
          height: seleccionado ? 12 : 10,
          borderRadius: 6,
          backgroundColor: '#fff',
        }}
      />
    </View>
  );
}

export default function RestaurantMap({ restaurant, parkings = [], selectedIndex, alto = 380 }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const mapRef = useRef(null);
  const coords = restaurant?.coords;

  const centroValido = coordsValidas(coords);
  const parkingsValidos = useMemo(
    () => parkings.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lon))),
    [parkings],
  );

  const puntos = useMemo(() => {
    if (!centroValido) return [];
    const lista = [
      { latitude: Number(coords.lat), longitude: Number(coords.lng) },
      ...parkingsValidos.map((p) => ({ latitude: Number(p.lat), longitude: Number(p.lon) })),
    ];
    return lista;
  }, [centroValido, coords, parkingsValidos]);

  const regionCentro = centroValido
    ? {
        latitude: Number(coords.lat),
        longitude: Number(coords.lng),
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : null;

  // fitBounds (padding 40, maxZoom ~16) al cargar parkings o cambiar datos.
  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa || !puntos.length) return;
    const timer = setTimeout(() => {
      try {
        if (puntos.length > 1) {
          mapa.fitToSuppliedCoordinates(puntos, {
            edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
            animated: true,
          });
        } else {
          mapa.animateToRegion(
            { ...puntos[0], latitudeDelta: 0.03, longitudeDelta: 0.03 },
            400,
          );
        }
      } catch {
        /* mapa aún no listo */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [puntos]);

  // flyTo del parking seleccionado (zoom 16).
  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa || selectedIndex == null) return;
    const p = parkingsValidos[selectedIndex];
    if (!p) return;
    const timer = setTimeout(() => {
      try {
        mapa.animateToRegion(
          { latitude: Number(p.lat), longitude: Number(p.lon), latitudeDelta: 0.015, longitudeDelta: 0.015 },
          800,
        );
      } catch {
        /* noop */
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedIndex, parkingsValidos]);

  if (!centroValido) return null;

  return (
    <View
      style={[styles.wrap, { height: alto, borderColor: colores.glassBorder, backgroundColor: colores.fondoSuave, borderRadius: RADIO.peq }]}
      accessibilityLabel={`${t('otros.mapaPorZonas')} — ${restaurant.nombre}`}
    >
      <MapView
        ref={mapRef}
        style={styles.mapa}
        initialRegion={regionCentro}
        showsUserLocation={false}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        <Marker
          coordinate={{ latitude: Number(coords.lat), longitude: Number(coords.lng) }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <Circulo color="#d92d20" />
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.calloutTitulo}>{restaurant.nombre}</Text>
              <Text style={styles.calloutTexto}>{restaurant.direccion || restaurant.ciudad || ''}</Text>
            </View>
          </Callout>
        </Marker>
        {parkingsValidos.map((p, i) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: Number(p.lat), longitude: Number(p.lon) }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <Circulo color="#2563eb" tam={i === selectedIndex ? 34 : 28} seleccionado={i === selectedIndex} />
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitulo}>{p.nombre}</Text>
                <Text style={styles.calloutTexto}>{p.direccion}</Text>
                <Text style={styles.calloutTexto}>
                  {p.gratuito === 'yes' ? t('otros.gratis') : t('otros.pago')}
                  {p.tipo !== '—' ? ` · ${p.tipo}` : ''}
                  {p.distanciaMetros != null ? ` · ${p.distanciaMetros} m` : ''}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <Text style={styles.atribucion} pointerEvents="none">
        © OpenStreetMap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitulo: {
    fontWeight: '700',
    fontSize: 13.5,
    fontFamily: FUENTES.textoBold,
    color: '#181c1a',
  },
  calloutTexto: {
    fontSize: 12.5,
    fontFamily: FUENTES.texto,
    color: '#414844',
    marginTop: 2,
  },
  atribucion: {
    position: 'absolute',
    right: 6,
    bottom: 4,
    fontSize: 10,
    color: '#414844',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    fontFamily: FUENTES.texto,
  },
});
