/**
 * Registro — espejo de Registro.jsx ('#/registro'): 2 pasos
 * (datos de cuenta → dieta/accesibilidad/idioma) con invitación opcional.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import { invitationsApi } from '../services/api.js';
import { ALERGENOS } from '../models/restaurantModel.js';
import CampoTexto from '../components/ui/CampoTexto';
import Chip, { ChipGrid } from '../components/ui/Chip';
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

/** 0-3: longitud + variedad de caracteres (mismo criterio que la web). */
function fuerzaPassword(p) {
  if (!p) return 0;
  if (p.length < 8) return 1;
  const variedad = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter((re) => re.test(p)).length;
  if (variedad === 3 || (variedad === 2 && p.length >= 12)) return 3;
  return variedad >= 2 ? 2 : 1;
}

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
  const [verPass, setVerPass] = useState(false);

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
      if (password.length < 8) return setError(t('registro.errorPass'));
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

  const fuerza = fuerzaPassword(password);
  const fuerzaInfo = [
    null,
    { txt: t('registro.fuerzaDebil'), color: colores.rojo, ancho: '33%' },
    { txt: t('registro.fuerzaMedia'), color: colores.doradoClaro, ancho: '66%' },
    { txt: t('registro.fuerzaFuerte'), color: colores.primaryContainer, ancho: '100%' },
  ][fuerza];

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('registro.crearCuenta')}>
        <AuthTarjeta titulo={t('registro.crearCuenta')}>
          <View style={styles.pasos} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 2, now: paso }}>
            {[t('registro.pasoDatos'), t('registro.pasoPrefs')].map((nombrePaso, i) => {
              const on = paso >= i + 1;
              return (
                <View key={nombrePaso} style={[styles.paso, { borderColor: on ? colores.primaryContainer : colores.fondoSuave }]}>
                  <Text
                    style={[
                      styles.pasoNum,
                      { backgroundColor: on ? colores.primaryContainer : colores.fondoSuave, color: on ? '#fff' : colores.gris },
                    ]}
                  >
                    {paso > i + 1 ? '✓' : i + 1}
                  </Text>
                  <Text style={[styles.pasoTxt, { color: on ? colores.primaryContainer : colores.gris }]}>{nombrePaso}</Text>
                </View>
              );
            })}
          </View>
          <AuthSub>{t('registro.gratis')}</AuthSub>
          {inviteCodigo && (
            <View style={[styles.invite, { backgroundColor: colores.secondaryContainer }]}>
              <Text style={[styles.inviteTxt, { color: colores.primary }]}>🎉 {t('registro.invitado')}</Text>
            </View>
          )}
          {error ? <AuthError>{error}</AuthError> : null}

          {paso === 1 && (
            <>
              <Text style={[styles.leyenda, { color: colores.gris }]}>{t('registro.tipoCuenta')}</Text>
              <View style={styles.tipos} accessibilityRole="radiogroup">
                {[
                  [false, '🍽️', t('registro.tipoCliente'), t('registro.tipoClienteDesc')],
                  [true, '🏪', t('registro.tipoEmpresa'), t('registro.tipoEmpresaDesc')],
                ].map(([valor, icono, titulo, desc]) => {
                  const on = esEmpresa === valor;
                  return (
                    <Pressable
                      key={String(valor)}
                      onPress={() => setEsEmpresa(valor)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={({ pressed }) => [
                        styles.tipo,
                        {
                          borderColor: on ? colores.primaryContainer : colores.borde,
                          borderWidth: on ? 2 : 1.5,
                          backgroundColor: on ? colores.verdeSuave : colores.papel,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.tipoIcono}>{icono}</Text>
                      <Text style={[styles.tipoTitulo, { color: colores.tinta }]}>{titulo}</Text>
                      <Text style={[styles.tipoDesc, { color: colores.gris }]}>{desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <CampoTexto
                label={t('registro.nombre')}
                value={nombre}
                onChangeText={(v) => {
                  setNombre(v);
                  setError('');
                }}
                maxLength={80}
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
                maxLength={254}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
              />
              <View>
                <CampoTexto
                  label={t('registro.contrasena')}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError('');
                  }}
                  maxLength={128}
                  secureTextEntry={!verPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  rightSlot={
                    <Pressable
                      onPress={() => setVerPass((v) => !v)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={verPass ? t('registro.ocultar') : t('registro.mostrar')}
                    >
                      <Text style={styles.ojo}>{verPass ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  }
                />
                {fuerzaInfo && (
                  <View style={styles.fuerza} accessibilityLiveRegion="polite">
                    <View style={[styles.fuerzaBarra, { backgroundColor: colores.fondoSuave }]}>
                      <View style={{ width: fuerzaInfo.ancho, height: '100%', borderRadius: 999, backgroundColor: fuerzaInfo.color }} />
                    </View>
                    <Text style={[styles.fuerzaTxt, { color: fuerzaInfo.color }]}>{fuerzaInfo.txt}</Text>
                  </View>
                )}
                <Text style={[styles.ayuda, { color: colores.gris }]}>{t('registro.passAyuda')}</Text>
              </View>
              <AuthBoton onPress={manejarEnvio}>{t('registro.siguiente')} →</AuthBoton>
            </>
          )}

          {paso === 2 && (
            <>
              <Text style={[styles.leyenda, { color: colores.gris }]}>{t('registro.miDieta')}</Text>
              <ChipGrid>
                <Chip value={vegano} onToggle={() => setVegano((v) => !v)}>🌱 {t('registro.vegano')}</Chip>
                <Chip value={vegetariano} onToggle={() => setVegetariano((v) => !v)}>🥕 {t('registro.vegetariano')}</Chip>
                <Chip value={sinGluten} onToggle={() => setSinGluten((v) => !v)}>🌾 {t('registro.sinGluten')}</Chip>
              </ChipGrid>

              <Text style={[styles.leyenda, { color: colores.gris }]}>{t('registro.misAlergias')}</Text>
              <ChipGrid>
                {ALERGENOS.filter((a) => a.key !== 'gluten').map(({ key, label }) => (
                  <Chip key={key} value={alergias.includes(key)} onToggle={() => toggleAlergia(key)}>
                    {label}
                  </Chip>
                ))}
              </ChipGrid>

              <Text style={[styles.leyenda, { color: colores.gris }]}>{t('registro.miAccesibilidad')}</Text>
              <ChipGrid>
                <Chip value={sillaRuedas} onToggle={() => setSillaRuedas((v) => !v)}>♿ {t('registro.sillaRuedas')}</Chip>
                <Chip value={tea} onToggle={() => setTea((v) => !v)}>🧩 {t('registro.espectroAutista')}</Chip>
              </ChipGrid>

              <Text style={[styles.leyenda, { color: colores.gris }]}>{t('registro.idioma')}</Text>
              <View style={styles.langs}>
                {Object.entries(available).map(([code, label]) => {
                  const on = lang === code;
                  return (
                    <Pressable
                      key={code}
                      onPress={() => setLang(code)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={label}
                      style={[
                        styles.lang,
                        {
                          borderColor: on ? colores.primaryContainer : colores.borde,
                          backgroundColor: on ? colores.primaryContainer : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.langTxt, { color: on ? '#fff' : colores.tinta }]}>{code.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>

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
  pasos: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  paso: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 9,
    borderBottomWidth: 3,
  },
  pasoNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontFamily: FUENTES.textoBold,
  },
  pasoTxt: {
    fontSize: 13,
    fontFamily: FUENTES.textoSemi,
  },
  invite: {
    borderRadius: RADIO.peq,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  inviteTxt: {
    fontSize: 14.4,
    textAlign: 'center',
    fontFamily: FUENTES.textoSemi,
  },
  leyenda: {
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: FUENTES.textoBold,
    marginTop: 8,
  },
  tipos: {
    flexDirection: 'row',
    gap: 10,
  },
  tipo: {
    flex: 1,
    borderRadius: RADIO.md,
    padding: 13,
    gap: 2,
  },
  tipoIcono: {
    fontSize: 22,
    marginBottom: 2,
  },
  tipoTitulo: {
    fontSize: 15,
    fontFamily: FUENTES.textoBold,
  },
  tipoDesc: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: FUENTES.texto,
  },
  ojo: {
    fontSize: 18,
  },
  fuerza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  fuerzaBarra: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fuerzaTxt: {
    fontSize: 12.5,
    fontFamily: FUENTES.textoSemi,
  },
  ayuda: {
    fontSize: 12.5,
    marginTop: 5,
    fontFamily: FUENTES.texto,
  },
  langs: {
    flexDirection: 'row',
    gap: 8,
  },
  lang: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: RADIO.md,
    paddingVertical: 9,
    alignItems: 'center',
  },
  langTxt: {
    fontSize: 14,
    fontFamily: FUENTES.textoBold,
  },
  nota: {
    fontSize: 13.12,
    fontFamily: FUENTES.texto,
    marginTop: 12.8,
    marginBottom: 8,
  },
});
