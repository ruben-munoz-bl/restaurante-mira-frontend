# MIRA — Documentación del Proyecto

## Índice

1. [Resumen](#1-resumen)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura general](#3-arquitectura-general)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Inicio rápido](#5-inicio-rápido)
6. [Variables de entorno](#6-variables-de-entorno)
7. [Routing](#7-routing)
8. [Sistema de diseño](#8-sistema-de-diseño)
9. [Sistema i18n (internacionalización)](#9-sistema-i18n)
10. [Autenticación y usuario](#10-autenticación-y-usuario)
11. [Controladores (hooks)](#11-controladores)
12. [Modelo de datos](#12-modelo-de-datos)
13. [Servicios (API)](#13-servicios)
14. [Componentes](#14-componentes)
15. [Funcionalidades destacadas](#15-funcionalidades-destacadas)
16. [Firebase](#16-firebase)
17. [Despliegue](#17-despliegue)
18. [Branches](#18-branches)

---

## 1. Resumen

**MIRA** es una aplicación web de restaurantes que permite a los usuarios buscar, filtrar, comparar y reservar mesas en restaurantes reales. Incluye un sistema de reseñas, mapas con parkings cercanos, predicción meteorológica para terrazas, soporte dietético/alergénico, y un panel de administración para gestionar incidencias y propuestas de negocio.

- **URL del repositorio:** https://github.com/ruben-munoz-bl/restaurante-mira-frontend
- **Firebase:** `restaurante-mira-18e0c` (Spark plan)
- **Idiomas soportados:** Español (es), Català (ca), English (en)

---

## 2. Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.3.1 | UI framework |
| Vite | 5.4.0 | Bundler / dev server |
| Firebase | 12.18.0 | Auth (login/token) — Firestore va por mira-api |
| Leaflet / react-leaflet | 1.9.4 / 4.2.1 | Mapas interactivos |
| Geoapify API | — | Parkings cercanos |
| Open-Meteo API | — | Predicción meteorológica |

**Dependencias de desarrollo:** `@vitejs/plugin-react`

**Fuentes tipográficas:** Plus Jakarta Sans (body), Playfair Display (display)

---

## 3. Arquitectura general

```
┌─────────────────────────────────────────────────────┐
│  App.jsx (Controller/Orquestador)                   │
│  ├── useAuth() → sesión, perfil, preferencias       │
│  ├── useRestaurantController() → datos, filtros     │
│  ├── Hash routing (#/login, #/cuenta, ...)          │
│  └── I18nProvider → contexto de idioma              │
├─────────────────────────────────────────────────────┤
│  Components (Views)                                 │
│  ├── Header / Hero / SearchBar / RestaurantList     │
│  ├── RestaurantCard / RestaurantDetail              │
│  ├── Login / Registro / Recuperar / Restablecer     │
│  ├── Cuenta / Reservas / Favoritos / Comparador     │
│  ├── Contacto / Admin / Negocio / Mensajes          │
│  ├── Mapa / LibroCarta / CookieBanner               │
│  ├── BottomNav / FloatingReservation                │
│  └── Footer / PromoBanner / Privacidad              │
├─────────────────────────────────────────────────────┤
│  Services (API layer)                               │
│  ├── authApi.js / perfilApi.js                      │
│  ├── restaurantApi.js / filterService.js            │
│  ├── reservaApi.js / resenasApi.js                  │
│  ├── parkingApi.js / meteoApi.js                    │
│  ├── contactoApi.js / incidenciaApi.js              │
│  ├── negocioApi.js / mensajesApi.js                 │
│  └── cookieService.js / firebase.js                 │
├─────────────────────────────────────────────────────┤
│  Models (domain logic)                              │
│  └── restaurantModel.js (716 líneas)                │
├─────────────────────────────────────────────────────┤
│  i18n (internacionalización)                        │
│  └── index.jsx + es.js + ca.js + en.js              │
└─────────────────────────────────────────────────────┘
```

**Patrón arquitectónico:** MVC ligero donde `App.jsx` actúa como controller, los `components/` son las views, y los `services/` + `models/` son el modelo. Los controllers (`useAuth`, `useRestaurantController`) orquestan la lógica de negocio.

---

## 4. Estructura de archivos

```
restaurante-mira-frontend/
├── public/
│   ├── hero-dining.jpg
│   └── hero-gastrobar.jpg
├── src/
│   ├── components/          # 30 componentes React
│   │   ├── Admin.jsx
│   │   ├── BottomNav.jsx
│   │   ├── Comparador.jsx
│   │   ├── Contacto.jsx
│   │   ├── CookieBanner.jsx
│   │   ├── Cuenta.jsx
│   │   ├── Favoritos.jsx
│   │   ├── FloatingReservation.jsx
│   │   ├── Footer.jsx
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── LibroCarta.jsx
│   │   ├── Login.jsx
│   │   ├── Mapa.jsx
│   │   ├── Mensajes.jsx
│   │   ├── Negocio.jsx
│   │   ├── ParkingsPanel.jsx
│   │   ├── Privacidad.jsx
│   │   ├── PromoBanner.jsx
│   │   ├── Recuperar.jsx
│   │   ├── Registro.jsx
│   │   ├── Reservas.jsx
│   │   ├── Restablecer.jsx
│   │   ├── RestaurantCard.jsx
│   │   ├── RestaurantDetail.jsx
│   │   ├── RestaurantList.jsx
│   │   ├── RestaurantMap.jsx
│   │   ├── RestaurantSkeleton.jsx
│   │   ├── SearchBar.jsx
│   │   └── Sellos.jsx
│   ├── controllers/         # Hooks de lógica de negocio
│   │   ├── useAuth.js
│   │   └── useRestaurantController.js
│   ├── i18n/                # Internacionalización
│   │   ├── index.jsx
│   │   ├── es.js
│   │   ├── ca.js
│   │   └── en.js
│   ├── models/
│   │   └── restaurantModel.js
│   ├── services/            # Capa de acceso a datos
│   │   ├── authApi.js
│   │   ├── cityCenters.js
│   │   ├── contactoApi.js
│   │   ├── cookieService.js
│   │   ├── firebase.js
│   │   ├── firebaseConfig.js
│   │   ├── filterService.js
│   │   ├── incidenciaApi.js
│   │   ├── mensajesApi.js
│   │   ├── meteoApi.js
│   │   ├── negocioApi.js
│   │   ├── parkingApi.js
│   │   ├── perfilApi.js
│   │   ├── reservaApi.js
│   │   ├── reservasApi.js
│   │   ├── resenasApi.js
│   │   └── restaurantApi.js
│   ├── styles/
│   │   └── tokens.css       # Design tokens (colores, tipografía, sombras)
│   ├── App.css              # Estilos globales (~2650 líneas)
│   ├── App.jsx              # Orquestador principal
│   └── index.css            # Reset y estilos base
├── .env                     # Variables de entorno (no tracked)
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## 5. Inicio rápido

```bash
# 1. Arrancar la API (otra terminal)
cd ../restuarante-mira-backend/mira-api
npm start                 # http://localhost:3000

# 2. Clonar / entrar al frontend
cd restaurante-mira-frontend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# VITE_API_URL=http://localhost:3000  (+ clave Geoapify si usas parkings)

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Abrir en navegador
# http://localhost:5173
```

**Scripts disponibles:**
- `npm run dev` — Servidor de desarrollo con hot reload
- `npm run build` — Build de producción en `dist/`
- `npm run preview` — Vista previa del build de producción

---

## 6. Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | Base URL de la API `mira-api` | `http://localhost:3000` |
| `VITE_GEOAPIFY_KEY` | API key de Geoapify para parkings cercanos | `f9344e461230...` |

> **Nota:** Las claves de Firebase en `src/services/firebaseConfig.js` son
> públicas por diseño (solo se usan para Auth). Los datos de Firestore **no**
> se leen desde el frontend: pasan por `mira-api` (Admin SDK en el servidor).

---

## 7. Routing

La aplicación usa **hash routing** sin dependencias externas. Las rutas se definen en `App.jsx`:

```javascript
// Definición de rutas (App.jsx)
function rutaActual() {
  const h = baseHash();
  if (h === '#/login') return 'login';
  if (h === '#/registro') return 'registro';
  if (h === '#/cuenta') return 'cuenta';
  if (h === '#/favoritos') return 'favoritos';
  if (h === '#/reservas') return 'reservas';
  if (h === '#/contacto') return 'contacto';
  if (h === '#/admin') return 'admin';
  if (h === '#/negocio') return 'negocio';
  if (h === '#/mensajes') return 'mensajes';
  if (h === '#/mapa') return 'mapa';
  if (h === '#/privacidad') return 'privacidad';
  if (h === '#/recuperar') return 'recuperar';
  if (h === '#/restablecer') return 'restablecer';
  return 'home';
}
```

| Ruta | Componente | Descripción |
|---|---|---|
| `#/` | `Hero + SearchBar + RestaurantList` | Landing page con buscador |
| `#/login` | `Login` | Inicio de sesión + Google |
| `#/registro` | `Registro` | Registro en 2 pasos |
| `#/cuenta` | `Cuenta` | Perfil, dieta, idioma, cookies, verificación |
| `#/favoritos` | `Favoritos` | Guardados + comparador + recomendaciones |
| `#/reservas` | `Reservas` | Calendario + lista de reservas |
| `#/contacto` | `Contacto` | Formulario de contacto |
| `#/admin` | `Admin` | Panel de administración |
| `#/negocio` | `Negocio` | Propuesta de restaurante |
| `#/mensajes` | `Mensajes` | Bandeja interna |
| `#/mapa` | `Mapa` | Mapa full-screen con todos los locales |
| `#/privacidad` | `Privacidad` | Política GDPR |
| `#/recuperar` | `Recuperar` | Solicitud de recuperación de contraseña |
| `#/restablecer` | `Restablecer` | Restablecimiento con token oobCode |

El **modal de detalle** (`RestaurantDetail`) y el **libro de carta** (`LibroCarta`) se renderizan como overlays modales basados en estado, no en rutas.

---

## 8. Sistema de diseño

### Design Tokens (`src/styles/tokens.css`)

Paleta inspirada en Material Design 3 con tonos naturales:

**Colores principales (modo claro):**
- `--primary`: #002218 (pino bosque — color principal)
- `--dorado`: #735c00 (champagne dorado)
- `--papel`: #f7faf6 (marfil cálido)
- `--tinta`: #1a1c1a (texto)
- `--gris`: #6b6f6a (texto secundario)
- `--borde`: #c5c9be (bordes)
- `--verde`: #2e7d32 (éxito)
- `--naranja`: #e65100 (advertencia)
- `--rojo`: #c62828 (error)
- `--estrella`: #f9a825 (estrellas)
- `--primary-container`: #7adfbb (contenedor principal)

**Modo oscuro** (`[data-theme='dark']`):
- `--primary`: #7adfbb
- `--papel`: #191c19
- `--tinta`: #e1e3df
- `--borde`: #414941
- `--primary-container`: #005239

**Tipografía:**
- Body: Plus Jakarta Sans (400, 500, 600, 700)
- Display: Playfair Display (500, 700)

**Efectos:**
- Glassmorphism (`backdrop-filter: blur(12px)`)
- Elevaciones de sombra (0 a 5 niveles)
- Border radius variables (`--radio-peq`, `--radio-med`, `--radio-grande`)

### Layout

El CSS global (`App.css`, ~2650 líneas) define todos los estilos de componentes. No se usa CSS modules ni styled-components.

---

## 9. Sistema i18n

### Arquitectura

Sistema propio sin dependencias externas (`src/i18n/`):

```javascript
// src/i18n/index.jsx
export function I18nProvider({ children, onLangChange })  // Provider
export function useI18n()    // { lang, setLang, cycleLang, available }
export function useT(translations)  // hook de traducción
export { AVAILABLE, detectarIdioma }
```

### Cómo funciona

1. **Detección automática:** `localStorage` → `navigator.language` → fallback `es`
2. **Almacenamiento:** `localStorage` key `mira_lang`
3. **Resolución de claves:** Claves anidadas (`detail.precio`) con fallback a la clave literal
4. **Interpolación:** `t('key', { var: valor })` reemplaza `{{var}}` en el string
5. **Ciclo de idioma:** Botón en Header hace ES → CA → EN

### Diccionarios

Cada idioma tiene ~540 líneas con 25 secciones:

| Sección | Contenido |
|---|---|
| `nav` | Navegación principal |
| `hero` | Sección hero |
| `busqueda` | Filtros de búsqueda |
| `card` | Tarjetas de restaurante |
| `lista` | Lista de resultados |
| `detail` / `detalle` | Detalle del restaurante |
| `auth` | Login, registro, recuperación |
| `cuenta` | Página de cuenta |
| `registro` | Formulario de registro |
| `modelos` | Datos comunes (meses, días, locale) |
| `otros` | Strings genéricos |
| `reservas` | Gestión de reservas |
| `cookie` | Banner y preferencias de cookies |
| `contacto` | Formulario de contacto |
| `favoritos` | Favoritos y comparador |
| `comparador` | Tabla comparativa |
| `libro` | Libro de carta |
| `recuperar` | Recuperación de contraseña |
| `restablecer` | Restablecimiento de contraseña |
| `admin` | Panel de administración |
| `negocio` | Propuesta de negocio |
| `mensajes` | Bandeja de mensajes |
| `footer` | Pie de página |

### Uso en componentes

```jsx
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function MiComponente() {
  const t = useT(TRADS);
  return <p>{t('detail.precio')}</p>;
}
```

### Selector de idioma

- **Header:** Botón circular que cicla ES → CA → EN
- **Cuenta.jsx:** 3 botones horizontales (ES / CA / EN) con estado activo
- **Registro.jsx:** Selector durante el registro
- **Cambio instantáneo:** Sin recarga de página

---

## 10. Autenticación y usuario

### Proveedor: Firebase Authentication

| Método | Implementación |
|---|---|
| Email + Password | `createUserWithEmailAndPassword` / `signInWithEmailAndPassword` |
| Google Sign-In | `GoogleAuthProvider` + `signInWithPopup` |
| Recuperación | `sendPasswordResetEmail` con `urlContinuacionReset` |
| Verificación | `sendEmailVerification` con lang param |
| Sesión | `onAuthStateChanged` (subscription) |

### Flujo de autenticación (`authApi.js`)

```javascript
crearCuenta({ email, password, nombre, lang })   // Registro
iniciarSesion(email, password)                    // Login
iniciarSesionGoogle()                             // Login con Google
cerrarSesion()                                    // Logout
recuperarContrasena(email, lang)                  // Envía email de reset
enviarVerificacionEmail(lang)                     // Verificación de email
recargarEmailVerified()                           // Recarga estado de verificación
suscribirSesion(callback)                         // Listener de estado
```

### Perfil de usuario (`perfilApi.js`)

Firestore: `usuarios/{uid}`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Nombre del usuario |
| `email` | string | Correo electrónico |
| `tipo` | string | `'cliente'` o `'empresa'` |
| `lang` | string | Idioma preferido (`es`, `ca`, `en`) |
| `dieta` | object | Preferencias dietéticas |
| `accesibilidad` | object | Preferencias de accesibilidad |
| `favoritos` | array | IDs de restaurantes favoritos |
| `consentimientoCookies` | object | Preferencias de cookies |

### Controller: `useAuth.js`

El hook `useAuth()` gestiona todo el estado del usuario:

```javascript
const {
  usuario,              // Objeto de Firebase Auth
  perfil,               // Perfil de Firestore
  crearCuenta,          // Registro
  iniciarSesion,        // Login email
  iniciarSesionGoogle,  // Login Google
  cerrarSesion,         // Logout
  esAdmin,              // Boolean
  dieta,                // Preferencias dietéticas
  guardarDieta,         // Guardar dieta
  accesibilidad,        // Preferencias de accesibilidad
  guardarAccesibilidad, // Guardar accesibilidad
  favoritos,            // Array de IDs
  toggleFavorito,       // Añadir/quitar favorito
  noLeidos,             // Mensajes no leídos
  recargarMensajes,     // Recargar contador
  enviarVerificacionEmail,
  recargarEmailVerified,
} = useAuth();
```

**Comportamiento:**
- Invitado: `favoritos` y `dieta` se guardan en `localStorage`
- Logueado: se migra a Firestore y se fusionan datos locales con los remotos

---

## 11. Controladores

### `useAuth.js` (247 líneas)

Hook principal de estado del usuario. Gestiona:
- Suscripción a `onAuthStateChanged`
- Carga de perfil desde Firestore
- Favoritos (localStorage → Firestore con merge en login)
- Dieta y accesibilidad
- Contador de mensajes no leídos
- Sincronización de idioma (`perfil.lang` → provider)
- Funciones de login/logout/registro

### `useRestaurantController.js` (225 líneas)

Hook de orquestación de datos. Gestiona:
- Carga paginada de restaurantes desde Firestore
- Scroll infinito con `IntersectionObserver`
- Filtrado por: nombre, cocina, zona, precio, distancia, día, franja horaria, hora
- Ordenación: relevancia, valoración, distancia, precio
- Filtrado por dieta y accesibilidad del usuario
- Apertura/cierre de modal de detalle y libro de carta
- Cálculo de distancias al centro de ciudad

```javascript
const {
  filtros, filtrados, todos, total,
  modo, hayMas, cargandoMas, cargarMas,
  estado, error,
  cocinasDisponibles, zonasDisponibles,
  seleccionado, libro,
  ocultosDieta, ignorarDieta, hayFiltrosActivos,
  actualizarFiltro, limpiarFiltros, recargar,
  abrirDetalle, cerrarDetalle,
  abrirCarta, cerrarCarta,
  verTodosIgual, obtenerRestaurante, elegirCocina,
} = useRestaurantController({ dieta, accesibilidad });
```

---

## 12. Modelo de datos

### `restaurantModel.js` (716 líneas)

Contiene toda la lógica de dominio de la aplicación.

**Tipos (JSDoc):**
- `Restaurant` — Modelo completo de restaurante
- `Resena` — Reseña de usuario

**Constantes:**

| Constante | Descripción |
|---|---|
| `COCINAS` | Tipos de cocina disponibles |
| `PRECIOS` | Rangos de precio (`€`, `€€`, `€€€`) |
| `DISTANCIAS` | Distancias al centro |
| `ORDENES` | Opciones de ordenación |
| `DIAS` | Días de la semana |
| `FRANJAS` | Franjas horarias (desayuno, comida, cena) |
| `ZONAS_CATALUNA` | Zonas geográficas |
| `ALERGENOS` | Alérgenos con key y label |
| `SELLOS_PLATO` | Sellos dietéticos/alergénicos |
| `DIETA_VACIA` | Objeto dieta por defecto |
| `ACCESIBILIDAD_VACIA` | Objeto accesibilidad por defecto |
| `FESTIVOS_2026` | Festivos Cataluña 2026 |

**Funciones principales:**

| Función | Descripción |
|---|---|
| `imagenParaRestaurante(id)` | Genera URL de imagen determinista |
| `mesasDelLocal(r)` | Calcula capacidad del restaurante |
| `horarioRestaurante(r)` | Devuelve horario estructurado |
| `estaAbierto(r, fecha, hora)` | Comprueba si está abierto |
| `estaDisponible(r, fecha, hora, comensales)` | Comprueba disponibilidad |
| `cartaLibro(r)` | Genera libro de carta formateado |
| `cartaDelLocal(r)` | Devuelve la carta simple |
| `flagsPlato(nombre)` | Detecta ingredientes por nombre (heurísticas) |
| `platoApto(nombre, dieta)` | Comprueba si un plato es apto |
| `aptosEnCarta(r, dieta)` | Cuenta platos aptos en la carta |
| `recomendarPara(favoritos, todos, n)` | Recomienda restaurantes similares |
| `resumenRestaurante(r, dieta)` | Resumen para el comparador |
| `haversineKm(lat1, lng1, lat2, lng2)` | Distancia entre dos puntos |
| `normalizarDieta(raw)` | Normaliza objeto de dieta |
| `normalizarAccesibilidad(raw)` | Normaliza objeto de accesibilidad |
| `ordenarResenas(lista, modo)` | Ordena reseñas por populares/recientes |
| `parseFechaLocal(fecha)` | Parsea fecha local |
| `hoyLocalISO()` | Fecha de hoy en ISO local |

---

## 13. Servicios

Todos los módulos de datos hablan con **`mira-api`** vía `httpClient.js`
(`VITE_API_URL`). El frontend **no** importa Firestore.

### HTTP Core

#### `httpClient.js`
```javascript
api.get(path, opts)   // GET  (opts.auth añade Bearer token de Firebase Auth)
api.post(path, body)
api.put(path, body)
api.del(path)
BASE_URL              // VITE_API_URL || http://localhost:3000
```

#### `firebase.js` / `firebaseConfig.js`
Solo Auth (login/token). Credenciales web públicas por diseño.

### API de Autenticación (`authApi.js`)

| Función | Descripción |
|---|---|
| `crearCuenta({email, password, nombre, lang})` | Registro con lang para emails |
| `iniciarSesion(email, password)` | Login email+password |
| `iniciarSesionGoogle()` | Login con Google popup |
| `cerrarSesion()` | Cierra sesión |
| `recuperarContrasena(email, lang)` | Envía email de reset (con lang) |
| `enviarVerificacionEmail(lang)` | Envía email de verificación |
| `recargarEmailVerified()` | Recarga `emailVerified` del usuario |
| `suscribirSesion(cb)` | Listener de `onAuthStateChanged` |

### Perfil (`perfilApi.js`)

| Función | Descripción |
|---|---|
| `leerPerfil(uid)` | Lee perfil vía API |
| `guardarPerfil(uid, data)` | Actualiza perfil |
| `guardarLang(uid, lang)` | Guarda idioma preferido |

### Restaurantes (`restaurantApi.js`)

| Función | Descripción |
|---|---|
| `fetchPrimeraPagina()` | 1ª tanda (`limit=27`) + cursor |
| `fetchSiguientePagina(cursor)` | Siguiente tanda del scroll |
| `fetchRestaurants()` | Catálogo completo (`all=1`, filtros) |
| `contarRestaurantes()` | Count total |
| `fetchRestaurantePorId(id)` | Detalle por ID |
| `TAMANO_PAGINA` | **27** (constante compartida con la API) |

### Filtros (`filterService.js`)

Funciones puras de filtrado y ordenación (todo en cliente):

| Función | Descripción |
|---|---|
| `filtrar(restaurantes, filtros)` | Aplica todos los filtros |
| `ordenar(restaurantes, criterio)` | Ordena por valoración/distancia/precio |
| `aplicarDieta(restaurantes, dieta)` | Filtra por dieta |
| `aplicarAccesibilidad(restaurantes, acc)` | Filtra por accesibilidad |

### Reservas (`reservaApi.js`, 155 líneas)

| Función | Descripción |
|---|---|
| `crearReserva({restaurante, usuario, fecha, hora, comensales})` | Crea reserva con control atómico de aforo |
| `getDisponibilidad(restaurant, fecha, hora)` | Devuelve plazas libres |
| `listarMisReservas(uid)` | Lista reservas del usuario |
| `cancelarReserva(id)` | Cancela una reserva |
| `listarReservasAdmin()` | Lista todas (admin) |

**Control atómico de aforo:** Usa documentos Firestore `aforo/{id}_{date}_{time}` con transacciones para evitar sobreventa.

**Slots disponibles:** `12:00`, `12:30`, `13:00`, `13:30`, `14:00`, `14:30`, `20:00`, `20:30`, `21:00`, `21:30`, `22:00`

### Reseñas (`resenasApi.js`, 51 líneas)

| Función | Descripción |
|---|---|
| `crearResena({restauranteId, usuario, puntuacion, comentario})` | Publica reseña |
| `listarResenasDeRestaurante(id)` | Lista reseñas de un restaurante |
| `listarResenasDeUsuario(uid)` | Lista reseñas del usuario |
| `darLikeResena(id, uid)` | Añade like |
| `quitarLikeResena(id, uid)` | Quita like |

### Parkings (`parkingApi.js`, 132 líneas)

| Función | Descripción |
|---|---|
| `fetchNearbyParkings(lat, lng)` | Parkings cercanos vía Geoapify |

**Cache:** 48 horas en `localStorage` con clave `mira:parkings:{lat}_{lng}`.

### Meteorología (`meteoApi.js`, 91 líneas)

| Función | Descripción |
|---|---|
| `pronosticoDia(lat, lng, fecha)` | Pronóstico diario vía Open-Meteo |
| `alertaTerraza(terraza, meteo)` | Alerta si llueve/viento en terraza |
| `diasConPunto(fechaInicio, dias)` | Array de días con disponibilidad para calendario |

### Contacto (`contactoApi.js`)

```javascript
enviarContacto({ nombre, email, motivo, mensaje })
```

### Incidencias (`incidenciaApi.js`)

```javascript
crearIncidencia({ uid, email, motivo, mensaje })
listarMisIncidencias({ uid, email })
listarIncidenciasPendientes()        // Admin
resolverIncidencia(id)               // Admin
```

### Negocio (`negocioApi.js`)

```javascript
proponerNegocio({ uid, ...datos })
listarMisNegocios(uid)
listarNegociosPendientes()           // Admin
aprobarNegocio(id)                   // Admin
rechazarNegocio(id)                  // Admin
```

### Mensajes (`mensajesApi.js`)

```javascript
listarMensajes(uid)
contarNoLeidos(uid)
marcarLeidos(uid)
```

### Cookies (`cookieService.js`)

```javascript
leerCookies(uid)          // localStorage (guest) o Firestore (logueado)
guardarCookies(data, uid) // Guarda preferencias
tieneConsentimiento(c)    // Comprueba si tiene consentimiento
```

**Categorías:** `necesarias` (requerida), `preferencias`, `analiticas`, `marketing`

### Centros de ciudad (`cityCenters.js`)

Coordenadas de centro para: Barcelona, Tarragona, Girona, Lleida (para cálculo de distancia).

---

## 14. Componentes

### Header (`Header.jsx`, 154 líneas)

Cabecera glassmorphic sticky con:
- Logo MIRA
- Navegación principal (Descubrir, Mapa, Reservas, Contacto)
- Botón de tema (claro/oscuro)
- Botón de idioma (ES/CA/EN)
- Enlaces de sesión (Mi cuenta, Favoritos, Admin, Cerrar sesión)
- Menú hamburguesa móvil
- Se oculta al hacer scroll down, reaparece al hacer scroll up

### Hero (`Hero.jsx`, 41 líneas)

Sección editorial con:
- Título + subtítulo
- Estadísticas dinámicas (restaurantes, zonas, reseñas por local)
- Botón de búsqueda

### SearchBar (`SearchBar.jsx`, 145 líneas)

Buscador con:
- Campo de texto
- Pills de filtros (precio, cocina, zona, distancia, día, franja horaria, hora, orden)
- Botón limpiar filtros
- Contador de resultados
- Traducción automática de franjas horarias

### RestaurantList (`RestaurantList.jsx`, 66 líneas)

Grid responsive de tarjetas con:
- Estado vacío con ilustración
- Infinite scroll via `IntersectionObserver`
- Spinner de carga

### RestaurantCard (`RestaurantCard.jsx`, 110 líneas)

Tarjeta editorial con:
- Foto con lazy loading
- Estrellas de valoración
- Distancia al centro
- Badge de precio
- Botón de favoritos (corazón)
- Disponibilidad por franja horaria
- Badge de accesibilidad

### RestaurantSkeleton (`RestaurantSkeleton.jsx`, 23 líneas)

Skeleton de carga con animación shimmer. Se muestran 8 en la carga inicial y 3 durante scroll infinito.

### RestaurantDetail (`RestaurantDetail.jsx`, 368 líneas)

Modal premium con:
- Foto del restaurante
- Datos (nota Yelp, nota MIRA, precio, dirección, teléfono)
- Accesibilidad (acceso adaptado, menú infantil, tronas, terraza, entorno tranquilo)
- Alérgenos
- Botón de "Ver carta" y "Cómo llegar" (Google Maps)
- **Formulario de reserva:** fecha, hora, comensales, comentarios
  - Control de disponibilidad en tiempo real
  - Alerta meteorológica para terrazas
  - Confirmación de reserva con código
- **Mapa de parkings cercanos** (Geoapify)
- **Sección de reseñas:**
  - Pestañas: populares / recientes
  - Formulario para nueva reseña (estrellas + comentario)
  - Lista de reseñas MIRA con likes
  - Lista de reseñas Yelp
  - Botón "ver más/menos"

### RestaurantMap (`RestaurantMap.jsx`, 105 líneas)

Mapa Leaflet con:
- Marcador del restaurante
- Marcadores de parkings (seleccionable)
- Centro en la posición del restaurante

### ParkingsPanel (`ParkingsPanel.jsx`, 67 líneas)

Panel lateral con:
- Lista de parkings cercanos (nombre, distancia, tipo, precio)
- Botón seleccionar (resalta en mapa)
- Estado de carga

### LibroCarta (`LibroCarta.jsx`, 188 líneas)

Modal estilo libro con:
- Portada temática (color según cocina)
- Secciones paginadas con navegación
- Platos con precios y sellos dietéticos
- Leyenda de sellos

### Sellos (`Sellos.jsx`, 58 líneas)

Componentes de badges:
- `Sellos` — Badges de alérgenos/dieta para un plato
- `MiniLeyenda` — Leyenda de los sellos

### Comparador (`Comparador.jsx`, 105 líneas)

Tabla comparativa de 2-3 restaurantes:
- Nota Yelp, Nota MIRA, mejor nota
- Precio, distancia, ciudad
- Aptos para ti (si hay dieta)
- Carta (secciones, platos, más barato, más caro)
- Resaltado del ganador por fila

### Login (`Login.jsx`, 152 líneas)

Formulario de login con:
- Email + contraseña
- Botón "Continuar con Google"
- Enlace "He olvidado mi contraseña"
- Enlace "Crear cuenta"
- Redirección a `#/` tras login exitoso

### Registro (`Registro.jsx`, 201 líneas)

Formulario de 2 pasos:
1. **Datos:** nombre, email, contraseña, tipo (cliente/empresa)
2. **Preferencias:** dieta, alérgenos, accesibilidad, idioma

### Recuperar (`Recuperar.jsx`, 83 líneas)

Solicitud de recuperación de contraseña:
- Campo de email
- Mensaje de éxito/error
- Enlace volver al login

### Restablecer (`Restablecer.jsx`, 148 líneas)

Restablecimiento de contraseña con token:
- Verifica `oobCode` de la URL
- Muestra formulario de nueva contraseña
- Validación de coincidencia
- Mensaje de éxito con enlace a login

### Cuenta (`Cuenta.jsx`, 338 líneas)

Página completa de gestión de usuario:
- Avatar con inicial
- Datos del perfil (email, verificado, miembro desde)
- **Dieta:** checkboxes de vegano/vegetariano + alérgenos
- **Accesibilidad:** checkboxes de silla de ruedas / espectro autista
- **Idioma:** selector con 3 botones (ES/CA/EN)
- **Verificación de correo:** enviar/recargar verificación
- **Cookies:** configuración por categorías
- **Negocio:** enlace a propuesta (solo empresas)
- **Reservas:** próximas reservas con código
- **Incidencias:** lista de incidencias del usuario
- **Reseñas:** lista de reseñas publicadas

### Reservas (`Reservas.jsx`, 274 líneas)

Gestión de reservas:
- Calendario con puntos de disponibilidad (verde/amarillo/rojo)
- Pronóstico meteorológico por día
- Pestañas: próximas / pasadas / canceladas
- Cancelación de reservas con confirmación

### Favoritos (`Favoritos.jsx`, 191 líneas)

Página de favoritos:
- Grid de restaurantes guardados
- Checkbox para añadir a comparar (máx. 3)
- Botón comparar → tabla Comparador
- Recomendaciones basadas en cocinas favoritas

### Contacto (`Contacto.jsx`, 118 líneas)

Formulario de contacto:
- Nombre, email, motivo (select), mensaje
- Validación de campos
- Mensaje de agradecimiento tras envío

### Admin (`Admin.jsx`, 153 líneas)

Panel de administración (solo admins):
- Incidencias pendientes con botón resolver
- Locales propuestos con aprobar/rechazar

### Negocio (`Negocio.jsx`, 222 líneas)

Formulario de propuesta de restaurante:
- Nombre, ciudad, zona, dirección, teléfono
- Cocinas (separadas por comas)
- Precio, descripción, foto
- Opciones de accesibilidad
- Envío → revisión por admin

### Mensajes (`Mensajes.jsx`, 113 líneas)

Bandeja interna:
- Lista de mensajes con expandir
- Indicador de no leídos
- Marcar como leídos
- Info de parking recomendado

### Mapa (`Mapa.jsx`, 255 líneas)

Mapa full-screen con:
- Todos los restaurantes como marcadores
- Filtro por zona
- Popup con info básica + botón detalle

### Privacidad (`Privacidad.jsx`, 260 líneas)

Página de política de privacidad GDPR.

### CookieBanner (`CookieBanner.jsx`, 120 líneas)

Banner de consentimiento de cookies:
- Aceptar todas
- Solo necesarias
- Configurar por categorías (necesarias, preferencias, analíticas, marketing)

### Footer (`Footer.jsx`, 51 líneas)

Pie de página con:
- Logo + descripción
- Columna "Descubrir" (buscar, mapa, reservas)
- Columna "Mi cuenta" (login, registro, cuenta)
- Contacto (dirección, email, teléfono)
- Aviso de privacidad + política de cookies

### BottomNav (`BottomNav.jsx`, 51 líneas)

Navegación inferior móvil con:
- Inicio, Favoritos, Reservas, Contacto

### FloatingReservation (`FloatingReservation.jsx`, 60 líneas)

Bottom sheet para reserva rápida:
- Hora, comensales, ahorro estimado
- Confirmar → abre detalle del restaurante

### PromoBanner (`PromoBanner.jsx`, 25 líneas)

Banner de beneficios: "Sin comisiones · Reseñas reales · Parkings gratis"

---

## 15. Funcionalidades destacadas

### Scroll infinito
`RestaurantList` usa `IntersectionObserver` para detectar cuándo el usuario llega al final y cargar más restaurantes.

### Filtrado en tiempo real
Los filtros se aplican en cliente sobre los datos ya cargados. Incluyen:
- Búsqueda por nombre (parcial)
- Cocina, zona, precio
- Distancia al centro
- Día de la semana + franja horaria
- Ordenación por relevancia/valoración/distancia/precio

### Control atómico de aforo
Las reservas usan transacciones Firestore para garantizar que dos usuarios no reserven la última mesa al mismo tiempo. Cada slot tiene un documento `aforo/{restauranteId}_{date}_{time}` con el contador de mesas ocupadas.

### Detección de alérgenos en platos
La función `flagsPlato(nombre)` usa heurísticas de texto para detectar automáticamente ingredientes en nombres de platos (gluten, lactosa, frutos secos, marisco, etc.).

### Libro de carta
La función `cartaLibro(r)` genera un formato de libro con portada, secciones temáticas, y leyenda de sellos. Cada restaurante tiene su tema de color según cocina.

### Parkings cercanos
`parkingApi.js` consulta la API de Geoapify para encontrar parkings en un radio de 500m. Los resultados se cachean 48h en `localStorage`.

### Meteorología para terrazas
`meteoApi.js` consulta Open-Meteo para el pronóstico del día de una reserva. Si el restaurante tiene terraza y el pronóstico indica lluvia/viento, muestra una alerta.

### Recomendaciones
`recomendarPara()` analiza las cocinas de los favoritos del usuario y recomienda restaurantes similares que no estén en favoritos.

### Skeleton loading
Se muestran 8 skeletons shimmer durante la carga inicial y 3 durante scroll infinito.

### Modo oscuro
Toggle en Header. Preferencia guardada en `localStorage`. Respeta `prefers-color-scheme` del sistema. Implementado con `data-theme="dark"` en `<html>` y CSS custom properties.

---

## 16. Firebase

### Proyecto
- **Nombre:** `restaurante-mira-18e0c`
- **Plan:** Spark (gratuito)

### Servicios utilizados
- **Firebase Authentication** (desde el frontend): Email+password, Google Sign-In
- **Cloud Firestore** (solo desde `mira-api` con Admin SDK): base de datos

### Colecciones Firestore

| Colección | Documentos | Descripción |
|---|---|---|
| `restaurants/{id}` | ~690 | Restaurantes |
| `usuarios/{uid}` | Por usuario | Perfiles |
| `reservas/{id}` | Por reserva | Reservas |
| `aforo/{key}` | Por slot | Control de capacidad |
| `resenas/{id}` | Por reseña | Reseñas |
| `contactos/{id}` | Por mensaje | Formulario de contacto |
| `incidencias/{id}` | Por incidencia | Incidencias |
| `negocios/{id}` | Por propuesta | Propuestas de negocio |
| `mensajes/{id}` | Por mensaje | Mensajes internos |

### Configuración de seguridad (Firebase Rules)

Las reglas de Firestore viven en `mira-api/firestore.rules` y se despliegan
con la API. El frontend no escribe en Firestore; las escrituras pasan por
endpoints autenticados de `mira-api`. Ver README del backend para el
inventario completo de endpoints.

---

## 17. Despliegue

### Build de producción
```bash
npm run build    # Genera dist/
npm run preview  # Previsualiza el build localmente
```

### Hosting

El frontend es una SPA estática. Puede desplegarse en:
- Firebase Hosting
- Vercel
- Netlify
- Cualquier CDN estático

**Importante:** Configurar reescritura para que todas las rutas devuelvan `index.html` (necesario para hash routing).

---

## 18. Branches

| Branch | Descripción | Estado |
|---|---|---|
| `main` | Rama principal, production-ready | ✅ Pushed |
| `feat/skeleton` | i18n + skeleton loading + merge de stich | ✅ Pushed |
| `feat/test_frontend_stich` | UI redesign (BottomNav, FloatingReservation, Google sign-in) | Mergeado en skeleton |

### Commits recientes en main

```
d12386c fix: selector idioma limpio sin emojis, texto que encaja
e6ef14a fix: iniciarSesionGoogle no pasaba a AppContent + selector idioma rediseñado + todas las traducciones Cuenta/Footer/Cookies
541d1dd merge: combinar feat/test_frontend_stich con feat/skeleton
517cbc9 i18n: traducir todos los componentes restantes (13 archivos)
...
```

---

*Documentación generada automáticamente el 17 de septiembre de 2026.*
