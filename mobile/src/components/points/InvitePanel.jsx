import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import CampoTexto from '../ui/CampoTexto';
import useInviteStore from '../../stores/useInviteStore.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';
import { btnCta, btnTexto } from '../../theme/ui';

const TRADS = { es, ca, en };

export default function InvitePanel() {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { fetchMyInvites, enviadas, aceptadas, puntosTotales, createInvite } = useInviteStore();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetchMyInvites();
  }, [fetchMyInvites]);

  async function handleInvite() {
    if (!email || loading) return;
    setLoading(true);
    setError('');
    try {
      await createInvite(email);
      setEmail('');
    } catch (err) {
      setError(err.message || 'Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(link) {
    try {
      await Clipboard.setStringAsync(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
      <Text style={[styles.h3, { color: colores.primary }]}>{t('points.invite')}</Text>
      <Text style={[styles.info, { color: colores.gris }]}>
        Gana <Text style={styles.negrita}>200 pts</Text> cuando tu amigo haga 2 reservas. Máximo 5
        invitaciones por mes.
      </Text>

      <View style={styles.form}>
        <View style={styles.formInput}>
          <CampoTexto
            value={email}
            onChangeText={setEmail}
            placeholder={t('points.inviteEmailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleInvite}
            returnKeyType="send"
          />
        </View>
        <Pressable onPress={handleInvite} disabled={loading || !email}>
          <Text style={btnCta(colores, { disabled: loading || !email })}>
            {loading ? t('points.inviteSending') : 'Invitar'}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.error, { color: colores.rojo }]}>{error}</Text> : null}

      <View style={[styles.stats, { borderTopColor: colores.borde, borderBottomColor: colores.borde }]}>
        {[
          [String(enviadas.length), 'Enviadas'],
          [String(aceptadas), 'Aceptadas'],
          [String(puntosTotales), 'Puntos ganados'],
        ].map(([valor, etiqueta]) => (
          <View key={etiqueta} style={styles.stat}>
            <Text style={[styles.statValor, { color: colores.primary }]}>{valor}</Text>
            <Text style={[styles.statEtiqueta, { color: colores.gris }]}>{etiqueta}</Text>
          </View>
        ))}
      </View>

      {enviadas.length > 0 && (
        <View style={styles.lista}>
          {enviadas.map((inv) => (
            <View key={inv.id} style={[styles.item, { borderBottomColor: colores.borde }]}>
              <Text style={[styles.itemEmail, { color: colores.tinta }]} numberOfLines={1}>
                {inv.emailInvitado || inv.invitadoEmail}
              </Text>
              <Text style={styles.itemEstado}>
                {inv.estado === 'aceptada'
                  ? '✅'
                  : inv.estado === 'esperando_2_reservas' || inv.estado === 'pendiente'
                    ? '⏳'
                    : '❌'}
              </Text>
              {inv.link ? (
                <Pressable onPress={() => copyLink(inv.link)}>
                  <Text style={btnTexto(colores)}>{copiado ? 'Copiado' : 'Copiar link'}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 24,
  },
  h3: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 20.8,
    marginBottom: 8,
  },
  info: {
    fontFamily: FUENTES.texto,
    fontSize: 15.2,
    lineHeight: 21,
    marginBottom: 24,
  },
  negrita: {
    fontWeight: '700',
  },
  form: {
    flexDirection: 'row',
    gap: 12.8,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  formInput: {
    flex: 1,
  },
  error: {
    fontFamily: FUENTES.texto,
    fontSize: 13.6,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValor: {
    fontFamily: FUENTES.textoBold,
    fontSize: 24,
    fontWeight: '700',
  },
  statEtiqueta: {
    fontFamily: FUENTES.texto,
    fontSize: 12.8,
    marginTop: 2,
  },
  lista: {
    marginTop: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12.8,
    paddingVertical: 9.6,
    borderBottomWidth: 1,
  },
  itemEmail: {
    flex: 1,
    fontFamily: FUENTES.texto,
    fontSize: 14.4,
  },
  itemEstado: {
    fontSize: 19.2,
  },
});
