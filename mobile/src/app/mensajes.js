/**
 * Mensajes â€” espejo de Mensajes.jsx ('#/mensajes'): buzÃ³n interno con
 * acordeÃ³n por mensaje, marcado de leÃ­do y enlace de parking.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { AuthPagina, AuthTarjeta, AuthError } from '../components/ui/Auth';
import { listarMensajes, marcarLeido } from '../services/mensajesApi.js';
import { useAuthContext } from '../context/AuthContext';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';

const TRADS = { es, ca, en };

export default function Mensajes() {
  const t = useT(TRADS);
  const auth = useAuthContext();
  const router = useRouter();
  const { colores } = useTheme();
  const usuario = auth.usuario;
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    if (!auth.cargandoSesion && !usuario) router.replace('/login');
  }, [auth.cargandoSesion, usuario, router]);

  useEffect(() => {
    if (!usuario?.uid) return undefined;
    let vivo = true;
    setCargando(true);
    listarMensajes()
      .then((l) => {
        if (vivo) {
          setLista(l);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(e.message);
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, [usuario?.uid]);

  if (auth.cargandoSesion) return null;
  if (!usuario) return null;

  async function alternar(m) {
    const vaAbrir = abierto !== m.id;
    setAbierto(vaAbrir ? m.id : null);
    if (vaAbrir && m.leido !== true) {
      try {
        await marcarLeido(m.id);
        setLista((prev) => prev.map((x) => (x.id === m.id ? { ...x, leido: true } : x)));
        auth.recargarMensajes();
      } catch {
        /* queda como no leÃ­do */
      }
    }
  }

  const noLeidos = lista.filter((m) => m.leido !== true).length;

  return (
    <AppShell>
      <AuthPagina ancho>
        <AuthTarjeta ancho>
          <View style={estilos.h1Fila}>
            <Text style={[estilos.titulo, { color: colores.tinta }]}>{t('mensajes.titulo')}</Text>
            {noLeidos > 0 && (
              <View style={[estilos.badge, { backgroundColor: colores.tertiaryContainer }]}>
                <Text style={estilos.badgeTxt}>
                  {noLeidos} {t('mensajes.sinLeer')}
                </Text>
              </View>
            )}
          </View>

          {cargando && <Text style={[estilos.p, { color: colores.tinta }]}>{t('mensajes.cargando')}</Text>}
          {error ? <AuthError>{error}</AuthError> : null}
          {!cargando && !error && lista.length === 0 && (
            <Text style={[estilos.vacio, { color: colores.gris }]}>{t('mensajes.vacio')}</Text>
          )}

          <View style={estilos.lista}>
            {lista.map((m) => {
              const esAbierto = abierto === m.id;
              const sinLeer = m.leido !== true;
              return (
                <View
                  key={m.id}
                  style={[
                    estilos.registro,
                    { borderColor: colores.glassBorder },
                    sinLeer && { borderColor: colores.primaryContainer, borderWidth: 2 },
                  ]}
                >
                  <Pressable
                    onPress={() => alternar(m)}
                    style={estilos.mensajeCab}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: esAbierto }}
                  >
                    <Text style={[estilos.punto, { color: sinLeer ? colores.primaryContainer : colores.borde }]}>
                      {sinLeer ? 'â—' : 'â—‹'}
                    </Text>
                    <Text style={{ color: colores.tinta, flex: 1 }}>
                      <Text style={estilos.mensajeTitulo}>{m.titulo}</Text>
                      <Text style={[estilos.detalle, { color: colores.gris }]}>
                        {' '}
                        Â· {m.fecha || ''} {m.hora || ''}
                      </Text>
                    </Text>
                  </Pressable>
                  {esAbierto && (
                    <>
                      <Text style={[estilos.cuerpo, { color: colores.tinta }]}>{m.cuerpo}</Text>
                      {(m.parkingLink || m.parkingNombre) && (
                        <Text style={[estilos.parking, { color: colores.gris }]}>
                          ðŸ…¿ï¸ {t('mensajes.parking')}: {m.parkingNombre || t('mensajes.recomendado')}
                          {m.parkingDistanciaM != null
                            ? ` a ${m.parkingDistanciaM < 1000 ? `${m.parkingDistanciaM} m` : `${(m.parkingDistanciaM / 1000).toLocaleString(t('modelos.locale'), { maximumFractionDigits: 1 })} km`}`
                            : ''}{' '}
                          {m.parkingLink ? (
                            <Text
                              style={[estilos.parkingLink, { color: colores.primaryContainer }]}
                              onPress={() => Linking.openURL(m.parkingLink)}
                              accessibilityRole="link"
                            >
                              {t('mensajes.comoLlegarParking')}
                            </Text>
                          ) : null}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const estilos = StyleSheet.create({
  h1Fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 28.8,
    margin: 0,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 2.4,
    paddingHorizontal: 9.6,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 12.48,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
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
  },
  lista: {
    gap: 9.6,
    width: '100%',
  },
  registro: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 12.8,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 4,
  },
  mensajeCab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
    width: '100%',
  },
  punto: {
    fontSize: 12.8,
    flexShrink: 0,
  },
  mensajeTitulo: {
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  detalle: {
    fontSize: 14.08,
    fontFamily: FUENTES.texto,
  },
  cuerpo: {
    marginTop: 9.6,
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
  },
  parking: {
    marginTop: 6.4,
    fontSize: 14.08,
    fontFamily: FUENTES.texto,
    lineHeight: 20,
  },
  parkingLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
