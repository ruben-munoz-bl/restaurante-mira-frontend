/**
 * Contacto — espejo de Contacto.jsx ('#/contacto'): formulario con motivo
 * (select) y textarea; estado de éxito con agradecimiento personalizado.
 */
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import { enviarContacto } from '../services/contactoApi.js';
import CampoTexto from '../components/ui/CampoTexto';
import SelectCampo from '../components/ui/SelectCampo';
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

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contacto() {
  const t = useT(TRADS);
  const router = useRouter();
  const auth = useAuthContext();
  const { colores } = useTheme();

  const MOTIVOS = t('contacto.motivos');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Si la sesión llega después, pre-rellena sin pisar lo escrito.
  const usuario = auth.usuario;
  useEffect(() => {
    if (!usuario) return;
    setNombre((v) => v || usuario.nombre || '');
    setEmail((v) => v || usuario.email || '');
  }, [usuario]);

  async function manejarEnvio() {
    if (nombre.trim().length < 2) return setError(t('contacto.errorNombre'));
    if (!EMAIL_OK.test(email.trim())) return setError(t('contacto.errorEmail'));
    if (mensaje.trim().length < 10) return setError(t('contacto.errorMensajeCorto'));
    if (mensaje.trim().length > 2000) return setError(t('contacto.errorMensajeLargo'));
    setError('');
    setEnviando(true);
    try {
      await enviarContacto({ nombre, email, motivo, mensaje });
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function otroMensaje() {
    setMensaje('');
    setMotivo(t('contacto.motivos')[0]);
    setEnviado(false);
    setError('');
  }

  if (enviado) {
    return (
      <AppShell>
        <AuthPagina>
          <AuthTarjeta titulo={t('contacto.enviado')}>
            <AuthSub>
              {t('contacto.agradecimiento', { nombre: nombre.trim(), email: email.trim() })}
            </AuthSub>
            <AuthBoton secundario onPress={otroMensaje}>
              {t('contacto.otroMensaje')}
            </AuthBoton>
            <AuthBoton onPress={() => router.replace('/')}>
              {t('contacto.volverBuscador')}
            </AuthBoton>
          </AuthTarjeta>
        </AuthPagina>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('contacto.titulo')}>
        <AuthTarjeta titulo={t('contacto.titulo')}>
          <AuthSub>{t('contacto.sub')}</AuthSub>
          {error ? <AuthError>{error}</AuthError> : null}

          <CampoTexto
            label={t('contacto.nombre')}
            value={nombre}
            onChangeText={(v) => {
              setNombre(v);
              setError('');
            }}
            autoCapitalize="words"
            autoComplete="name"
          />
          <CampoTexto
            label={t('contacto.correo')}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <SelectCampo
            label={t('contacto.motivo')}
            value={motivo}
            opciones={MOTIVOS}
            onChange={setMotivo}
          />
          <CampoTexto
            label={t('contacto.mensaje')}
            value={mensaje}
            onChangeText={(v) => {
              setMensaje(v);
              setError('');
            }}
            placeholder={t('contacto.placeholder')}
            placeholderTextColor={colores.gris}
            maxLength={2000}
            multiline
            style={styles.textarea}
          />

          <AuthBoton onPress={manejarEnvio} disabled={enviando}>
            {enviando ? t('contacto.enviando') : t('contacto.enviarMensaje')}
          </AuthBoton>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
