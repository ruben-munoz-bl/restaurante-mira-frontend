/**
 * Restablecer contraseña — espejo de Restablecer.jsx ('#/restablecer'):
 * valida el oobCode (deep link o query) y aplica la nueva contraseña.
 * En el flujo normal los enlaces de Firebase abren la web (#/restablecer).
 */
import { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import {
  verificarCodigoReset,
  confirmarNuevaContrasena,
  enmascararEmail,
  extraerOobCode,
} from '../services/authApi.js';
import CampoTexto from '../components/ui/CampoTexto';
import {
  AuthPagina,
  AuthTarjeta,
  AuthSub,
  AuthError,
  AuthBoton,
} from '../components/ui/Auth';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES } from '../theme/tokens';

const TRADS = { es, ca, en };

export default function Restablecer() {
  const t = useT(TRADS);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colores } = useTheme();

  const [paso, setPaso] = useState('cargando'); // cargando | formulario | error | exito
  const [email, setEmail] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const oobCode =
    (typeof params.oobCode === 'string' && params.oobCode) || extraerOobCode() || '';

  useEffect(() => {
    if (!oobCode) {
      setPaso('error');
      setError(t('restablecer.enlaceInvalido'));
      return undefined;
    }
    let vivo = true;
    verificarCodigoReset(oobCode)
      .then((emailRecuperado) => {
        if (!vivo) return;
        setEmail(emailRecuperado);
        setPaso('formulario');
      })
      .catch((err) => {
        if (!vivo) return;
        setError(err.message);
        setPaso('error');
      });
    return () => {
      vivo = false;
    };
  }, [oobCode, t]);

  async function manejarEnvio() {
    if (!nueva) {
      setError(t('restablecer.errorVacio'));
      return;
    }
    if (nueva.length < 6) {
      setError(t('restablecer.errorCorto'));
      return;
    }
    if (nueva !== repetir) {
      setError(t('restablecer.errorNoCoinciden'));
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await confirmarNuevaContrasena(oobCode, nueva);
      setPaso('exito');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('restablecer.titulo')}>
        <AuthTarjeta titulo={t('restablecer.titulo')}>
          {paso === 'cargando' && <AuthSub>{t('restablecer.verificando')}</AuthSub>}

          {paso === 'error' && (
            <>
              <AuthSub>{error}</AuthSub>
              <AuthBoton peq onPress={() => router.push('/recuperar')}>
                {t('restablecer.pedirNuevo')}
              </AuthBoton>
            </>
          )}

          {paso === 'formulario' && (
            <>
              <AuthSub>
                {t('restablecer.restablecerAcceso')} <Text style={styles.email}>{enmascararEmail(email)}</Text>
              </AuthSub>
              <CampoTexto
                label={t('restablecer.nuevaPass')}
                value={nueva}
                onChangeText={(v) => {
                  setNueva(v);
                  setError('');
                }}
                secureTextEntry={!mostrarPass}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t('restablecer.placeholderMin')}
                rightSlot={
                  <Pressable
                    onPress={() => setMostrarPass((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarPass ? t('restablecer.ocultarPass') : t('restablecer.mostrarPass')
                    }
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 17.6 }}>{mostrarPass ? '🙈' : '👁'}</Text>
                  </Pressable>
                }
              />
              <CampoTexto
                label={t('restablecer.repetirPass')}
                value={repetir}
                onChangeText={(v) => {
                  setRepetir(v);
                  setError('');
                }}
                secureTextEntry={!mostrarPass}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t('restablecer.placeholderIgual')}
              />
              {error ? <AuthError>{error}</AuthError> : null}
              <AuthBoton onPress={manejarEnvio} disabled={guardando}>
                {guardando ? t('restablecer.guardando') : t('restablecer.cambiarPass')}
              </AuthBoton>
            </>
          )}

          {paso === 'exito' && (
            <>
              <Text style={[styles.exito, { color: colores.verde }]} accessibilityLiveRegion="polite">
                {t('restablecer.exito')}
              </Text>
              <AuthSub>{t('restablecer.yaPuedes')}</AuthSub>
              <AuthBoton peq onPress={() => router.push('/login')}>
                {t('restablecer.iniciarSesion')}
              </AuthBoton>
            </>
          )}
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  email: {
    fontWeight: '700',
  },
  exito: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
});
