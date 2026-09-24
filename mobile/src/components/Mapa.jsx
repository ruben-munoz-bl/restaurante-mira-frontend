/**
 * #/mapa — locales con coordenadas filtrables por zona — espejo de Mapa.jsx web.
 * Leaflet → react-native-maps con tiles OpenStreetMap (gratis, sin claves).
 * Círculos verdes, callout "Ver más información" → detalle.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import MapView, { UrlTile, Marker, Callout } from 'react-native-maps';
import { fetchRestaurants } from '../services/restaurantApi.js';
import { ZONAS_CATALUNA } from '../models/restaurantModel.js';
import { centroDeZona, CENTRO_CATALUNA } from '../services/cityCenters.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';
import { btnCta, btnSecundario, TITULO_DISPLAY } from '../theme/ui';

const TRADS = { es, ca, en };

function nombreZona(z, t) {
  return String(z || '').replace(', Spain', '') || (t ? t('otros.sinZona') : 'Sin zona');
}

function deltaDeZoom(zoom) {
  return 360 / Math.pow(2, zoom || 13);
}

function coordsValidas(r) {
  return (
    r.coords &&
    Number.isFinite(Number(r.coords.lat)) &&
    Number.isFinite(Number(r.coords.lng))
  );
}

export default function Mapa({ todos, total, onVerDetalle }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { height } = useWindowDimensions();
  const mapRef = useRef(null);

  const [fuente, setFuente] = useState(() => (Array.isArray(todos) && todos.length ? [...todos] : []));
  const [cargando, setCargando] = useState(() => !(Array.isArray(todos) && todos.length));
  const [error, setError] = useState('');
  const [zona, setZona] = useState('');
  const [reintento, setReintento] = useState(0);

  // Datos: usa lo ya cargado y mejora a colección completa en fondo.
  useEffect(() => {
    let vivo = true;
    if (Array.isArray(todos) && todos.length > 0) {
      setFuente((prev) => (prev.length ? prev : [...todos]));
      setCargando(false);
    }
    fetchRestaurants()
      .then((l) => {
        if (!vivo) return;
        if (Array.isArray(l) && l.length) {
          setFuente(l);
          setError('');
        }
        setCargando(false);
      })
      .catch((e) => {
        if (!vivo) return;
        if (fuente.length > 0 || (Array.isArray(todos) && todos.length > 0)) {
          setCargando(false);
          return;
        }
        setError(e.message || t('otros.noMapa'));
        setCargando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reintento, todos]);

  const porZona = useMemo(() => {
    const m = {};
    fuente.forEach((r) => {
      const z = r.zona || t('otros.sinZona');
      m[z] = (m[z] || 0) + 1;
    });
    return m;
  }, [fuente, t]);

  const visibles = useMemo(
    () =>
      fuente.filter(
        (r) =>
          coordsValidas(r) &&
          (!zona || (r.zona || t('otros.sinZona')) === zona),
      ),
    [fuente, zona, t],
  );

  const zonas = useMemo(
    () => [...new Set([...ZONAS_CATALUNA, ...Object.keys(porZona)])],
    [porZona],
  );

  // Repintar cámara al cambiar zona/datos (fitBounds padding 30 / maxZoom 13).
  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa) return undefined;
    const timer = setTimeout(() => {
      try {
        const pts = visibles.map((r) => ({
          latitude: Number(r.coords.lat),
          longitude: Number(r.coords.lng),
        }));
        if (pts.length > 1) {
          mapa.fitToSuppliedCoordinates(pts, {
            edgePadding: { top: 30, right: 30, bottom: 30, left: 30 },
            animated: true,
          });
        } else if (pts.length === 1) {
          mapa.animateToRegion({ ...pts[0], latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
        } else if (zona) {
          const centro = centroDeZona(zona);
          mapa.animateToRegion(
            {
              latitude: Number(centro.lat),
              longitude: Number(centro.lng),
              latitudeDelta: deltaDeZoom(centro.zoom),
              longitudeDelta: deltaDeZoom(centro.zoom),
            },
            400,
          );
        } else if (fuente.length === 0) {
          mapa.animateToRegion(regionInicial(), 400);
        }
      } catch {
        /* contenedor aún no listo */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [visibles, zona, fuente.length]);

  const mapaVacio = !cargando && fuente.length === 0 && !error;
  const mapH = Math.max(380, Math.round(height * 0.65));

  function regionInicial() {
    const c = CENTRO_CATALUNA;
    const d = deltaDeZoom(c.zoom);
    return { latitude: Number(c.lat), longitude: Number(c.lng), latitudeDelta: d, longitudeDelta: d };
  }

  function tabBtn(valor, etiqueta) {
    const activo = zona === valor;
    return (
      <Pressable
        key={etiqueta}
        onPress={() => setZona(valor)}
        accessibilityRole="button"
        accessibilityState={{ selected: activo }}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <Text
          style={
            activo
              ? btnCta(colores, { peq: true })
              : [{ ...btnSecundario(colores, { peq: true }), marginTop: 0 }]
          }
        >
          {etiqueta}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.pagina, { paddingHorizontal: 24 }]}>
      <View
        style={[
          styles.tarjeta,
          { backgroundColor: colores.papel, borderColor: colores.glassBorder },
        ]}
      >
        <Text style={[TITULO_DISPLAY, styles.titulo, { color: colores.tinta }]}>
          {t('otros.mapaPorZonas')}
        </Text>

        <View style={styles.tabs} accessibilityLabel="Filtrar por zona">
          {tabBtn('', `${t('otros.todas')} (${fuente.length || total || 0})`)}
          {zonas.map((z) => tabBtn(z, `${nombreZona(z, t)} (${porZona[z] ?? 0})`))}
        </View>

        <Text style={[styles.status, { color: colores.gris }]} accessibilityLiveRegion="polite">
          {cargando
            ? t('otros.cargandoLocales')
            : `${t('otros.localesEnMapa', { count: visibles.length })}${
                zona ? ` · ${nombreZona(zona, t)} (centrado en su centro)` : ''
              }.`}
        </Text>

        {error && fuente.length === 0 && (
          <View style={[styles.errorPanel, { backgroundColor: colores.fondoSuave, borderColor: colores.rojo }]}>
            <Text style={[styles.errorTitulo, { color: colores.tinta }]}>{t('otros.noMapa')}</Text>
            <Text style={[styles.errorTxt, { color: colores.gris }]}>{error}</Text>
            <Pressable onPress={() => setReintento((i) => i + 1)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Text style={btnCta(colores)}>{t('otros.reintentar')}</Text>
            </Pressable>
          </View>
        )}

        {mapaVacio && <Text style={[styles.status, { color: colores.gris }]}>{t('otros.noCoordenadas')}</Text>}

        <View
          style={[
            styles.mapaGrande,
            { height: mapH, borderColor: colores.glassBorder, backgroundColor: colores.fondoSuave },
          ]}
          accessibilityLabel={t('otros.mapaPorZonas')}
        >
          <MapView ref={mapRef} style={styles.mapa} initialRegion={regionInicial()}>
            <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
            {zona && (
              <Marker
                coordinate={{
                  latitude: Number(centroDeZona(zona).lat),
                  longitude: Number(centroDeZona(zona).lng),
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={2}
              >
                <View style={styles.pinCentro}>
                  <Text style={styles.pinCentroTxt}>★</Text>
                </View>
              </Marker>
            )}
            {visibles.map((r) => (
              <Marker
                key={r.id}
                coordinate={{ latitude: Number(r.coords.lat), longitude: Number(r.coords.lng) }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={styles.circulo} />
                <Callout
                  tooltip
                  onPress={() => {
                    const hallado = visibles.find((x) => String(x.id) === String(r.id));
                    if (hallado) onVerDetalle?.(hallado);
                  }}
                >
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitulo}>{r.nombre}</Text>
                    <Text style={styles.calloutTexto}>
                      ★ {r.valoracion ?? '—'} · {r.precio} · {nombreZona(r.zona, t)}
                    </Text>
                    <View style={styles.calloutBtn}>
                      <Text style={styles.calloutBtnTxt}>{t('card.verMas')}</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
          <Text style={styles.atribucion} pointerEvents="none">
            © OpenStreetMap
          </Text>
        </View>

        {cargando && fuente.length === 0 && (
          <Text style={[styles.status, { color: colores.gris }]}>{t('otros.cargandoMapa')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 48,
    paddingBottom: 64,
    alignItems: 'center',
  },
  tarjeta: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 28.8,
    gap: 14.4,
  },
  titulo: {
    fontSize: 28.8,
    marginTop: 0,
    marginBottom: 0,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  status: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
  },
  errorPanel: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12.8,
  },
  errorTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 22.4,
  },
  errorTxt: {
    marginTop: 6.4,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: FUENTES.texto,
    fontSize: 15,
  },
  mapaGrande: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  circulo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2fa37c',
    borderWidth: 2,
    borderColor: '#00664f',
  },
  pinCentro: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#16382C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  pinCentroTxt: {
    color: '#16382C',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    maxWidth: 240,
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
  calloutBtn: {
    marginTop: 6.4,
    alignSelf: 'flex-start',
    backgroundColor: '#16382C',
    borderRadius: 999,
    paddingVertical: 6.4,
    paddingHorizontal: 12.8,
  },
  calloutBtnTxt: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
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
