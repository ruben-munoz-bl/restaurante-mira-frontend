/**
 * Barra de búsqueda con filtros — espejo de .searchbar:
 * campo de texto con lupa, plegado de filtros (≤767 con toggle) y botón Limpiar.
 * Los <select> nativos se sustituyen por SelectCampo (Modal).
 */
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { DIAS, FRANJAS, DISTANCIAS } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO, ANCHO_MAX, GUTTER, GUTTER_MOVIL, sombraFlotante } from '../theme/tokens';
import { btnSecundario } from '../theme/ui';
import { IconoBusqueda } from './shell/Iconos';
import SelectCampo, { CampoEtiqueta } from './ui/SelectCampo';
import BuscadorMovil from './BuscadorMovil';

const TRADS = { es, ca, en };
const GAP = 14.4; // 0.9rem
const PAD = 19.2; // 1.2rem

/** Opciones de hora libre (input type=time del web): media hora. */
const HORAS = [{ valor: '', etiqueta: '' }];
for (let h = 0; h < 24; h += 1) {
  for (const m of ['00', '30']) {
    HORAS.push({ valor: `${String(h).padStart(2, '0')}:${m}`, etiqueta: `${String(h).padStart(2, '0')}:${m}` });
  }
}

export default function SearchBar({ filtros, opciones, hayFiltrosActivos, onChange, onClear, total = 0 }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { width } = useWindowDimensions();
  const esMovil = width <= 767;
  const [qLocal, setQLocal] = useState(filtros.q);
  const [plegado, setPlegado] = useState(() => width < 768);

  useEffect(() => setQLocal(filtros.q), [filtros.q]);

  function traducirFranja(f) {
    const map = {
      'Cualquier hora': t('busqueda.cualquierHora'),
      'Desayuno (09:00-12:00)': t('busqueda.desayuno'),
      'Comida (13:00-16:00)': t('busqueda.comida'),
      'Cena (20:00-23:30)': t('busqueda.cena'),
    };
    return map[f.label] || f.label;
  }
  // Etiquetas por valor estable: el texto de los modelos va en español.
  const CLAVES_DISTANCIA = { '': 'cualquierDistancia', 1: 'menos1km', 3: 'menos3km', 5: 'menos5km', 10: 'menos10km' };
  const CLAVES_ORDEN = { Relevancia: 'relevancia', 'Valoración': 'valoracion', Distancia: 'distanciaOrden', Precio: 'precioOrden' };
  const CLAVES_DIA = { Lunes: 'lunes', Martes: 'martes', 'Miércoles': 'miercoles', Jueves: 'jueves', Viernes: 'viernes', 'Sábado': 'sabado', Domingo: 'domingo' };

  const gutter = width <= 640 ? GUTTER_MOVIL : GUTTER;
  const seccionW = Math.min(width, ANCHO_MAX) - gutter * 2;
  const cols = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
  const innerW = seccionW - PAD * 2;
  const itemW = cols === 1 ? innerW : (innerW - GAP * (cols - 1)) / cols;
  const textoW = cols === 1 ? innerW : cols >= 4 ? itemW * 2 + GAP : innerW;
  // En móvil los filtros van en una hoja inferior a todo el ancho.
  const anchoCampo = esMovil ? width - 40 : cols === 1 ? innerW : itemW;

  const filtrosVisibles = !esMovil || !plegado;

  const selects = (
    <>
      <SelectCampo
        label={t('busqueda.precio')}
        value={filtros.precio}
        placeholder={t('busqueda.cualquiera')}
        opciones={opciones.precios.map((p) => ({ valor: p, etiqueta: p }))}
        onChange={(v) => onChange('precio', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.cocina')}
        value={filtros.cocina}
        placeholder={t('busqueda.todas')}
        opciones={opciones.cocinas.map((c) => ({ valor: c, etiqueta: c }))}
        onChange={(v) => onChange('cocina', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.zona')}
        value={filtros.zona}
        placeholder={t('busqueda.todaCataluna')}
        opciones={opciones.zonas.map((z) => ({ valor: z, etiqueta: z.replace(', Spain', '') }))}
        onChange={(v) => onChange('zona', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.distancia')}
        value={filtros.distanciaMax}
        placeholder={t('busqueda.cualquierDistancia')}
        opciones={DISTANCIAS.map((d) => ({ valor: d.value, etiqueta: CLAVES_DISTANCIA[d.value] ? t(`busqueda.${CLAVES_DISTANCIA[d.value]}`) : d.label }))}
        onChange={(v) => onChange('distanciaMax', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.dia')}
        value={filtros.dia}
        placeholder={t('busqueda.cualquierDia')}
        opciones={DIAS.filter(Boolean).map((d) => ({ valor: d, etiqueta: CLAVES_DIA[d] ? t(`modelos.${CLAVES_DIA[d]}`) : d }))}
        onChange={(v) => onChange('dia', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.franjaHoraria')}
        value={filtros.franja}
        placeholder={t('busqueda.cualquierHora')}
        opciones={FRANJAS.map((f) => ({ valor: f.value, etiqueta: traducirFranja(f) })).filter((o) => o.valor !== '')}
        onChange={(v) => onChange('franja', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.hora')}
        value={filtros.hora}
        opciones={HORAS}
        onChange={(v) => onChange('hora', v)}
        style={{ width: anchoCampo }}
      />
      <SelectCampo
        label={t('busqueda.ordenarPor')}
        value={filtros.orden}
        opciones={opciones.ordenes.map((o) => ({ valor: o, etiqueta: CLAVES_ORDEN[o] ? t(`busqueda.${CLAVES_ORDEN[o]}`) : o }))}
        onChange={(v) => onChange('orden', v)}
        style={{ width: anchoCampo }}
      />
    </>
  );

  if (esMovil) {
    return (
      <BuscadorMovil
        filtros={filtros}
        opciones={opciones}
        hayFiltrosActivos={hayFiltrosActivos}
        onChange={onChange}
        onClear={onClear}
        total={total}
        selects={selects}
      />
    );
  }

  const limpiar = (
    <>
      <View style={{ width: anchoCampo, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClear}
          disabled={!hayFiltrosActivos}
          style={({ pressed }) => ({ opacity: !hayFiltrosActivos ? 0.45 : pressed ? 0.75 : 1 })}
        >
          <Text style={btnSecundario(colores, { disabled: !hayFiltrosActivos })}>{t('busqueda.limpiar')}</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={[styles.card, { backgroundColor: colores.papel, borderColor: colores.glassBorder }, sombraFlotante(colores)]}>
      <View style={{ width: textoW }}>
        <CampoEtiqueta>{t('busqueda.placeholder')}</CampoEtiqueta>
        <View style={[styles.inputWrap, { backgroundColor: colores.fondo, borderColor: colores.borde }]}>
          <View style={styles.lupa}>
            <IconoBusqueda size={16} color={colores.gris} />
          </View>
          <TextInput
            value={qLocal}
            onChangeText={setQLocal}
            onSubmitEditing={() => {
              if (qLocal !== filtros.q) onChange('q', qLocal);
            }}
            placeholder={t('busqueda.placeholder') + '…'}
            placeholderTextColor={colores.gris}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.input, { color: colores.tinta }]}
            accessibilityLabel={t('busqueda.placeholder')}
          />
        </View>
      </View>

      {esMovil && (
        <Pressable
          onPress={() => setPlegado((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !plegado }}
          style={({ pressed }) => [
            styles.toggle,
            { backgroundColor: colores.papel, borderColor: colores.borde, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.toggleTxt, { color: colores.primaryContainer }]}>
            {plegado ? t('busqueda.mostrarFiltros') : t('busqueda.ocultarFiltros')}
          </Text>
        </Pressable>
      )}

      {filtrosVisibles && (
        <View style={cols === 1 ? styles.filtrosMovil : styles.filtrosEscritorio}>{selects}{limpiar}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: PAD,
    marginTop: -40,
    gap: GAP,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lupa: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    fontFamily: FUENTES.texto,
    fontSize: 15,
    paddingVertical: 9.6,
    paddingHorizontal: 12,
    paddingLeft: 38.4,
    width: '100%',
  },
  toggle: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9.6,
    paddingHorizontal: 9.6,
    alignItems: 'center',
  },
  toggleTxt: {
    fontFamily: FUENTES.textoBold,
    fontWeight: '700',
    fontSize: 15,
  },
  filtrosEscritorio: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    width: '100%',
  },
  filtrosMovil: {
    gap: GAP,
    width: '100%',
  },
  btnTxt: {
    fontFamily: FUENTES.textoSemi,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});
