# Estado y handoff de QA

> Última actualización: **2026-10-22**. Si retomas esto, lee primero este
> fichero; el detalle cronológico está en `bitacora.md`.

## TL;DR

- Rama: `test/qa-selenium-taurus` (remota, pusheada).
- Suite E2E de navegador real: **27 tests, verde** (incluye los paneles de
  admin/restaurante vía `#/demo-paneles` y los dos guards de sesión).
- Monkey reproducible por seed: **verde**, 0 incidencias. Ahora con varias
  semillas, modo móvil, formularios y ráfagas de clics (ver bitácora 2026-10-20 b).
- Regresión: frontend **320/320** y backend verde; `qa:regresion` ya no tiene
  fallos preexistentes.
- **CI en GitHub Actions, en verde** (`.github/workflows/qa.yml`) y el job
  `unit-frontend` ya bloquea si falla.
- **No hay flujos autenticados reales**: falta un usuario de Firebase de prueba
  o un mock de Auth.

## Qué está hecho y verificado

| Pieza | Estado |
|---|---|
| Arranque automático de mock API + Vite | verde |
| 16 flujos públicos (landing, buscador, ficha, favoritos, rutas) | verde |
| 5 flujos de auth sin credenciales (validación, opciones, guard de reserva) | verde |
| Paneles admin/restaurante (`#/demo-paneles`) y guards de sesión | verde |
| CI en GitHub Actions (3 jobs) | verde |
| Monkey 40/80 acciones con seed | verde, 0 incidencias |
| Monkey multisemilla (1,2,3 escritorio · 4,5 móvil), Chrome en Linux | verde, 0 incidencias |
| Perfiles Taurus con `passfail` (exit 3 si falla) | verde |
| `npm test` backend | verde |
| `npm test` frontend | 320/320 verde |

Comandos rápidos (desde la raíz del frontend):

```powershell
npm run qa:flujo       # 27 E2E, ~4-6 min (cada test abre navegador)
npm run qa:monkey      # 80 acciones
npm run qa:regresion   # unitarias + E2E
```

Para iterar un solo fichero:

```powershell
& "$env:USERPROFILE\tools\taurus\Scripts\python.exe" -m pytest qa/tests/test_flujo_auth.py -v
```

## Requisitos y trampas del entorno

- Taurus/Selenium viven en un venv aparte:
  `C:\Users\<usuario>\tools\taurus\Scripts\python.exe`.
- En el equipo de Rubén solo hay **Edge**. En Linux/CI se usa Chrome con
  `MIRA_BROWSER=chrome` (ver `navegador.py`). El driver lo resuelve Selenium Manager.
- El mock escucha en **3101**, no en 3001: ese puerto lo ocupa `AMAgent` y
  Windows permite dos listeners, así que `localhost:3001` era una ruleta.
- En PowerShell `npm` puede fallar por ExecutionPolicy: usa `npm.cmd`.
- Taurus **no propaga** `env` al executor `pytest`: sus perfiles pasan las
  opciones por `additional-args`.
- El runner `pytest` de Taurus **siempre sale con 0**: el veredicto lo da el
  módulo `passfail` (`fail>0, continue as failed` → exit 3).
- La app **no tiene `data-testid`**: los selectores van por clase/rol. Si un
  flujo se vuelve frágil, lo correcto es añadir `data-testid` al componente.
- `element.text` sale vacío en tarjetas/modales con animación: usa
  `helpers.texto()` (innerText por JS).
- Edge headless arranca con `prefers-reduced-motion: reduce` (en CI y con
  `QA_REDUCED_MOTION=1` en local): la app monta entonces las variantes sin
  animación. Un test que busque textos del vuelo de «Descubrir» debe valer para
  las dos.
- `clear()` de Selenium no dispara `onChange` de React: borra con teclado.

## Qué queda (en orden sugerido)

### 1. CI en GitHub Actions — **hecho (2026-10-21)**

`.github/workflows/qa.yml`, tres jobs:

- `e2e` en `windows-latest` (Edge preinstalado): `npm ci` → `setup-python 3.12`
  → `pip install pytest selenium` → `python -m pytest qa -k "not monkey and not
  suite_"`. Sube `qa/artifacts/` siempre.
- `unit-frontend` en `ubuntu-latest`, Node 20. Llama a `node --test
  test/*.test.js` **sin comillas**: `npm test` lo cita y Node 20 sobre Linux no
  expande el glob. Ya bloquea el PR si falla.
- `monkey` solo `schedule` (lunes 04:00 UTC) o `workflow_dispatch`; en push sale
  como *skipped* y es lo correcto. A mano: Actions → *QA* → *Run workflow*.

### 2. Flujos autenticados (login + reserva completa)

Bloqueo: no hay credenciales de Firebase. Dos caminos:

1. **Usuario de pruebas** en Firebase (recomendado): crear cuenta dedicada,
   guardar `MIRA_TEST_EMAIL` / `MIRA_TEST_PASSWORD` como secretos y añadir
   `qa/tests/test_flujo_reserva_autenticada.py` (login, reservar, ver reserva,
   cancelar).
2. **Mock de Auth** en el frontend tras un flag de desarrollo: más invasivo,
   pero no depende de red ni de cuentas.

Ya cubierto sin credenciales en `test_flujo_auth.py`: correo inválido,
contraseña corta, opciones Google/recuperar/registro, validación nativa de
recuperar y redirección a login al reservar como invitado.

### 3. Fallos unitarios del frontend — **resuelto (2026-10-22)**

El arnés que quita los `import` y ejecuta con `vm.runInContext` fallaba con los
finales de línea según la plataforma: afectaba a `verifyEmail`/reset y a
`mobile/src`. Se corrigió en `08ca563` (regex `\r?\n`), `npm test` da 320/320
en Node 20 y 24, y el job de CI ya no lleva `continue-on-error`.

### 4. Bug de contraseña — **resuelto (2026-10-21)**

Regla decidida: **mínimo 6** (lo que ya validaban `Login.jsx` y
`Restablecer.jsx`). Se alinearon `auth.contrasenaCorta` y `restablecer.errorCorto`
en es/en/ca, y `test_login_valida_contrasena_corta` exige que el mensaje diga
«6», así que la regla no puede desviarse sin romper el test. `registro` sigue en
8 (mensaje y validación ya coincidían).

### 5. Opcionales

- Regresión visual con baseline de capturas (hoy solo se guardan al fallar).
- Acelerar el monkey (80 acciones ≈ 2 min por semilla en Chromium/Linux).
- Carga de backend con Taurus (`apiritif`); `jmeter` requiere instalar un JDK.

## Mapa de ficheros

| Fichero | Para qué |
|---|---|
| `qa/conftest.py` | Fixtures `driver`/`servidores`, opciones CLI, capturas al fallar |
| `qa/servers.py` | Ciclo de vida de mock API + Vite (también portable a Linux) |
| `qa/helpers.py` | `abrir`, `ir_hash`, `click_js`, `texto`, errores de consola |
| `qa/tests/test_flujo_*.py` | Flujos con aserciones |
| `qa/tests/test_flujo_paneles.py` | Paneles admin/restaurante (demo) y guards de sesión |
| `qa/tests/test_monkey.py` | Monkey dentro de pytest |
| `qa/tests/test_regresion_unitaria.py` | Envoltorio de `npm test` (solo con `--unitarias`) |
| `qa/monkey/monkey_web.py` | Monkey CLI (`--acciones`, `--seed`, `--visible`, `--json`) |
| `qa/bzt/*.yml` | Perfiles Taurus |
| `scripts/mock-api.mjs` | Mock API (se taparon huecos: `/mapa`, `q`, CORS, agente) |

## Antes de dar una tanda por buena

```powershell
npm run qa:flujo
npm run qa:monkey
npm run build
```

`qa:regresion` ya debe salir en verde; si falla, mira el detalle y no solo el
código de salida.
