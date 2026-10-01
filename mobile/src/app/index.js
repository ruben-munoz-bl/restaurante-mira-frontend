/**
 * Home — espejo de App.jsx (ruta 'home'): Hero + buscador (SearchBar,
 * contador, aviso de dieta, rejilla con scroll infinito) + PromoBanner.
 */
import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell, useShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import { useRestaurantController } from '../controllers/useRestaurantController';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { PRECIOS, DISTANCIAS, ORDENES } from '../models/restaurantModel.js';
import Hero from '../components/Hero';
import SearchBar from '../components/SearchBar';
import RestaurantList, { Rejilla, columnasDe } from '../components/RestaurantList';
import RestaurantSkeleton from '../components/RestaurantSkeleton';
import PromoBanner from '../components/PromoBanner';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO, ANCHO_MAX, GUTTER, GUTTER_MOVIL } from '../theme/tokens';
import { btnCta, btnTexto } from '../theme/ui';

const TRADS = { es, ca, en };

export default function Index() {
  const t = useT(TRADS);
  const router = useRouter();
  const auth = useAuthContext();
  const { colores } = useTheme();
  const { width } = useWindowDimensions();
  const { scrollRef, headerH } = useShell();

  const {
    filtros,
    filtrados,
    visibles,
    total,
    modo,
    hayMas,
    cargandoMas,
    cargarMas,
    estado,
    error,
    cocinasDisponibles,
    zonasDisponibles,
    ocultosDieta,
    ignorarDieta,
    hayFiltrosActivos,
    actualizarFiltro,
    limpiarFiltros,
    recargar,
    verTodosIgual,
  } = useRestaurantController({ dieta: auth.dieta, accesibilidad: auth.accesibilidad });

  const opciones = useMemo(
    () => ({
      cocinas: cocinasDisponibles,
      zonas: zonasDisponibles,
      precios: PRECIOS,
      distancias: DISTANCIAS,
      ordenes: ORDENES,
    }),
    [cocinasDisponibles, zonasDisponibles],
  );

  const esFavorito = useMemo(() => (id) => auth.favoritos.includes(id), [auth.favoritos]);

  const [buscadorY, setBuscadorY] = useState(0);

  function irAlBuscador() {
    if (!buscadorY) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, buscadorY - headerH), animated: true });
  }

  function cercaFinal() {
    if (hayMas && !cargandoMas) cargarMas();
  }

  function abrirDetalle(r) {
    router.push({ pathname: '/detalle', params: { id: String(r.id) } });
  }

  function abrirCarta(r) {
    router.push({ pathname: '/carta', params: { id: String(r.id) } });
  }

  const gutter = width <= 640 ? GUTTER_MOVIL : GUTTER;
  const cols = columnasDe(width);

  const skelInicial = Array.from({ length: 8 }, (_, i) => ({ key: `skel-${i}` }));

  return (
    <AppShell onCercaFinal={cercaFinal}>
      <Hero total={total} numZonas={zonasDisponibles.length} onBuscar={irAlBuscador} />

      <View
        onLayout={(e) => setBuscadorY(e.nativeEvent.layout.y)}
        style={[styles.buscar, { paddingHorizontal: gutter, maxWidth: ANCHO_MAX }]}
        accessibilityLabel={t('busqueda.titulo')}
      >
        <Text style={[styles.buscarTitulo, { color: colores.tinta }]}>{t('busqueda.titulo')}</Text>

        {estado === 'cargando' && (
          <View accessibilityLabel={t('otros.cargando')} accessibilityLiveRegion="polite">
            <Rejilla cols={cols} items={skelInicial} renderItem={() => <RestaurantSkeleton />} />
          </View>
        )}

        {estado === 'error' && (
          <View style={[styles.errorPanel, { backgroundColor: colores.fondoSuave, borderColor: colores.rojo }]}>
            <Text style={[styles.vacioTitulo, { color: colores.tinta }]}>{t('otros.error')}</Text>
            <Text style={[styles.errorTxt, { color: colores.gris }]}>{error}</Text>
            <Pressable onPress={recargar} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Text style={btnCta(colores)}>{t('otros.reintentar')}</Text>
            </Pressable>
          </View>
        )}

        {estado === 'listo' && (
          <>
            <SearchBar
              filtros={filtros}
              opciones={opciones}
              hayFiltrosActivos={hayFiltrosActivos}
              onChange={actualizarFiltro}
              onClear={limpiarFiltros}
            />

            <Text style={[styles.contador, { color: colores.tinta }]} accessibilityLiveRegion="polite">
              {t('lista.mostrando', {
                n: visibles.length,
                total: modo === 'pagina' ? total || filtrados.length : filtrados.length,
              })}
              {filtros.q ? ` ${t('lista.de')} "${filtros.q}"` : ''}
            </Text>

            {ocultosDieta > 0 && !ignorarDieta && (
              <View style={[styles.aviso, { backgroundColor: colores.verdeSuave, borderColor: colores.primaryContainer }]}>
                <Text style={[styles.avisoTxt, { color: colores.tinta }]}>
                  {ocultosDieta} {ocultosDieta === 1 ? t('lista.localOculto') : t('lista.localesOcultos')}{' '}
                  {t('lista.porTuDieta')}{' '}
                </Text>
                <Pressable onPress={() => router.push('/cuenta')} accessibilityRole="link">
                  <Text style={[styles.avisoTxt, { color: colores.primaryContainer, textDecorationLine: 'underline' }]}>
                    {t('lista.cambiarCuenta')}
                  </Text>
                </Pressable>
                <Text style={[styles.avisoTxt, { color: colores.tinta }]}> · </Text>
                <Pressable onPress={verTodosIgual}>
                  <Text style={btnTexto(colores)}>{t('lista.verTodos')}</Text>
                </Pressable>
              </View>
            )}

            <RestaurantList
              restaurants={visibles}
              filtros={filtros}
              onClear={limpiarFiltros}
              onSelect={abrirDetalle}
              hayMas={hayMas}
              cargandoMas={cargandoMas}
              esFavorito={esFavorito}
              onToggleFavorito={auth.toggleFavorito}
              onVerCarta={abrirCarta}
              cargandoInicial={estado === 'cargando'}
            />
          </>
        )}
      </View>

      <PromoBanner />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  buscar: {
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },
  buscarTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 28,
    marginTop: 32,
    marginBottom: 56,
  },
  contador: {
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
    fontSize: 15.2,
    marginTop: 17.6,
    marginBottom: 16,
  },
  aviso: {
    borderLeftWidth: 4,
    borderTopRightRadius: RADIO.peq,
    borderBottomRightRadius: RADIO.peq,
    paddingVertical: 10.4,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  avisoTxt: {
    fontSize: 14.08,
    fontFamily: FUENTES.texto,
    lineHeight: 20,
  },
  errorPanel: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 24,
    alignItems: 'center',
  },
  errorTxt: {
    marginTop: 6.4,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: FUENTES.texto,
    fontSize: 15,
  },
  vacioTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 22.4,
  },
});
