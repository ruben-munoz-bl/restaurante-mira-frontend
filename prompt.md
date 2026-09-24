# PROMPT — Contexto y trabajo pendiente (migración React Native)

> Rama actual de trabajo en local: `react-native` (basada en `main`).
> Este documento es el handoff para continuar la migración del frontend MIRA a Expo/React Native.

---

## 1. Contexto del proyecto

- **Frontend:** `Frontend/restaurante-mira-frontend` (esta repo)
- **Backend:** `restuarante-mira-backend` (puerto 3000; `node src/server.js`; reiniciar si cambia código)
- **Comandos:** `npm.cmd test` / `npm.cmd run build` (plain `npm` bloqueado por PS exec policy). En Expo: `npx expo start`, `npx expo export --platform web`
- **Idioma del usuario:** español
- **Decisiones ya tomadas:**
  1. Estrategia A: `main` consolidado con el árbol de `feat/migration-mira-api` (fuente de verdad). Hecho y push.
  2. Expo (SDK ~53) para conservar todo.
  3. Mantener **absolutamente todo** en RN (mapas, libro 3D, charts, ruleta, Google auth, password reset, banner cookies adaptado).
  4. Orden: merge a `main` → crear `react-native` desde `main` → migrar.
  5. El agente ejecuta builds; el usuario verifica en dispositivo/emulador.

### Stack RN elegido
- Expo ~53, React Navigation (native-stack + bottom-tabs)
- react-native-maps, zustand, firebase JS SDK (`initializeAuth` + `getReactNativePersistence(AsyncStorage)`)
- expo-auth-session (Google ID token), victory-native, reanimated, expo-blur, @expo/vector-icons, expo-localization, expo-web-browser

### Entorno / API
- Web: `VITE_API_URL` / `VITE_GEOAPIFY_KEY` → RN: `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_GEOAPIFY_KEY` (+ `Constants.expoConfig.extra`)
- Default API: `https://mira-api-xveu.onrender.com` · local: `http://localhost:3000`
- Tokens de diseño en `src/theme/tokens.js` (`--verde: #16382C`; fonts Playfair Display / Plus Jakarta Sans)
- `localStorage` shim: `src/storage/storage.js` (Map síncrona + hidratación AsyncStorage; define `globalThis.localStorage` y stub `window`). **`hydrateStorage()` debe correr antes de render.**
- Firestore eliminado del frontend; solo Firebase Auth. Config web real en `firebaseConfig.js`.
- Password reset: abre `https://restaurante-mira.vercel.app/#/restablecer` (`urlContinuacionReset()` / `extraerOobCode(url)`).
- Google RN: sin `signInWithPopup` → expo-auth-session → `completarGoogleIdToken(idToken)`.

### Git
- `main` = `039ae1e` (push) · `feat/migration-mira-api` = `91a755f` (push) · rama `react-native` = trabajo RN
- Web viva en `main`; en `react-native` el código web se sustituye por RN
- Backend tiene ~5 ficheros sin commitear (points/tickets/interactions) — no tocar

---

## 2. Qué YA está hecho (en rama `react-native`, sin commitear aún)

### Infraestructura
- `package.json` Expo + deps RN · `app.json` · `babel.config.js` · `index.js` (`registerRootComponent`)
- `src/theme/tokens.js` · `src/storage/storage.js` · `src/i18n/index.jsx` (expo-localization)
- `src/services/httpClient.js`, `firebase.js`, `authApi.js` (RN), `parkingApi.js` (env vars)
- `src/context/AppContext.jsx` (auth + restCtrl + streak/wheel/sheet)
- `src/components/ui/primitives.jsx` (Btn, Campo, Input, Select, Card, Vacio, Cargando, ModalBase, ModalOverlay, ui)
- `src/controllers/useRestaurantController.js` — quitado `window.addEventListener('keydown')`
- `src/hooks/useDailyLogin.js` — sessionStorage → storage shim en memoria
- `src/App.jsx` — providers + NavigationContainer + modales globales ( RestaurantDetail, LibroCarta, FloatingReservation, DailyStreakPopup, WheelModal, CookieBanner )
- `src/navigation/RootNavigator.jsx` — AuthStack + MainTabs (Home/Puntos/Reservas/Favoritos/Cuenta) + AppStack (Mapa, Contacto, Privacidad, Historial, Invitar, Ticket, Mensajes, Negocio, Admin, Dashboard)
- `src/screens/HomeScreen.jsx` — hero + buscador + lista + promo

### Componentes ya convertidos a RN (verificado sin HTML/window/document)
- Auth: `Login`, `Registro`, `Recuperar`, `Restablecer`, `Cuenta`
- Home: `Hero`, `SearchBar`, `RestaurantCard`, `RestaurantSkeleton`, `RestaurantList`, `PromoBanner`, `PromoBadge`, `PromotedCarousel`
- Secciones (parcial/completo según lote): `Contacto`, `Reservas`, `Favoritos`, `Mensajes`, `Mapa`, `Privacidad`, `Negocio`, `Admin`/`ops/*`, `dashboard/*` parcial
- Páginas puntos: `PuntosDashboard`, `HistorialPuntos`, `Invitar`, `TicketPage`, `points/*`
- Modales: `RestaurantDetail`, `LibroCarta`, `FloatingReservation`, `DailyStreakPopup` (sin confeti DOM), `WheelModal` (sin confeti DOM), `CookieBanner`

`npm.cmd install --legacy-peer-deps` ya ejecutado (654 paquetes).

---

## 3. Qué FALTA hacer (orden sugerido)

### A. Pantallas que RootNavigator importa y **no existen aún**
Crear en `src/screens/` (wrappers delante de los componentes convertidos; pasar props reales de `useApp()` / `useRoute()`):

- [ ] `LoginScreen`, `RegistroScreen`, `RecuperarScreen`, `RestablecerScreen`
- [ ] `CuentaScreen`, `ContactoScreen`, `ReservasScreen`, `OpsScreen` (Admin), `DashboardScreen`
- [ ] `NegocioScreen`, `FavoritosScreen`, `MensajesScreen`, `MapaScreen`, `PrivacidadScreen`
- [ ] `PuntosScreen`, `HistorialPuntosScreen`, `InvitarScreen`, `TicketScreen` (ticketId por route params)

### B. Ajustes de integración
- [ ] Cargar fuentes Expo: `useFonts` / `expo-font` para `PlayfairDisplay_*` y `PlusJakartaSans_*` (hoy `fonts.display` se usa sin registrar)
- [ ] `HomeScreen`: pasar `onClear={limpiarFiltros}` a `RestaurantList` (estado vacío)
- [ ] Revisar props de modales globales en `App.jsx` vs componentes (nombres `restaurante`/`onCerrar`/`onAbrirCarta` etc.)
- [ ] `RootNavigator`: badge moneda (`moneda-mira.png`), claves i18n `bottomNav.*` / `mensajes.titulo` / `points.*` — verificar existencia en es/ca/en
- [ ] `useAuth`: navegación post-login no debe usar `window.location.hash` (si queda, quitar)
- [ ] `Admin`/`Cuenta`/`Mensajes`/`Negocio`/`Reservas`/`OpsPanel`: si aún queda `window.location.hash = '#/login'` → `navigation.navigate('Login')`
- [ ] `Dashboard.jsx`: `document.addEventListener`, `sessionStorage`, CSV download, `window.scrollTo` — completar si quedó algo
- [ ] `opsData.js`: `document.createElement('a')` descarga → expo-file-system + expo-sharing (o skip)
- [ ] `EmblemaAvatar.jsx` puede seguir web si Cuenta ya no lo importa; si se usa, convertir
- [ ] `Sellos.jsx`: revisar si quedó HTML

### C. Limpieza web-only (borrar en rama `react-native`)
- [ ] `src/main.jsx`, `index.html`, `vite.config.js`
- [ ] `src/styles/*.css`, `src/index.css`, `src/App.css` (si existen)
- [ ] Quitar scripts/build de Vite si sobran; `npm run build` = `expo export --platform web`
- [ ] `check-rn.js` (temp de verificación) — borrar si ya no se usa

### D. Verificación
- [ ] `npx expo export --platform web` (o `expo start`) sin errores de bundling
- [ ] Scan grep: cero `window.` / `document.` / `sessionStorage` / `className` / tags HTML en `src/**`
- [ ] Smoke en emulador: login Google, lista, detalle, carta libro, reserva floating, streak + ruleta, puntos, favoritos, mapa, admin
- [ ] Commit en rama `react-native` (no hacer push salvo petición)

### E. Known gaps / decisiones abiertas
- Header/Footer/BottomNav web → sustituidos por React Navigation tabs; si se necesita header custom, crear en stack screen options
- Tema oscuro: tokens existen; cablear `tema` + `useColorScheme` en toda la UI (hoy parcial)
- Confeti streak/ruleta: quitado DOM; se puede reimplementar con reanimated si se pide
- Fotos de restaurante: `Image` con `uri` del API; assets locales en `public/` con `require()`
- Google deep link: en device real configurar scheme `mira` + redirect en Firebase/Google

---

## 4. Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/App.jsx` | Shell RN: hydrate → I18n → AppProvider → Navigation + modales |
| `src/context/AppContext.jsx` | Estado global (auth, restCtrl, puntos, streak, wheel, sheet) |
| `src/navigation/RootNavigator.jsx` | Rutas auth + tabs + stacks |
| `src/screens/*` | Pantallas (faltan casi todas excepto Home) |
| `src/components/ui/primitives.jsx` | Primitivas UI compartidas |
| `src/controllers/useRestaurantController.js` | Lista/filtros/libro/detalle |
| `src/controllers/useAuth.js` | Sesión, dieta, favoritos |
| `src/services/authApi.js` | Firebase Auth RN (Google ID token, reset) |
| `src/storage/storage.js` | Shim localStorage/AsyncStorage |
| `src/theme/tokens.js` | Colores, fonts, radii, shadows |
| `src/i18n/{es,ca,en}.js` | Traducciones (no romper claves) |

---

## 5. Cómo retomar (prompt de arranque sugerido)

```
Estás en la rama react-native del frontend MIRA (Expo SDK 53).
Lee prompt.md en la raíz del repo.
Objetivo ahora: crear las pantallas que faltan en src/screens/ (ver sección 3.A),
conectarlas a src/navigation/RootNavigator.jsx y useApp(), registrar fuentes Expo,
y limpiar los window/document restantes.
No hagas push. Ejecuta npx expo export --platform web para verificar bundling.
Responde en español. Conserva toda la lógica de negocio e i18n.
```
