# Bugs

Estados: `pendiente` · `en curso (claude)` · `en curso (codex)` · `en revisión` · `hecho`

Reparto por zonas para no tocar los mismos archivos:
- **Claude**: cards, detalle, carta y mapa (001, 002, 003, 005)
- **Codex**: cuenta, «Mis reservas» y admin (004, 006, 007, 008)

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| [BUG-001](BUG-001.md) | Abrir restaurante al clicar la card | buscador | claude | hecho | main |
| [BUG-002](BUG-002.md) | Tras reservar, cerrar desplegable e ir a «Mis reservas» | reservas | claude | hecho | main |
| [BUG-003](BUG-003.md) | Scroll de la carta/card se propaga a la landing | buscador | claude | hecho | main |
| [BUG-004](BUG-004.md) | Preferencias/cookies con esquinas cuadradas | cuenta | codex | hecho | main |
| [BUG-005](BUG-005.md) | Filtro del mapa: solo las 4 comarcas | mapa | claude | hecho | main |
| [BUG-006](BUG-006.md) | «Mis reservas» debe abrirse siempre arriba | reservas | codex | hecho | main |
| [BUG-007](BUG-007.md) | Diseño tipo agenda en «Agenda del día» | reservas | codex | hecho | main |
| [BUG-008](BUG-008.md) | Resolver incidencia con popup de confirmación | admin | codex | hecho | main |

## Tanda 2

Ramas: **Claude** → `fix/claude-tanda2` · **Codex** → `fix/codex-tanda2` (una rama por agente, en su propio worktree).

Orden recomendado: los bugs transversales (018 tema, 019 idioma) se hacen **al final**, porque tocan muchos archivos.

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| [BUG-009](BUG-009.md) | Icono del ojo de la contraseña roto en el registro | registro | claude | en revisión | fix/claude-tanda2 |
| [BUG-010](BUG-010.md) | Multiplicador: «x» minúscula y número centrado | cuenta | claude | en revisión | fix/claude-tanda2 |
| [BUG-011](BUG-011.md) | Botón «Marcar todo como leído» en mensajería | mensajes | codex | en revisión | fix/claude-tanda2 |
| [BUG-012](BUG-012.md) | Botón de MIRA JAM más destacado | reservas | codex | en revisión | fix/claude-tanda2 |
| [BUG-013](BUG-013.md) | Bugs de la racha diaria | puntos | claude | en revisión | fix/claude-tanda2 (front + back) |
| [BUG-014](BUG-014.md) | Revisión de seguridad del backend | backend | codex | en revisión | fix/claude-tanda2 |
| [BUG-015](BUG-015.md) | «Invitar amigos» no funciona | puntos | codex | en revisión | fix/claude-tanda2 |
| [BUG-016](BUG-016.md) | Logo MIRA del header no vuelve a la landing | header | claude | en revisión | fix/claude-tanda2 |
| [BUG-017](BUG-017.md) | Chatbot MIRASI: idioma, autoscroll y nº de recomendaciones | mira | claude | en revisión | fix/claude-tanda2 (front + back) |
| [BUG-018](BUG-018.md) | Bugs visuales en modo oscuro y claro | tema | codex | en revisión | fix/claude-tanda2 |
| [BUG-019](BUG-019.md) | Toda la interfaz en un solo idioma | i18n | claude | en revisión (parcial) | fix/claude-tanda2 |
| [BUG-020](BUG-020.md) | Header: mostrar solo el nombre del usuario | header | claude | en revisión | fix/claude-tanda2 |
| [BUG-021](BUG-021.md) | Auditoría general de bugs de la web | general | codex | en revisión | fix/claude-tanda2 |

## Hallazgos de BUG-021

Reproducciones de la auditoría de Codex. Se corrigen en la **tanda 3**.

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| [BUG-101](BUG-101.md) | La ficha inventa plazas libres cuando falla la consulta de disponibilidad | reservas | claude | en revisión | fix/claude-tanda3 |
| [BUG-102](BUG-102.md) | Nuevo chat recibe la respuesta pendiente de la conversación anterior | mira | claude | en revisión | fix/claude-tanda3 |
| [BUG-103](BUG-103.md) | Quitar de la lista de espera oculta la reserva aunque falle el servidor | reservas | claude | en revisión | fix/claude-tanda3 |
| [BUG-104](BUG-104.md) | Los accesos de canje e historial de puntos de Mi cuenta están cruzados | cuenta/puntos | claude | en revisión | fix/claude-tanda3 |
| [BUG-105](BUG-105.md) | Exportar liquidación de Este mes incluye tickets de otros meses | dashboard/fiscal | codex | en revisión | fix/claude-tanda3 |
| [BUG-106](BUG-106.md) | La exportación de liquidación pierde tickets cuando hay más de 20 | dashboard/fiscal | codex | en revisión | fix/claude-tanda3 |
| [BUG-107](BUG-107.md) | Liquidación CSV marca los tickets de no-show como asistencia sí | dashboard/fiscal | codex | en revisión | fix/claude-tanda3 |
| [BUG-108](BUG-108.md) | Dashboard duplica las reservas y comensales de hoy en sus contadores | dashboard | codex | en revisión | fix/claude-tanda3 |
| [BUG-109](BUG-109.md) | Dashboard de restaurante desborda el ancho móvil de 390 px | dashboard/móvil | codex | en revisión | fix/claude-tanda3 |
| [BUG-110](BUG-110.md) | La búsqueda de cabecera Ops no actualiza Reservas Globales al pulsar Enter | admin/ops | codex | en revisión | fix/claude-tanda3 |

## Tanda 3

Base: rama `fix/claude-tanda2` (la tanda 2 aún no está en `main`). Ramas: **Claude** → `fix/claude-tanda3` · **Codex** → `fix/codex-tanda3` (worktrees `../codex-tanda3` y `../codex-tanda3-backend`).

Reparto por archivos: Codex se queda con el dashboard de restaurante, la exportación fiscal y el panel Ops (todos los de `Dashboard.jsx` van juntos) y la seguridad P2. Claude, con la ficha, las reservas, MIRASI, «Mi cuenta» y los puntos. **BUG-112 (idioma) va el último**, después de unir la rama de Codex, porque toca `Dashboard.jsx` y los paneles Ops.

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| BUG-101 a BUG-104 | (ver tabla de hallazgos) | usuario | claude | pendiente | |
| BUG-105 a BUG-110 | (ver tabla de hallazgos) | dashboard/ops | codex | pendiente | |
| [BUG-111](BUG-111.md) | POST /points/review da puntos sin una reseña real | puntos | claude | en revisión | fix/claude-tanda3 (front + back) |
| [BUG-112](BUG-112.md) | Resto de textos fijos sin traducir (continuación de BUG-019) | i18n | claude | en revisión | fix/claude-tanda3 |
| [BUG-113](BUG-113.md) | Seguridad P2 pendiente del backend | backend | codex | en revisión | fix/claude-tanda3 |


## Tanda 4

Base: `main`. Ramas: **Claude** → `fix/claude-tanda4` · **Codex** → `fix/codex-tanda4` (worktree `../codex-tanda4`; backend en `../restaurante-mira-backend`).

Reparto por archivos: Claude se queda con todo lo de `App.jsx` (card, JAM, filtros, racha, mapa). Codex, con invitaciones (Mi cuenta + backend) y con incidencias del admin (`Admin.jsx` + backend). Codex no toca `App.jsx`; si lo necesita, lo avisa.

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| [BUG-114](BUG-114.md) | La card del restaurante no se cierra al crear una JAM | card/jam | claude | hecho | fix/claude-tanda4 |
| [BUG-115](BUG-115.md) | Rediseño visual de la JAM (card, mini cards y fotos) | jam/ui | claude | hecho | fix/claude-tanda4 |
| [BUG-116](BUG-116.md) | Tipos de cocina repetidos en el filtro | buscador | claude | hecho | fix/claude-tanda4 |
| [BUG-117](BUG-117.md) | Filtro de zona: solo las 4 provincias de Cataluña | buscador | claude | hecho | fix/claude-tanda4 |
| [BUG-118](BUG-118.md) | Racha: modo oscuro, popup al entrar y scroll del fondo | racha | claude | hecho | fix/claude-tanda4 |
| [BUG-119](BUG-119.md) | Al volver a Mapa no empieza arriba | mapa | claude | hecho | fix/claude-tanda4 |
| [BUG-120](BUG-120.md) | Invitaciones: mensaje, lista tras F5 y envío real del correo | invitaciones | codex | hecho | fix/codex-tanda4 |
| [BUG-121](BUG-121.md) | Incidencias del admin: resolución y gráficos | admin/incidencias | codex | hecho | fix/codex-tanda4 |


## Tanda 4b — revisión visual (Claude)

Segunda pasada de hallazgos del usuario (colores y modo oscuro). Rama: `fix/claude-tanda4`.

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| [BUG-123](BUG-123.md) | Botón en modo oscuro no se oscurece al pasar el cursor | tema | claude | en revisión | fix/claude-tanda4 |
| [BUG-124](BUG-124.md) | La mascota de MiraClub se ve transparente en modo oscuro | tema/miraclub | claude | pendiente | |
| [BUG-125](BUG-125.md) | Texto de «reclamar MiraClub» ilegible en modo oscuro | tema/miraclub | claude | pendiente | |
| [BUG-126](BUG-126.md) | Avatar de MiraAI: cuadrado blanco en el círculo en modo oscuro | mira/tema | claude | en revisión | fix/claude-tanda4 |
| [BUG-127](BUG-127.md) | Desaparece la opción de ver cómo piensa MiraAI | mira | claude | pendiente | |
| [BUG-128](BUG-128.md) | Los iconos de admin tardan en cargar | admin | claude | pendiente | |
| [BUG-129](BUG-129.md) | Botones rojos de eliminar demasiado claros en modo oscuro | tema | claude | en revisión | fix/claude-tanda4 |
| [BUG-130](BUG-130.md) | Los modales se centran en la página y no en la pantalla | ui-global | claude | pendiente | |
| [BUG-131](BUG-131.md) | Ayuda visual de primera vez en Admin para el menú lateral | admin/ux | claude | pendiente | |
| [BUG-132](BUG-132.md) | El menú desplegable izquierdo de Admin baja de más | admin | claude | pendiente | |

## Seguimiento de la prueba real de invitaciones

| ID | Título | Zona | Asignado | Estado | Rama |
|----|--------|------|----------|--------|------|
| [BUG-122](BUG-122.md) | Brevo acepta el envío pero el error posterior no cambia el estado | invitaciones/backend | codex | hecho | fix/BUG-122-brevo-error |
