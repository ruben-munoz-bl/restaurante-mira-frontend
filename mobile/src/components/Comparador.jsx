/**
 * Tabla comparativa conjunta (2-3 restaurantes) â€” espejo de Comparador.jsx web.
 * Solo la tabla (sin fichas): foto + nombre + Quitar por columna; scroll
 * horizontal en mÃ³vil; resaltado del ganador por fila.
 */
import { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { resumenRestaurante, imagenParaRestaurante } from '../models/restaurantModel.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';
import { btnTexto } from '../theme/ui';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function fmtDistancia(km, t) {
  if (km == null) return 'â€”';
  return `${km.toLocaleString(t('modelos.locale'), { maximumFractionDigits: 1 })} ${t('comparador.km')}`;
}

function fmtNota(v, locale) {
  return v > 0 ? `â˜… ${v.toLocaleString(locale)}` : 'â€”';
}

// Filas comparables: get numÃ©rico para el resaltado, fmt para pintar.
function filasDe(conAptos, t, locale, gris) {
  const filas = [
    {
      label: t('comparador.notaYelp'),
      get: (s) => (s.notaYelp > 0 ? s.notaYelp : null),
      fmt: (s) => (
        <>
          {fmtNota(s.notaYelp, locale)}{' '}
          <Text style={{ color: gris, fontSize: 13.12 }}>({s.totalYelp.toLocaleString(locale)})</Text>
        </>
      ),
      mejor: 'max',
    },
    { label: t('comparador.notaMira'), get: (s) => (s.notaMira > 0 ? s.notaMira : null), fmt: (s) => fmtNota(s.notaMira, locale), mejor: 'max' },
    { label: t('comparador.mejorNota'), get: (s) => (s.mejorNota > 0 ? s.mejorNota : null), fmt: (s) => fmtNota(s.mejorNota, locale), mejor: 'max' },
    { label: t('comparador.precio'), get: (s) => s.precio.length, fmt: (s) => s.precio, mejor: 'min' },
    { label: t('comparador.distancia'), get: (s) => s.distanciaKm, fmt: (s) => fmtDistancia(s.distanciaKm, t), mejor: 'min' },
    { label: t('comparador.ciudad'), get: null, fmt: (s) => s.ciudad || 'â€”', mejor: null },
  ];
  if (conAptos) {
    filas.push({ label: t('comparador.aptosParaTi'), get: (s) => s.aptos, fmt: (s) => s.aptos ?? 'â€”', mejor: 'max' });
  }
  filas.push(
    {
      label: t('comparador.carta'),
      get: null,
      fmt: (s) => `${s.secciones} ${t('comparador.secciones')} Â· ${s.platos} ${t('comparador.platos')}`,
      mejor: null,
    },
    { label: t('comparador.masBarato'), get: null, fmt: (s) => (s.barato ? `${s.barato.nombre} (${s.barato.precio} â‚¬)` : 'â€”'), mejor: null },
    { label: t('comparador.masCaro'), get: null, fmt: (s) => (s.caro ? `${s.caro.nombre} (${s.caro.precio} â‚¬)` : 'â€”'), mejor: null },
  );
  return filas;
}

export default function Comparador({ restaurantes, dieta, onQuitar }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const locale = t('modelos.locale');
  const [fallos, setFallos] = useState({});

  const datos = restaurantes.map((r) => ({ r, s: resumenRestaurante(r, dieta) }));
  if (datos.length < 2) return null;
  const conAptos = datos.some((d) => d.s.aptos != null);
  const filas = filasDe(conAptos, t, locale, colores.gris);

  const ganadores = (fila) => {
    if (!fila.mejor || !fila.get) return new Set();
    const vals = datos.map((d) => fila.get(d.s)).filter((v) => v != null);
    if (!vals.length) return new Set();
    const top = fila.mejor === 'min' ? Math.min(...vals) : Math.max(...vals);
    return new Set(datos.filter((d) => fila.get(d.s) === top).map((d) => d.s.id));
  };

  return (
    <View accessibilityLabel={t('comparador.comparando', { count: datos.length })}>
      <Text style={[estilos.sub, { color: colores.tinta }]}>
        {t('comparador.comparando', { count: datos.length })}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={[estilos.tabla, { backgroundColor: colores.papel }]}>
          <View style={estilos.fila}>
            <View style={[estilos.celda, estilos.celdaEtiqueta, { backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder }]} />
            {datos.map(({ s }) => (
              <View key={s.id} style={[estilos.celda, estilos.celdaDato, { backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder }]}>
                <Image
                  source={{ uri: fallos[s.id] ? imagenParaRestaurante(s.cocina, s.id) : s.imagen }}
                  style={estilos.miniFoto}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  onError={() => setFallos((p) => (p[s.id] ? p : { ...p, [s.id]: true }))}
                />
                <Text style={[estilos.colNombre, { color: colores.tinta }]}>{s.nombre}</Text>
                <Pressable onPress={() => onQuitar(s.id)}>
                  <Text style={btnTexto(colores, { size: 13.12 })}>{t('comparador.quitar')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {filas.map((fila) => {
            const top = ganadores(fila);
            return (
              <View key={fila.label} style={estilos.fila}>
                <Text style={[estilos.celda, estilos.celdaEtiqueta, estilos.etiqueta, { color: colores.tinta, backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder }]}>
                  {fila.label}
                </Text>
                {datos.map(({ s }) => (
                  <Text
                    key={s.id}
                    style={[
                      estilos.celda,
                      estilos.celdaDato,
                      { color: colores.tinta, borderColor: colores.glassBorder },
                      top.has(s.id) && [estilos.mejor, { backgroundColor: colores.verdeSuave }],
                    ]}
                  >
                    {fila.fmt(s)}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  sub: {
    fontFamily: FUENTES.display,
    fontSize: 18.4,
    marginTop: 22.4,
    marginBottom: 9.6,
  },
  tabla: {
    minWidth: 560,
    marginTop: 12.8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  celda: {
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.35)',
    paddingVertical: 9.6,
    paddingHorizontal: 11.2,
    fontSize: 14.4,
    fontFamily: FUENTES.texto,
    textAlign: 'left',
    flexShrink: 0,
  },
  celdaEtiqueta: {
    width: 110,
  },
  celdaDato: {
    flex: 1,
    minWidth: 160,
  },
  etiqueta: {
    fontWeight: '600',
  },
  colNombre: {
    fontSize: 15.2,
    fontFamily: FUENTES.textoSemi,
    fontWeight: '600',
    marginTop: 2,
  },
  miniFoto: {
    width: '100%',
    height: 72,
    borderRadius: RADIO.peq,
    marginBottom: 6.4,
  },
  mejor: {
    fontWeight: '700',
  },
});
