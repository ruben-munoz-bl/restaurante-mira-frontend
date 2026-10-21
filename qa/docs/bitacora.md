# Bitácora de QA (MIRA frontend)

Registro cronológico de lo hecho, lo medido y lo encontrado. Se actualiza en
cada tanda de trabajo; el detalle operativo está en `../README.md`.

---

## 2026-10-20 · Tanda 1: arnés E2E + monkey + regresión

### Contexto
Se instala Taurus 1.17.1 para pruebas de carga y se decide aprovecharlo como
orquestador de pruebas de navegador (Selenium), no solo de carga HTTP.

### Hecho
- Taurus en venv dedicado (`~/tools/taurus`), con `pytest` 9.1.1 y
  `selenium` 4.51.0. Edge headless vía Selenium Manager (sin Chrome ni Java).
- `qa/`: fixtures, page helpers, 3 perfiles Taurus y monkey reproducible.
- Servidores autocontenidos: si Vite/mock no están, la suite los levanta y los
  mata al terminar.
- Cierre de huecos del mock (`scripts/mock-api.mjs`): `/v1/restaurants/mapa`,
  filtro `q`, cabecera CORS `Idempotency-Key` y `POST /v1/ai/agent`.

### Resultados
| Suite | Resultado |
|---|---|
| E2E landing/buscador/ficha/favoritos/rutas | 16/16 verde |
| Monkey 40 y 80 acciones (seed 20261020) | 0 incidencias |
| `npm test` backend | 210/210 verde |
| `npm test` frontend | 271/309 (38 fallos) |

### Hallazgos
1. **Puerto 3001 ocupado por `AMAgent`** (agente corporativo). Windows permite
   dos listeners en el mismo puerto (0.0.0.0 y 127.0.0.1), así que `localhost`
   podía resolver al servicio equivocado. QA usa **3101**.
2. **El executor `pytest` de Taurus ignora el código de salida de pytest** y
   devuelve 0 siempre. Sin `passfail` el CI sería ciego. Añadido
   `fail>0, continue as failed` (exit 3).
3. **El mock no era paridad de producción**: faltaban `/mapa`, `q`, la cabecera
   `Idempotency-Key` en CORS y el endpoint del agente. El monkey destapó los
   tres últimos al pulsar las sugerencias del chat.
4. **El monkey necesita seed**: con acciones aleatorias sin semilla no se puede
   reproducir un fallo. Todo incidente guarda acción, URL y paso.
5. **`clear()` de Selenium no dispara el `onChange` de React**: hay que borrar
   con teclado (`Ctrl+A`, `Backspace`) o usar el botón real de la UI.
6. **`element.text` devuelve vacío en tarjetas y modales** durante/after
   animación; se usa `innerText` vía JS (`helpers.texto`).

### Decisiones
- `executor: pytest` en Taurus (no `executor: selenium`) para controlar el
  driver y evitar el provisionado de webdrivers, que en Windows solo tiene Edge.
- Tests por clase/rol, no por `data-testid` (la app no tiene). Si un flujo se
  vuelve frágil, lo correcto es añadir `data-testid` al componente.
- El perfil `03-regresion` es estricto: incluye `npm test`; si el frontend está
  rojo, la regresión sale roja. No se oculta.

### Pendiente
- Flujos autenticados (login real, reserva completa, puntos, admin).
- Regresión visual (diff de imágenes).
- CI.

---

## 2026-10-20 · Tanda 2: autenticación sin credenciales + CI

### Hecho
- `qa/tests/test_flujo_auth.py` (5 tests):
  - login valida correo y contraseña corta (mensajes propios, `noValidate`);
  - login ofrece Google, recuperar y registro;
  - recuperar usa validación nativa del navegador (su form no tiene `noValidate`);
  - reservar como invitado redirige a `#/login`.
- `qa/servers.py`: `npm`/`npm.cmd` según sistema y parada de procesos portable.
- Plan de CI escrito en `ESTADO.md`; **el workflow aún no existe** (no se ha
  validado en GitHub Actions).

### Resultados
| Suite | Resultado |
|---|---|
| `qa/tests/test_flujo_auth.py` | 5/5 verde |
| Total E2E | 21 tests |

### Hallazgos nuevos
1. **Inconsistencia de longitud de contraseña**: `Login.jsx` rechaza `< 6`
   caracteres pero el mensaje (`auth.contrasenaCorta`) dice "al menos 8".
   Decidir cuál es la regla correcta y alinear ambos.
2. **Dos estrategias de validación en formularios hermanos**: Login usa
   `noValidate` + mensajes propios; Recuperar usa validación nativa del
   navegador. Funciona, pero conviene unificar el criterio de UX.
3. **Selenium no puede probar el login real sin un usuario de Firebase**: se
   cubre la validación y los guards; el camino feliz queda pendiente de unas
   credenciales de prueba o de un mock de Auth.

### Cómo reproducir
```powershell
npm run qa:flujo      # 21 E2E, exit 0
npm run qa:monkey     # 80 acciones, exit 0
npm run qa:regresion  # exit 3 por los 38 fallos preexistentes del frontend
```


## 2026-10-20 (b) — Ampliación del monkey test

### Qué se hizo
- `qa/navegador.py`: el driver se crea en un solo sitio y admite Chrome
  (`MIRA_BROWSER=chrome`) además de Edge, para poder ejecutar en Linux/CI.
- Nuevas acciones: `formulario` (select, checkbox, radio, date, time, number,
  range con el setter nativo para que React reciba el evento), `rafaga`
  (3-6 clics seguidos: doble envío) y `redimensionar` (escritorio ↔ móvil).
- `--monkey-seeds 1,2,3` → un test de pytest por semilla; `--monkey-movil`
  arranca en 390x844. El log de acciones se guarda siempre en `artifacts/`.
- Perfil Taurus `02-monkey.yml`: 3 semillas escritorio + 2 móvil.

### Hallazgos (del propio monkey, no de la app)
1. **"Atrás" salía de la app** hasta la página inicial del navegador (`data:,`)
   y todo lo siguiente contaba como "pantalla en blanco" (19-24 falsos
   positivos con las semillas 1 y 2). Ahora vuelve a la home.
2. **Ruido de Chromium**: "Network location provider ... 400" (geolocalización
   sin clave de Google) se añadió a `_RUIDO`.
3. **Login con Google**: el monkey abría el popup, lo cerraba y Firebase
   registraba `auth/internal-error`. Se añade "google" a `PROHIBIDO`.

### Resultados (Chromium 141, Linux)
| Ejecución | Resultado |
|---|---|
| 60 acciones, semillas 1,2,3, escritorio | 3/3 verde (3 min 27 s) |
| 80 acciones, semillas 4,5, móvil | 2/2 verde (4 min 10 s) |

### Para que la suite entera funcione en Chrome/Linux
4. **Idioma**: Chromium en Linux ignora `--lang=es-ES` y la app arrancaba en
   inglés (11 flujos en rojo por textos). `navegador.py` fuerza
   `intl.accept_languages` y `LANGUAGE/LANG` a español.
5. `test_reserva_sin_sesion_manda_al_login` leía `nota.text`, que sale vacío
   en el modal animado con Chrome; ahora usa `helpers.texto()` (la trampa ya
   estaba documentada en `ESTADO.md`).

| Suite completa (`pytest qa`, Chrome) | 22 verde, 2 omitidos (unitarias) |

---

## 2026-10-21 — Tanda 7: paneles y CI (ya dentro de `main`)

Se retoma encima de `main` (49 commits después) y se traen solo los tests y los
tres arreglos que necesitan:

1. **Paneles** (`qa/tests/test_flujo_paneles.py`, 6 tests): KPIs de admin,
   métricas de finanzas, los tres gráficos del restaurante, factura fiscal y los
   dos guards de sesión (`#/admin`, `#/dashboard` sin sesión → login). Sin
   credenciales se recorren por `#/demo-paneles` (datos simulados).
2. **Dos bugs de redirección** que encontraron esos tests: `OpsPanel` cambiaba
   el hash durante el render (con `hashchange` disparado antes de que App se
   suscriba la ruta se quedaba clavada) y `#/dashboard` sin sesión se quedaba en
   «Cargando…» para siempre. Los dos van ahora en un `useEffect`.
3. **Contraseña**: mensajes de es/en/ca alineados con la validación real (6), y
   `test_login_valida_contrasena_corta` exige que el mensaje diga «6».
4. **«Descubrir» sin animaciones**: Edge en CI arranca con
   `prefers-reduced-motion: reduce` y monta `VueloEstatico`, que no tenía
   cabecera: la página se quedaba **sin `<h1>`**. Se le añade la del vuelo
   animado.

CI (`.github/workflows/qa.yml`): `e2e` y `unit-frontend` en push, `monkey` solo
lunes o a mano. Dos fallos del primer run, los dos del entorno, ya arreglados:
la aserción de navegación leía una sola vez (ahora espera al texto con
`helpers.texto()`) y el glob de `npm test` no se expandía con Node 20 en Linux
(el job llama a `node --test test/*.test.js` sin comillas).
