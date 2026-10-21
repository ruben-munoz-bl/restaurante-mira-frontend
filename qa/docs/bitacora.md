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

---

## 2026-10-21 — Tanda 3: CI escrito, flaky del modal y bug de contraseña

### Hecho
- `.github/workflows/qa.yml`: tres jobs (`e2e` en `windows-latest`,
  `unit-frontend` en `ubuntu-latest` con `continue-on-error`, `monkey` solo
  `schedule`/`workflow_dispatch`), artefactos con `if: always()`, timeout 30 min.
  YAML validado en local; **sin ejecutar en Actions**.
- `test_reserva_sin_sesion_manda_al_login` falló una vez en la primera pasada:
  leía `nota.text` (vacío en nodos ya animados) en vez de `helpers.texto()`.
  Era el fallo documentado en la tanda 1, aplicado al propio test.
- Regla de contraseña = **6** (la que ya validaban `Login.jsx` y
  `Restablecer.jsx`): mensajes `auth.contrasenaCorta` y `restablecer.errorCorto`
  alineados en es/en/ca. `test_login_valida_contrasena_corta` exige ahora que el
  mensaje diga "6". `registro` sigue en 8, que es lo que valida.

### Resultados
| Suite | Resultado |
|---|---|
| E2E Selenium (21) | verde |
| `test/i18n*.test.js` | 4/4 verde |
| `npm run build` | verde |

### Pendiente
- Validar el workflow en Actions (necesita push de la rama).
- Todo lo de `ESTADO.md`: flujos autenticados, 38 unitarios, opcionales.

---

## 2026-10-21 — Tanda 4: paneles de admin y restaurante

### Hecho
- `qa/tests/test_flujo_paneles.py` (6 tests) contra `#/demo-paneles`, que monta
  los dos paneles con datos simulados y sin sesión: KPIs de admin, métricas de
  finanzas, los tres gráficos del panel del restaurante, la factura de comisiones
  y los dos guards.
- Guards reales: `#/admin` y `#/dashboard` sin sesión mandan a `#/login`.

### Dos bugs de redirección que destaparon los tests
1. `OpsPanel` cambiaba `window.location.hash` **durante el render**. El
   `hashchange` se disparaba antes de que `App` estuviera suscrito, así que la
   ruta se quedaba en `admin` y el `<main>` salía vacío: pantalla en blanco sin
   header ni login. Se movió a un `useEffect` (mismo patrón que ya documentaba
   `Dashboard.jsx`).
2. `#/dashboard` sin sesión se quedaba en «Cargando…» para siempre. Ahora
   redirige al login cuando la sesión ya está resuelta y no hay usuario; `App`
   pasa `cargandoSesion` al panel.

### Resultados
| Suite | Resultado |
|---|---|
| E2E Selenium (27) | verde |
| `npm run build` | verde |

### Pendiente
- Primer run de CI (#1) en rojo: el job `e2e` falló y no hay log a mano
  (la API pide token). `unit-frontend` falla como estaba previsto.
- Sesión real de admin/restaurante: sigue bloqueada por credenciales.

---

## 2026-10-21 — Tanda 5: los dos primeros runs del CI

Runs #1 y #2 en rojo, con un fallo cada uno y **ninguno de la app**:

1. `test_ruta_renderiza[#/descubrir]`: en el runner Edge arranca con
   `prefers-reduced-motion: reduce`, así que la página montaba `VueloEstatico`…
   y esa versión no tenía cabecera: **la página se quedaba sin `<h1>`** (fallo
   real de accesibilidad, no del test). Se le añade la misma cabecera que en la
   versión animada. El test además espera al texto y lo lee con
   `helpers.texto()` (innerText) en vez de una lectura única de `.text`.
2. `unit-frontend`: `npm test` ejecuta `node --test "test/*.test.js"`; con Node
   20 sobre Linux el glob entrecomillado no se expande y Node responde
   «Could not find …/test/*.test.js». El job llama a `node --test test/*.test.js`
   sin comillas y deja que lo expanda bash.

`monkey` no se ejecuta en push: por diseño (`schedule` o `workflow_dispatch`).
`QA_REDUCED_MOTION=1` en el entorno de pytest arranca Edge con
`--force-prefers-reduced-motion`, para probar a mano la variante sin animaciones.

