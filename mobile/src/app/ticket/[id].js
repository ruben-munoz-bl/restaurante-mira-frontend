import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../components/shell/AppShell';
import TicketDetail from '../../components/tickets/TicketDetail';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES } from '../../theme/tokens';

const TRADS = { es, ca, en };

export default function PantallaTicket() {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { id } = useLocalSearchParams();

  return (
    <AppShell>
      <View style={styles.pagina}>
        <View style={styles.header}>
          <Text style={[styles.h1, { color: colores.primary }]}>{t('points.history')}</Text>
        </View>
        <TicketDetail ticketId={id} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '700',
    fontSize: 32,
    marginBottom: 8,
  },
});
