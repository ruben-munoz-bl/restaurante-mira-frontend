/**
 * Mi cuenta — espejo de Cuenta.jsx ('#/cuenta'): progreso de emblema,
 * datos, panel, MIRA Points, dieta, accesibilidad, idioma, verificación,
 * cookies, negocio, próximas reservas, incidencias y reseñas.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import { listarMisReservas } from '../services/reservaApi.js';
import { obtenerEmblemasUsuario } from '../services/emblemasApi.js';
import { listarMisIncidencias } from '../services/incidenciaApi.js';
import { listarResenasDeUsuario } from '../services/resenasApi.js';
import { listarMisNegocios } from '../services/negocioApi.js';
import {
  COOKIE_CATEGORIAS,
  COOKIE_DEFAULT,
  leerCookies,
  guardarCookies,
} from '../services/cookieService.js';
import {
  ALERGENOS,
  normalizarDieta,
  normalizarAccesibilidad,
} from '../models/restaurantModel.js';
import EmblemaAvatar from '../components/EmblemaAvatar.jsx';
import CheckCasilla from '../components/ui/CheckCasilla';
import { AuthPagina, AuthTarjeta, AuthError } from '../components/ui/Auth';
import { useI18n, useT } from '../i18n/index.jsx';
import usePointsStore from '../stores/usePointsStore.js';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';
import { btnCta, btnSecundario, btnTexto } from '../theme/ui';

const TRADS = { es, ca, en };

function hoyISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

function Sub({ children }) {
  const { colores } = useTheme();
  return <Text style={[styles.sub, { color: colores.tinta }]}>{children}</Text>;
}

function Registro({ children }) {
  const { colores } = useTheme();
  return <View style={[styles.registro, { borderColor: colores.glassBorder }]}>{children}</View>;
}

function DatoFila({ etiqueta, children }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.datoFila, { borderTopColor: colores.glassBorder }]}>
      <Text style={[styles.datoDt, { color: colores.gris }]}>{etiqueta}</Text>
      <View style={styles.datoDd}>{children}</View>
    </View>
  );
}

export default function Cuenta() {
  const t = useT(TRADS);
  const { lang, setLang, available } = useI18n();
  const router = useRouter();
  const auth = useAuthContext();
  const { colores, tema } = useTheme();
  const { saldoActual, rachaLogin, rachaReservas, fetchBalance } = usePointsStore();

  const usuario = auth.usuario;
  const esAdmin = auth.esAdmin;
  const perfil = auth.perfil;

  const [proximas, setProximas] = useState([]);
  const [emblemaEstado, setEmblemaEstado] = useState({
    totalReservas: 0,
    desbloqueados: [],
    emblema: null,
    multi: 1,
    multiTexto: 'x1.00',
    siguiente: null,
    faltan: 0,
  });
  const [incidencias, setIncidencias] = useState([]);
  const [misResenas, setMisResenas] = useState([]);
  const [misNegocios, setMisNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [borrador, setBorrador] = useState(() => normalizarDieta(auth.dieta));
  const [guardandoPrefs, setGuardandoPrefs] = useState(false);
  const [prefsOk, setPrefsOk] = useState('');
  const [borradorAcc, setBorradorAcc] = useState(() => normalizarAccesibilidad(auth.accesibilidad));
  const [guardandoAcc, setGuardandoAcc] = useState(false);
  const [accOk, setAccOk] = useState('');

  const [verificando, setVerificando] = useState(false);
  const [verOk, setVerOk] = useState('');
  const [verError, setVerError] = useState('');

  const [cookiesPrefs, setCookiesPrefs] = useState({ ...COOKIE_DEFAULT });
  const [cookiesOk, setCookiesOk] = useState('');

  useEffect(() => {
    if (!auth.cargandoSesion && !usuario) router.replace('/login');
  }, [auth.cargandoSesion, usuario, router]);

  useEffect(() => {
    if (!usuario?.uid) return;
    fetchBalance();
    let vivo = true;
    (async () => {
      const [todasRes, incRes, resRes, negRes] = await Promise.allSettled([
        listarMisReservas(),
        listarMisIncidencias(),
        listarResenasDeUsuario(usuario.uid),
        listarMisNegocios(),
      ]);
      if (!vivo) return;
      const todas = todasRes.status === 'fulfilled' ? todasRes.value : [];
      const inc = incRes.status === 'fulfilled' ? incRes.value : [];
      const res = resRes.status === 'fulfilled' ? resRes.value : [];
      const neg = negRes.status === 'fulfilled' ? negRes.value : [];
      const hoy = hoyISO();
      setProximas(
        todas
          .filter((r) => String(r.estado || '').toLowerCase() !== 'cancelada' && r.fecha >= hoy)
          .slice(0, 3),
      );
      setIncidencias(inc.slice(0, 5));
      setMisResenas(res.slice(0, 5));
      setMisNegocios(neg.slice(0, 5));
      setCargando(false);
      if (todasRes.status !== 'fulfilled') return;
      try {
        const emb = await obtenerEmblemasUsuario(usuario.uid, todas);
        if (vivo) setEmblemaEstado(emb);
      } catch {
        /* emblemas opcionales */
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.uid]);

  useEffect(() => {
    setBorrador(normalizarDieta(auth.dieta));
  }, [auth.dieta]);
  useEffect(() => {
    setBorradorAcc(normalizarAccesibilidad(auth.accesibilidad));
  }, [auth.accesibilidad]);
  useEffect(() => {
    if (!usuario?.uid) return;
    leerCookies(usuario.uid).then(setCookiesPrefs).catch(() => {});
  }, [usuario?.uid]);

  function toggleDieta(campo) {
    setBorrador((prev) => ({ ...prev, [campo]: !prev[campo] }));
    setPrefsOk('');
  }
  function toggleAlergia(key) {
    setBorrador((prev) => ({
      ...prev,
      alergias: prev.alergias.includes(key)
        ? prev.alergias.filter((x) => x !== key)
        : [...prev.alergias, key],
    }));
    setPrefsOk('');
  }
  async function guardarPrefs() {
    setGuardandoPrefs(true);
    setPrefsOk('');
    try {
      await auth.guardarDieta(borrador);
      setPrefsOk(t('cuenta.dietaGuardada'));
    } catch {
      setPrefsOk(t('cuenta.dietaError'));
    } finally {
      setGuardandoPrefs(false);
    }
  }
  function toggleAcc(campo) {
    setBorradorAcc((prev) => ({ ...prev, [campo]: !prev[campo] }));
    setAccOk('');
  }
  async function guardarAcc() {
    setGuardandoAcc(true);
    setAccOk('');
    try {
      await auth.guardarAccesibilidad(borradorAcc);
      setAccOk(t('cuenta.accesibilidadGuardada'));
    } catch {
      setAccOk(t('cuenta.accesibilidadError'));
    } finally {
      setGuardandoAcc(false);
    }
  }
  async function enviarVerificacion() {
    setVerError('');
    setVerOk('');
    setVerificando(true);
    try {
      await auth.enviarVerificacion();
      setVerOk(t('cuenta.correoEnviado'));
    } catch (err) {
      setVerError(err.message || t('cuenta.correoError'));
    } finally {
      setVerificando(false);
    }
  }
  async function recargarVerificacion() {
    setVerError('');
    setVerOk('');
    try {
      const verificado = await auth.recargarEmailVerified();
      auth.recargarPerfil?.();
      if (verificado) setVerOk(t('cuenta.correoVerificadoOk'));
      else setVerError(t('cuenta.correoNoCambiado'));
    } catch {
      setVerError(t('cuenta.comprobarError'));
    }
  }
  async function guardarCookiesCuenta() {
    setCookiesOk('');
    await guardarCookies(cookiesPrefs);
    setCookiesOk(t('cuenta.cookiesGuardadas'));
  }

  if (auth.cargandoSesion) return null;
  if (!usuario) return null;

  const inicial = (usuario.nombre || usuario.email || '?').trim().charAt(0).toUpperCase();
  const miembroDesde = usuario.creado
    ? new Date(usuario.creado).toLocaleDateString(t('modelos.locale'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const { totalReservas, emblema, multiTexto, siguiente, faltan } = emblemaEstado;
  const nombreEmblema = emblema ? t(`emblemas.${emblema.id}`) : '';
  const nombreSiguiente = siguiente ? t(`emblemas.${siguiente.id}`) : '';

  let textoProgreso;
  if (totalReservas === 0) {
    textoProgreso = t('emblemas.sinEmblema');
  } else if (siguiente && faltan > 0) {
    textoProgreso =
      faltan === 1
        ? t('emblemas.faltaUna', { siguiente: nombreSiguiente })
        : t('emblemas.faltan', { n: faltan, siguiente: nombreSiguiente });
  } else {
    textoProgreso = t('emblemas.maximo');
  }

  const coloresSubrayado =
    emblema?.id === 'foodie'
      ? ['#c4884a', '#8b5a2b', '#c4884a']
      : emblema?.id === 'gourmet'
        ? ['#e8e8e8', '#b0b0b0', '#e8e8e8']
        : emblema?.id === 'michelin'
          ? ['#f0d78c', '#d4af37', '#f0d78c']
          : ['transparent', colores.doradoClaro, 'transparent'];

  return (
    <AppShell>
      <AuthPagina>
        <AuthTarjeta>
          {/* --- Progreso emblema --- */}
          <View style={styles.progreso} accessibilityLiveRegion="polite">
            <View style={styles.progresoLabelFila}>
              <View style={[styles.linea, { backgroundColor: colores.borde }]} />
              <Text style={[styles.progresoLabel, { color: colores.gris }]}>
                {t('emblemas.tituloProgreso')}
              </Text>
              <View style={[styles.linea, { backgroundColor: colores.borde }]} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.progresoTitulo, { color: colores.tinta }]}>
                {emblema ? t('emblemas.tituloNivel', { nombre: nombreEmblema }) : ' '}
              </Text>
              {emblema && (
                <LinearGradient
                  colors={coloresSubrayado}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subrayado}
                />
              )}
            </View>
            <EmblemaAvatar inicial={inicial} emblema={emblema} size="lg" />
            <Text style={[styles.progresoTexto, { color: colores.gris }]}>{textoProgreso}</Text>
            <View
              style={[
                styles.rachaPill,
                {
                  backgroundColor: tema === 'oscuro' ? 'rgba(115, 92, 0, 0.35)' : 'rgba(254, 214, 91, 0.30)',
                  borderColor: tema === 'oscuro' ? 'rgba(254, 214, 91, 0.42)' : 'rgba(198, 146, 75, 0.55)',
                },
              ]}
              accessibilityLabel={t('emblemas.multiplicador', { multi: multiTexto })}
            >
              <Text style={styles.rachaIcono}>🔥</Text>
              <Text style={[styles.rachaNombre, { color: colores.gris }]}>
                {t('emblemas.multiplicador')}
              </Text>
              <Text
                style={[
                  styles.rachaValor,
                  { color: tema === 'oscuro' ? colores.secondaryContainer : colores.dorado },
                ]}
              >
                {multiTexto}
              </Text>
            </View>
          </View>

          <Text style={[styles.titulo, { color: colores.tinta }]}>
            {usuario.nombre || t('cuenta.miCuenta')}
          </Text>

          <View>
            <DatoFila etiqueta={t('cuenta.email')}>
              <Text style={[styles.datoDdTxt, { color: colores.tinta }]}>{usuario.email}</Text>
            </DatoFila>
            <DatoFila etiqueta={t('cuenta.verificado')}>
              <Text
                style={[
                  styles.datoDdTxt,
                  { color: usuario.emailVerified ? colores.verde : colores.naranja },
                ]}
              >
                {usuario.emailVerified ? `✓ ${t('cuenta.si')}` : t('cuenta.noVerificado')}
              </Text>
            </DatoFila>
            <DatoFila etiqueta={t('cuenta.miembroDesde')}>
              <Text style={[styles.datoDdTxt, { color: colores.tinta }]}>{miembroDesde}</Text>
            </DatoFila>
          </View>

          <View style={styles.acciones}>
            <Pressable onPress={() => router.replace('/')} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Text style={btnCta(colores)}>{t('cuenta.buscarRestaurantes')}</Text>
            </Pressable>
            <Pressable onPress={() => auth.cerrarSesion()} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
              <Text style={btnSecundario(colores)}>{t('cuenta.cerrarSesion')}</Text>
            </Pressable>
          </View>

          {/* --- Panel (admin / empresa) --- */}
          {(esAdmin || perfil?.tipo === 'empresa') && (
            <View
              style={[
                styles.banner,
                { backgroundColor: colores.glassBg, borderColor: colores.primaryContainer },
              ]}
            >
              <Text style={[styles.sub, { color: colores.tinta, marginTop: 0 }]}>
                {esAdmin ? 'Panel de Administración' : 'Panel de Restaurante'}
              </Text>
              <Text style={[styles.bannerTxt, { color: colores.gris }]}>
                {esAdmin
                  ? 'Gestiona usuarios, restaurantes, reservas, comisiones y analytics de la plataforma.'
                  : 'Gestiona tu restaurante: información, reservas, facturación y tickets.'}
              </Text>
              <Pressable
                onPress={() => router.push(esAdmin ? '/admin' : '/dashboard')}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={btnCta(colores)}>
                  {esAdmin ? 'Abrir Panel Admin' : 'Abrir Mi Panel'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* --- MIRA POINTS --- */}
          <Sub>{t('points.title')}</Sub>
          <LinearGradient
            colors={[colores.primaryContainer, 'rgba(115, 92, 0, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.points}
          >
            <View style={styles.saldo}>
              <Text style={[styles.saldoAmount, { color: colores.primary }]}>{saldoActual}</Text>
              <Text style={[styles.saldoLabel, { color: colores.gris }]}>{t('points.balance')}</Text>
            </View>
            {rachaLogin?.dias > 0 && (
              <Text style={[styles.rachaLinea, { color: colores.gris }]}>
                🔥 {rachaLogin.dias} {t('points.days')} {t('points.streak')} — +
                {Math.min(5 + 3 * Math.max(0, rachaLogin.dias - 1), 15)} pts/día
              </Text>
            )}
            {rachaReservas?.semanasConsecutivas > 0 && (
              <Text style={[styles.rachaLinea, { color: colores.dorado }]}>
                ⭐ x{rachaReservas.multiplicador} multiplicador activo
              </Text>
            )}
            <View style={styles.pointsActions}>
              <Pressable onPress={() => router.push('/puntos')} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Text style={[btnCta(colores, { peq: true }), { marginTop: 0 }]}>
                  {t('points.history')}
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push('/puntos/historial')} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[btnSecundario(colores, { peq: true }), { marginTop: 0 }]}>
                  {t('points.redeem')}
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push('/invitar')} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[btnSecundario(colores, { peq: true }), { marginTop: 0 }]}>
                  {t('points.invite')}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.redemption, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
              <Text style={[styles.redemptionTxt, { color: colores.verde }]}>
                💰 100 pts = 1,00 € · Sin caducidad
              </Text>
            </View>
          </LinearGradient>

          {/* --- Dieta --- */}
          <Sub>{t('cuenta.miDieta')}</Sub>
          <View style={styles.form}>
            {[['vegano', t('cuenta.vegano')], ['vegetariano', t('cuenta.vegetariano')]].map(
              ([campo, etiqueta]) => (
                <CheckCasilla key={campo} value={Boolean(borrador[campo])} onToggle={() => toggleDieta(campo)}>
                  {etiqueta}
                </CheckCasilla>
              ),
            )}
            <View style={[styles.alergias, { borderColor: colores.glassBorder }]}>
              <Text style={[styles.leyenda, { color: colores.tinta }]}>{t('cuenta.misAlergias')}</Text>
              <View style={styles.alergiasGrid}>
                {ALERGENOS.map(({ key, label }) => (
                  <CheckCasilla
                    key={key}
                    value={borrador.alergias.includes(key)}
                    onToggle={() => toggleAlergia(key)}
                    style={styles.alergia}
                  >
                    {label}
                  </CheckCasilla>
                ))}
              </View>
            </View>
            <Pressable
              onPress={guardarPrefs}
              disabled={guardandoPrefs}
              style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: guardandoPrefs ? 0.5 : pressed ? 0.75 : 1 }]}
            >
              <Text style={[btnSecundario(colores, { peq: true }), { marginTop: 0 }]}>
                {guardandoPrefs ? t('cuenta.guardando') : t('cuenta.guardarDieta')}
              </Text>
            </Pressable>
            {prefsOk ? (
              <Text style={[styles.ok, { color: colores.gris }]} accessibilityRole="status">
                {prefsOk}
              </Text>
            ) : null}
          </View>

          {/* --- Accesibilidad --- */}
          <Sub>{t('cuenta.miAccesibilidad')}</Sub>
          <View style={styles.form}>
            <Text style={[styles.vacio, { color: colores.gris }]}>{t('cuenta.soloAccesibilidad')}</Text>
            <CheckCasilla value={Boolean(borradorAcc.sillaRuedas)} onToggle={() => toggleAcc('sillaRuedas')}>
              {t('cuenta.sillaRuedas')}
            </CheckCasilla>
            <CheckCasilla value={Boolean(borradorAcc.tea)} onToggle={() => toggleAcc('tea')}>
              {t('cuenta.espectroAutista')}
            </CheckCasilla>
            <Pressable
              onPress={guardarAcc}
              disabled={guardandoAcc}
              style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: guardandoAcc ? 0.5 : pressed ? 0.75 : 1 }]}
            >
              <Text style={[btnSecundario(colores, { peq: true }), { marginTop: 0 }]}>
                {guardandoAcc ? t('cuenta.guardando') : t('cuenta.guardarAccesibilidad')}
              </Text>
            </Pressable>
            {accOk ? (
              <Text style={[styles.ok, { color: colores.gris }]} accessibilityRole="status">
                {accOk}
              </Text>
            ) : null}
          </View>

          {/* --- Idioma --- */}
          <Sub>{t('cuenta.idioma')}</Sub>
          <View style={styles.langSelector}>
            {Object.entries(available).map(([code, label]) => {
              const activo = lang === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLang(code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={label}
                  style={({ pressed }) => [
                    styles.langOption,
                    {
                      borderColor: activo ? colores.primaryContainer : colores.borde,
                      backgroundColor: activo ? colores.primaryContainer : colores.papel,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12.8,
                      fontWeight: '600',
                      letterSpacing: 0.77,
                      textTransform: 'uppercase',
                      color: activo ? '#fff' : colores.tinta,
                      fontFamily: FUENTES.textoSemi,
                    }}
                  >
                    {code.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* --- Verificación de email --- */}
          <Sub>{t('cuenta.verificacionCorreo')}</Sub>
          <View style={styles.form}>
            {usuario.emailVerified ? (
              <View
                style={[
                  styles.verOkBox,
                  { backgroundColor: colores.fondoSuave, borderRadius: RADIO.peq },
                ]}
              >
                <Text style={{ color: colores.verde, fontWeight: '600', fontFamily: FUENTES.textoSemi }}>
                  ✓ {t('cuenta.correoVerificado')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.vacio, { color: colores.gris }]}>{t('cuenta.correoNoVerificado')}</Text>
                {verError ? <AuthError>{verError}</AuthError> : null}
                {verOk ? (
                  <Text style={{ color: colores.verde }} accessibilityRole="status">
                    {verOk}
                  </Text>
                ) : null}
                <View style={styles.filaWrap}>
                  <Pressable
                    onPress={enviarVerificacion}
                    disabled={verificando}
                    style={({ pressed }) => [{ opacity: verificando ? 0.5 : pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[btnSecundario(colores, { peq: true }), { marginTop: 0 }]}>
                      {verificando ? t('cuenta.enviando') : t('cuenta.enviarVerificacion')}
                    </Text>
                  </Pressable>
                  <Pressable onPress={recargarVerificacion} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <Text style={btnTexto(colores)}>{t('cuenta.yaVerifique')}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* --- Cookies --- */}
          <Sub>{t('cuenta.preferenciasCookies')}</Sub>
          <View style={styles.form}>
            <Text style={[styles.vacio, { color: colores.gris }]}>{t('cuenta.cookiesDescripcion')}</Text>
            {COOKIE_CATEGORIAS.filter((c) => !c.requerida).map((cat) => (
              <View key={cat.key}>
                <CheckCasilla
                  value={Boolean(cookiesPrefs[cat.key])}
                  onToggle={() => setCookiesPrefs((p) => ({ ...p, [cat.key]: !p[cat.key] }))}
                >
                  {t(`cookie.${cat.key}`)}
                </CheckCasilla>
                <Text style={[styles.cookieDesc, { color: colores.gris }]}>
                  {t(`cookie.${cat.key}Desc`)}
                </Text>
              </View>
            ))}
            <Pressable
              onPress={guardarCookiesCuenta}
              style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={[btnSecundario(colores, { peq: true }), { marginTop: 0 }]}>
                {t('cuenta.guardarCookies')}
              </Text>
            </Pressable>
            {cookiesOk ? (
              <Text style={[styles.ok, { color: colores.gris }]} accessibilityRole="status">
                {cookiesOk}
              </Text>
            ) : null}
          </View>

          {/* --- Negocio --- */}
          {(perfil?.tipo === 'empresa' || esAdmin) && (
            <>
              <Sub>{t('cuenta.miNegocio')}</Sub>
              {perfil?.tipo === 'empresa' && (
                <Pressable
                  onPress={() => {
                    try {
                      globalThis.sessionStorage?.setItem('mira_abrir_crear', '1');
                    } catch {
                      /* ignore */
                    }
                    router.push('/dashboard');
                  }}
                  style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={btnCta(colores)}>{t('cuenta.anadirRestaurante')}</Text>
                </Pressable>
              )}
              {esAdmin && (
                <Pressable
                  onPress={() => router.push('/admin')}
                  style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={btnCta(colores)}>Panel de Administracion</Text>
                </Pressable>
              )}
              {!cargando && misNegocios.length > 0 && (
                <View style={styles.lista}>
                  {misNegocios.map((n) => (
                    <Registro key={n.id}>
                      <View>
                        <Text style={[styles.registroTitulo, { color: colores.tinta }]}>{n.nombre}</Text>
                        <Text style={[styles.registroDetalle, { color: colores.gris }]}>
                          {n.ciudad} ·{' '}
                          {n.estado === 'aprobada'
                            ? t('cuenta.publicado')
                            : n.estado === 'rechazada'
                              ? t('cuenta.rechazado')
                              : t('cuenta.enRevision')}
                        </Text>
                      </View>
                    </Registro>
                  ))}
                </View>
              )}
            </>
          )}

          {/* --- Reservas --- */}
          <Sub>{t('cuenta.proximasReservas')}</Sub>
          {cargando && <Text style={[styles.vacio, { color: colores.gris }]}>{t('otros.cargando')}</Text>}
          {!cargando && proximas.length === 0 && (
            <Text style={[styles.vacio, { color: colores.gris }]}>{t('cuenta.sinReservas')}</Text>
          )}
          {!cargando && proximas.length > 0 && (
            <View style={styles.lista}>
              {proximas.map((r) => (
                <Registro key={r.id}>
                  <View>
                    <Text style={[styles.registroTitulo, { color: colores.tinta }]}>
                      {r.nombreRestaurante}
                    </Text>
                    <Text style={[styles.registroDetalle, { color: colores.gris }]}>
                      {r.fecha} · {r.hora} · {r.comensales}{' '}
                      {Number(r.comensales) === 1 ? t('modelos.persona') : t('modelos.personas')} ·{' '}
                      <Text style={[styles.code, { backgroundColor: colores.fondo, borderColor: colores.borde }]}>
                        {r.codigo}
                      </Text>
                    </Text>
                  </View>
                </Registro>
              ))}
            </View>
          )}
          <Pressable onPress={() => router.push('/reservas')} style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[styles.enlace, { color: colores.primaryContainer }]}>
              {t('cuenta.verTodasReservas')}
            </Text>
          </Pressable>

          {/* --- Incidencias --- */}
          <Sub>{t('cuenta.misIncidencias')}</Sub>
          {!cargando && incidencias.length === 0 && (
            <Text style={[styles.vacio, { color: colores.gris }]}>{t('cuenta.sinIncidencias')}</Text>
          )}
          {!cargando && incidencias.length > 0 && (
            <View style={styles.lista}>
              {incidencias.map((r) => (
                <Registro key={r.id}>
                  <View>
                    <Text style={[styles.registroTitulo, { color: colores.tinta }]}>
                      {r.motivo} · {r.estado === 'resuelta' ? t('cuenta.resuelta') : t('cuenta.pendiente')}
                    </Text>
                    <Text style={[styles.registroDetalle, { color: colores.gris }]}>{r.mensaje}</Text>
                  </View>
                </Registro>
              ))}
            </View>
          )}

          {/* --- Reseñas --- */}
          <Sub>{t('cuenta.misResenas')}</Sub>
          {!cargando && misResenas.length === 0 && (
            <Text style={[styles.vacio, { color: colores.gris }]}>{t('cuenta.sinResenas')}</Text>
          )}
          {!cargando && misResenas.length > 0 && (
            <View style={styles.lista}>
              {misResenas.map((r) => (
                <Registro key={r.id}>
                  <View>
                    <Text style={[styles.registroTitulo, { color: colores.tinta }]}>
                      ★ {r.puntuacion}
                      <Text style={[styles.registroDetalle, { color: colores.gris }]}>
                        {' '}
                        · {r.fecha || ''} · {r.likes || 0} likes
                      </Text>
                    </Text>
                    <Text style={[styles.registroDetalle, { color: colores.gris }]}>{r.comentario}</Text>
                  </View>
                </Registro>
              ))}
            </View>
          )}
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  progreso: {
    alignItems: 'center',
    gap: 8.8,
    width: '100%',
    marginTop: 3.2,
    marginBottom: 6.4,
  },
  progresoLabelFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.4,
    width: '100%',
    justifyContent: 'center',
  },
  linea: {
    width: 21.6,
    height: 1,
    flexGrow: 1,
    maxWidth: 60,
  },
  progresoLabel: {
    fontSize: 12.48,
    fontWeight: '700',
    letterSpacing: 1.75,
    textTransform: 'uppercase',
    fontFamily: FUENTES.textoBold,
  },
  progresoTitulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 28.8,
    letterSpacing: 0.24,
    minHeight: 28.8,
    textAlign: 'center',
    paddingBottom: 5.6,
  },
  subrayado: {
    height: 2,
    width: '70%',
    maxWidth: 176,
    borderRadius: 999,
    marginTop: -5.6,
  },
  progresoTexto: {
    fontSize: 15.2,
    maxWidth: 288,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 2.4,
    fontFamily: FUENTES.texto,
  },
  rachaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7.2,
    borderRadius: 999,
    paddingVertical: 7.2,
    paddingHorizontal: 17.6,
    marginTop: 5.6,
    borderWidth: 1,
  },
  rachaIcono: {
    fontSize: 15.2,
    lineHeight: 17,
  },
  rachaNombre: {
    fontSize: 13.12,
    fontWeight: '600',
    letterSpacing: 0.79,
    textTransform: 'uppercase',
    fontFamily: FUENTES.textoSemi,
  },
  rachaValor: {
    fontFamily: FUENTES.display,
    fontSize: 17.6,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.35,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 28.8,
    textAlign: 'center',
  },
  datoFila: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 9.6,
    marginBottom: 9.6,
  },
  datoDt: {
    fontSize: 13.6,
    fontWeight: '700',
    width: 128,
    fontFamily: FUENTES.textoBold,
  },
  datoDd: {
    flex: 1,
  },
  datoDdTxt: {
    fontSize: 15,
    fontFamily: FUENTES.texto,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9.6,
    marginTop: 6.4,
  },
  banner: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 19.2,
    marginBottom: 16,
    alignItems: 'center',
    gap: 4,
  },
  bannerTxt: {
    fontSize: 14.4,
    textAlign: 'center',
    marginBottom: 12.8,
    fontFamily: FUENTES.texto,
    lineHeight: 20,
  },
  sub: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 18.4,
    marginTop: 22.4,
    marginBottom: 9.6,
  },
  points: {
    borderRadius: RADIO.md,
    padding: 19.2,
    marginVertical: 8,
    gap: 8,
  },
  saldo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12.8,
  },
  saldoAmount: {
    fontFamily: FUENTES.display,
    fontSize: 32,
    fontWeight: '700',
  },
  saldoLabel: {
    fontSize: 14.4,
    fontFamily: FUENTES.texto,
  },
  rachaLinea: {
    fontSize: 14.4,
    marginBottom: 8,
    fontFamily: FUENTES.texto,
  },
  pointsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12.8,
    marginTop: 4,
  },
  redemption: {
    padding: 9.6,
    borderRadius: RADIO.peq,
    marginTop: 12.8,
  },
  redemptionTxt: {
    fontSize: 13.6,
    fontFamily: FUENTES.texto,
  },
  form: {
    gap: 11.2,
    marginBottom: 8,
  },
  alergias: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 11.2,
    paddingHorizontal: 14.4,
    gap: 6.4,
  },
  leyenda: {
    fontSize: 13.6,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  alergiasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6.4,
  },
  alergia: {
    width: '48%',
  },
  ok: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
  },
  vacio: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
  },
  langSelector: {
    flexDirection: 'row',
    gap: 6.4,
    marginBottom: 8,
  },
  langOption: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: RADIO.md,
    alignItems: 'center',
  },
  verOkBox: {
    padding: 12.8,
  },
  filaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  cookieDesc: {
    fontSize: 13.12,
    marginLeft: 27.2,
    marginTop: 2.4,
    marginBottom: 4,
    fontFamily: FUENTES.texto,
  },
  lista: {
    gap: 9.6,
    marginBottom: 8,
  },
  registro: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 12.8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12.8,
    alignItems: 'center',
  },
  registroTitulo: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  registroDetalle: {
    fontSize: 14.08,
    marginTop: 2.4,
    fontFamily: FUENTES.texto,
  },
  code: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5.6,
    paddingVertical: 1.6,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  enlace: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: FUENTES.textoSemi,
    marginBottom: 8,
  },
});
