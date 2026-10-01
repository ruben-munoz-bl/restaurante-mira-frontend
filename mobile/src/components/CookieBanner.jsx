/**
 * Banner de cookies — espejo de .cookie-fondo/.cookie-banner del web:
 * fondo oscuro inferior, tarjeta papel radius 24, acciones en fila
 * (columna ≤500px). Aceptar / solo necesarias / configurar por categorías.
 */
import { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { COOKIE_CATEGORIAS, COOKIE_DEFAULT, leerCookies, guardarCookies, tieneConsentimiento } from '../services/cookieService.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO, sombraFlotante } from '../theme/tokens';
import { btnCta, btnSecundario, btnTexto } from '../theme/ui';

const TRADS = { es, ca, en };

export default function CookieBanner({ usuario }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { width } = useWindowDimensions();
  const estrecho = width <= 500;
  const [visible, setVisible] = useState(false);
  const [configurando, setConfigurando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [prefs, setPrefs] = useState({ ...COOKIE_DEFAULT });

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    leerCookies(usuario?.uid)
      .then((c) => {
        if (!vivo) return;
        if (tieneConsentimiento(c)) {
          setVisible(false);
        } else {
          setVisible(true);
          setPrefs({ ...COOKIE_DEFAULT, ...c });
        }
        setCargando(false);
      })
      .catch(() => {
        if (vivo) {
          setVisible(true);
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, [usuario]);

  async function aceptarTodas() {
    const datos = { ...COOKIE_DEFAULT, necesarias: true, preferencias: true, analiticas: true, marketing: true };
    await guardarCookies(datos, usuario?.uid);
    setVisible(false);
  }

  async function rechazar() {
    await guardarCookies({ ...COOKIE_DEFAULT }, usuario?.uid);
    setVisible(false);
  }

  async function guardarConfig() {
    await guardarCookies({ ...prefs, necesarias: true }, usuario?.uid);
    setVisible(false);
    setConfigurando(false);
  }

  function toggle(key) {
    if (key === 'necesarias') return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  if (cargando || !visible) return null;

  const accionesStyle = [styles.acciones, estrecho && { flexDirection: 'column', alignItems: 'stretch' }];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}} accessibilityViewIsModal>
      <View style={styles.fondo} accessibilityLabel={t('cookie.aviso')}>
        <View style={[styles.banner, { backgroundColor: colores.papel, borderColor: colores.glassBorder }, sombraFlotante(colores), estrecho && { padding: 16 }]}>
          {!configurando ? (
            <>
              <View style={styles.texto}>
                <Text style={[styles.titulo, { color: colores.tinta }]}>{t('cookie.titulo')}</Text>
                <Text style={[styles.p, { color: colores.gris }]}>{t('cookie.texto')}</Text>
              </View>
              <View style={accionesStyle}>
                <Pressable onPress={aceptarTodas} accessibilityRole="button">
                  <Text style={[btnCta(colores, { peq: true }), estrecho && styles.btnFull]}>{t('cookie.aceptarTodas')}</Text>
                </Pressable>
                <Pressable onPress={rechazar} accessibilityRole="button">
                  <Text style={[btnSecundario(colores, { peq: true }), estrecho && styles.btnFull]}>{t('cookie.soloNecesarias')}</Text>
                </Pressable>
                <Pressable onPress={() => setConfigurando(true)} accessibilityRole="button">
                  <Text style={[btnTexto(colores), estrecho && styles.btnFull]}>{t('cookie.configurar')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.texto}>
                <Text style={[styles.titulo, { color: colores.tinta }]}>{t('cookie.configurarCookies')}</Text>
                {COOKIE_CATEGORIAS.map((cat, i) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => toggle(cat.key)}
                    disabled={cat.requerida}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: Boolean(prefs[cat.key]), disabled: cat.requerida }}
                    style={[
                      styles.cat,
                      { borderBottomColor: colores.glassBorder },
                      i === COOKIE_CATEGORIAS.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View
                      style={[
                        styles.check,
                        { borderColor: colores.borde },
                        Boolean(prefs[cat.key]) && { backgroundColor: colores.primaryContainer, borderColor: colores.primaryContainer },
                        cat.requerida && { opacity: 0.6 },
                      ]}
                    >
                      {Boolean(prefs[cat.key]) && <Text style={styles.checkTxt}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catLabel, { color: colores.tinta }]}>
                        <Text style={{ fontWeight: '700', fontFamily: FUENTES.textoBold }}>{t(`cookie.${cat.key}`)}</Text>
                        {cat.requerida && <Text style={[styles.oblig, { color: colores.gris }]}> ({t('cookie.obligatoria')})</Text>}
                      </Text>
                      <Text style={[styles.desc, { color: colores.gris }]}>{t(`cookie.${cat.key}Desc`)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              <View style={accionesStyle}>
                <Pressable onPress={guardarConfig} accessibilityRole="button">
                  <Text style={[btnCta(colores, { peq: true }), estrecho && styles.btnFull]}>{t('cookie.guardarPreferencias')}</Text>
                </Pressable>
                <Pressable onPress={() => setConfigurando(false)} accessibilityRole="button">
                  <Text style={[btnSecundario(colores, { peq: true }), estrecho && styles.btnFull]}>{t('cookie.volver')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  banner: {
    borderRadius: RADIO.xl,
    borderWidth: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 19.2,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  texto: {
    marginBottom: 12.8,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 18.4,
    marginBottom: 8,
  },
  p: {
    marginTop: 4.8,
    fontSize: 14.08,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9.6,
    alignItems: 'center',
  },
  btnFull: {
    width: '100%',
    textAlign: 'center',
  },
  cat: {
    flexDirection: 'row',
    gap: 9.6,
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: 0,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  catLabel: {
    fontSize: 14.4,
    fontFamily: FUENTES.texto,
    lineHeight: 20,
  },
  desc: {
    fontSize: 13.12,
    fontFamily: FUENTES.texto,
    lineHeight: 18,
    marginTop: 2,
  },
  oblig: {
    fontSize: 12.48,
    fontFamily: FUENTES.texto,
  },
});
