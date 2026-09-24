import { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { IMG } from '../theme/imagenes';
import { FUENTES } from '../theme/tokens';

const LogoCircular = IMG.logoCircular;

function calcularPuntosPorDia(dia) {
  if (dia >= 7) return 0;
  return Math.min(5 + 3 * Math.max(0, dia - 1), 15);
}

/** Camino de 7 días genérico (mismas reglas que el web). */
function construirCamino(dias, yaReclamado, esDia7) {
  const d = Math.min(Math.max(dias || 0, 0), 7);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = i + 1;
    const completado = dia <= d;
    const esSiguiente = !yaReclamado && dia === d + 1;
    const esHoy = yaReclamado ? false : esDia7 ? dia === 7 : esSiguiente;
    const bloqueado = !completado && !esHoy;
    return { dia, label: `Día ${dia}`, completado, esHoy, bloqueado, esSiguiente };
  });
}

export default function DailyStreakPopup({ racha, saldo, yaReclamado, onClaim, onWheel, onClose }) {
  const { colores } = useTheme();
  const [claimed, setClaimed] = useState(yaReclamado || false);
  const [showToast, setShowToast] = useState(false);
  const [animSaldo, setAnimSaldo] = useState(saldo || 0);
  const [justClaimed, setJustClaimed] = useState(false);
  const [lastPuntos, setLastPuntos] = useState(0);

  useEffect(() => {
    setClaimed(Boolean(yaReclamado));
  }, [yaReclamado]);

  const dias = racha?.dias || 0;
  const puntosDesdeApi = racha?.puntosHoy;
  const esDia7 = Boolean(racha?.dia7Disponible) || dias >= 7;
  const puntosHoy =
    claimed || esDia7
      ? 0
      : typeof puntosDesdeApi === 'number'
        ? puntosDesdeApi
        : calcularPuntosPorDia(Math.max(dias + 1, 1));
  const camino = construirCamino(dias, claimed, esDia7);

  useEffect(() => {
    if (!justClaimed) setAnimSaldo(saldo || 0);
  }, [saldo, justClaimed]);

  const handleClaim = useCallback(async () => {
    if (esDia7) {
      onWheel?.();
      return;
    }
    if (claimed) return;
    try {
      const result = await onClaim?.();
      const puntosNuevos = typeof result?.puntos === 'number' ? result.puntos : 0;
      const exito =
        puntosNuevos > 0 || (result?.nuevoSaldo != null && result?.yaReclamado !== true);
      if (!exito) {
        setClaimed(true);
        return;
      }
      setClaimed(true);
      setJustClaimed(true);
      setLastPuntos(puntosNuevos);
      if (result?.nuevoSaldo != null) setAnimSaldo(result.nuevoSaldo);
      else if (puntosNuevos > 0) setAnimSaldo((prev) => prev + puntosNuevos);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch {
      setClaimed(false);
      setJustClaimed(false);
    }
  }, [claimed, esDia7, onClaim, onWheel]);

  const habla = esDia7
    ? '¡Llegaste al día 7!'
    : justClaimed
      ? `¡Día ${Math.max(dias, 1)} completado!`
      : claimed
        ? '¡Racha imparable!'
        : '¡Te toca reclamar hoy!';

  const badgeTxt =
    dias === 0
      ? 'BIENVENIDO'
      : esDia7
        ? 'DÍA 7 COMPLETADO'
        : claimed
          ? `DÍA ${Math.max(dias, 1)} COMPLETADO`
          : `RACHA DE ${dias} DÍA${dias !== 1 ? 'S' : ''}`;

  const btnLabel = esDia7
    ? '¡GIRAR RULETA! 🎡'
    : claimed
      ? 'VER RACHA ACTUAL ✓'
      : `¡RECLAMAR +${puntosHoy} MIRA! ✨`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        {showToast && (
          <View style={styles.toast}>
            <View style={styles.toastIcono}>
              <Text style={styles.toastIconoTxt}>✓</Text>
            </View>
            <View>
              <Text style={styles.toastTitulo}>+{lastPuntos} MIRA Points acreditados</Text>
              <Text style={styles.toastSub}>¡Vuelve mañana para continuar tu racha!</Text>
            </View>
          </View>
        )}

        <View style={[styles.modal, { borderColor: 'rgba(0, 106, 85, 0.1)' }]}>
          <ScrollView contentContainerStyle={styles.scrollContenido} showsVerticalScrollIndicator={false}>
            {/* Cintillo superior */}
            <View style={styles.header}>
              <View style={styles.brand}>
                <View style={[styles.brandIcono, { backgroundColor: colores.primaryContainer }]}>
                  <LogoCircular width={22} height={22} />
                </View>
                <View>
                  <Text style={[styles.brandNombre, { color: colores.primaryContainer }]}>MIRA CLUB</Text>
                  <Text style={[styles.brandSub, { color: colores.gris }]}>Recompensa Diaria</Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={styles.close}
              >
                <Text style={styles.closeTxt}>✕</Text>
              </Pressable>
            </View>

            {/* Hero con mascota */}
            <View style={styles.hero}>
              <View style={styles.mascotaArea}>
                <Image source={IMG.mascotaRacha} style={styles.mascota} resizeMode="contain" />
                <View style={styles.speech}>
                  <Text style={styles.speechTxt}>
                    🔥 {habla}
                  </Text>
                  <View style={styles.speechFlecha} />
                </View>
                <Image source={IMG.moneda} style={styles.monedaIzq} resizeMode="contain" />
                <Image source={IMG.moneda} style={styles.monedaDer} resizeMode="contain" />
              </View>

              <View style={[styles.dayBadge, { backgroundColor: '#FEF3C7', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
                <Text style={styles.dayBadgeTxt}>⚡ {badgeTxt}</Text>
              </View>

              <Text style={styles.titulo}>
                {dias === 0 ? (
                  <>¡Bienvenido a <Text style={styles.fuego}>MIRA Club!</Text> 🎉</>
                ) : esDia7 ? (
                  <>¡Completaste la racha de 7 días! <Text style={styles.fuego}>🎉</Text></>
                ) : claimed ? (
                  <>¡Llevas <Text style={styles.fuego}>{Math.max(dias, 1)} Días 🔥</Text> de Racha!</>
                ) : (
                  <>¡Racha de <Text style={styles.fuego}>{dias} Día{dias !== 1 ? 's' : ''} 🔥</Text> — reclama hoy!</>
                )}
              </Text>

              <Text style={styles.subtitulo}>
                {dias === 0 ? (
                  <>Reclama tu primera recompensa y empieza a acumular <Text style={styles.bold}>MIRA Points</Text></>
                ) : esDia7 ? (
                  <>Gira la ruleta para ganar entre <Text style={styles.bold}>20 y 100 MIRA Points</Text></>
                ) : (
                  <>Entra a diario para desbloquear más <Text style={styles.bold}>MIRA Points</Text> y conseguir descuentos en tu próxima cena.</>
                )}
              </Text>
            </View>

            {/* Grid 7 días */}
            <View style={styles.calendario}>
              <View style={styles.calendarioHeader}>
                <Text style={[styles.calendarioTitulo, { color: colores.primaryContainer }]}>
                  Camino del Foodie <Text style={[styles.calendarioSemana, { color: colores.gris }]}>· 7 días</Text>
                </Text>
                {esDia7 && (
                  <View style={[styles.calendarioPremio, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <Text style={styles.calendarioPremioTxt}>🎡 Ruleta: ¡hasta 100 MIRA pts!</Text>
                  </View>
                )}
              </View>

              <View style={styles.grid}>
                {camino.map((celda) => {
                  const dia = celda.dia;
                  const completado = celda.completado;
                  const esHoy = celda.esHoy && !completado;
                  const bloqueado = celda.bloqueado && !esHoy;
                  const puntos = dia === 7 ? null : calcularPuntosPorDia(dia);
                  const esRueda = esHoy && esDia7;

                  return (
                    <View
                      key={dia}
                      style={[
                        styles.dia,
                        completado && { backgroundColor: 'rgba(0, 106, 85, 0.08)', borderColor: colores.primaryContainer },
                        esHoy && !esDia7 && styles.diaHoy,
                        esRueda && styles.diaRueda,
                        bloqueado && styles.diaLocked,
                      ]}
                    >
                      {esHoy && <View style={styles.diaTag}><Text style={styles.diaTagTxt}>HOY</Text></View>}
                      <Text style={[styles.diaNombre, esHoy && styles.diaNombreHoy, { color: colores.gris }]}>
                        {celda.label}
                      </Text>
                      <View style={styles.diaIcono}>
                        {completado && (
                          <View style={[styles.check, { backgroundColor: colores.primaryContainer }]}>
                            <Text style={styles.checkTxt}>✓</Text>
                          </View>
                        )}
                        {!completado && esHoy && esRueda && (
                          <Image source={IMG.rachaFuego} style={styles.iconoImg} resizeMode="contain" />
                        )}
                        {!completado && esHoy && !esDia7 && (
                          <Image source={IMG.moneda} style={styles.iconoImg} resizeMode="contain" />
                        )}
                        {bloqueado && <Text style={styles.lock}>🔒</Text>}
                      </View>
                      {dia === 7 ? (
                        <Text style={styles.diaPuntosRueda}>🎡 Ruleta</Text>
                      ) : (
                        <Text style={[styles.diaPuntos, { color: colores.primaryContainer }]}>+{puntos}</Text>
                      )}
                      <Text style={[styles.diaUnidad, { color: colores.gris }]}>MIRA</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Saldo + botón */}
            <View style={styles.acciones}>
              <View style={[styles.balance, { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.06)' }]}>
                <View style={styles.balanceIcono}>
                  <Image source={IMG.moneda} style={styles.balanceMoneda} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.balanceLabel, { color: colores.gris }]}>Tu saldo de MIRA Points</Text>
                  <View style={styles.balanceAmount}>
                    <Text style={[styles.balanceNum, { color: colores.tinta }]}>{animSaldo}</Text>
                    <Text style={[styles.balanceTexto, { color: colores.primaryContainer }]}>acumulados</Text>
                  </View>
                </View>
              </View>

              <Pressable onPress={handleClaim} accessibilityRole="button" style={{ width: '100%' }}>
                {esDia7 ? (
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.claimBtn, styles.claimBtnRueda]}
                  >
                    <Text style={styles.claimTxt}>{btnLabel}</Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.claimBtn,
                      { backgroundColor: claimed ? '#D1D5DB' : colores.primaryContainer },
                      claimed && { shadowColor: '#CBD5E1' },
                    ]}
                  >
                    <Text style={[styles.claimTxt, claimed && { color: '#6B7280' }]}>{btnLabel}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: 'rgba(0,0,0,0.02)', borderTopColor: 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.footerTxt, { color: colores.gris }]}>
                🛡️ Protector de racha activo: si olvidas entrar mañana, tu racha no se pierde.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 15, 0.65)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    backgroundColor: '#FCFBF8',
    borderRadius: 32,
    borderWidth: 4,
    overflow: 'hidden',
  },
  scrollContenido: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25.6,
    paddingVertical: 19.2,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
  },
  brandIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandNombre: {
    fontSize: 11.2,
    fontWeight: '900',
    letterSpacing: 0.9,
    fontFamily: FUENTES.textoExtra,
  },
  brandSub: {
    fontSize: 10.4,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
    marginTop: -1,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#414844',
  },
  hero: {
    paddingHorizontal: 25.6,
    paddingBottom: 16,
    alignItems: 'center',
  },
  mascotaArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  mascota: {
    width: 150,
    height: 150,
  },
  speech: {
    position: 'absolute',
    top: -4,
    right: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    zIndex: 3,
  },
  speechTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#181c1a',
    fontFamily: FUENTES.textoExtra,
  },
  speechFlecha: {
    position: 'absolute',
    bottom: -5,
    left: 20,
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#F59E0B',
    transform: [{ rotate: '45deg' }],
  },
  monedaIzq: {
    position: 'absolute',
    left: '4%',
    top: 8,
    width: 52,
    height: 52,
    transform: [{ rotate: '-12deg' }],
  },
  monedaDer: {
    position: 'absolute',
    right: '4%',
    top: 4,
    width: 52,
    height: 52,
    transform: [{ rotate: '12deg' }],
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  dayBadgeTxt: {
    fontSize: 11.2,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.7,
    fontFamily: FUENTES.textoExtra,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontSize: 27,
    fontWeight: '900',
    color: '#181c1a',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
    lineHeight: 32,
  },
  fuego: {
    color: '#F59E0B',
  },
  subtitulo: {
    color: '#414844',
    fontSize: 14.1,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 21,
    fontFamily: FUENTES.textoMedio,
  },
  bold: {
    fontWeight: '800',
    fontFamily: FUENTES.textoExtra,
  },
  calendario: {
    paddingHorizontal: 25.6,
    marginVertical: 12.8,
  },
  calendarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  calendarioTitulo: {
    fontSize: 11.2,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: FUENTES.textoExtra,
  },
  calendarioSemana: {
    fontSize: 11.2,
    fontWeight: '700',
    textTransform: 'none',
    letterSpacing: 0,
    fontFamily: FUENTES.textoBold,
  },
  calendarioPremio: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  calendarioPremioTxt: {
    fontSize: 10.9,
    fontWeight: '800',
    color: '#D97706',
    fontFamily: FUENTES.textoExtra,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dia: {
    width: '13.5%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 1,
    position: 'relative',
  },
  diaHoy: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    zIndex: 2,
  },
  diaRueda: {
    backgroundColor: '#FDE68A',
    borderColor: '#F59E0B',
    zIndex: 2,
  },
  diaLocked: {
    opacity: 0.55,
  },
  diaTag: {
    position: 'absolute',
    top: -8,
    right: -2,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingVertical: 1,
    paddingHorizontal: 6,
    zIndex: 4,
  },
  diaTagTxt: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#fff',
    fontFamily: FUENTES.textoExtra,
  },
  diaNombre: {
    fontSize: 9.6,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontFamily: FUENTES.textoExtra,
  },
  diaNombreHoy: {
    color: '#92400E',
  },
  diaIcono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  check: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14.4,
  },
  iconoImg: {
    width: 30,
    height: 30,
  },
  lock: {
    fontSize: 15,
    opacity: 0.5,
  },
  diaPuntos: {
    fontSize: 10.4,
    fontWeight: '900',
    fontFamily: FUENTES.textoExtra,
  },
  diaPuntosRueda: {
    fontSize: 8.8,
    fontWeight: '900',
    color: '#D97706',
    fontFamily: FUENTES.textoExtra,
    textAlign: 'center',
  },
  diaUnidad: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: -2,
    fontFamily: FUENTES.textoBold,
  },
  acciones: {
    paddingHorizontal: 25.6,
    paddingTop: 12.8,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  balanceIcono: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceMoneda: {
    width: 28,
    height: 28,
  },
  balanceLabel: {
    fontSize: 9.3,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: FUENTES.textoExtra,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  balanceNum: {
    fontSize: 20.8,
    fontWeight: '900',
    fontFamily: FUENTES.display,
  },
  balanceTexto: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  claimBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
  },
  claimBtnRueda: {
    shadowColor: '#B45309',
  },
  claimTxt: {
    color: '#fff',
    fontSize: 14.7,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontFamily: FUENTES.textoExtra,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 25.6,
  },
  footerTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  toast: {
    position: 'absolute',
    top: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    zIndex: 10,
  },
  toastIcono: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconoTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13.6,
  },
  toastTitulo: {
    fontSize: 13.6,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FUENTES.textoExtra,
  },
  toastSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
    fontFamily: FUENTES.texto,
  },
});
