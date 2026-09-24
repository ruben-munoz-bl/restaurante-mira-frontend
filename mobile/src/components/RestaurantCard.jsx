/**
 * Ficha de restaurante — espejo de .card (foto con badges, cuerpo editorial,
 * estrellas, distancia, disponibilidad y acciones).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import PromoBadge from './promotions/PromoBadge.jsx';
import { imagenParaRestaurante } from '../models/restaurantModel.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO, sombraCard } from '../theme/tokens';

const TRADS = { es, ca, en };

function estrellas(valoracion) {
  const llenas = Math.round(valoracion);
  return '★'.repeat(llenas) + '☆'.repeat(Math.max(0, 5 - llenas));
}

function disponibilidadTexto(r, filtros, t) {
  if (!filtros) return null;
  const { dia, franja, hora } = filtros;
  if (!dia && !franja && !hora) return null;
  if (dia === 'Lunes' && r.cocina === 'Asador') return t('card.cerradoLunes');
  if (dia === 'Martes' && r.cocina === 'Fusión') return t('card.cerradoMartes');
  if (franja === 'cena' && r.cocina === 'Vegana' && r.precio === '€') return t('card.soloDesayuno');
  return `${t('card.disponible')} ${dia ? dia : ''} ${franja ? `· ${franja}` : ''} ${hora ? hora : ''}`.trim();
}

export default function RestaurantCard({
  restaurant,
  filtros,
  esFavorito,
  onToggleFavorito,
  onVerCarta,
  onSelect,
  children,
  altoMedia = 200,
}) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const {
    nombre,
    cocina,
    precio,
    distanciaKm,
    valoracion,
    totalResenasYelp,
    imagen,
    descripcion,
    ciudad,
    promoActiva,
  } = restaurant;
  const destacado = valoracion >= 4.7;
  const disp = disponibilidadTexto(restaurant, filtros, t);

  const fallback = useMemo(
    () => imagenParaRestaurante(cocina, restaurant.id),
    [cocina, restaurant.id],
  );
  const [uri, setUri] = useState(imagen || fallback);
  useEffect(() => setUri(imagen || fallback), [imagen, fallback]);

  const cerrado =
    disp === t('card.cerradoLunes') || disp === t('card.cerradoMartes');

  return (
    <View style={[styles.card, { backgroundColor: colores.papel, borderColor: colores.glassBorder }, sombraCard(colores)]}>
      <View style={[styles.media, { height: altoMedia, backgroundColor: colores.fondoSuave }]}>
        <Image
          source={{ uri }}
          style={styles.foto}
          resizeMode="cover"
          accessibilityLabel={`${nombre} — cocina ${cocina}`}
          onError={() => {
            if (uri !== fallback) setUri(fallback);
          }}
        />
        {destacado && (
          <View style={[styles.top, { backgroundColor: colores.tertiaryContainer }]}>
            <Text style={styles.topTxt}>{t('card.recomendado')}</Text>
          </View>
        )}
        <View style={[styles.precioBadge, { backgroundColor: colores.badgeBg, borderColor: colores.glassBorder }]}>
          <Text style={[styles.precioTxt, { color: colores.tinta }]}>{precio}</Text>
        </View>
        {promoActiva && <PromoBadge promoActiva={promoActiva} style={styles.promo} />}
        {onToggleFavorito && (
          <Pressable
            onPress={() => onToggleFavorito(restaurant.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(esFavorito) }}
            accessibilityLabel={
              esFavorito
                ? `${t('card.quitarFavoritos')} ${nombre}`
                : `${t('card.guardarFavoritos')} ${nombre}`
            }
            style={({ pressed }) => [
              styles.fav,
              {
                backgroundColor: colores.favBg,
                borderColor: esFavorito ? colores.rojo : 'rgba(255, 255, 255, 0.6)',
                transform: [{ scale: pressed ? 1.15 : 1 }],
              },
            ]}
          >
            <Text style={{ fontSize: 16, lineHeight: 20, color: esFavorito ? colores.rojo : colores.gris }}>♥</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.cuerpo}>
        <Text numberOfLines={1} style={[styles.titulo, { color: colores.tinta }]}>
          {nombre}
        </Text>
        <Text style={styles.nota}>
          {valoracion > 0 ? (
            <>
              <Text
                style={[styles.estrellas, { color: colores.estrella }]}
                accessibilityLabel={`${t('busqueda.valoracion')} ${valoracion} ${t('lista.de')} 5`}
              >
                {estrellas(valoracion)} {valoracion.toLocaleString(t('modelos.locale'))}
              </Text>{' '}
              <Text style={[styles.opiniones, { color: colores.gris }]}>
                ({(totalResenasYelp ?? 0).toLocaleString(t('modelos.locale'))} {t('card.opiniones')})
              </Text>
            </>
          ) : (
            <Text style={[styles.nuevo, { color: colores.primaryContainer }]}>{t('card.nuevo')}</Text>
          )}
        </Text>
        <Text style={[styles.gris, { color: colores.gris }]}>
          {cocina} · {ciudad}
          {restaurant.accesoDiscapacidad === true ? ` ${t('card.accesible')}` : ''}
        </Text>
        <View style={styles.distanciaFila}>
          <View style={[styles.pin, { borderColor: colores.gris }]}>
            <View style={[styles.pinPunto, { backgroundColor: colores.gris }]} />
          </View>
          <Text style={[styles.gris, { color: colores.gris }]}>
            {distanciaKm == null
              ? t('card.centroNoDisponible')
              : t('card.kmCentro', {
                  km: distanciaKm.toLocaleString(t('modelos.locale'), { maximumFractionDigits: 1 }),
                })}
          </Text>
        </View>
        {disp && (
          <Text style={[styles.disp, { color: cerrado ? colores.rojo : colores.primaryContainer }]}>
            {disp}
          </Text>
        )}
        <Text numberOfLines={2} style={[styles.descripcion, { color: colores.tinta }]}>
          {descripcion}
        </Text>
        {children}
        <View style={styles.espaciador} />
        <View style={styles.acciones}>
          <Pressable
            onPress={() => onSelect(restaurant)}
            style={({ pressed }) => [
              styles.btnReservar,
              { backgroundColor: pressed ? colores.primary : colores.primaryContainer },
            ]}
          >
            <Text style={styles.btnReservarTxt}>{t('card.verMas')}</Text>
          </Pressable>
          {onVerCarta && (
            <Pressable
              onPress={() => onVerCarta(restaurant)}
              style={({ pressed }) => [
                styles.btnSecundario,
                { backgroundColor: colores.papel, borderColor: colores.borde, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[styles.btnSecundarioTxt, { color: colores.tinta }]}>{t('card.verCarta')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    overflow: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
  },
  media: {
    width: '100%',
    overflow: 'hidden',
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  top: {
    position: 'absolute',
    top: 9.6,
    left: 9.6,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 11.2,
  },
  topTxt: {
    color: '#fff',
    fontSize: 11.2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    fontFamily: FUENTES.textoBold,
  },
  precioBadge: {
    position: 'absolute',
    bottom: 9.6,
    right: 9.6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 3.2,
    paddingHorizontal: 11.2,
  },
  precioTxt: {
    fontSize: 13.12,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  promo: {
    position: 'absolute',
    bottom: 9.6,
    left: 9.6,
  },
  fav: {
    position: 'absolute',
    top: 9.6,
    right: 9.6,
    width: 33.6,
    height: 33.6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    padding: 16,
    paddingHorizontal: 17.6,
    gap: 4,
    flexGrow: 1,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 18.4,
    lineHeight: 23,
  },
  nota: {
    marginTop: 0,
  },
  estrellas: {
    fontWeight: '800',
    fontSize: 15.2,
    fontFamily: FUENTES.textoExtra,
  },
  opiniones: {
    fontSize: 13.12,
    fontFamily: FUENTES.texto,
  },
  nuevo: {
    fontWeight: '700',
    fontSize: 14.08,
    fontFamily: FUENTES.textoBold,
  },
  gris: {
    fontSize: 14.08,
    fontFamily: FUENTES.texto,
  },
  distanciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.8,
  },
  pin: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderRadius: 6,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pinPunto: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2.4,
  },
  disp: {
    fontSize: 12.48,
    fontWeight: '600',
    marginTop: 1.6,
    marginBottom: 0,
    fontFamily: FUENTES.textoSemi,
  },
  descripcion: {
    fontSize: 14.08,
    marginTop: 4,
    marginBottom: 9.6,
    lineHeight: 21.12,
    fontFamily: FUENTES.texto,
  },
  espaciador: {
    flexGrow: 1,
    minHeight: 4,
  },
  acciones: {
    gap: 8,
  },
  btnReservar: {
    borderRadius: 999,
    paddingVertical: 10.4,
    paddingHorizontal: 19.2,
    width: '100%',
    alignItems: 'center',
  },
  btnReservarTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: FUENTES.textoBold,
  },
  btnSecundario: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9.6,
    paddingHorizontal: 17.6,
    width: '100%',
    alignItems: 'center',
  },
  btnSecundarioTxt: {
    fontWeight: '600',
    fontSize: 15,
    fontFamily: FUENTES.textoSemi,
  },
});
