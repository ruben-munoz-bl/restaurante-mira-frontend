# Hilo PC 3 ↔ PC 4

Git como mensajería: cada mensaje es una entrada nueva abajo del todo, commit y push. Se responde citando el mensaje («re: #id»). Formato:

```
### #N · YYYY-MM-DD · de (PC X) → para (PC Y | todos)
- Mensaje:
- Acción / respuesta:
```

---

### #1 · 2026-10-15 · Ruben (PC 3) → todos
- Mensaje: Arrancamos el reparto del panel del restaurante (ofertas por geolocalización). Yo me quedo con **G04** (editor de ofertas, fase 1, rama `feat/G04-editor-ofertas` desde `origin/feat/G01-contrato-ofertas`). Marco (PC 4) se queda con **G07** (estadísticas) y **G10** (escáner QR), empezando por la preparación de G10 (jsQR + fallback manual) y G07 contra mock, sin tocar `Dashboard.jsx` hasta que se mergee G04. Instrucciones en `docs/coordenacion/PC4-INSTRUCCIONES.md`.
- Acción: Marco confirma recepción, elige el orden (G10 o G07 primero) y avisa en este hilo de su rama y de cualquier contrato asumido.

### #2 · 2026-10-15 · Ruben (PC 3) → todos
- Mensaje: **G04 listo para revisión** en `feat/G04-editor-ofertas` (commit 0204bca): `ofertasModel.js` + 8 tests, `ofertasApi.js`, `OfertasPanel.jsx` (lista, crear/editar por niveles con aviso de mejora, vigencia, borrar), integrado en `Dashboard.jsx` (botón «Ofertas» en la topbar), i18n es/ca/en. `npm test` 199/203 (los 4 fallos son preexistentes en `esperaQuitar`/`miraNuevoChat` con Node 24) y `npm run build` en verde. Nota: el mock de G01 ya incluye el endpoint de la fase 2 (`/v1/ofertas/cerca`) y PC 1 ha publicado el contrato de la fase 2 en la bóveda.
- Acción: quien revise G04 (PC 1 o PC 4), revisad y anotad en la tarea de la bóveda. Marco: podéis empezar G10/G07; si necesitáis que G04 mergee antes para integrar en `Dashboard.jsx`, avisad y lo priorizo en la revisión.

### #3 · 2026-10-15 · Ruben (PC 3) → todos
- Mensaje: **Cambio de reparto decidido**: Marco (PC 4) se queda con **toda la parte web** del proyecto de ofertas (revisión y merge de G04, G07 estadísticas, G10 escáner, avisos web de G06) y Ruben (PC 3) pasa a la **app móvil** (`mobile/`, Expo): **G06 móvil** (avisos por distancia con notificaciones locales) y **G09 móvil** (llegada a 20 m con QR), además de la **prueba en móvil de G03** (el código ya lo tienen Izan/Codex y está unido en `feat/mira-app`). Base de ramas de PC 3: `origin/feat/mira-app` (ojo: Alex/PC 2 sigue ahí con las notificaciones, coordinarse, nada de pisarse). La parte web del cliente (consentimiento/avisos en landing) queda con PC 2 salvo que acordemos otra cosa. He actualizado `PC4-INSTRUCCIONES.md` (reparto, ramas y archivos).
- Acción: Marco confirma y pasa a revisar G04 (commit `5d629e8`); Alex, avisa en la bóveda si preferís otra fecha para arrancar en `feat/mira-app`.

### #4 · 2026-10-15 · Ruben (PC 3) → todos
- Mensaje: **G04 cerrado** (commit `5d629e8`): aplicados los puntos de la revisión de PC 1 — **P2** (el error general de guardar ya se pinta también en el formulario, encima de Guardar/Cancelar) y **P3** (`estadoOferta` usa la fecha de Madrid con `hoyMadrid()`, igual que el backend, con test). `npm test` 200/204 (los mismos 4 fallos preexistentes de Node 24) y build en verde. **Prueba contra la API real**: crear → 201, recarga → persiste, segunda activa → 409, editar → persiste; oferta dejada inactiva («SMOKE TEST G04 (borrar)») para verla/borrarla desde el panel.
- Acción: a la bóveda lo he puesto a **hecho**; merge de fase pendiente por revisión. Dato para quien le interese: `GET /v1/dashboard/my-restaurants` devuelve un id de restaurante huérfano (`V2Zjzmay4kZRzuuSG56t`, «Restaurante test») que da 404 en ownership — posible `restaurantId` viejo en el perfil.
