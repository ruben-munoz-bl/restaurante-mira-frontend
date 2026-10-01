/**
 * Recuperar contraseña — espejo de Recuperar.jsx ('#/recuperar'):
 * pide el email y envía el enlace (mensaje siempre genérico).
 */
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { recuperarContrasena } from '../services/authApi.js';
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

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Recuperar() {
  const t = useT(TRADS);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  async function manejarEnvio() {
    const val = email.trim();
    if (!val) {
      setError(t('recuperar.errorVacio'));
      return;
    }
    if (!EMAIL_OK.test(val)) {
      setError(t('recuperar.errorNoValido'));
      return;
    }
    setError('');
    setEnviando(true);
    try {
      await recuperarContrasena(val);
      setExito(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('recuperar.titulo')}>
        <AuthTarjeta titulo={t('recuperar.titulo')}>
          {exito ? (
            <>
              <AuthSub>{t('recuperar.exito')}</AuthSub>
              <AuthBoton peq onPress={() => router.push('/login')}>
                {t('recuperar.volverLogin')}
              </AuthBoton>
            </>
          ) : (
            <>
              <AuthSub>{t('recuperar.intro')}</AuthSub>
              <CampoTexto
                label={t('recuperar.correoElectronico')}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="tu@correo.com"
              />
              {error ? <AuthError>{error}</AuthError> : null}
              <AuthBoton onPress={manejarEnvio} disabled={enviando}>
                {enviando ? t('recuperar.enviando') : t('recuperar.enviarEnlace')}
              </AuthBoton>
            </>
          )}

          <AuthAlt>
            <AuthEnlace onPress={() => router.push('/login')}>← {t('recuperar.volverLogin')}</AuthEnlace>
          </AuthAlt>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}
