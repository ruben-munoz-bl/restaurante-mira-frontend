/**
 * Mis reservas â€” espejo de Reservas.jsx ('#/reservas'): calendario con
 * meteorologÃ­a de los dÃ­as con reserva, lista del dÃ­a seleccionado y
 * pestaÃ±as prÃ³ximas/pasadas/canceladas con cancelaciÃ³n (Alert nativo).
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { AuthPagina, AuthTarjeta, AuthError } from '../components/ui/Auth';
import { listarMisReservas, cancelarReserva } from '../services/reservaApi.js';
import { diasMes, pronosticoDia, alertaTerraza } from '../services/meteoApi.js';
import { useAuthContext } from '../context/AuthContext';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO } from '../theme/tokens';
import { btnCta, btnSecundario } from '../theme/ui';

const TRADS = { es, ca, en };

function hoyISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

export default function Reservas() {
  const t = useT(TRADS);
  const MESES = t('modelos.meses');
  const DIAS_SEMANA = t('modelos.diasSemana');
  const auth = useAuthContext();
  const router = useRouter();
  const { colores } = useTheme();
  const usuario = auth.usuario;
  const esAdmin = auth.esAdmin;

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('proximas');
  const [mesVista, setMesVista] = useState(() => {
    const h = new Date();
    return { anio: h.getFullYear(), mes: h.getMonth() + 1 };
  });
  const [diaSel, setDiaSel] = useState(hoyISO());
  const [meteo, setMeteo] = useState({});

  useEffect(() => {
    if (!auth.cargandoSesion && !usuario) router.replace('/login');
  }, [auth.cargandoSesion, usuario, router]);

  useEffect(() => {
    if (!usuario?.uid) return undefined;
    let vivo = true;
    setCargando(true);
    listarMisReservas()
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

  // Meteo de los dÃ­as con reserva del mes visible (gratis, con cachÃ©).
  useEffect(() => {
    const prefijo = `${mesVista.anio}-${String(mesVista.mes).padStart(2, '0')}`;
    const porDiaPre = new Map();
    for (const r of lista) {
      if (r.fecha?.startsWith(prefijo) && r.lat != null && r.lng != null && !porDiaPre.has(r.fecha)) {
        porDiaPre.set(r.fecha, r);
      }
    }
    if (!porDiaPre.size) return undefined;
    let vivo = true;
    Promise.all([...porDiaPre].map(async ([fecha, r]) => [fecha, await pronosticoDia(r.lat, r.lng, fecha)]))
      .then((pares) => {
        if (!vivo) return;
        setMeteo((prev) => {
          const next = { ...prev };
          pares.forEach(([f, p]) => {
            next[f] = p;
          });
          return next;
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [lista, mesVista]);

  if (auth.cargandoSesion) return null;
  if (!usuario) return null;

  function handleCancelar(r) {
    Alert.alert(t('reservas.cancelarReserva', { fecha: r.fecha, hora: r.hora }), undefined, [
      { text: t('otros.cancelar'), style: 'cancel' },
      {
        text: t('otros.aceptar'),
        onPress: async () => {
          setError('');
          try {
            await cancelarReserva(r.id, { uid: usuario.uid, esAdmin });
            setLista((prev) => prev.map((x) => (x.id === r.id ? { ...x, estado: 'cancelada' } : x)));
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);
  }

  const hoy = hoyISO();
  const noCancelada = (r) => String(r.estado || '').toLowerCase() !== 'cancelada';
  const proximas = lista.filter((r) => noCancelada(r) && r.fecha >= hoy);
  const pasadas = lista.filter((r) => noCancelada(r) && r.fecha < hoy);
  const canceladas = lista.filter((r) => r.estado === 'cancelada');
  const visibles = tab === 'proximas' ? proximas : tab === 'pasadas' ? pasadas : canceladas;

  // Calendario: reservas por dÃ­a + meteo del dÃ­a seleccionado.
  const porDia = new Map();
  lista.forEach((r) => {
    if (!r.fecha || r.estado === 'cancelada') return;
    if (!porDia.has(r.fecha)) porDia.set(r.fecha, []);
    porDia.get(r.fecha).push(r);
  });
  const celdas = diasMes(mesVista.anio, mesVista.mes);
  const delDiaSel = (porDia.get(diaSel) || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  function moverMes(dir) {
    setMesVista((m) => {
      let { anio, mes } = m;
      mes += dir;
      if (mes < 1) {
        mes = 12;
        anio -= 1;
      }
      if (mes > 12) {
        mes = 1;
        anio += 1;
      }
      return { anio, mes };
    });
  }

  const filasCalendario = [0, 1, 2, 3, 4, 5].map((f) => celdas.slice(f * 7, f * 7 + 7));

  return (
    <AppShell>
      <AuthPagina ancho>
        <AuthTarjeta ancho>
          <Text style={[estilos.titulo, { color: colores.tinta }]}>{t('reservas.misReservas')}</Text>

          {cargando && <Text style={[estilos.p, { color: colores.tinta }]}>{t('reservas.cargando')}</Text>}
          {error ? <AuthError>{error}</AuthError> : null}

          {!cargando && (
            <View>
              <Text style={[estilos.sub, { color: colores.tinta }]}>{t('reservas.calendario')}</Text>

              <View style={estilos.calCab}>
                <Pressable onPress={() => moverMes(-1)} accessibilityLabel={t('reservas.mesAnterior')}>
                  <Text style={btnSecundario(colores, { peq: true })}>â†</Text>
                </Pressable>
                <Text style={[estilos.calMes, { color: colores.tinta }]}>
                  {MESES[mesVista.mes - 1]} {mesVista.anio}
                </Text>
                <Pressable onPress={() => moverMes(1)} accessibilityLabel={t('reservas.mesSiguiente')}>
                  <Text style={btnSecundario(colores, { peq: true })}>â†’</Text>
                </Pressable>
              </View>

              <View accessibilityLabel={`${t('reservas.misReservas')} ${MESES[mesVista.mes - 1]}`}>
                <View style={estilos.calFila}>
                  {DIAS_SEMANA.map((d) => (
                    <Text key={d} style={estilos.calNombreDia}>
                      {d}
                    </Text>
                  ))}
                </View>
                {filasCalendario.map((fila, fi) => (
                  <View key={`fila-${fi}`} style={estilos.calFila}>
                    {fila.map((c, i) =>
                      !c ? (
                        <View key={`vacia-${fi}-${i}`} style={[estilos.calDia, estilos.calVacio]} />
                      ) : (
                        <Pressable
                          key={c.fecha}
                          onPress={() => setDiaSel(c.fecha)}
                          accessibilityRole="gridcell"
                          accessibilityState={{ selected: diaSel === c.fecha }}
                          accessibilityLabel={`${c.dia}: ${(porDia.get(c.fecha) || []).length} reservas`}
                          style={[
                            estilos.calDia,
                            { borderColor: colores.glassBorder, backgroundColor: colores.papel },
                            diaSel === c.fecha && [estilos.calSel, { borderColor: colores.primaryContainer }],
                          ]}
                        >
                          <Text
                            style={[
                              estilos.calNum,
                              { color: colores.tinta },
                              c.fecha === hoy && [estilos.calNumHoy, { backgroundColor: colores.verdeSuave }],
                            ]}
                          >
                            {c.dia}
                          </Text>
                          {(porDia.get(c.fecha) || []).length > 0 && (
                            <View style={estilos.calPuntos} accessibilityElementsHidden>
                              {(porDia.get(c.fecha) || []).slice(0, 3).map((r) => (
                                <View key={r.id} style={[estilos.calPunto, { backgroundColor: colores.primaryContainer }]} />
                              ))}
                            </View>
                          )}
                          {meteo[c.fecha] && meteo[c.fecha].tempMax != null && (
                            <Text style={[estilos.calTemp, { color: colores.gris }]} numberOfLines={1}>
                              {Math.round(meteo[c.fecha].tempMax)}Â°
                            </Text>
                          )}
                        </Pressable>
                      ),
                    )}
                  </View>
                ))}
              </View>

              <Text style={[estilos.sub, estilos.diaTitulo, { color: colores.tinta }]}>
                {new Date(`${diaSel}T12:00:00`).toLocaleDateString(t('modelos.locale'), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              {delDiaSel.length === 0 && (
                <Text style={[estilos.vacio, { color: colores.gris }]}>{t('reservas.nadaEsteDia')}</Text>
              )}
              <View style={estilos.lista}>
                {delDiaSel.map((r) => {
                  const aviso = alertaTerraza(r.terraza, meteo[r.fecha]);
                  const m = meteo[r.fecha];
                  return (
                    <View key={r.id} style={[estilos.registro, { borderColor: colores.glassBorder }]}>
                      <View style={estilos.registroCuerpo}>
                        <Text style={[estilos.registroTitulo, { color: colores.tinta }]}>{r.nombreRestaurante}</Text>
                        <Text style={[estilos.detalle, { color: colores.gris }]}>
                          {r.hora} Â· {r.comensales}{' '}
                          {Number(r.comensales) === 1 ? t('modelos.persona') : t('modelos.personas')} Â·{' '}
                          <Text style={estilos.codigo}>{r.codigo}</Text>
                          {m && m.tempMax != null ? <> Â· {Math.round(m.tempMax)}Â° {m.resumen}</> : null}
                        </Text>
                        {aviso ? (
                          <Text style={[estilos.detalle, estilos.avisoMeteo]} accessibilityRole="status">
                            {aviso}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {!cargando && (
            <>
              <View style={estilos.tabs} accessibilityRole="tablist">
                {[
                  ['proximas', `${t('reservas.proximas')} (${proximas.length})`],
                  ['pasadas', `${t('reservas.pasadas')} (${pasadas.length})`],
                  ['canceladas', `${t('reservas.canceladas')} (${canceladas.length})`],
                ].map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === key }}
                  >
                    <Text style={tab === key ? btnCta(colores, { peq: true }) : btnSecundario(colores, { peq: true })}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {visibles.length === 0 && (
                <Text style={[estilos.vacio, { color: colores.gris }]}>{t('reservas.nadaAqui')}</Text>
              )}
              <View style={estilos.lista}>
                {visibles.map((r) => (
                  <View key={r.id} style={[estilos.registro, estilos.registroFila, { borderColor: colores.glassBorder }]}>
                    <View style={estilos.registroCuerpo}>
                      <Text style={[estilos.registroTitulo, { color: colores.tinta }]}>{r.nombreRestaurante}</Text>
                      <Text style={[estilos.detalle, { color: colores.gris }]}>
                        {r.fecha} a las {r.hora} Â· {r.comensales}{' '}
                        {Number(r.comensales) === 1 ? t('modelos.persona') : t('modelos.personas')} Â·{' '}
                        <Text style={estilos.codigo}>{r.codigo}</Text> Â· {r.estado}
                      </Text>
                      {r.comentarios ? (
                        <Text style={[estilos.detalle, { color: colores.gris }]}>â€œ{r.comentarios}â€</Text>
                      ) : null}
                    </View>
                    {String(r.estado || '').toLowerCase() !== 'cancelada' && r.fecha >= hoy && (
                      <Pressable onPress={() => handleCancelar(r)}>
                        <Text style={btnSecundario(colores, { peq: true })}>{t('reservas.cancelar')}</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const estilos = StyleSheet.create({
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 28.8,
    margin: 0,
  },
  p: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
  },
  sub: {
    fontFamily: FUENTES.display,
    fontSize: 18.4,
    marginTop: 22.4,
    marginBottom: 9.6,
  },
  diaTitulo: {
    marginTop: 18,
    textTransform: 'capitalize',
  },
  vacio: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
    marginVertical: 4,
  },
  calCab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9.6,
    marginBottom: 11.2,
  },
  calMes: {
    fontFamily: FUENTES.textoBold,
    fontWeight: '700',
    fontSize: 15.2,
  },
  calFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calNombreDia: {
    width: '13.4%',
    textAlign: 'center',
    fontSize: 11.52,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6f7570',
    paddingVertical: 3.2,
    fontFamily: FUENTES.textoBold,
  },
  calDia: {
    width: '13.4%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: RADIO.peq,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.4,
    gap: 1.6,
  },
  calVacio: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  calSel: {
    borderWidth: 2,
  },
  calNum: {
    fontSize: 13.6,
    fontFamily: FUENTES.texto,
  },
  calNumHoy: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    overflow: 'hidden',
  },
  calPuntos: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
  },
  calPunto: {
    width: 5,
    height: 5,
    borderRadius: 5,
  },
  calTemp: {
    fontSize: 10.88,
    lineHeight: 12,
  },
  lista: {
    gap: 9.6,
    width: '100%',
    marginTop: 4,
  },
  registro: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    padding: 12.8,
    flexDirection: 'column',
    gap: 8,
  },
  registroFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  registroCuerpo: {
    flex: 1,
    gap: 2,
  },
  registroTitulo: {
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
    fontSize: 15.2,
  },
  detalle: {
    fontSize: 14.08,
    fontFamily: FUENTES.texto,
    lineHeight: 20,
    marginTop: 2.4,
  },
  codigo: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13.2,
  },
  avisoMeteo: {
    color: '#8f1d14',
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
});
