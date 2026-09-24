/**
 * Registro — espejo de Registro.jsx ('#/registro'): 2 pasos
 * (datos de cuenta → dieta/accesibilidad/idioma) con invitación opcional.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import { invitationsApi } from '../services/api.js';
import { ALERGENOS } from '../models/restaurantModel.js';
import CampoTexto from '../components/ui/CampoTexto';
import CheckCasilla from '../components/ui/CheckCasilla';
import SelectCampo from '../components/ui/SelectCampo';
import {
  AuthPagina,
  AuthTarjeta,
  AuthSub,
  AuthError,
  AuthBoton,
  AuthAlt,
  AuthEnlace,
} from '../components/ui/Auth';
import { useT, useI18n } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Registro() {
  const t = useT(TRADS);
  const { lang, setLang, available } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams();
  const auth = useAuthContext();
  const { colores } = useTheme();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esEmpresa, setEsEmpresa] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [paso, setPaso] = useState(1);

  const [vegano, setVegano] = useState(false);
  const [vegetariano, setVegetariano] = useState(false);
  const [sinGluten, setSinGluten] = useState(false);
  const [alergias, setAlergias] = useState([]);
  const [sillaRuedas, setSillaRuedas] = useState(false);
  const [tea, setTea] = useState(false);

  const inviteCodigo = typeof params.invite === 'string' && params.invite ? params.invite : null;

  useEffect(() => {
    if (!auth.cargandoSesion && auth.usuario) router.replace('/');
  }, [auth.cargandoSesion, auth.usuario, router]);

  if (auth.cargandoSesion) return null;

  function toggleAlergia(key) {
    setAlergias((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  async function manejarEnvio() {
    if (paso === 1) {
      if (nombre.trim().length < 2) return setError(t('registro.errorNombre'));
      if (!EMAIL_OK.test(email.trim())) return setError(t('registro.errorCorreo'));
      if (password.length < 6) return setError(t('registro.errorPass'));
      setError('');
      setPaso(2);
      return;
    }
    setError('');
    setEnviando(true);
    try {
      const preferencias = { vegano, vegetariano, sinGluten, alergias };
      const accesibilidad = { sillaRuedas, tea };
      await auth.crearCuenta({
        nombre,
        email,
        password,
        tipo: esEmpresa ? 'empresa' : 'cliente',
        preferencias,
        accesibilidad,
        lang,
      });
      if (inviteCodigo) {
        invitationsApi.accept(inviteCodigo).catch(() => {});
      }
      router.replace('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('registro.crearCuenta')}>
        <AuthTarjeta titulo={t('registro.crearCuenta')}>
          <AuthSub>{t('registro.gratis')}</AuthSub>
          {inviteCodigo && (
            <View
              style={[
                styles.invite,
                { backgroundColor: colores.primaryContainer, borderColor: colores.primaryContainer },
              ]}
            >
              <Text style={styles.inviteTxt}>🎉 Te invitaron a MIRA Points</Text>
            </View>
          )}
          {error ? <AuthError>{error}</AuthError> : null}

          {paso === 1 && (
            <>
              <CampoTexto
                label={t('registro.nombre')}
                value={nombre}
                onChangeText={(v) => {
                  setNombre(v);
                  setError('');
                }}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
              <CampoTexto
                label={t('registro.correo')}
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
                label={t('registro.contrasena')}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError('');
                }}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <CheckCasilla value={esEmpresa} onToggle={() => setEsEmpresa((v) => !v)}>
                {t('auth.soyEmpresa')}
              </CheckCasilla>
              <AuthBoton onPress={manejarEnvio}>{t('registro.siguiente')}</AuthBoton>
            </>
          )}

          {paso === 2 && (
            <>
              <Text style={[styles.sub, { color: colores.tinta }]}>{t('registro.miDieta')}</Text>
              <CheckCasilla value={vegano} onToggle={() => setVegano((v) => !v)}>
                {t('registro.vegano')}: {t('registro.veganoDesc')}
              </CheckCasilla>
              <CheckCasilla value={vegetariano} onToggle={() => setVegetariano((v) => !v)}>
                {t('registro.vegetariano')}: {t('registro.vegetarianoDesc')}
              </CheckCasilla>
              <CheckCasilla value={sinGluten} onToggle={() => setSinGluten((v) => !v)}>
                {t('registro.sinGluten')}
              </CheckCasilla>

              <View style={[styles.alergias, { borderColor: colores.glassBorder }]}>
                <Text style={[styles.leyenda, { color: colores.tinta }]}>{t('registro.misAlergias')}</Text>
                <View style={styles.alergiasGrid}>
                  {ALERGENOS.filter((a) => a.key !== 'gluten').map(({ key, label }) => (
                    <CheckCasilla
                      key={key}
                      value={alergias.includes(key)}
                      onToggle={() => toggleAlergia(key)}
                      style={styles.alergia}
                    >
                      {label}
                    </CheckCasilla>
                  ))}
                </View>
              </View>

              <Text style={[styles.sub, { color: colores.tinta }]}>{t('registro.miAccesibilidad')}</Text>
              <CheckCasilla value={sillaRuedas} onToggle={() => setSillaRuedas((v) => !v)}>
                {t('registro.sillaRuedas')}
              </CheckCasilla>
              <CheckCasilla value={tea} onToggle={() => setTea((v) => !v)}>
                {t('registro.espectroAutista')}
              </CheckCasilla>

              <Text style={[styles.sub, { color: colores.tinta }]}>{t('registro.idioma')}</Text>
              <SelectCampo
                value={lang}
                opciones={Object.entries(available).map(([code, label]) => ({ valor: code, etiqueta: label }))}
                onChange={setLang}
              />

              <Text style={[styles.nota, { color: colores.gris }]}>{t('registro.cambiarDespues')}.</Text>

              <AuthBoton onPress={manejarEnvio} disabled={enviando}>
                {enviando ? t('registro.creando') : t('registro.crear')}
              </AuthBoton>
              <AuthBoton
                secundario
                peq
                onPress={() => {
                  setPaso(1);
                  setError('');
                }}
              >
                ← {t('registro.volver')}
              </AuthBoton>
            </>
          )}

          <AuthAlt>
            {t('registro.yaTienesCuenta')}{' '}
            <AuthEnlace onPress={() => router.push('/login')}>{t('registro.iniciaSesion')}</AuthEnlace>
          </AuthAlt>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  invite: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 12.8,
    paddingHorizontal: 16,
    marginBottom: 1.6,
  },
  inviteTxt: {
    color: '#fff',
    fontSize: 14.4,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: FUENTES.textoSemi,
  },
  sub: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 16.8,
    marginTop: 16,
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
  nota: {
    fontSize: 13.12,
    fontFamily: FUENTES.texto,
    marginTop: 12.8,
    marginBottom: 8,
  },
});
