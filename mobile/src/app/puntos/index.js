import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../components/shell/AppShell';
import BalanceCard from '../../components/points/BalanceCard';
import StreakBadge from '../../components/points/StreakBadge';
import LedgerTable from '../../components/points/LedgerTable';
import DiscountPanel from '../../components/points/DiscountPanel';
import InvitePanel from '../../components/points/InvitePanel';
import usePointsStore from '../../stores/usePointsStore.js';
import { useStreak } from '../../context/StreakContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES } from '../../theme/tokens';
import { btnTexto } from '../../theme/ui';

const TRADS = { es, ca, en };

export default function Index() {
  const t = useT(TRADS);
  const router = useRouter();
  const { colores } = useTheme();
  const auth = useAuthContext();
  const { rachaLogin, rachaReservas } = usePointsStore();
  const { fetchStreakData, openStreakPopup } = useStreak();

  return (
    <AppShell>
      <View style={styles.pagina}>
        <View style={styles.header}>
          <Text style={[styles.h1, { color: colores.primary }]}>{t('points.title')}</Text>
          <Text style={[styles.headerSub, { color: colores.gris }]}>{t('points.subtitle')}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.main}>
            <BalanceCard usuario={auth.usuario} />
            <StreakBadge
              rachaLogin={rachaLogin}
              rachaReservas={rachaReservas}
              onOpenStreak={openStreakPopup}
              fetchStreakData={fetchStreakData}
            />
            <LedgerTable limit={5} usuario={auth.usuario} />
            <Pressable onPress={() => router.push('/puntos/historial')} accessibilityRole="link">
              <Text style={btnTexto(colores)}>Ver historial completo →</Text>
            </Pressable>
          </View>

          <View style={styles.sidebar}>
            <DiscountPanel usuario={auth.usuario} />
            <InvitePanel />
          </View>
        </View>
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
  headerSub: {
    fontFamily: FUENTES.texto,
    fontSize: 16.8,
    lineHeight: 24,
  },
  grid: {
    gap: 20,
  },
  main: {
    gap: 20,
  },
  sidebar: {
    gap: 20,
  },
});
