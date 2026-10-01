/**
 * Insignias de dieta/alérgenos + mini-leyenda — espejo de Sellos.jsx web.
 * Los textos vienen del catálogo (leyendaSellos): nada hardcodeado.
 */
import { View, Text, StyleSheet } from 'react-native';
import { leyendaSellos, codigoAlergeno } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { FUENTES } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const TRADS = { es, ca, en };

const COLORES = {
  vegano: { color: '#2e7d32', bg: '#e8f5e9' },
  veg: { color: '#6a1b9a', bg: '#f3e5f5' },
  sg: { color: '#8d6e00', bg: '#fff8e1' },
};

function Sello({ texto, tipo, etiqueta }) {
  const c = COLORES[tipo];
  return (
    <View
      style={[styles.sello, { backgroundColor: c.bg, borderColor: c.color }]}
      accessibilityLabel={etiqueta}
    >
      <Text style={[styles.selloTxt, { color: c.color }]}>{texto}</Text>
    </View>
  );
}

export function Sellos({ plato }) {
  const t = useT(TRADS);
  return (
    <View style={styles.sellos}>
      {plato.vegano && <Sello texto="🌱" tipo="vegano" etiqueta={t('sellos.vegano')} />}
      {!plato.vegano && plato.vegetariano && (
        <Sello texto="VG" tipo="veg" etiqueta={t('sellos.vegetariano')} />
      )}
      {plato.sinGluten && <Sello texto="SG" tipo="sg" etiqueta={t('sellos.sinGluten')} />}
    </View>
  );
}

export function ConflictosAlergenos({ alergenos }) {
  const lista = alergenos || [];
  if (!lista.length) return null;
  return (
    <View style={styles.sellos}>
      {lista.map((a) => (
        <View key={a} style={styles.mini} accessibilityLabel={a}>
          <Text style={styles.miniTxt}>{codigoAlergeno(a)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Mini-leyenda de una línea (sellos de dieta) para listas compactas. */
export function MiniLeyenda() {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const items = leyendaSellos().slice(0, 3);
  return (
    <Text style={[styles.leyenda, { color: colores.gris }]} accessibilityLabel={t('sellos.leyendaSellos')}>
      {items.map((e, i) => (
        <Text key={e.nombre}>
          {i > 0 ? ' · ' : ''}
          <Text style={{ fontWeight: '700' }}>{e.simbolo}</Text> {e.nombre}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  sellos: {
    flexDirection: 'row',
    gap: 4.8,
    alignItems: 'center',
  },
  sello: {
    minWidth: 23.2,
    height: 23.2,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  selloTxt: {
    fontSize: 11.2,
    fontWeight: '800',
    fontFamily: FUENTES.textoExtra,
  },
  mini: {
    minWidth: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8f1d14',
    backgroundColor: '#fdecea',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  miniTxt: {
    fontSize: 10.88,
    fontWeight: '800',
    color: '#8f1d14',
    fontFamily: FUENTES.textoExtra,
  },
  leyenda: {
    fontSize: 13.12,
    marginBottom: 9.6,
    fontFamily: FUENTES.texto,
  },
});
