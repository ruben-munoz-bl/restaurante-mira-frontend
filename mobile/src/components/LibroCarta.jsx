/**
 * Libro de carta — espejo de LibroCarta.jsx web (portada + pliegos con
 * volteo 3D). En RN: perspective + rotateY animados con Reanimated,
 * cara visible conmutada por opacidad (sin backface-visibility), cierre
 * tocando el fondo y swipe horizontal con props de responder.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing as EasingRN,
  Dimensions,
} from 'react-native';
import AnimatedR, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  cartaLibro,
  temaCarta,
  dietaActiva,
  aptosEnCarta,
  leyendaSellos,
} from '../models/restaurantModel.js';
import { Sellos, ConflictosAlergenos } from './Sellos.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { FUENTES } from '../theme/tokens';

const TRADS = { es, ca, en };
const VW = Dimensions.get('window').width;

const EYEBROWS = {
  Entrantes: 'Para Comenzar',
  Principales: 'Principales de Temporada',
  Postres: 'Dulces & Bodega',
};

const PAPEL = '#faf7f2';
const TINTA_PAPEL = '#1c1917';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* ---------- Contenidos de página (a nivel de módulo) ---------- */

function ContenidoSeccion({ seccion, dieta, mostrarConflictos, numero }) {
  const eyebrow = EYEBROWS[seccion.titulo] || seccion.titulo;
  return (
    <>
      <View style={estilos.paginaTop}>
        <Text style={estilos.eyebrow}>{eyebrow}</Text>
        <Text style={estilos.paginaNum}>{numero}</Text>
      </View>
      <Text style={estilos.seccionTitulo}>{seccion.titulo}</Text>
      <ScrollView style={estilos.paginaCuerpo} showsVerticalScrollIndicator={false}>
        <View style={estilos.platos}>
          {seccion.platos.map((p) => {
            const conflictos = (dieta?.alergias || []).filter((a) => p.alergenos.includes(a));
            return (
              <View key={p.nombre} style={estilos.plato}>
                <View style={estilos.platoCab}>
                  <Text style={estilos.platoNombre}>{p.nombre}</Text>
                  <Text style={estilos.precio}>{Number(p.precio).toFixed(2)}€</Text>
                </View>
                <Text style={estilos.platoDesc}>{p.descripcion}</Text>
                <View style={estilos.platoTags}>
                  <Sellos plato={p} />
                  {mostrarConflictos ? <ConflictosAlergenos alergenos={conflictos} /> : null}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
    </>
  );
}

function ContenidoLeyenda({ leyenda, numero }) {
  const t = useT(TRADS);
  return (
    <>
      <View style={estilos.paginaTop}>
        <Text style={estilos.eyebrow}>{t('libro.leyenda')}</Text>
        <Text style={estilos.paginaNum}>{numero}</Text>
      </View>
      <Text style={estilos.seccionTitulo}>{t('libro.leyenda')}</Text>
      <ScrollView style={estilos.paginaCuerpo} showsVerticalScrollIndicator={false}>
        <View style={estilos.leyendaLista}>
          {leyenda.map((e) => (
            <View key={e.nombre} style={estilos.leyendaItem}>
              <View style={estilos.leyendaSimbolo}>
                <Text style={estilos.leyendaSimboloTxt}>{e.simbolo}</Text>
              </View>
              <Text style={estilos.leyendaTxt}>
                <Text style={estilos.leyendaNombre}>{e.nombre}.</Text> {e.descripcion}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
    </>
  );
}

function ContenidoVacia({ numero }) {
  return (
    <View style={estilos.vacia} accessibilityElementsHidden importantForAccessibility="no">
      {numero !== '' && numero != null ? <Text style={estilos.vaciaNum}>{numero}</Text> : null}
      <Text style={estilos.vaciaMarca}>✦</Text>
    </View>
  );
}

function ContenidoPortada({ restaurant, tema, libro, totalPlatos, conDieta, aptos }) {
  const t = useT(TRADS);
  const [pulso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 1600, easing: EasingRN.inOut(EasingRN.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 1600, easing: EasingRN.inOut(EasingRN.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulso]);

  const cresta = {
    transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
  };
  const cta = {
    transform: [{ translateY: pulso.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  };

  const iniciales = (restaurant.nombre || 'M')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tamTitulo = clamp(25.6, VW * 0.035, 35.2);

  return (
    <>
      <View style={estilos.marco} accessibilityElementsHidden importantForAccessibility="no">
        <View style={estilos.esquinas}>
          <Text style={estilos.esquinaTxt}>✦</Text>
          <Text style={estilos.esquinaTxt}>✦</Text>
        </View>
        <View style={[estilos.esquinas, { marginTop: 'auto' }]}>
          <Text style={estilos.esquinaTxt}>✦</Text>
          <Text style={estilos.esquinaTxt}>✦</Text>
        </View>
      </View>

      <View style={estilos.portadaTop}>
        <Text style={estilos.portadaBadge}>{tema.nombre}</Text>
      </View>

      <View style={estilos.portadaCentro}>
        <Animated.View style={[estilos.crest, cresta]}>
          <Text style={estilos.crestTxt}>★</Text>
        </Animated.View>
        <Text style={[estilos.portadaTitulo, { fontSize: tamTitulo }]} numberOfLines={2}>
          {restaurant.nombre}
        </Text>
        <Text style={estilos.portadaSub}>
          {restaurant.cocina} · {restaurant.precio}
        </Text>
        <View style={estilos.portadaLinea} />
        <Text style={estilos.portadaDatos}>
          {libro.secciones.length} {t('libro.secciones')} · {totalPlatos} {t('libro.platos')}
          {conDieta ? ` · ${t('libro.aptosParaTi')}: ${aptos}` : ''}
          {restaurant.menuInfantil === true ? ` · ${t('libro.menuInfantil')}` : ''}
        </Text>
        <Text style={estilos.portadaIniciales} accessibilityElementsHidden>
          {iniciales}
        </Text>
      </View>

      <View style={estilos.portadaCta}>
        <Animated.View style={[estilos.ctaPill, cta]}>
          <Text style={estilos.ctaPillTxt}>{t('libro.abrirMenu')}</Text>
        </Animated.View>
        <Text style={estilos.ctaHint}>{t('libro.desliza')}</Text>
      </View>
    </>
  );
}

/* ---------- Cara de página (papel o cuero) ---------- */

function Cara({ lado, cuero, children, style }) {
  const radios = cuero
    ? { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderTopRightRadius: 12, borderBottomRightRadius: 12 }
    : lado === 'izq'
      ? { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderTopRightRadius: 3, borderBottomRightRadius: 3 }
      : { borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 12, borderBottomRightRadius: 12 };
  return (
    <View style={[estilos.cara, radios, cuero ? estilos.cuero : estilos.papel, style]}>
      {cuero ? (
        <LinearGradient
          colors={['#1f1a17', '#151210', '#0d0a08']}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

/* ---------- Libro ---------- */

export default function LibroCarta({ restaurant, dieta, onClose }) {
  const t = useT(TRADS);

  const [spread, setSpread] = useState(0);
  const [volteo, setVolteo] = useState(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const progreso = useSharedValue(0);
  const dirSV = useSharedValue(1);
  const montado = useRef(true);
  const [apertura] = useState(() => new Animated.Value(0));
  const libroRect = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const libro = useMemo(() => cartaLibro(restaurant), [restaurant]);
  const tema = useMemo(() => temaCarta(restaurant.cocina), [restaurant.cocina]);
  const leyenda = useMemo(() => leyendaSellos(), []);
  const conDieta = dietaActiva(dieta);
  const aptos = conDieta ? aptosEnCarta(restaurant, dieta) : null;
  const totalPlatos = libro.secciones.reduce((n, s) => n + s.platos.length, 0);

  const spreads = useMemo(() => {
    const paginas = [
      ...libro.secciones.map((s, i) => ({ tipo: 'seccion', ...s, num: i + 1 })),
      { tipo: 'leyenda', num: libro.secciones.length + 1 },
    ];
    if (paginas.length % 2 === 1) {
      paginas.push({ tipo: 'vacia', num: paginas.length + 1 });
    }
    const lista = [{ tipo: 'portada' }];
    for (let i = 0; i < paginas.length; i += 2) {
      lista.push({ tipo: 'spread', izq: paginas[i], der: paginas[i + 1] });
    }
    return lista;
  }, [libro]);

  const maxSpread = spreads.length - 1;
  const wHoja = dims.w > 0 ? (dims.w - 14) / 2 : 0;

  useEffect(() => {
    montado.current = true;
    Animated.timing(apertura, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    return () => {
      montado.current = false;
    };
  }, [apertura]);

  function completar(v) {
    if (!montado.current) return;
    setSpread(v.to);
    setVolteo(null);
    progreso.value = 0;
  }

  function irA(n) {
    if (volteo) return;
    const destino = clamp(n, 0, maxSpread);
    if (destino === spread) return;
    const dir = destino > spread ? 1 : -1;
    const esTapa = spreads[spread].tipo === 'portada' || spreads[destino].tipo === 'portada';
    const v = { dir, from: spread, to: destino, esTapa };
    dirSV.value = dir;
    progreso.value = 0;
    setVolteo(v);
    progreso.value = withTiming(
      1,
      {
        duration: esTapa ? 450 : 700,
        easing: esTapa
          ? EasingRN.bezier(0.25, 0.1, 0.25, 1)
          : EasingRN.bezier(0.45, 0.05, 0.35, 1),
      },
      (fin) => {
        'worklet';
        if (fin) runOnJS(completar)(v);
      },
    );
  }

  function moverResponder(_, g) {
    if (volteo) return false;
    return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
  }

  function soltarResponder(_, g) {
    if (g.dx < -48) irA(spread + 1);
    else if (g.dx > 48) irA(spread - 1);
  }

  function cerrarDesdeFondo(e) {
    const { locationX, locationY } = e.nativeEvent;
    const { x, y, width, height } = libroRect.current;
    const dentro =
      locationX >= x && locationX <= x + width && locationY >= y && locationY <= y + height;
    if (!dentro) onClose();
  }

  function pintarPagina(pg) {
    if (!pg) return <ContenidoVacia numero="" />;
    if (pg.tipo === 'portada') {
      return (
        <ContenidoPortada
          restaurant={restaurant}
          tema={tema}
          libro={libro}
          totalPlatos={totalPlatos}
          conDieta={conDieta}
          aptos={aptos}
        />
      );
    }
    if (pg.tipo === 'vacia') return <ContenidoVacia numero={pg.num ?? ''} />;
    if (pg.tipo === 'leyenda') return <ContenidoLeyenda leyenda={leyenda} numero={pg.num} />;
    if (pg.tipo === 'seccion') {
      return <ContenidoSeccion seccion={pg} dieta={dieta} mostrarConflictos={conDieta} numero={pg.num} />;
    }
    return <ContenidoVacia numero="" />;
  }

  const hojaAnim = useAnimatedStyle(() => {
    const grados = dirSV.value === 1 ? -180 * progreso.value : 180 * progreso.value;
    const off = dirSV.value === 1 ? -wHoja / 2 : wHoja / 2;
    return {
      transform: [{ perspective: 1800 }, { translateX: off }, { rotateY: `${grados}deg` }, { translateX: -off }],
    };
  }, [wHoja]);

  const anversoAnim = useAnimatedStyle(() => {
    const grados = Math.abs(dirSV.value === 1 ? -180 * progreso.value : 180 * progreso.value);
    return { opacity: grados < 90 ? 1 : 0 };
  }, []);

  const reversoAnim = useAnimatedStyle(() => {
    const grados = Math.abs(dirSV.value === 1 ? -180 * progreso.value : 180 * progreso.value);
    return { opacity: grados >= 90 ? 1 : 0, transform: [{ rotateY: '180deg' }] };
  }, []);

  const tapaAnim = useAnimatedStyle(() => ({
    opacity: dirSV.value === 1 ? 1 - progreso.value : progreso.value,
  }), []);

  const contenedorStyle = {
    opacity: apertura,
    transform: [{ translateY: apertura.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  let hojas = null;

  if (volteo) {
    const from = spreads[volteo.from];
    const to = spreads[volteo.to];
    const adelante = volteo.dir === 1;
    const esTapa = volteo.esTapa;

    if (esTapa) {
      const contenido = from.tipo === 'portada' ? to : from;
      const contIzq = contenido.tipo === 'spread' ? contenido.izq : { tipo: 'vacia', num: '' };
      const contDer = contenido.tipo === 'spread' ? contenido.der : { tipo: 'vacia', num: '' };
      const portada = from.tipo === 'portada' ? from : to;

      hojas = (
        <View style={estilos.spread} pointerEvents="none">
          <View style={estilos.pliego}>
            <Cara lado="izq">{pintarPagina(contIzq)}</Cara>
          </View>
          <Lomo />
          <View style={estilos.pliego}>
            <Cara lado="der">{pintarPagina(contDer)}</Cara>
          </View>
          <AnimatedR.View
            style={[
              estilos.hojaTapa,
              { left: adelante ? 14 : 0, right: adelante ? 0 : 14 },
              tapaAnim,
            ]}
          >
            <Cara cuero>{pintarPagina(portada)}</Cara>
          </AnimatedR.View>
        </View>
      );
    } else {
      const underIzq = adelante ? from.izq : to.izq;
      const underDer = adelante ? to.der : from.der;
      const leafAnverso = adelante ? from.der : from.izq;
      const leafReverso = adelante ? to.izq : to.der;

      hojas = (
        <View style={estilos.spread} pointerEvents="none">
          <View style={estilos.pliego}>
            <Cara lado="izq">{pintarPagina(underIzq)}</Cara>
          </View>
          <Lomo />
          <View style={estilos.pliego}>
            <Cara lado="der">{pintarPagina(underDer)}</Cara>
          </View>
          <AnimatedR.View
            style={[
              estilos.hoja,
              adelante ? { left: wHoja + 14, width: wHoja } : { left: 0, width: wHoja },
              hojaAnim,
            ]}
          >
            <AnimatedR.View style={[StyleSheet.absoluteFill, anversoAnim]}>
              <Cara lado={adelante ? 'der' : 'izq'}>{pintarPagina(leafAnverso)}</Cara>
            </AnimatedR.View>
            <AnimatedR.View style={[StyleSheet.absoluteFill, reversoAnim]}>
              <Cara lado={adelante ? 'izq' : 'der'}>{pintarPagina(leafReverso)}</Cara>
            </AnimatedR.View>
          </AnimatedR.View>
        </View>
      );
    }
  } else if (spread === 0) {
    hojas = (
      <View style={[estilos.spread, estilos.spreadPortada]}>
        <Pressable
          style={estilos.pliegoSolo}
          onPress={() => irA(1)}
          accessibilityRole="button"
          accessibilityLabel={t('libro.cartaDe', { nombre: restaurant.nombre })}
        >
          <Cara cuero>{pintarPagina(spreads[0])}</Cara>
        </Pressable>
      </View>
    );
  } else {
    const pg = spreads[spread];
    hojas = (
      <View style={estilos.spread}>
        <Pressable style={estilos.pliego} onPress={() => irA(spread - 1)} accessibilityRole="button">
          <Cara lado="izq">{pintarPagina(pg.izq)}</Cara>
        </Pressable>
        <Lomo />
        <Pressable style={estilos.pliego} onPress={() => irA(spread + 1)} accessibilityRole="button">
          <Cara lado="der">{pintarPagina(pg.der)}</Cara>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={estilos.fondo} onPress={cerrarDesdeFondo} accessibilityRole="button" accessibilityLabel={t('libro.cerrarCarta')}>
      <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, estilos.fondoTinte]} />
      <Animated.View
        style={[estilos.libro, contenedorStyle]}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          libroRect.current = { x, y, width, height };
        }}
      >
        <View
          style={estilos.hojas}
          onLayout={(e) => setDims({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          onMoveShouldSetResponder={moverResponder}
          onResponderRelease={soltarResponder}
        >
          {hojas}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function Lomo() {
  return (
    <View style={estilos.lomo} accessibilityElementsHidden importantForAccessibility="no">
      <LinearGradient
        colors={['rgba(30,22,12,0)', 'rgba(30,22,12,0.22)', 'rgba(18,12,6,0.4)', 'rgba(30,22,12,0.22)', 'rgba(30,22,12,0)']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(212,175,55,0.16)', 'rgba(212,175,55,0)', 'rgba(212,175,55,0)', 'rgba(212,175,55,0)', 'rgba(212,175,55,0.16)']}
        locations={[0, 0.1, 0.5, 0.9, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/* ---------- Estilos ---------- */

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Math.max(Dimensions.get('window').height * 0.04, 5.6),
    paddingHorizontal: 16,
    paddingBottom: 5.6,
  },
  fondoTinte: {
    backgroundColor: 'rgba(0, 34, 24, 0.5)',
  },
  libro: {
    width: '100%',
    maxWidth: 1180,
    height: '100%',
    borderRadius: 14,
  },
  hojas: {
    flex: 1,
    position: 'relative',
  },
  spread: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  spreadPortada: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pliego: {
    flex: 1,
    height: '100%',
    minWidth: 0,
  },
  pliegoSolo: {
    width: '90%',
    maxWidth: 440,
    height: '100%',
  },
  lomo: {
    width: 14,
    alignSelf: 'stretch',
  },
  cara: {
    flex: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  papel: {
    backgroundColor: PAPEL,
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 80, 0.25)',
    paddingVertical: 16,
    paddingHorizontal: 19.2,
    paddingBottom: 17.6,
  },
  cuero: {
    backgroundColor: '#151210',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    paddingVertical: 25.6,
    paddingHorizontal: 21.6,
    paddingBottom: 22.4,
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center',
  },
  hoja: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },
  hojaTapa: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },

  /* Página de contenido */
  paginaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(146, 100, 20, 0.2)',
    paddingBottom: 6.4,
    marginBottom: 8,
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 11.2,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#926414',
    fontFamily: FUENTES.textoExtra,
  },
  paginaNum: {
    fontSize: 12.48,
    fontWeight: '700',
    color: '#78716c',
    fontFamily: FUENTES.textoBold,
  },
  paginaCuerpo: {
    flex: 1,
    minHeight: 0,
  },
  seccionTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: clamp(18.4, VW * 0.02, 21.6),
    letterSpacing: 0.6,
    color: TINTA_PAPEL,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(146, 100, 20, 0.25)',
    paddingBottom: 5.6,
    marginBottom: 11.2,
    flexShrink: 0,
  },
  platos: {
    gap: 13.6,
  },
  plato: {},
  platoCab: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 13.6,
    alignItems: 'baseline',
  },
  platoNombre: {
    fontSize: 15.2,
    fontWeight: '600',
    color: TINTA_PAPEL,
    fontFamily: FUENTES.textoSemi,
    flexShrink: 1,
  },
  precio: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 15.68,
    color: '#926414',
  },
  platoDesc: {
    marginTop: 2.9,
    marginBottom: 4.5,
    fontSize: 13.12,
    fontFamily: FUENTES.displayRegular,
    fontStyle: 'italic',
    color: '#57534e',
    lineHeight: 18.4,
  },
  platoTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4.8,
    alignItems: 'center',
  },

  /* Página vacía */
  vacia: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  vaciaNum: {
    fontFamily: FUENTES.display,
    fontSize: 22.4,
    fontWeight: '700',
    color: '#b9a88a',
  },
  vaciaMarca: {
    fontSize: 19.2,
    color: '#c4b59a',
    opacity: 0.7,
  },

  /* Leyenda */
  leyendaLista: {
    gap: 8.8,
  },
  leyendaItem: {
    flexDirection: 'row',
    gap: 8.8,
    alignItems: 'flex-start',
  },
  leyendaSimbolo: {
    minWidth: 27.2,
    height: 27.2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#926414',
    backgroundColor: PAPEL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leyendaSimboloTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#926414',
    fontFamily: FUENTES.textoExtra,
  },
  leyendaTxt: {
    flex: 1,
    fontSize: 13.6,
    color: '#44403c',
    lineHeight: 19,
    fontFamily: FUENTES.texto,
  },
  leyendaNombre: {
    fontWeight: '700',
  },

  /* Portada */
  marco: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 10,
    paddingVertical: 7.2,
    paddingHorizontal: 8.8,
  },
  esquinas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  esquinaTxt: {
    fontSize: 11.2,
    color: 'rgba(232, 190, 74, 0.55)',
  },
  portadaTop: {
    zIndex: 1,
    alignSelf: 'flex-start',
  },
  portadaBadge: {
    fontSize: 11.2,
    fontWeight: '700',
    letterSpacing: 2.9,
    textTransform: 'uppercase',
    color: '#e8be4a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 190, 74, 0.4)',
    paddingBottom: 4.8,
    fontFamily: FUENTES.textoBold,
  },
  portadaCentro: {
    zIndex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  crest: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(232, 190, 74, 0.65)',
    backgroundColor: 'rgba(80, 50, 10, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 9,
    elevation: 6,
  },
  crestTxt: {
    fontSize: 21.6,
    color: '#e8be4a',
  },
  portadaTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    color: '#e8be4a',
    letterSpacing: 1.9,
    lineHeight: 40,
    textAlign: 'center',
  },
  portadaSub: {
    fontFamily: FUENTES.displaySemi,
    fontSize: 12.48,
    fontWeight: '600',
    letterSpacing: 3.2,
    textTransform: 'uppercase',
    color: '#c4b59a',
    textAlign: 'center',
  },
  portadaLinea: {
    width: 52,
    height: 1,
    backgroundColor: 'rgba(232, 190, 74, 0.5)',
  },
  portadaDatos: {
    fontSize: 13.12,
    fontFamily: FUENTES.displayRegular,
    fontStyle: 'italic',
    color: '#a89a82',
    lineHeight: 19,
    maxWidth: 288,
    textAlign: 'center',
  },
  portadaIniciales: {
    marginTop: 4.8,
    fontFamily: FUENTES.display,
    fontSize: 17.6,
    letterSpacing: 3.5,
    color: 'rgba(232, 190, 74, 0.45)',
  },
  portadaCta: {
    zIndex: 1,
    alignItems: 'center',
    gap: 7.2,
    alignSelf: 'stretch',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.4,
    paddingVertical: 8,
    paddingHorizontal: 17.6,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 190, 74, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 190, 74, 0.4)',
  },
  ctaPillTxt: {
    fontSize: 13.12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#f0d78c',
    fontFamily: FUENTES.textoBold,
  },
  ctaHint: {
    fontSize: 10.88,
    letterSpacing: 0.65,
    color: '#8a7f6c',
    fontFamily: FUENTES.texto,
    textAlign: 'center',
  },
});
