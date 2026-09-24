/** OpsAjustes — tema, sesión y referencias operativas. */
import { View, Text, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useOpsStyles } from './OpsTokens';
import { OpsCard, OpsBtn, OpsCode } from './OpsUi';
import { Simbolo } from '../shell/Simbolo';

export default function OpsAjustes({ usuario, tema, onCambiarTema }) {
  const { s, op } = useOpsStyles();
  const router = useRouter();
  const oscuro = tema === 'oscuro';

  const items = [
    {
      titulo: 'Modo visual',
      sub: 'Claro / oscuro (igual que la app, se guarda en este navegador)',
      accion: (
        <OpsBtn sm onPress={onCambiarTema} icono={oscuro ? 'dark_mode' : 'light_mode'}>
          {oscuro ? 'Oscuro' : 'Claro'}
        </OpsBtn>
      ),
    },
    {
      titulo: 'Sesión',
      sub: null,
      subComponente: (
        <Text style={s.muted}>
          {usuario?.email} · rol operador (allowlist <OpsCode>admins</OpsCode>)
        </Text>
      ),
      accion: (
        <OpsBtn sm onPress={() => router.push('/cuenta')}>
          Mi cuenta
        </OpsBtn>
      ),
    },
    {
      titulo: 'Reglas de Firestore',
      sub: 'Reservas, aforo, contactos, reseñas y mensajes: solo dueño o admin',
      accion: (
        <OpsBtn sm onPress={() => Linking.openURL('https://console.firebase.google.com/')}>
          Abrir consola
        </OpsBtn>
      ),
    },
    {
      titulo: 'Volver a la web',
      sub: 'Salir del panel operativo sin cerrar sesión',
      accion: (
        <OpsBtn sm onPress={() => router.push('/')}>
          Ir a MIRA
        </OpsBtn>
      ),
    },
  ];

  return (
    <OpsCard titulo="Ajustes & Auditoría" sub="Preferencias del panel y accesos rápidos">
      <View style={s.list}>
        {items.map((it) => (
          <View key={it.titulo} style={s.listItem}>
            <View style={s.listItemCuerpo}>
              <Text style={s.listItemTitulo}>{it.titulo}</Text>
              {it.sub ? <Text style={s.muted}>{it.sub}</Text> : null}
              {it.subComponente}
            </View>
            {it.accion}
          </View>
        ))}
      </View>
      <Text style={[s.muted, { marginTop: 12 }]}>
        <Simbolo name="settings" size={12} color={op.onVariant} /> Panel Operator Hub · MIRA
      </Text>
    </OpsCard>
  );
}
