# QA de MIRA: flujos, monkey y regresión con Selenium + Taurus

Suite de pruebas de navegador real (Edge headless) sobre el frontend de MIRA.
Taurus orquesta y reporta; **la carga de trabajo la ejecuta Selenium**, que es
lo que hace falta para un monkey test, flujos de usuario y regresión visual-funcional.

> Taurus **no** simula usuarios por sí solo: es el orquestador. Sus executors de
> carga (`jmeter`, `k6`, `apiritif`) prueban HTTP; `pytest`/`selenium` prueban la
> interfaz de verdad. Aquí usamos `executor: pytest` + Selenium.

---

## Qué hay aquí

| Carpeta / fichero | Qué hace |
|---|---|
| `conftest.py` | Fixtures de pytest: servidores, Edge headless por test, screenshot y consola al fallar |
| `servers.py` | Arranca mock-api + Vite si no están (lo usan pytest y el CLI del monkey) |
| `helpers.py` | Navegación, cookies, errores de consola, clicks robustos |
| `tests/test_flujo_home.py` | Landing, buscador (Enter), ficha de restaurante, cierre |
| `tests/test_flujo_favoritos.py` | Marcar/quitar favorito, contador del header, panel |
| `tests/test_flujo_navegacion.py` | Regresión de las 10 rutas públicas y la protegida |
| `tests/test_flujo_auth.py` | Login (validación), recuperar contraseña y guard de reserva sin sesión |
| `tests/test_flujo_paneles.py` | Paneles de admin y restaurante vía `#/demo-paneles`, y guards de `#/admin` y `#/dashboard` |
| `tests/test_monkey.py` | Monkey con seed fija: 40 acciones aleatorias, cero incidencias |
| `tests/test_flujo_paneles.py` | Paneles admin/restaurante (demo) y guards de sesión |
| `tests/test_regresion_unitaria.py` | `npm test` de frontend y backend (solo con `MIRA_UNITARIAS=1`) |
| `monkey/monkey_web.py` | Monkey ejecutable aparte, con `--acciones`, `--seed`, `--visible` |
| `bzt/01-flujo.yml` | Taurus: flujos E2E (sin monkey) |
| `bzt/02-monkey.yml` | Taurus: monkey de 80 acciones |
| `bzt/03-regresion.yml` | Taurus: unitarias + E2E + monkey |
| `docs/bitacora.md` | Registro cronológico: qué se hizo, resultados, hallazgos y decisiones |
| `docs/ESTADO.md` | Handoff: cómo retomar, qué está verde y qué queda pendiente |
| `artifacts/` | Screenshots, logs de consola y reportes de Taurus (ignorado por git) |

---

## Requisitos

- Node 20+ y dependencias instaladas (`npm install`).
- El venv de QA con Selenium y pytest:
  `C:\Users\<usuario>\tools\taurus\Scripts\python.exe`
  (creado para Taurus; `pip install pytest selenium`).
- Microsoft Edge (ya viene con Windows). No hace falta Chrome ni Java.

> **Ojo con el puerto 3001**: en este equipo lo ocupa un agente corporativo
> (`AMAgent`) que responde 404. La suite levanta el mock API en **3101**
> (`MIRA_API_URL`) para no hablar con el servicio equivocado.

---

## Cómo ejecutarlo

### Con Taurus (recomendado: reporte consolidado)

```powershell
bzt qa/bzt/01-flujo.yml       # flujos E2E
bzt qa/bzt/02-monkey.yml      # monkey 80 acciones
bzt qa/bzt/03-regresion.yml   # regresión completa (unitarias + E2E + monkey)
```

Cada run deja su carpeta en `qa/artifacts/bzt/<fecha>/`. **Importante:** el
runner de pytest de Taurus ignora el código de salida de pytest y siempre
devuelve 0, así que los perfiles llevan un módulo `passfail`
(`fail>0, continue as failed`): si algo falla, el comando termina con **código
3** (0 = todo verde). Eso es lo que hace la suite usable en CI.

También hay atajos npm:

```powershell
npm run qa:flujo
npm run qa:monkey
npm run qa:regresion
```

### Con pytest directo (desarrollo, más rápido de iterar)

```powershell
python -m pytest qa -v                          # todo
python -m pytest qa/tests/test_flujo_home.py    # un fichero
python -m pytest qa -k "not monkey"             # sin monkey
python -m pytest qa --unitarias                 # incluye npm test de los dos repos
python -m pytest qa --monkey-acciones 200 --monkey-seed 7
```

> `--unitarias`, `--monkey-acciones` y `--monkey-seed` son opciones de pytest.
> Las variables `MIRA_*` valen para ejecuciones directas de pytest; Taurus no
> propaga `env` a este executor, así que sus perfiles usan `additional-args`.

Monkey exploratorio, a mano:

```powershell
python qa/monkey/monkey_web.py --acciones 200 --seed 7 --visible
python qa/monkey/monkey_web.py --acciones 100 --json incidencias.json
```

### Variables de entorno

| Variable | Defecto | Para qué |
|---|---|---|
| `MIRA_BASE_URL` | `http://localhost:5173` | Probar otro entorno (preview, staging) |
| `MIRA_API_URL` | `http://localhost:3101` | Mock API que arranca la suite |
| `MIRA_HEADLESS` | `1` | `0` para ver el navegador |
| `MIRA_ARTIFACTS` | `qa/artifacts` | Dónde dejar capturas y logs |
| `MIRA_UNITARIAS` | `0` | Equivale a `--unitarias` (solo ejecuciones directas) |
| `MIRA_MONKEY_ACCIONES` | `40` | Acciones del monkey dentro de pytest |
| `MIRA_MONKEY_SEED` | `20261020` | Semilla: misma semilla = mismo recorrido |

---

## Los tres conceptos, aplicados

**Monkey automático** — `monkey_web.py` pulsa enlaces/botones/tarjetas, escribe
basura (`<script>`, emojis, 80 caracteres), hace scroll, cambia de ruta, vuelve
atrás y recarga. Tras cada acción comprueba: `#root` vacío, errores JS no
capturados, `unhandledrejection`, errores de consola y alertas. Cada paso queda
en `artifacts/monkey.log` con URL y selector, y la seed permite reproducirlo.
Nunca pulsa acciones destructivas (salir, borrar, pagar...).

**Selenium y flujo** — `tests/test_flujo_*.py` son recorridos con aserciones:
catálogo, buscador con Enter, ficha modal, favoritos y las 10 rutas públicas.
Son deterministas y sirven como puerta de calidad.

**Regresión** — `03-regresion.yml` encadena en un solo run: `npm test` del
frontend, `npm test` del backend (210 tests) y toda la capa E2E. Un único
código de salida y un único reporte: si algo se rompe, se ve qué capa fue.

---

## Estado actual (2026-10-21)

| Capa | Resultado |
|---|---|
| E2E Selenium (27 tests) | **verde** |
| Monkey 40 y 80 acciones (seed fija) | **verde**, sin incidencias |
| Backend `npm test` | **210/210 verde** |
| Frontend `npm test` | **38 fallos / 309** — preexistente, no lo causa esta suite |

Los 38 fallos del frontend son de `verifyEmail`/reset y de los tests de
`mobile/src` (el arnés hace `vm.runInContext` tras quitar los `import`, y esos
ficheros ya no encajan). Node aquí es **v24.21**; el proyecto declara `>=18`.
Por eso `qa:regresion` sale en rojo: es información correcta, no un fallo del
arnés. Si se quiere una puerta verde solo con E2E, usa `qa:flujo`.

### Huecos del mock que hubo que tapar

El monkey destapó dos cosas que no eran bugs de la app sino del mock:

1. `POST /v1/ai/agent` no existía → el chat del agente fallaba al pulsar una
   sugerencia. Se añadió una respuesta fija.
2. El preflight CORS no permitía `Idempotency-Key` → el navegador bloqueaba la
   petición del agente. Se añadió la cabecera (el API real la acepta).
3. `GET /v1/restaurants/mapa` devolvía 404 y `q` se ignoraba. Ambos añadidos.

---

## Qué NO cubre todavía (y cómo ampliarlo)

- **Paneles con datos reales**: `#/demo-paneles` recorre los paneles de admin y
  restaurante con datos simulados (`test_flujo_paneles.py`), y los guards de
  `#/admin` y `#/dashboard` están cubiertos. Falta la sesión real: acciones de
  admin, reservas del restaurante y facturación con datos de verdad.
- **Login/registro reales**: la validación de formularios y el guard de reserva
  ya están cubiertos (`test_flujo_auth.py`), pero el camino feliz no: la app usa
  Firebase Auth y haría falta un usuario de prueba con credenciales o mockear
  Auth. Hoy `#/reservas` se prueba como ruta protegida, no el flujo autenticado.
- **Reserva completa, puntos, panel admin, empresa**: requieren sesión.
- **CI**: no hay workflow todavía; el plan está en `docs/ESTADO.md`.
- **Bug de contraseña (resuelto el 2026-10-21)**: la regla es 6 caracteres en
  login y restablecer; los mensajes es/en/ca ya lo dicen y un test lo fija.
  `registro` pide 8, que es lo que valida.
- **Visual regression** (comparación de imágenes): Selenium saca capturas, pero
  no hay diff contra una baseline. Se puede añadir con `pytest-playwright` o
  `percy`/`backstop`.
- **Carga**: para eso están los perfiles de Taurus con `apiritif`/`jmeter`
  (ver plan de carga), no Selenium.

Para añadir un flujo: crea `qa/tests/test_flujo_<area>.py`, usa las fixtures
`driver` y `servidores`, y apóyate en `helpers.py`. Sin `data-testid` en la app,
los selectores van por clase/rol; si un flujo se vuelve frágil, lo correcto es
añadir `data-testid` en el componente.
