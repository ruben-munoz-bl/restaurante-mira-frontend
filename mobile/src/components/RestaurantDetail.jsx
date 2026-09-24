/**
 * Detalle premium — espejo de RestaurantDetail.jsx web (modal):
 * info + acciones + carta + reserva + mapa/parkings + reseñas con likes.
 * En RN es una pantalla a pantalla completa (ruta /detalle, presentación modal).
 */
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  Linking,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { crearReserva, getDisponibilidad, SLOTS } from '../services/reservaApi.js';
import { crearResena, listarResenasDeRestaurante, darLikeResena, quitarLikeResena } from '../services/resenasApi.js';
import {
  semillaLikes,
  parseFechaLocal,
  hoyLocalISO,
  ordenarResenas,
  cartaDelLocal,
  flagsPlato,
  imagenParaRestaurante,
} from '../models/restaurantModel.js';
import { pronosticoDia, alertaTerraza } from '../services/meteoApi.js';
import { fetchNearbyParkings } from '../services/parkingApi.js';
import { interactionsApi } from '../services/api.js';
import RestaurantMap from './RestaurantMap.jsx';
import ParkingsPanel from './ParkingsPanel.jsx';
import { Sellos, MiniLeyenda } from './Sellos.jsx';
import usePointsStore from '../stores/usePointsStore.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO, GUTTER } from '../theme/tokens';
import { btnCta, btnSecundario, btnTexto, TITULO_DISPLAY } from '../theme/ui';
import { CampoEtiqueta } from './ui/SelectCampo';
import SelectCampo from './ui/SelectCampo';

const TRADS = { es, ca, en };
const MOSTRAR_INICIAL = 10;

function marcaInfo(valor, t) {
  if (valor === true) return t('detail.si');
  if (valor === false) return t('detail.no');
  return t('detail.sinInfo');
}

function googleLink(coords, direccion) {
  if (coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng))) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(coords.lat)},${Number(coords.lng)}`;
  }
  if (direccion) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  return null;
}

function coordsValidas(coords) {
  return Boolean(coords) && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng));
}

function StarPicker({ value, onChange, etiqueta }) {
  const { colores } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === n }}
          accessibilityLabel={`${n} ${etiqueta}`}
          hitSlop={4}
        >
          <Text
            style={{
              fontSize: 23.2,
              lineHeight: 26,
              color: n <= value ? colores.estrella : colores.borde,
            }}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function RestaurantDetail({ restaurant, usuario, onClose, onVerCarta }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { descuentoPendiente, fetchBalance } = usePointsStore();

  const apilado = width <= 560;
  const mapaEnFila = width >= 1024;

  const [verTodas, setVerTodas] = useState(false);
  const [verTodasYelp, setVerTodasYelp] = useState(false);
  const [ordenResenas, setOrdenResenas] = useState('populares');
  const [reserva, setReserva] = useState({ fecha: '', hora: '', comensales: '2', comentarios: '' });
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [meteoReserva, setMeteoReserva] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [errorReserva, setErrorReserva] = useState('');
  const [cargandoReserva, setCargandoReserva] = useState(false);

  const [resenasFs, setResenasFs] = useState([]);
  const [cargandoResenas, setCargandoResenas] = useState(true);
  const [nuevaResena, setNuevaResena] = useState({ puntuacion: 5, comentario: '' });
  const [errorResena, setErrorResena] = useState('');
  const [enviandoResena, setEnviandoResena] = useState(false);

  const [parkings, setParkings] = useState([]);
  const [cargandoParkings, setCargandoParkings] = useState(false);
  const [parkingSeleccionado, setParkingSeleccionado] = useState(null);

  const [uri, setUri] = useState(restaurant.imagen);
  const fallback = useMemo(
    () => imagenParaRestaurante(restaurant.cocina, restaurant.id),
    [restaurant.cocina, restaurant.id],
  );
  useEffect(() => setUri(restaurant.imagen || fallback), [restaurant.imagen, fallback]);

  const media = restaurant.media;
  const mockResenas = (restaurant.resenas ?? []).map((r, i) => ({
    ...r,
    id: `mock-${i}`,
    likes: r.likes ?? semillaLikes(restaurant.id, i),
    likedBy: [],
    esMock: true,
    puntuacion: r.puntuacion,
  }));
  const resenasMira = ordenarResenas(resenasFs, ordenResenas);
  const resenasYelp = ordenarResenas(mockResenas, ordenResenas);
  const visiblesMira = verTodas ? resenasMira : resenasMira.slice(0, MOSTRAR_INICIAL);
  const visiblesYelp = verTodasYelp ? resenasYelp : resenasYelp.slice(0, MOSTRAR_INICIAL);

  const externalMapUrl = googleLink(restaurant.coords, restaurant.direccion);

  useEffect(() => {
    let vivo = true;
    setDisponibilidad(null);
    if (!reserva.fecha || !reserva.hora) return undefined;
    getDisponibilidad(restaurant, reserva.fecha, reserva.hora)
      .then((d) => {
        if (vivo) setDisponibilidad(d);
      })
      .catch(() => {
        if (vivo) setDisponibilidad(null);
      });
    return () => {
      vivo = false;
    };
  }, [restaurant, reserva.fecha, reserva.hora]);

  useEffect(() => {
    let vivo = true;
    setMeteoReserva(null);
    if (restaurant.terraza !== true) return undefined;
    if (!reserva.fecha || !coordsValidas(restaurant.coords)) return undefined;
    pronosticoDia(Number(restaurant.coords.lat), Number(restaurant.coords.lng), reserva.fecha)
      .then((p) => {
        if (vivo) setMeteoReserva(p);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [restaurant, reserva.fecha]);

  const avisoTerraza = alertaTerraza(restaurant.terraza, meteoReserva);

  useEffect(() => {
    let vivo = true;
    setCargandoResenas(true);
    listarResenasDeRestaurante(restaurant.id)
      .then((list) => {
        if (vivo) {
          setResenasFs(list);
          setCargandoResenas(false);
        }
      })
      .catch(() => vivo && setCargandoResenas(false));
    return () => {
      vivo = false;
    };
  }, [restaurant.id]);

  useEffect(() => {
    if (!usuario?.uid) return;
    fetchBalance();
  }, [usuario?.uid]);

  useEffect(() => {
    if (!usuario?.uid) return;
    interactionsApi.track(restaurant.id, 'view').catch(() => {});
  }, [restaurant.id, usuario?.uid]);

  useEffect(() => {
    let vivo = true;
    const coords = restaurant.coords;
    if (!coordsValidas(coords)) {
      setParkings([]);
      setCargandoParkings(false);
      return undefined;
    }
    setCargandoParkings(true);
    fetchNearbyParkings(Number(coords.lat), Number(coords.lng))
      .then((list) => {
        if (vivo) setParkings(list);
      })
      .finally(() => {
        if (vivo) setCargandoParkings(false);
      });
    return () => {
      vivo = false;
    };
  }, [restaurant.coords]);

  async function handleReserva() {
    setErrorReserva('');
    setConfirmacion(null);
    if (!usuario?.uid) {
      router.push('/login');
      return;
    }
    const fechaOk = /^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha);
    if (!fechaOk || !reserva.hora || !reserva.comensales) {
      setErrorReserva(t('detail.eligeFechaHora'));
      return;
    }
    const hoy = parseFechaLocal(hoyLocalISO());
    if (parseFechaLocal(reserva.fecha) < hoy) {
      setErrorReserva(t('detail.fechaNoAnterior'));
      return;
    }
    setCargandoReserva(true);
    try {
      const r = await crearReserva({
        restaurante: restaurant,
        usuario,
        fecha: reserva.fecha,
        hora: reserva.hora,
        comensales: reserva.comensales,
        comentarios: reserva.comentarios,
      });
      setConfirmacion(r);
      const d = await getDisponibilidad(restaurant, reserva.fecha, reserva.hora);
      setDisponibilidad(d);
    } catch (err) {
      setErrorReserva(err.message);
    } finally {
      setCargandoReserva(false);
    }
  }

  async function handleCrearResena() {
    setErrorResena('');
    if (!usuario?.uid) {
      setErrorResena(t('detail.debesLoginResena'));
      return;
    }
    setEnviandoResena(true);
    try {
      await crearResena({
        restauranteId: restaurant.id,
        puntuacion: nuevaResena.puntuacion,
        comentario: nuevaResena.comentario,
      });
      setNuevaResena({ puntuacion: 5, comentario: '' });
      const list = await listarResenasDeRestaurante(restaurant.id);
      setResenasFs(list);
    } catch (err) {
      setErrorResena(err.message);
    } finally {
      setEnviandoResena(false);
    }
  }

  async function handleLike(r) {
    if (!usuario?.uid) {
      setErrorResena(t('detail.iniciaParaLike'));
      return;
    }
    const ya = (r.likedBy || []).includes(usuario.uid);
    setResenasFs((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              likes: (x.likes || 0) + (ya ? -1 : 1),
              likedBy: ya
                ? x.likedBy.filter((id) => id !== usuario.uid)
                : [...(x.likedBy || []), usuario.uid],
            }
          : x,
      ),
    );
    try {
      if (ya) await quitarLikeResena(r.id);
      else await darLikeResena(r.id);
    } catch {
      setResenasFs((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...x,
                likes: (x.likes || 0) + (ya ? 1 : -1),
                likedBy: ya
                  ? [...(x.likedBy || []), usuario.uid]
                  : x.likedBy.filter((id) => id !== usuario.uid),
              }
            : x,
        ),
      );
    }
  }

  function Dato({ etiqueta, valor, children }) {
    if (apilado) {
      return (
        <View style={styles.datoApilado}>
          <Text style={[styles.datoDt, { color: colores.gris }]}>{etiqueta}</Text>
          <Text style={[styles.datoDd, { color: colores.tinta }]}>{children || valor}</Text>
        </View>
      );
    }
    return (
      <View style={styles.dato}>
        <Text style={[styles.datoDt, { color: colores.gris }]}>{etiqueta}</Text>
        <Text style={[styles.datoDd, { color: colores.tinta }]}>{children || valor}</Text>
      </View>
    );
  }

  function ItemResena({ r }) {
    const liked = (r.likedBy || []).includes(usuario?.uid);
    return (
      <View style={[styles.resenaItem, { borderTopColor: colores.glassBorder }]}>
        <View style={styles.resenaCabFila}>
          <Text style={[styles.resenaCab, { color: colores.tinta }]}>
            {r.usuarioNombre || r.usuario} ·{' '}
            {r.fecha || (r.createdAt ? new Date(r.createdAt).toLocaleDateString(t('modelos.locale')) : '')} ·{' '}
            <Text accessibilityLabel={`${r.puntuacion} de 5`}>★ {r.puntuacion}</Text>
          </Text>
          <Pressable
            onPress={() => handleLike(r)}
            disabled={r.esMock}
            accessibilityRole="button"
            accessibilityLabel={r.esMock ? t('detail.soloLikeMira') : liked ? t('detail.quitarLike') : t('detail.darLike')}
            style={({ pressed }) => [
              styles.likeBtn,
              {
                backgroundColor: liked ? colores.primaryContainer : colores.papel,
                borderColor: colores.borde,
                opacity: r.esMock ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 11.5, color: liked ? '#fff' : colores.tinta }}>♥</Text>
            <Text
              style={[
                styles.likeTxt,
                { color: liked ? '#fff' : colores.tinta },
              ]}
            >
              {r.likes || 0}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.resenaTexto, { color: colores.tinta }]}>{r.comentario}</Text>
      </View>
    );
  }

  const carta = cartaDelLocal(restaurant);

  return (
    <View style={[styles.raiz, { backgroundColor: colores.papel }]}>
      <View style={[styles.barraDorada, { backgroundColor: colores.dorado }]} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.fotoWrap}>
          <Image
            source={{ uri }}
            style={styles.foto}
            resizeMode="cover"
            accessibilityLabel={`${restaurant.nombre} — cocina ${restaurant.cocina}`}
            onError={() => {
              if (uri !== fallback) setUri(fallback);
            }}
          />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('otros.cerrar')}
            style={({ pressed }) => [styles.cerrar, { backgroundColor: colores.primaryContainer, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.cerrarTxt}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.cuerpo}>
          <Text
            style={{
              color: colores.gris,
              fontSize: 13.12,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.96,
              marginBottom: 4.8,
              fontFamily: FUENTES.textoBold,
            }}
          >
            {restaurant.cocina}
          </Text>
          <Text style={[TITULO_DISPLAY, styles.titulo, { color: colores.tinta, fontSize: apilado ? 22.4 : 28.8 }]}>
            {restaurant.nombre}
          </Text>

          {(restaurant.categorias?.length > 1) && (
            <View style={styles.chips} accessibilityLabel={t('detail.especialidades')}>
              {restaurant.categorias.map((c) => (
                <View key={c} style={[styles.chip, { backgroundColor: colores.verdeSuave }]}>
                  <Text style={[styles.chipTxt, { color: colores.primaryContainer }]}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.datos}>
            <Dato etiqueta={t('detail.notaYelp')}>
              ★ {restaurant.valoracion.toLocaleString(t('modelos.locale'))} ({restaurant.totalResenasYelp ?? 0}{' '}
              {t('card.resenas')})
            </Dato>
            {media != null && <Dato etiqueta={t('detail.notaMira')}>★ {media.toLocaleString(t('modelos.locale'))}</Dato>}
            <Dato etiqueta={t('detail.precio')} valor={restaurant.precio} />
            {restaurant.direccion && <Dato etiqueta={t('detail.direccion')} valor={restaurant.direccion} />}
            {restaurant.telefono && (
              <Dato etiqueta={t('detail.telefono')}>
                <Text
                  onPress={() => Linking.openURL(`tel:${restaurant.telefono.replace(/\s/g, '')}`)}
                  style={{ textDecorationLine: 'underline', color: colores.tinta }}
                >
                  {restaurant.telefono}
                </Text>
              </Dato>
            )}
            <Dato etiqueta={t('detail.accesoAdaptado')}>{marcaInfo(restaurant.accesoDiscapacidad, t)}</Dato>
            <Dato etiqueta={t('detail.menuInfantil')}>{marcaInfo(restaurant.menuInfantil, t)}</Dato>
            <Dato etiqueta={t('detail.tronas')}>{marcaInfo(restaurant.tronas, t)}</Dato>
            <Dato etiqueta={t('detail.terraza')}>{marcaInfo(restaurant.terraza, t)}</Dato>
            <Dato etiqueta={t('detail.entornoTranquilo')}>{marcaInfo(restaurant.entornoTranquilo, t)}</Dato>
            <Dato etiqueta={t('detail.alergenos')}>
              {restaurant.alergenos || t('detail.sinInfoAlrgenos')}
            </Dato>
          </View>

          <View style={styles.acciones}>
            {onVerCarta && (
              <Pressable
                onPress={() => onVerCarta(restaurant)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={btnCta(colores, { peq: true })}>{t('detail.verCarta')}</Text>
              </Pressable>
            )}
            {externalMapUrl && (
              <Pressable
                onPress={() => Linking.openURL(externalMapUrl)}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[btnSecundario(colores), styles.btnSinMargen]}>📍 {t('detail.comoLlegar')}</Text>
              </Pressable>
            )}
            {restaurant.yelpUrl && (
              <Pressable
                onPress={() => Linking.openURL(restaurant.yelpUrl)}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[btnSecundario(colores), styles.btnSinMargen]}>{t('detail.verEnYelp')}</Text>
              </Pressable>
            )}
          </View>

          {/* La carta */}
          <Text style={[styles.sub, { color: colores.tinta }]}>{t('detail.laCarta')}</Text>
          <MiniLeyenda />
          <View style={styles.cartaLista}>
            {carta.map((p) => (
              <View key={p.nombre} style={[styles.cartaFila, { borderBottomColor: colores.borde }]}>
                <View style={styles.cartaNombreFila}>
                  <Text style={[styles.cartaNombre, { color: colores.tinta }]}>{p.nombre}</Text>
                  <Sellos plato={{ ...p, ...flagsPlato(p.nombre) }} />
                </View>
                <Text style={[styles.cartaPrecio, { color: colores.tinta }]}>{p.precio} €</Text>
              </View>
            ))}
          </View>
          {onVerCarta && (
            <Pressable
              onPress={() => onVerCarta(restaurant)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={btnSecundario(colores)}>{t('detail.verCartaCompleta')}</Text>
            </Pressable>
          )}

          {/* Reserva */}
          <View style={[styles.reservaBloque, { backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder }]}>
            <View style={styles.subFila}>
              <Text style={[styles.sub, { color: colores.tinta, marginTop: 0, marginBottom: 0 }]}>
                📅 {t('detail.reservarMesa')}
              </Text>
            </View>

            <View style={[styles.puntosPill, { backgroundColor: colores.primaryContainer }]}>
              <Image source={require('../../assets/images/moneda-mira.png')} style={styles.puntosCoin} />
              <Text style={styles.puntosTxt}>+100 pts por reserva</Text>
              <View style={styles.puntosRacha}>
                <Text style={styles.puntosRachaTxt}>x1.2 si mantienes racha</Text>
              </View>
            </View>

            {descuentoPendiente?.euros > 0 && (
              <View
                style={[
                  styles.avisoDescuento,
                  { backgroundColor: colores.verdeSuave, borderColor: colores.verde },
                ]}
                accessibilityRole="status"
              >
                <Text style={{ fontSize: 14.08, color: colores.tinta, fontFamily: FUENTES.texto }}>
                  {t('detail.descuentoPendiente', { euros: descuentoPendiente.euros })}
                </Text>
              </View>
            )}

            <View style={styles.reservaGrid}>
              <View style={[styles.campo, apilado ? { width: '100%' } : { flex: 1, minWidth: 150 }]}>
                <CampoEtiqueta>{t('detail.fecha')}</CampoEtiqueta>
                <TextInput
                  value={reserva.fecha}
                  onChangeText={(v) => setReserva((s) => ({ ...s, fecha: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colores.gris}
                  maxLength={10}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    { backgroundColor: colores.fondo, borderColor: colores.borde, color: colores.tinta },
                  ]}
                />
              </View>
              <View style={[styles.campo, apilado ? { width: '100%' } : { flex: 1, minWidth: 150 }]}>
                <SelectCampo
                  label={t('detail.hora')}
                  value={reserva.hora}
                  placeholder={t('detail.eligeHora')}
                  opciones={SLOTS}
                  onChange={(v) => setReserva((s) => ({ ...s, hora: v }))}
                />
              </View>
              <View style={[styles.campo, apilado ? { width: '100%' } : { flex: 1, minWidth: 150 }]}>
                <SelectCampo
                  label={t('detail.comensales')}
                  value={reserva.comensales}
                  opciones={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
                    valor: String(n),
                    etiqueta: `${n} ${n === 1 ? t('modelos.persona') : t('modelos.personas')}`,
                  }))}
                  onChange={(v) => setReserva((s) => ({ ...s, comensales: v }))}
                />
              </View>
            </View>

            <View style={[styles.campo, { marginTop: 9.6 }]}>
              <CampoEtiqueta>{t('detail.comentarios')}</CampoEtiqueta>
              <TextInput
                value={reserva.comentarios}
                onChangeText={(v) => setReserva((s) => ({ ...s, comentarios: v }))}
                maxLength={500}
                multiline
                placeholder={t('detail.placeholderComentarios')}
                placeholderTextColor={colores.gris}
                style={[
                  styles.textarea,
                  { backgroundColor: colores.fondo, borderColor: colores.borde, color: colores.tinta },
                ]}
              />
            </View>

            {reserva.fecha && reserva.hora && disponibilidad && (
              <Text style={[styles.plazas, { color: colores.primaryContainer }]} accessibilityRole="status">
                {disponibilidad.libres > 0
                  ? t('detail.plazasLibres', { libres: disponibilidad.libres, limite: disponibilidad.limite })
                  : t('detail.completo')}
              </Text>
            )}

            {avisoTerraza && (
              <View style={styles.avisoMeteo} accessibilityRole="status">
                <Text style={styles.avisoMeteoTxt}>
                  {avisoTerraza}
                  {meteoReserva ? ` (${meteoReserva.resumen})` : ''}
                </Text>
              </View>
            )}

            {errorReserva ? (
              <View style={[styles.errorReserva, { borderColor: colores.rojo }]} accessibilityRole="alert">
                <Text style={styles.errorReservaTxt}>{errorReserva}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleReserva}
              disabled={cargandoReserva || (disponibilidad && disponibilidad.libres <= 0)}
              style={({ pressed }) => [
                {
                  marginTop: 11.2,
                  opacity: cargandoReserva || (disponibilidad && disponibilidad.libres <= 0) ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={btnCta(colores)}>
                {cargandoReserva ? t('detail.reservando') : t('detail.reservar')}
              </Text>
            </Pressable>

            {!usuario && (
              <Text style={[styles.sinSesion, { color: colores.gris }]}>
                {t('otros.debes')}{' '}
                <Text
                  onPress={() => router.push('/login')}
                  style={{ color: colores.primaryContainer, textDecorationLine: 'underline' }}
                >
                  {t('otros.iniciarSesion')}
                </Text>{' '}
                {t('detail.reservar')}.
              </Text>
            )}

            {confirmacion && (
              <View style={[styles.confirm, { backgroundColor: colores.verdeSuave, borderColor: colores.primaryContainer }]}>
                <Text style={[styles.confirmTitulo, { color: colores.tinta }]}>{t('detail.reservaConfirmada')}</Text>
                <Text style={[styles.confirmTxt, { color: colores.tinta }]}>
                  {t('detail.codigo')}: <Text style={[styles.code, { backgroundColor: colores.fondo, borderColor: colores.borde, color: colores.tinta }]}>{confirmacion.codigo}</Text> — {confirmacion.fecha} a las{' '}
                  {confirmacion.hora} para {confirmacion.comensales} {t('modelos.personas')} en{' '}
                  <Text style={{ fontStyle: 'italic' }}>{confirmacion.restauranteNombre}</Text>.
                </Text>
                <Text
                  onPress={() => router.push('/reservas')}
                  style={{ color: colores.primaryContainer, textDecorationLine: 'underline', marginTop: 6.4 }}
                >
                  {t('detail.verMisReservas')}
                </Text>
              </View>
            )}
          </View>

          {/* Mapa + parkings */}
          {coordsValidas(restaurant.coords) ? (
            <View style={[styles.parkingSection, { marginTop: 19.2 }]}>
              <View style={[styles.parkingGrid, mapaEnFila && styles.parkingGridFila]}>
                <View style={mapaEnFila ? { flex: 1 } : { width: '100%' }}>
                  <RestaurantMap
                    restaurant={restaurant}
                    parkings={parkings}
                    selectedIndex={parkingSeleccionado}
                  />
                </View>
                <View style={mapaEnFila ? { width: 320 } : { width: '100%' }}>
                  <ParkingsPanel
                    parkings={parkings}
                    cargando={cargandoParkings}
                    onSeleccionarParking={(i) => setParkingSeleccionado(i)}
                  />
                </View>
              </View>
              <Text style={[styles.mapaPie, { color: colores.gris }]}>
                {restaurant.direccion || restaurant.ciudad}
              </Text>
            </View>
          ) : (
            <Text style={[styles.mapaVacio, { color: colores.gris }]}>{t('detail.esteLocalSinCoord')}</Text>
          )}

          {/* Reseñas */}
          <Text style={[styles.sub, { color: colores.tinta }]}>
            {t('detail.resenas', { count: resenasMira.length + resenasYelp.length })}
          </Text>
          <View style={styles.tabs}>
            {[
              ['populares', t('detail.populares')],
              ['recientes', t('detail.masRecientes')],
            ].map(([valor, etiqueta]) => (
              <Pressable
                key={valor}
                onPress={() => setOrdenResenas(valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: ordenResenas === valor }}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Text
                  style={
                    ordenResenas === valor
                      ? btnCta(colores, { peq: true })
                      : [btnSecundario(colores, { peq: true }), { marginTop: 0 }]
                  }
                >
                  {etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sub2, { color: colores.tinta }]}>
            {t('detail.resenasMira', { count: resenasMira.length })}
          </Text>
          <View style={[styles.resenaForm, { backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder }]}>
            <StarPicker
              value={nuevaResena.puntuacion}
              onChange={(v) => setNuevaResena((s) => ({ ...s, puntuacion: v }))}
              etiqueta={t('detail.puntuacion')}
            />
            <View style={[styles.campo, { marginTop: 8 }]}>
              <CampoEtiqueta>{t('detail.tuComentario')}</CampoEtiqueta>
              <TextInput
                value={nuevaResena.comentario}
                onChangeText={(v) => setNuevaResena((s) => ({ ...s, comentario: v }))}
                placeholder={t('detail.cuentaExperiencia')}
                placeholderTextColor={colores.gris}
                multiline
                style={[
                  styles.textarea,
                  { backgroundColor: colores.fondo, borderColor: colores.borde, color: colores.tinta },
                ]}
              />
            </View>
            {errorResena ? (
              <View style={[styles.errorReserva, { borderColor: colores.rojo }]}>
                <Text style={styles.errorReservaTxt}>{errorResena}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={handleCrearResena}
              disabled={enviandoResena}
              style={({ pressed }) => [{ marginTop: 8, opacity: enviandoResena ? 0.45 : pressed ? 0.75 : 1 }]}
            >
              <Text style={btnSecundario(colores)}>
                {enviandoResena ? t('detail.enviando') : t('detail.publicarResena')}
              </Text>
            </Pressable>
            {!usuario && (
              <Text style={[styles.sinSesion, { color: colores.gris, marginTop: 6.4 }]}>
                {t('detail.debesLoginResena')}
              </Text>
            )}
          </View>

          {cargandoResenas && (
            <Text style={[styles.vacioTexto, { color: colores.gris }]}>{t('detail.cargandoResenas')}</Text>
          )}
          {!cargandoResenas && resenasMira.length === 0 && (
            <Text style={[styles.vacioTexto, { color: colores.gris }]}>{t('detail.resenasMiraVacias')}</Text>
          )}
          <View style={styles.resenaLista}>
            {visiblesMira.map((r) => (
              <ItemResena key={r.id} r={r} />
            ))}
          </View>
          {resenasMira.length > MOSTRAR_INICIAL && (
            <Pressable onPress={() => setVerTodas((v) => !v)} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
              <Text style={btnSecundario(colores)}>
                {verTodas ? t('detail.verMenos') : t('detail.verResenasMira', { count: resenasMira.length })}
              </Text>
            </Pressable>
          )}

          <Text style={[styles.sub2, { color: colores.tinta }]}>
            {t('detail.resenasYelp', { count: resenasYelp.length })}
          </Text>
          {resenasYelp.length === 0 && (
            <Text style={[styles.vacioTexto, { color: colores.gris }]}>{t('detail.resenasYelpVacias')}</Text>
          )}
          <View style={styles.resenaLista}>
            {visiblesYelp.map((r) => (
              <ItemResena key={r.id} r={r} />
            ))}
          </View>
          {resenasYelp.length > MOSTRAR_INICIAL && (
            <Pressable onPress={() => setVerTodasYelp((v) => !v)} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
              <Text style={btnSecundario(colores)}>
                {verTodasYelp ? t('detail.verMenos') : t('detail.verResenasYelp', { count: resenasYelp.length })}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  barraDorada: {
    height: 6,
    width: '100%',
  },
  scroll: {
    paddingBottom: 48,
  },
  fotoWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: '#ecefeb',
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  cerrar: {
    position: 'absolute',
    top: 9.6,
    right: 9.6,
    width: 35.2,
    height: 35.2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cerrarTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cuerpo: {
    padding: 19.2,
    paddingHorizontal: 24,
    gap: 4,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6.4,
    marginBottom: 16,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 13.6,
  },
  chipTxt: {
    fontSize: 12.8,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  datos: {
    gap: 8,
    marginBottom: 16,
  },
  dato: {
    flexDirection: 'row',
    gap: 8,
  },
  datoApilado: {
    gap: 1.6,
  },
  datoDt: {
    fontWeight: '600',
    fontSize: 14.08,
    width: 176,
    fontFamily: FUENTES.textoSemi,
  },
  datoDd: {
    flex: 1,
    fontSize: 15,
    fontFamily: FUENTES.texto,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9.6,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnSinMargen: {
    marginTop: 0,
  },
  sub: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 20,
    marginTop: 19.2,
    marginBottom: 9.6,
  },
  subFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sub2: {
    fontSize: 16.32,
    fontWeight: '700',
    marginTop: 17.6,
    marginBottom: 9.6,
    fontFamily: FUENTES.textoBold,
  },
  cartaLista: {
    gap: 5.6,
    marginBottom: 8,
  },
  cartaFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted',
    paddingBottom: 5.6,
  },
  cartaNombreFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.4,
    flexShrink: 1,
  },
  cartaNombre: {
    fontSize: 14.88,
    fontFamily: FUENTES.texto,
    flexShrink: 1,
  },
  cartaPrecio: {
    fontWeight: '700',
    fontSize: 14.88,
    fontFamily: FUENTES.textoBold,
  },
  reservaBloque: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  puntosPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.4,
    borderRadius: 999,
    paddingVertical: 5.6,
    paddingHorizontal: 8,
    paddingLeft: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  puntosCoin: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  puntosTxt: {
    color: '#fff',
    fontSize: 13.6,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  puntosRacha: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    paddingVertical: 1.6,
    paddingHorizontal: 8,
    marginLeft: 2.4,
  },
  puntosRachaTxt: {
    color: '#fff',
    fontSize: 12.48,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  avisoDescuento: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 8.8,
    paddingHorizontal: 12,
    marginTop: 9.6,
  },
  reservaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9.6,
  },
  campo: {
    gap: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingHorizontal: 12,
    paddingVertical: 9.6,
    fontFamily: FUENTES.texto,
    fontSize: 15,
    width: '100%',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingHorizontal: 12,
    paddingVertical: 9.6,
    minHeight: 72,
    fontFamily: FUENTES.texto,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  plazas: {
    fontWeight: '700',
    fontSize: 14.72,
    marginTop: 9.6,
    fontFamily: FUENTES.textoBold,
  },
  avisoMeteo: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#eab308',
    borderRadius: RADIO.peq,
    paddingVertical: 8.8,
    paddingHorizontal: 12,
    marginTop: 9.6,
  },
  avisoMeteoTxt: {
    fontSize: 14.08,
    color: '#713f12',
    fontFamily: FUENTES.texto,
  },
  errorReserva: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    backgroundColor: '#fdecea',
    paddingVertical: 8,
    paddingHorizontal: 11.2,
    marginTop: 8,
  },
  errorReservaTxt: {
    fontSize: 14.08,
    color: '#8f1d14',
    fontFamily: FUENTES.texto,
  },
  sinSesion: {
    fontSize: 13.12,
    marginTop: 8,
    fontFamily: FUENTES.texto,
  },
  confirm: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 11.2,
    marginTop: 12.8,
    gap: 4,
  },
  confirmTitulo: {
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  confirmTxt: {
    fontSize: 14.4,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
  },
  code: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5.6,
    paddingVertical: 1.6,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  parkingSection: {
    gap: 7.2,
  },
  parkingGrid: {
    gap: 12,
    alignItems: 'stretch',
  },
  parkingGridFila: {
    flexDirection: 'row',
  },
  mapaPie: {
    fontSize: 13.12,
    fontFamily: FUENTES.texto,
  },
  mapaVacio: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  resenaForm: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 14.4,
    marginBottom: 16,
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2.4,
  },
  resenaLista: {
    gap: 11.2,
    marginBottom: 16,
  },
  resenaItem: {
    borderTopWidth: 1,
    paddingTop: 9.6,
  },
  resenaCabFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2.4,
  },
  resenaCab: {
    fontSize: 13.6,
    flex: 1,
    fontFamily: FUENTES.texto,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2.4,
    paddingHorizontal: 8,
  },
  likeTxt: {
    fontSize: 12.48,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  resenaTexto: {
    fontSize: 14.88,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
  },
  vacioTexto: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    marginBottom: 8,
  },
});
