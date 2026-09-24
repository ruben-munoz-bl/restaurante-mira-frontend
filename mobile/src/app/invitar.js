/**
 * Invitar — espejo de pages/Invitar.jsx ('#/invitar'): cabecera de puntos +
 * InvitePanel (email, stats de invitaciones, lista con copiar link).
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../components/shell/AppShell';
import CampoTexto from '../components/ui/CampoTexto';
import useInviteStore from '../stores/useInviteStore.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES } from '../theme/tokens';
import { btnCta, btnTexto } from '../theme/ui';

const TRADS = { es, ca, en };

export default function Invitar() {
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
    <AppShell>
      <View style={estilos.pagina}>
        <View style={estilos.header}>
          <Text style={[estilos.h1, { color: colores.primary }]}>{t('points.invite')}</Text>
          <Text style={[estilos.headerSub, { color: colores.gris }]}>{t('points.inviteDesc')}</Text>
        </View>

        <View style={[estilos.panel, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
          <Text style={[estilos.h3, { color: colores.primary }]}>Invita amigos</Text>
          <Text style={[estilos.info, { color: colores.gris }]}>
            Gana <Text style={estilos.negrita}>200 pts</Text> cuando tu amigo haga 2 reservas. Máximo 5
            invitaciones por mes.
          </Text>

          <View style={estilos.form}>
            <View style={estilos.formInput}>
              <CampoTexto
                value={email}
                onChangeText={setEmail}
                placeholder="Email del amigo"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleInvite}
                returnKeyType="send"
              />
            </View>
            <Pressable onPress={handleInvite} disabled={loading || !email}>
              <Text style={btnCta(colores, { disabled: loading || !email })}>
                {loading ? 'Enviando...' : 'Invitar'}
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={[estilos.error, { color: colores.rojo }]}>{error}</Text> : null}

          <View style={[estilos.stats, { borderTopColor: colores.borde, borderBottomColor: colores.borde }]}>
            {[
              [String(enviadas.length), 'Enviadas'],
              [String(aceptadas), 'Aceptadas'],
              [String(puntosTotales), 'Puntos ganados'],
            ].map(([valor, etiqueta]) => (
              <View key={etiqueta} style={estilos.stat}>
                <Text style={[estilos.statValor, { color: colores.primary }]}>{valor}</Text>
                <Text style={[estilos.statEtiqueta, { color: colores.gris }]}>{etiqueta}</Text>
              </View>
            ))}
          </View>

          {enviadas.length > 0 && (
            <View style={estilos.lista}>
              {enviadas.map((inv) => (
                <View key={inv.id} style={[estilos.item, { borderBottomColor: colores.borde }]}>
                  <Text style={[estilos.itemEmail, { color: colores.tinta }]} numberOfLines={1}>
                    {inv.emailInvitado || inv.invitadoEmail}
                  </Text>
                  <Text style={estilos.itemEstado}>
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
      </View>
    </AppShell>
  );
}

const estilos = StyleSheet.create({
  pagina: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  header: {
    marginBottom: 32,
  },
  h1: {
    fontFamily: FUENTES.display,
    fontSize: 32,
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 16.8,
    fontFamily: FUENTES.texto,
    lineHeight: 24,
  },
  panel: {
    borderWidth: 1,
    padding: 24,
    width: '100%',
  },
  h3: {
    fontFamily: FUENTES.display,
    fontSize: 20.8,
    marginBottom: 8,
  },
  info: {
    fontSize: 15.2,
    fontFamily: FUENTES.texto,
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
    fontSize: 13.6,
    marginBottom: 16,
    fontFamily: FUENTES.texto,
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
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  statEtiqueta: {
    fontSize: 12.8,
    fontFamily: FUENTES.texto,
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
    fontSize: 14.4,
    fontFamily: FUENTES.texto,
  },
  itemEstado: {
    fontSize: 19.2,
  },
});
