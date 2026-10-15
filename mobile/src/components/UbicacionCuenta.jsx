/** Sección de «Mi cuenta» (app): consentimiento y estado de la ubicación para ofertas cercanas (G03). */
import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import useUbicacion from '../hooks/useUbicacion.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, RADIO, sombraFlotante } from '../theme/tokens';
import { btnCta, btnSecundario } from '../theme/ui';

const TRADS = { es, ca, en };
const PUNTOS = ['puntoUso', 'puntoRecorrido', 'puntoAbiertaApp', 'puntoDesactivar'];

export default function UbicacionCuenta() {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { consentimiento, activa, posicion, error, aceptar, rechazar } = useUbicacion();
  const [preguntando, setPreguntando] = useState(false);
  const texto = [styles.texto, { color: colores.gris }];

  return (
    <View style={styles.form}>
      <Text style={texto}>{t('ubicacion.descripcion')}</Text>
      <Text style={[styles.estado, { color: colores.tinta }]} accessibilityLiveRegion="polite">
        {t(activa ? 'ubicacion.estadoActiva' : 'ubicacion.estadoInactiva')}
      </Text>
      {activa && !error && !posicion ? <Text style={texto}>{t('ubicacion.buscando')}</Text> : null}
      {activa && error ? <Text style={[styles.texto, { color: colores.rojo || '#b3261e' }]} accessibilityRole="alert">{t(`ubicacion.${error === 'errorPermiso' ? 'errorPermisoApp' : error}`)}</Text> : null}
      {activa && posicion ? (
        <Text style={texto}>
          {t('ubicacion.posicionActual', { lat: posicion.lat, lng: posicion.lng })}
          {posicion.precisionM != null ? ` · ${t('ubicacion.precision', { m: posicion.precisionM })}` : ''}
          {'\n'}{t('ubicacion.noSeEnviaApp')}
        </Text>
      ) : null}
      <Pressable
        onPress={activa ? rechazar : () => setPreguntando(true)}
        accessibilityRole="button"
        style={({ pressed }) => [{ alignSelf: 'flex-start', opacity: pressed ? 0.75 : 1 }]}
      >
        <Text style={[activa ? btnSecundario(colores, { peq: true }) : btnCta(colores, { peq: true }), { marginTop: 0 }]}>
          {t(activa ? 'ubicacion.desactivar' : 'ubicacion.activar')}
        </Text>
      </Pressable>
      {consentimiento.estado === 'rechazado' ? <Text style={texto}>{t('ubicacion.rechazadaNota')}</Text> : null}

      <Modal visible={preguntando} transparent animationType="fade" onRequestClose={() => { setPreguntando(false); rechazar(); }} accessibilityViewIsModal>
        <View style={styles.fondo}>
          <View style={[styles.caja, { backgroundColor: colores.papel, borderColor: colores.glassBorder }, sombraFlotante(colores)]}>
            <Text style={[styles.titulo, { color: colores.tinta }]} accessibilityRole="header">{t('ubicacion.modalTitulo')}</Text>
            <Text style={texto}>{t('ubicacion.modalIntro')}</Text>
            {PUNTOS.map((p) => <Text key={p} style={texto}>• {t(`ubicacion.${p}`)}</Text>)}
            <View style={styles.acciones}>
              <Pressable onPress={() => { setPreguntando(false); aceptar(); }} accessibilityRole="button">
                <Text style={btnCta(colores, { peq: true })}>{t('ubicacion.aceptar')}</Text>
              </Pressable>
              <Pressable onPress={() => { setPreguntando(false); rechazar(); }} accessibilityRole="button">
                <Text style={btnSecundario(colores, { peq: true })}>{t('ubicacion.ahoraNo')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 11.2, marginBottom: 8 },
  texto: { fontSize: 14.72, fontFamily: FUENTES.texto, lineHeight: 21 },
  estado: { fontSize: 14.72, fontFamily: FUENTES.textoBold, fontWeight: '700' },
  fondo: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  caja: { borderRadius: RADIO.xl, borderWidth: 1, maxWidth: 520, width: '100%', alignSelf: 'center', padding: 22, gap: 8 },
  titulo: { fontFamily: FUENTES.display, fontWeight: '700', fontSize: 20, marginBottom: 4 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
});
