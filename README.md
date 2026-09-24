# MIRA — ¿Dónde comemos hoy?

Landing + buscador de restaurantes de Cataluña con datos reales:
~690 locales con 50 reseñas cada uno, filtro por zona, fichas con mapa,
cuentas de usuario y formulario de contacto.

**Arquitectura:** el frontend **no** toca Firestore. Toda la lectura/escritura
de datos pasa por la API hermana `mira-api` (Express). El SDK de Firebase
solo se usa para Auth (login/token). El filtrado final es cliente.

---

## Qué incluye

| Apartado | Descripción |
|---|---|
| Landing | Hero fotográfico, cifras reales, atajos por cocina y franja de ventajas |
| Buscador | Texto (insensible a tildes), cocina, zona, precio, distancia, día/hora y 4 órdenes; **scroll infinito de 27 en 27** |
| Fichas | Foto, nota Yelp + nota MIRA, dirección, teléfono, mapa, carta y reseñas Yelp/MIRA |
| Carta libro | Modal con portada temática, páginas, leyenda fija + página Leyenda |
| Dieta | Vegano/vegetariano/sin gluten + 7 alergias; oculta locales con <2 platos aptos |
| Accesibilidad | Silla de ruedas y TEA en Mi cuenta; filtra solo verificados (lo declaran empresas) |
| Favoritos | Corazón en cards, contador en header, `#/favoritos` y comparador de hasta 3 |
| Reservas | Slots fijos con cupo, calendario con meteo y avisos de terraza, Mis reservas y cancelación |
| Cuentas | Registro (cliente/empresa), login, "Mi cuenta" y panel `#/admin` |
| Contacto | Formulario (reserva, sugerencia, incidencia) → API → Firestore |
| Empresa | Propuesta de locales con acceso, infantil, tronas, entorno, terraza y alérgenos; el admin aprueba |

## Rutas

| Ruta | Página |
|---|---|
| `#/` | Landing + buscador |
| `#/login` | Iniciar sesión |
| `#/registro` | Crear cuenta |
| `#/cuenta` | Mi cuenta (dieta, negocio, reservas, incidencias, reseñas) |
| `#/contacto` | Formulario de contacto |
| `#/reservas` | Mis reservas (calendario con meteo, próximas/pasadas/canceladas) |
| `#/favoritos` | Guardados + comparador de cartas (máx 3) |
| `#/mapa` | Mapa Leaflet con locales por zona (clic → detalle) |
| `#/mensajes` | Buzón interno (avisos 24h de TEAM MIRA) |
| `#/negocio` | Proponer restaurante (cuentas empresa) |
| `#/admin` | Incidencias y locales pendientes (solo allowlist) |

## Tecnologías

| Capa | Stack |
|---|---|
| App | Vite 5 + React 18 + CSS puro (sin librerías de UI) |
| Datos | API `mira-api` (Express) → Firestore (690 restaurantes de Cataluña) |
| Auth | Firebase Authentication (email + contraseña) — solo login/token |
| Mapas | Embed de OpenStreetMap (gratis, sin claves) |

## Arquitectura MVC adaptada a React

```
src/
├── models/       # Tipos JSDoc + helpers puros (normalizeText, haversineKm…)
├── data/         # Mocks de respaldo (la app usa la API)
├── services/     # httpClient + restaurantApi, filterService, authApi…
├── controllers/  # Hooks: useRestaurantController (filtros+detalle), useAuth
├── components/   # Views puras: solo props, nunca importan el Model
├── styles/       # tokens.css (paleta y tipografía)
├── App.jsx       # Orquestador + rutas hash
└── main.jsx
```

Regla de la casa: las Views no importan el Model; solo el Controller habla con él.

## Puesta en marcha

La API debe estar corriendo (puerto 3000) antes de usar el frontend:

```powershell
# 1. API (otra terminal)
cd ..\restuarante-mira-backend\mira-api
npm start              # http://localhost:3000

# 2. Frontend
cd restaurante-mira-frontend
npm.cmd install
npm.cmd run dev        # http://localhost:5173
npm.cmd run build      # genera dist/
npm.cmd run preview    # sirve el build en local
```

`.env` del frontend:

```
VITE_API_URL=http://localhost:3000
```

> En CMD escribe el comando limpio: lo que vaya detrás de `#` se ejecuta
> como argumento y rompe Vite. Nada de `npm.cmd run dev # comentario`.

## Conectar tu Firebase (2 pasos)

**1. Config web** en `src/services/firebaseConfig.js`
([Consola](https://console.firebase.google.com/) → Configuración del
proyecto → Tus apps → Web `</>`). Es clave pública por diseño; la protegen
las reglas, no el secreto.

**2. Reglas** en Firestore → Reglas. Sin este paso fallan reservas,
reseñas, likes y "Mis reservas" (permiso denegado). Dos formas:

- Automática: `node setup-colecciones.js` desde `Restaurante_Mira/`
  (crea `resenas`/`reservas` y despliega las reglas vía API; con
  `--admin UID` además te da rol admin).
- Manual: pega el bloque de abajo. Para dar acceso admin, crea el doc
  `admins/{uid}` (contenido libre, p. ej. `{rol:'admin'}`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
    function isAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /restaurants/{id} {
      allow read: if true;
      // Crear: cualquier logueado con forma válida (lo usa Aprobar del admin;
      // sin backend propio no hay otra vía).
      allow create: if isSignedIn()
        && request.resource.data.nombre is string
        && request.resource.data.nombre.size() > 0
        && request.resource.data.ciudad is string
        && request.resource.data.precio in ['€','€€','€€€'];
      allow update, delete: if false;
    }
    // Perfiles: cada uno solo el suyo.
    match /usuarios/{uid} {
      allow read, write: if isSignedIn() && request.auth.uid == uid;
    }
    // Propuestas de empresa: crear logueado validado, leer dueño o admin,
    // cambiar estado solo admin.
    match /negocios/{id} {
      allow read: if isOwner(resource.data.uid) || isAdmin();
      allow create: if isSignedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.nombre is string
        && request.resource.data.nombre.size() > 0
        && request.resource.data.estado == 'pendiente';
      allow update: if isAdmin();
      allow delete: if false;
    }
    match /contactos/{id} {
      allow read: if isOwner(resource.data.uid) || isAdmin();
      allow create: if request.resource.data.mensaje is string
        && request.resource.data.mensaje.size() > 0
        && request.resource.data.mensaje.size() <= 2000;
      allow update: if isAdmin();
      allow delete: if false;
    }
    // Reservas: crear solo el dueño validado; leer dueño o admin;
    // solo se puede pasar a 'cancelada' (dueño o admin); nunca borrar.
    match /reservas/{id} {
      allow read: if isOwner(resource.data.uid) || isAdmin();
      allow create: if isSignedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.hora in ['13:00','14:00','15:00','20:00','21:00','22:00']
        && request.resource.data.comensales >= 1
        && request.resource.data.comensales <= 10
        && request.resource.data.estado == 'activa';
      allow update: if (isOwner(resource.data.uid) || isAdmin())
        && request.resource.data.estado == 'cancelada';
      allow delete: if false;
    }
    // Aforo por slot: lectura pública (ver plazas); escritura validada
    // (las transacciones del cliente escriben como el usuario).
    match /aforo/{id} {
      allow read: if true;
      allow create, update: if isSignedIn()
        && request.resource.data.ocupadas >= 0
        && request.resource.data.limite >= 4
        && request.resource.data.limite <= 12;
      allow delete: if false;
    }
    // Reseñas de usuarios: lectura pública, crear logueado, likes logueado.
    match /resenas/{id} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.resource.data.usuarioId == request.auth.uid;
      allow update: if isSignedIn();
      allow delete: if false;
    }
    // Mensajería interna: los escribe el servidor (Admin SDK); el dueño
    // solo lee los suyos y marca leído (solo cambia `leido`).
    match /mensajes/{id} {
      allow read: if isOwner(resource.data.uid);
      allow create: if false;
      allow update: if isOwner(resource.data.uid)
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['leido']);
      allow delete: if false;
    }
    // Allowlist de admins: cada uno solo lee su propio doc
    // (las reglas sí pueden consultarla con exists()).
    match /admins/{uid} {
      allow read: if isSignedIn() && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

Además, en Authentication → Método de inicio de sesión, activa
**Correo electrónico/contraseña** (si no, el registro falla).

## Costes (plan Spark, gratis)

Las lecturas de Firestore las hace la API (Admin SDK), no el cliente.
Coste aproximado por visita:

| Acción | Lecturas Firestore |
|---|---|
| Abrir la portada | 27 (1 tanda) + 1 count |
| Seguir deslizando | +27 por tanda |
| Filtrar / ordenar global | ~690 (1 vez, conjunto entero) |
| Filtrar / ordenar (ya cargado) | 0 extra (todo en cliente) |
| Crear cuenta / entrar | 0 en Firestore (perfil: 1 lectura por sesión) |
| Enviar contacto | 1 escritura |
| Favoritos / dieta / carta libro | 0 (todo en cliente) |

Sin filtros la portada pinta **27** de 690 y el scroll carga otras 27.
Al activar cualquier filtro u orden global se trae el conjunto una vez,
pero la UI sigue pintando de 27 en 27.

## Flujos para probar

- Sin filtros → "Mostrando 27 de 690 restaurantes"; al deslizar carga más.
- `sushi` + `€€` + zona Barcelona → trae el conjunto y filtra en cliente (pinta de 27 en 27).
- `méxico` (con tilde) → encuentra igual (búsqueda normalizada).
- `#/registro` → crea cuenta → "Hola, {nombre}" → `#/cuenta` → salir.
- `#/contacto` → envía un mensaje → aparece en Firestore → `contactos`.

## Scripts con datos

La carpeta hermana `restuarante-mira-backend/yelp-connection/` contiene los
scripts de Node que llenan Firestore desde Yelp + Faker/IA:

```powershell
node index.js    # extrae, genera 50 reseñas y sube
node borrar.js   # vacía la colección (cuidado: full-scan = lecturas)
node ver-uno.js --zonas  # conteo por zona
```
