# Estado y handoff de QA

> Última actualización: **2026-10-21**. Si retomas esto, lee primero este
> fichero; el detalle cronológico está en `bitacora.md`.

## TL;DR

- Rama: `test/qa-continuacion` (local, sale de `test/qa-selenium-taurus`).
- Suite E2E de navegador real: **21 tests, verde**.
- Monkey reproducible por seed: **verde**, 0 incidencias.
- Regresión: el backend está verde (210/210), pero el frontend arrastra
  **38 fallos preexistentes** ajenos a esta suite; por eso `qa:regresion` sale
  en rojo (exit 3) y es correcto.
- **CI escrito, sin validar**: `.github/workflows/qa.yml` (ver abajo).
- **No hay flujos autenticados reales**: falta un usuario de Firebase de prueba
  o un mock de Auth.

## Qué está hecho y verificado

| Pieza | Estado |
|---|---|
| Arranque automático de mock API + Vite | verde |
| 16 flujos públicos (landing, buscador, ficha, favoritos, rutas) | verde |
| 5 flujos de auth sin credenciales (validación, opciones, guard de reserva) | verde |
| Monkey 40/80 acciones con seed | verde, 0 incidencias |
| Perfiles Taurus con `passfail` (exit 3 si falla) | verde |
| `npm test` backend (210 tests) | verde |
| `npm test` frontend | 271/309 (38 fallos preexistentes) |

Comandos rápidos (desde la raíz del frontend):

```powershell
npm run qa:flujo       # 21 E2E, ~12 min (cada test abre navegador)
npm run qa:monkey      # 80 acciones
npm run qa:regresion   # unitarias + E2E; rojo por el frontend
```

Para iterar un solo fichero:

```powershell
& "$env:USERPROFILE\tools\taurus\Scripts\python.exe" -m pytest qa/tests/test_flujo_auth.py -v
```

## Requisitos y trampas del entorno

- Taurus/Selenium viven en un venv aparte:
  `C:\Users\<usuario>\tools\taurus\Scripts\python.exe`.
- Solo hay **Edge** (no Chrome, no Java). El driver lo resuelve Selenium Manager.
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
- `clear()` de Selenium no dispara `onChange` de React: borra con teclado.

## Qué queda (en orden sugerido)

### 1. CI en GitHub Actions

Escrito en `.github/workflows/qa.yml`; **falta verlo correr en Actions**:

- Job `e2e` en `windows-latest` (Edge preinstalado):
  `checkout` → `setup-node 20` → `npm ci` → `setup-python 3.12` →
  `pip install pytest selenium` → `python -m pytest qa -k "not monkey and not suite_"`.
- Subir `qa/artifacts/` como artifact siempre (`if: always()`).
- Job `unit-frontend` en `ubuntu-latest` con `continue-on-error: true` y un
  comentario que explique los 38 fallos preexistentes; quitarlo cuando estén
  arreglados.
- Job `monkey` solo `schedule`/`workflow_dispatch` (80 acciones, seed fija).
- Timeout 30 min; la suite E2E tarda ~3,5 min en local (21 tests).

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

### 3. Fallos unitarios del frontend (preexistentes)

38 de 309. Afectan a `verifyEmail`/reset y a `mobile/src`; el arnés hace
`vm.runInContext` tras quitar los `import` y esos ficheros ya no encajan con
Node **v24.21** (el proyecto declara `>=18`). No lo causa la suite E2E.
Decidir: actualizar el arnés, fijar Node 20 en CI o mover esos tests a Vitest.

### 4. Bug de contraseña — **resuelto (2026-10-21)**

Regla decidida: **mínimo 6** (lo que ya aplicaban `Login.jsx` y
`Restablecer.jsx`, y lo que admite Firebase por defecto). Se alinearon los
mensajes de `auth.contrasenaCorta` y `restablecer.errorCorto` en es/en/ca, y
`test_login_valida_contrasena_corta` ahora exige que el mensaje diga "6", así
que la regla no puede desviarse sin romper el test. `registro` sigue en 8
(mensaje y validación ya coincidían).

### 5. Opcionales

- Regresión visual con baseline de capturas (hoy solo se guardan al fallar).
- Acelerar el monkey (80 acciones ≈ 4 min).
- Carga de backend con Taurus (`apiritif`); `jmeter` requiere instalar un JDK.

## Mapa de ficheros

| Fichero | Para qué |
|---|---|
| `qa/conftest.py` | Fixtures `driver`/`servidores`, opciones CLI, capturas al fallar |
| `qa/servers.py` | Ciclo de vida de mock API + Vite (también portable a Linux) |
| `qa/helpers.py` | `abrir`, `ir_hash`, `click_js`, `texto`, errores de consola |
| `qa/tests/test_flujo_*.py` | Flujos con aserciones |
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

`qa:regresion` seguirá rojo mientras el frontend tenga los 38 fallos: mira el
detalle, no el código de salida a secas.
