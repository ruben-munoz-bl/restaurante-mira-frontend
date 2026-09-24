/**
 * Favoritos — espejo de Favoritos.jsx ('#/favoritos'): guardados con
 * selección para comparar (tabla Comparador), avisos de máximo/mínimo y
 * recomendaciones "de tu cocina" calculadas contra el catálogo.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { AuthPagina, AuthTarjeta, AuthError } from '../components/ui/Auth';
import RestaurantCard from '../components/RestaurantCard';
import Comparador from '../components/Comparador';
import { useRestaurantController } from '../controllers/useRestaurantController';
import { useAuthContext } from '../context/AuthContext';
import { recomendarPara } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES } from '../theme/tokens';
import { btnCta, btnSecundario } from '../theme/ui';

const TRADS = { es, ca, en };
const MAX_COMPARAR = 3;
const MAX_RECOMENDADOS = 6;

export default function Favoritos() {
  const t = useT(TRADS);
  const auth = useAuthContext();
  const router = useRouter();
  const { colores } = useTheme();
  const { todos, obtenerRestaurante } = useRestaurantController({
    dieta: auth.dieta,
    accesibilidad: auth.accesibilidad,
  });

  const ids = auth.favoritos;
  const [locales, setLocales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comparar, setComparar] = useState([]);
  const [comparando, setComparando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setComparar((prev) => prev.filter((id) => ids.includes(id)));
    Promise.all(ids.map((id) => obtenerRestaurante(id)))
      .then((list) => {
        if (vivo) {
          setLocales(list.filter(Boolean));
          setCargando(false);
        }
      })
      .catch(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [ids, obtenerRestaurante]);

  function toggleComparar(id) {
    if (comparar.includes(id)) {
      setComparar(comparar.filter((x) => x !== id));
      setAviso('');
    } else if (comparar.length >= MAX_COMPARAR) {
      setAviso(t('favoritos.compararMaximo', { max: MAX_COMPARAR }));
    } else {
      setComparar([...comparar, id]);
      setAviso('');
    }
  }

  const seleccionados = comparar
    .map((id) => locales.find((r) => String(r.id) === String(id)))
    .filter(Boolean);

  // Modo comparar: solo los elegidos, juntos; la rejilla individual se oculta.
  const enComparativa = comparando && seleccionados.length >= 2;

  const recomendados = useMemo(
    () => recomendarPara(locales, todos, MAX_RECOMENDADOS),
    [locales, todos],
  );

  function abrirDetalle(r) {
    router.push({ pathname: '/detalle', params: { id: String(r.id) } });
  }

  function abrirCarta(r) {
    router.push({ pathname: '/carta', params: { id: String(r.id) } });
  }

  return (
    <AppShell>
      <AuthPagina ancho>
        <AuthTarjeta ancho>
          <Text style={[estilos.titulo, { color: colores.tinta }]}>
            {t('favoritos.misFavoritos', { count: locales.length })}
          </Text>

          {cargando && <Text style={[estilos.p, { color: colores.tinta }]}>{t('favoritos.cargando')}</Text>}

          {!cargando && locales.length === 0 && (
            <View accessibilityRole="summary">
              <Text style={[estilos.vacio, { color: colores.gris }]}>{t('favoritos.vacio')}</Text>
              <Pressable onPress={() => router.push('/')}>
                <Text style={btnCta(colores, { peq: true })}>{t('favoritos.buscarRestaurantes')}</Text>
              </Pressable>
            </View>
          )}

          {!cargando && locales.length > 0 && !enComparativa && (
            <>
              <View style={estilos.grid}>
                {locales.map((r) => {
                  const marcado = comparar.includes(r.id);
                  return (
                    <View key={r.id}>
                      <Pressable
                        onPress={() => toggleComparar(r.id)}
                        style={estilos.checkFila}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: marcado }}
                      >
                        <View
                          style={[
                            estilos.checkCaja,
                            { borderColor: colores.primaryContainer, backgroundColor: marcado ? colores.primaryContainer : 'transparent' },
                          ]}
                        >
                          {marcado && <Text style={estilos.checkMark}>✓</Text>}
                        </View>
                        <Text style={[estilos.checkLabel, { color: colores.tinta }]}>
                          {t('favoritos.anadirComparar')}
                        </Text>
                      </Pressable>
                      <RestaurantCard
                        restaurant={r}
                        esFavorito={() => true}
                        onToggleFavorito={auth.toggleFavorito}
                        onVerCarta={abrirCarta}
                        onSelect={abrirDetalle}
                      />
                    </View>
                  );
                })}
              </View>
              {aviso ? <AuthError>{aviso}</AuthError> : null}
              <View style={estilos.acciones}>
                <Pressable
                  onPress={() => setComparando(true)}
                  disabled={seleccionados.length < 2}
                  accessibilityHint={seleccionados.length < 2 ? t('favoritos.compararMinimo') : undefined}
                >
                  <Text style={btnCta(colores, { disabled: seleccionados.length < 2 })}>
                    {t('favoritos.comparar', { count: seleccionados.length })}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {!cargando && enComparativa && (
            <>
              <Pressable onPress={() => setComparando(false)} style={estilos.volver}>
                <Text style={btnSecundario(colores, { peq: true })}>{t('favoritos.volverFavoritos')}</Text>
              </Pressable>
              <Comparador
                restaurantes={seleccionados}
                dieta={auth.dieta}
                onQuitar={(id) => toggleComparar(id)}
              />
            </>
          )}

          {!cargando && !enComparativa && locales.length > 0 && recomendados.length === 0 && (
            <Text style={[estilos.vacio, { color: colores.gris }]}>{t('favoritos.sinRecomendaciones')}</Text>
          )}

          {!cargando && !enComparativa && recomendados.length > 0 && (
            <View>
              <Text style={[estilos.sub, { color: colores.tinta }]}>{t('favoritos.recomendados')}</Text>
              <Text style={[estilos.vacio, { color: colores.gris }]}>{t('favoritos.deTuCocina')}</Text>
              <View style={estilos.grid}>
                {recomendados.map(({ restaurante: r, motivo }) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    esFavorito={() => false}
                    onToggleFavorito={auth.toggleFavorito}
                    onVerCarta={abrirCarta}
                    onSelect={abrirDetalle}
                  >
                    <Text style={[estilos.motivo, { color: colores.primaryContainer }]}>{motivo}</Text>
                  </RestaurantCard>
                ))}
              </View>
            </View>
          )}
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const estilos = StyleSheet.create({
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 28.8,
    margin: 0,
  },
  p: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
  },
  vacio: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
    marginVertical: 4,
  },
  grid: {
    gap: 20,
    width: '100%',
  },
  checkFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6.4,
  },
  checkCaja: {
    width: 17.6,
    height: 17.6,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  checkLabel: {
    fontSize: 14.08,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  acciones: {
    marginTop: 19.2,
  },
  volver: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  sub: {
    fontFamily: FUENTES.display,
    fontSize: 18.4,
    marginTop: 22.4,
    marginBottom: 9.6,
  },
  motivo: {
    fontSize: 13.12,
    fontWeight: '600',
    marginBottom: 6.4,
    fontFamily: FUENTES.textoSemi,
  },
});
