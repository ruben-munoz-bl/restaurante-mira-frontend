/**
 * Login — espejo de Login.jsx ('#/login'): email + contraseña + Google
 * (flujo OAuth RN con expo-web-browser) y enlaces a recuperación/registro.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import CampoTexto from '../components/ui/CampoTexto';
import {
  AuthPagina,
  AuthTarjeta,
  AuthSub,
  AuthError,
  AuthBoton,
  AuthAlt,
  AuthEnlace,
} from '../components/ui/Auth';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { FUENTES } from '../theme/tokens';

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const t = useT(TRADS);
  const router = useRouter();
  const params = useLocalSearchParams();
  const auth = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  const avisoReset =
    typeof params.reset === 'string' && ['ok', 'enviado'].includes(params.reset) ? params.reset : '';

  useEffect(() => {
    if (!auth.cargandoSesion && auth.usuario) router.replace('/');
  }, [auth.cargandoSesion, auth.usuario, router]);

  if (auth.cargandoSesion) return null;

  async function manejarEnvio() {
    if (!EMAIL_OK.test(email.trim())) return setError(t('auth.correoInvalido'));
    if (password.length < 6) return setError(t('auth.contrasenaCorta'));
    setError('');
    setEnviando(true);
    try {
      await auth.iniciarSesion({ email, password });
      router.replace('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function manejarGoogle() {
    setCargandoGoogle(true);
    setError('');
    try {
      await auth.iniciarSesionGoogle();
      router.replace('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoGoogle(false);
    }
  }

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('auth.iniciarSesion')}>
        <AuthTarjeta titulo={t('auth.iniciarSesion')}>
          <AuthSub>{t('auth.entraParaGuardar')}</AuthSub>
          {avisoReset === 'ok' && <AuthSub verde>{t('auth.contrasenaCambiada')}</AuthSub>}
          {avisoReset === 'enviado' && <AuthSub verde>{t('auth.revisaSpam')}</AuthSub>}
          {error ? <AuthError>{error}</AuthError> : null}

          <CampoTexto
            label={t('auth.correo')}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <CampoTexto
            label={t('auth.contrasena')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError('');
            }}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />

          <AuthBoton onPress={manejarEnvio} disabled={enviando}>
            {enviando ? t('auth.entrando') : t('auth.entrar')}
          </AuthBoton>

          <Pressable
            onPress={manejarGoogle}
            disabled={cargandoGoogle}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.google,
              { opacity: cargandoGoogle ? 0.7 : pressed ? 0.9 : 1 },
            ]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
              <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <Path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </Svg>
            <Text style={styles.googleTxt}>
              {cargandoGoogle ? t('auth.googleEntrando') : t('auth.googleContinuar')}
            </Text>
          </Pressable>

          <View style={styles.centro}>
            <AuthEnlace onPress={() => router.push('/recuperar')}>
              {t('auth.olvidasteContrasena')}
            </AuthEnlace>
          </View>

          <AuthAlt>
            {t('auth.noTienesCuenta')}{' '}
            <AuthEnlace onPress={() => router.push('/registro')}>{t('auth.creaUnaGratis')}</AuthEnlace>
          </AuthAlt>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11.2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingVertical: 11.2,
    paddingHorizontal: 24,
    marginTop: 8,
    width: '100%',
  },
  googleTxt: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15.2,
    fontFamily: FUENTES.textoSemi,
  },
  centro: {
    alignItems: 'center',
    marginTop: 1.6,
  },
});
