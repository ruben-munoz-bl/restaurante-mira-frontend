# PC 4 (Marco) — Instrucciones de trabajo

> Eres **Marco (PC 4)**, agente **Opencode**. Trabajas en paralelo con **Ruben (PC 3)**, también Opencode.
> Proyecto: **ofertas por geolocalización**, parte del panel del restaurante de MIRA.
> El plan y el objetivo son los mismos que los de PC 3; solo cambia el reparto.

## 1. Antes de empezar

1. `git pull` en el repo del frontend.
2. Leer `AGENTS.md` (normas del repo; es la fuente única).
3. Leer este fichero y lo último de `docs/coordenacion/HILO-PC3-PC4.md`.
4. No cojas tareas de PC 3 ni toques su rama o su worktree.

## 2. Objetivo del proyecto (resumen)

- El usuario comparte su ubicación con consentimiento (RGPD: se puede desactivar, no se guarda el recorrido).
- Ofertas que mejoran al acercarse: **1 km → 500 m → 100 m**; a **20 m**, «¡Ya has llegado!» con un **QR único por visita** (firmado y con caducidad) que el restaurante escanea desde su panel.
- Modelo fijo de oferta: 4 niveles `[1000, 500, 100, 20]`, cada uno `{ distancia, texto (1-140), descuentoPct (0-100) }`, descuento monótono creciente, vigencia `desde`/`hasta`, **una sola oferta activa por restaurante**.
- La web no sigue ubicación en segundo plano; la prueba real de llegada es el QR.
- Las 3 fases del proyecto terminan con unión de ramas, revisión cruzada y prueba conjunta. PC 1 (Izan) publica el contrato de la API al empezar cada fase; se programa contra mock hasta entonces.

## 3. Reparto PC 3 / PC 4

| Fase | Tarea | Quién |
|---|---|---|
| 1 · Base | **G04** Editor de ofertas (hecho, rama `feat/G04-editor-ofertas`) · **revisión y merge: PC 4 (Marco)** | **PC 3 (Ruben)** |
| 1 · Base | **G03** Consentimiento y permiso de ubicación en la **app móvil** (`mobile/`) | **PC 3 (Ruben)** |
| 2 · Embudo | **G06** Avisos por distancia · parte **móvil** (app Expo) | **PC 3 (Ruben)** |
| 2 · Embudo | **G07** Estadísticas de ofertas (web, panel) | **PC 4 (Marco)** |
| 3 · Llegada | **G09** Pantalla de llegada con QR · parte **móvil** (app Expo) | **PC 3 (Ruben)** |
| 3 · Llegada | **G10** Escáner de QR y lista de llegadas (web, panel) | **PC 4 (Marco)** |

**Reparto actual (2026-10-15, decisión del usuario): Marco se queda con todo lo web del proyecto de ofertas y Ruben pasa a la app móvil** (`mobile/`, Expo, rama base `feat/mira-app` de PC 2/Alex, que sigue con las notificaciones T01–T10; coordinarse con él, no pisar su trabajo). La parte web del cliente (consentimiento/avisos en la landing) la retoma PC 2 o PC 4 si hace falta: avisar en el hilo.

- **G10 — escáner (PC 4)**: componente `OfertasEscanner.jsx` con **jsQR + fallback manual** (campo para pegar el código si no hay cámara). `getUserMedia` + canvas, estados de resultado (válido / caducado / ya usado / de otro restaurante / inválido / error de red). La llamada real será `POST .../validar` cuando PC 1 publique el contrato de la fase 3; mientras tanto, contra un mock local documentado en el hilo.
- **G07 — estadísticas (PC 4)**: modelo puro de transformación API → series de Recharts y componente `OfertasStats.jsx`, con datos simulados por nivel y por fecha.
- **G03/G06/G09 — app móvil (PC 3)**: consentimiento RGPD de ubicación en primer plano, avisos al acercarse (1 km, 500 m, 100 m) y pantalla de llegada a 20 m con el QR (llamada a `POST /visitas` cuando exista el contrato de la fase 3). En el app, Expo Router (`mobile/src/app/`), Zustand, i18n propia de `mobile/src/i18n/`.

Cuando PC 1 publique cada contrato (está en la bóveda del equipo: `Proyecto/Contratos API.md`, repo `Alex-Oses/mira-boveda-equipo`, legible en el navegador de GitHub), se ajusta lo preparado a la forma real.

**G04 está listo para revisión**: la revisa y mergea PC 4 (Marco) siguiendo el flujo del proyecto (revisión cruzada); anotad la revisión en la tarea de la bóveda y en el hilo.

## 4. Comunicación por git (ficheros .md)

Ya usáis git, así que la mensajería no requiere instalar nada:

- `docs/coordenacion/HILO-PC3-PC4.md` es el hilo. Cada mensaje: añadir entrada abajo del todo con el formato del fichero y `git add` + `commit` + `push`. Se responde citando el mensaje.
- Avisad en el hilo antes de cambiar un archivo compartido (`Dashboard.jsx`, `package.json`, i18n) o si esperáis un contrato de PC 1.
- Si necesitáis algo interactivo sin instalar nada: GitHub en el navegador → Issues o comentarios de commit/PR, y `github.dev` para editar `.md` directamente en el navegador.
- Cuando programeis contra un contrato todavía no publicado, PC 4 documenta lo que asume en `docs/coordenacion/CONTRATOS-ASUMIDOS.md` (firmas de endpoint y formas de respuesta) y lo avisa en el hilo.

## 5. Ramas y worktrees

- Una rama por tarea, con worktree propio (no se pisa el checkout de otro agente):
  - PC 3 (app móvil): partir de `origin/feat/mira-app` (la app más reciente, con las notificaciones de Alex/PC 2); rama por tarea, p. ej. `feat/G03-app-ubicacion`.
  - PC 4 (web): revisa/mergea `feat/G04-editor-ofertas`; para lo suyo, `feat/G10-escaner-qr`, `feat/G07-estadisticas-ofertas`.
- Nada de pushes a `main`. Se avanza sobre la propia rama y el merge lo hace una revisión cruzada al final de la fase.

## 6. Normas (resumen; AGENTS.md manda)

- Commits en español con Conventional Commits; scope `ofertas` para este proyecto: `feat(ofertas): escáner de QR con fallback manual (G10)`.
- Cambios mínimos y centrados en la tarea; sin refactors no pedidos; imitar el estilo del código que rodea al cambio.
- Lógica pura en `src/models/` (o `services/` si es utilidad) con tests en `test/` con `node --test`.
- i18n: claves nuevas en `es.js`, `ca.js` y `en.js` (faltan las 3 o no se usan).
- Estilos con las clases `op-*` y tokens de `dashboard.css` (claro/oscuro automáticos).
- `mobile/` no lo toca PC 4 (es del reparto de PC 3, con rama de base `feat/mira-app`); en web, no toques las tareas de PC 3 (G03/G06/G09 si alguna cae en web).
- Orden de despliegue: backend (Render) primero, frontend (Vercel) después.

## 7. Archivos por tarea (no solaparse)

| Tarea | Crea / cambia |
|---|---|
| G04 (PC 3, **hecha**; revisa/mergea PC 4) | `src/models/ofertasModel.js`, `src/services/ofertasApi.js`, `src/components/dashboard/OfertasPanel.jsx`, sección en `Dashboard.jsx`, claves `ofertas.*` en i18n, `test/ofertasModel.test.js` |
| G07 (PC 4) | `src/models/ofertasStatsModel.js`, `src/components/dashboard/OfertasStats.jsx`, claves `ofertasStats.*`, tests |
| G10 (PC 4) | `src/components/dashboard/OfertasEscanner.jsx`, lógica de lectura/estados (pura, testeable), dependencia `jsQR` en `package.json`, claves `escaner.*`, tests |
| G03/G06/G09 móvil (PC 3, base `feat/mira-app`) | en `mobile/`: permisos y consentimiento de ubicación (`expo-location`), avisos por distancia, pantalla de llegada con QR; `mobile/src/app/`, `mobile/src/pages/`, `mobile/src/services/`, `mobile/src/i18n/`, tests del app |

Los archivos compartidos en web (`Dashboard.jsx`, `package.json`, i18n) se tocan avisando antes en el hilo; si hay conflicto, se resuelve en la revisión de fase. En `mobile/` pasa lo mismo con el trabajo de PC 2 (Alex, notificaciones T01–T10).

## 8. Definición de hecho

1. `npm test` y `npm run build` en verde en tu rama.
2. Entrada en `HILO-PC3-PC4.md`: qué hiciste, rama, qué falta o bloquea.
3. Tarea en revisión: PC 3 y PC 4 se revisan mutuamente antes del merge de fase.
