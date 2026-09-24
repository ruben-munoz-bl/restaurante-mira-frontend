/**
 * Root layout — providers globales (storage ya hidratado en index.js),
 * fuentes, tema, i18n, auth y el Stack de expo-router (18 rutas del web hash).
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { hydrateStorage } from '../lib/storage';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { I18nProvider } from '../i18n/index.jsx';
import { AuthProvider, useAuthContext } from '../context/AuthContext';
import { StreakProvider } from '../context/StreakContext';

function I18nConAuth({ children }) {
  const auth = useAuthContext();
  return <I18nProvider onLangChange={auth.perfil?.guardarLang}>{children}</I18nProvider>;
}

function StreakConAuth({ children }) {
  const { usuario } = useAuthContext();
  return <StreakProvider usuario={usuario}>{children}</StreakProvider>;
}

function RootStack() {
  const { tema, colores } = useTheme();
  return (
    <>
      <StatusBar style={tema === 'oscuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="recuperar" />
        <Stack.Screen name="restablecer" />
        <Stack.Screen name="cuenta" />
        <Stack.Screen name="contacto" />
        <Stack.Screen name="reservas" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="negocio" />
        <Stack.Screen name="favoritos" />
        <Stack.Screen name="mensajes" />
        <Stack.Screen name="mapa" />
        <Stack.Screen name="privacidad" />
        <Stack.Screen name="puntos/index" />
        <Stack.Screen name="puntos/historial" />
        <Stack.Screen name="invitar" />
        <Stack.Screen name="ticket/[id]" />
        <Stack.Screen name="detalle" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="carta"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [hidratado, setHidratado] = useState(false);
  const [fuentesOk, fuentesErr] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    let vivo = true;
    hydrateStorage().finally(() => {
      if (vivo) setHidratado(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (fuentesErr) {
    // Sin fuentes no hay paridad visual: fallar ruidoso en desarrollo.
    console.error('[MIRA] Error cargando fuentes:', fuentesErr);
  }

  if (!fuentesOk || !hidratado) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <StreakConAuth>
              <I18nConAuth>
                <View style={{ flex: 1 }}>
                  <RootStack />
                </View>
              </I18nConAuth>
            </StreakConAuth>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
