# Requirements — Mover el campo de estado al proyecto

Feature id: `project-status-field`. EARS notation, numbered `R1`, `R2`, ...

Contexto previo: `specs/project-status-tracking/` (listado + drawer,
`done`), `specs/project-crud/` (crear/editar/eliminar proyectos, `done`),
`specs/weekly-update-entry/` (crear avances, `done`), y
`specs/weekly-update-edit-delete/` (editar/borrar avances, `done`). Esta
spec cambia el modelo de datos que las cuatro comparten: **el estado
(`on_track`/`at_risk`/`delayed`) deja de ser un campo del avance semanal y
pasa a ser un campo del proyecto**, decisión explícita del usuario ("El
estado es propio del proyecto, el avance no debe tener estados"). Un avance
semanal, tras esta feature, solo tiene `weekOf` + `note`.

Ver la sección **"Requirements retirados/modificados de specs previas"** al
final de este documento para el mapeo explícito `R<n>` → qué cambia en cada
una de las cuatro specs anteriores. Esos cuatro documentos también fueron
anotados in situ (mismo criterio que ya se usó para marcar R8 de
`project-status-tracking` como retirado), con una nota que apunta de vuelta
a esta spec — no se reescribieron sus requirements completos, solo se marcó
lo afectado.

## Esquema de datos (Supabase)

- **R1**: WHEN se aplica la migración nueva de esta feature THEN el sistema
  SHALL agregar una columna `status` a `projects` con el mismo dominio de
  valores que hoy tiene `project_weekly_updates.status`
  (`check (status in ('on_track', 'at_risk', 'delayed'))`), y SHALL dejarla
  `not null` al finalizar la migración. *(nota 2026-07-29: el dominio de
  valores de la constraint aquí documentado fue reemplazado por
  `specs/project-status-values-rename/` — ver R1-R4 de esa spec.)*
- **R2**: WHEN la migración agrega la columna `status` a `projects` en un
  entorno donde `projects` ya tiene filas (como el Supabase de dev del
  usuario, que ya tiene al menos el proyecto "Probador Virtual") THEN el
  sistema SHALL secuenciar la migración en pasos que no fallen contra esos
  datos existentes: (1) agregar la columna nullable, (2) poblarla vía
  `update`, (3) recién entonces aplicar `not null` + el `check` — nunca un
  `add column ... not null` directo sin backfill previo.
- **R3**: WHEN se puebla `projects.status` durante el backfill (R2, paso 2)
  THEN el sistema SHALL derivar el valor, **para cada proyecto de forma
  independiente** (subquery correlacionada por `project_id`, no una
  constante ni un único proyecto asumido), del `status` de su avance
  semanal con `week_of` más reciente en `project_weekly_updates` — mismo
  criterio de "más reciente por fecha" que ya usaba `healthFromTimeline()`.
  Esto SHALL funcionar sin cambios sin importar cuántos proyectos existan
  al momento en que el humano aplique la migración.
- **R4**: IF un proyecto no tiene ningún avance semanal en el momento del
  backfill (R3) THEN el sistema SHALL asignarle `'on_track'` como valor por
  defecto — único caso donde el backfill no deriva de datos existentes,
  documentado explícitamente como una decisión de "no hay otro dato
  disponible", no como un valor de negocio implícito.
- **R5**: WHEN la migración de esta feature termina de poblar y validar
  `projects.status` (R1-R4) THEN el sistema SHALL eliminar la columna
  `status` de `project_weekly_updates` (`alter table ... drop column
  status`) — operación irreversible (se pierde el historial de estado por
  semana), decisión consciente y ya validada explícitamente por el usuario
  antes de escribir esta spec, no un ítem a re-confirmar en review.
- **R6**: WHEN se define la columna `status` nueva en `projects` THEN el
  sistema SHALL NO modificar ninguna policy de RLS existente — sigue sin
  policy para `anon`/`authenticated` en `projects` ni en
  `project_weekly_updates` (deny-by-default, solo `service_role`
  server-side), mismo criterio que todas las specs anteriores de
  `/proyectos`.

## Tipos y mapeo (`lib/types.ts`, `lib/projects.ts`)

- **R7**: WHEN se define el tipo `Project` THEN el sistema SHALL incluir un
  campo `status: HealthStatus` (no opcional, no `| null`) — coherente con
  la columna `not null` de R1.
- **R8**: WHEN se define el tipo `WeeklyUpdate` THEN el sistema SHALL
  eliminar el campo `status` — un avance semanal pasa a tener únicamente
  `id`, `weekOf`, `note`.
- **R9**: WHEN `rowToProject()` mapea una fila de `projects` THEN el
  sistema SHALL incluir `status: row.status` en el objeto `Project`
  devuelto.
- **R10**: WHEN `rowToUpdate()` mapea una fila de `project_weekly_updates`
  THEN el sistema SHALL NO leer ni incluir ningún campo `status` — la fila
  de origen tampoco lo tiene ya (R5).
- **R11**: WHEN se elimina la noción de "estado derivado del timeline" THEN
  el sistema SHALL eliminar la función `healthFromTimeline()` de
  `lib/projects.ts` junto con su test de Vitest existente
  (`lib/projects.test.ts`, bloque `describe("healthFromTimeline", ...)`) —
  la función pierde sentido: el estado ya no se deriva de `updates`, viene
  directo de `project.status`. Ver `design.md` para la alternativa
  descartada de repropósito en vez de borrado.
- **R12**: WHEN se define `ProjectFormValues` (usado por
  `createProject()`/`updateProject()`) THEN el sistema SHALL agregar un
  campo `status: HealthStatus`.
- **R13**: WHEN se define `WeeklyUpdateFormValues` (usado por
  `createWeeklyUpdate()`/`updateWeeklyUpdate()`) THEN el sistema SHALL
  eliminar el campo `status` — queda `{ weekOf: string; note: string }`.
- **R14**: WHEN se centraliza la lista de valores válidos de estado (hoy
  duplicada como `VALID_STATUSES` en `app/api/proyectos/[id]/avances/route.ts`
  y `.../[updateId]/route.ts`) THEN el sistema SHALL exportar una única
  constante (p. ej. `VALID_STATUSES`) desde `lib/projects.ts` y SHALL
  reutilizarla desde las rutas de `/api/proyectos` (que ahora la necesitan
  para validar `status` de un proyecto) en vez de mantener una tercera
  copia — no se acepta una nueva duplicación de este array. *(nota
  2026-07-29: el contenido de `VALID_STATUSES` aquí documentado fue
  reemplazado por `specs/project-status-values-rename/` R7 — sigue
  centralizada en `lib/projects.ts`, sin duplicación nueva.)*

## Formulario de proyecto (`ProjectForm.tsx`)

- **R15**: WHEN un usuario tiene el formulario de crear/editar proyecto
  abierto THEN el sistema SHALL mostrar un campo "Estado" (`<select>` con
  las tres opciones de `HEALTH_STATUS_LABELS`, mismo vocabulario que ya usa
  el badge) como un quinto campo obligatorio, junto a nombre/país/unidad de
  negocio/resumen — mismo criterio de habilitación de submit que los otros
  cuatro (campo vacío ⇒ botón deshabilitado).
- **R16**: WHEN el usuario confirma la creación o edición de un proyecto
  con los cinco campos completos (R15) THEN el sistema SHALL enviar
  `status` junto con `name`/`country`/`businessUnit`/`summary` en el
  payload de `POST /api/proyectos` o `PATCH /api/proyectos/<id>`.
- **R17**: WHEN el formulario de edición se abre para un proyecto existente
  THEN el sistema SHALL prellenar el campo "Estado" con el `project.status`
  actual — mismo patrón de prellenado que los otros cuatro campos.
- **R18**: WHEN se muestra la sección opcional "Primer avance semanal" del
  formulario de creación de proyecto THEN el sistema SHALL mostrar
  únicamente los campos fecha y nota — el selector de estado se retira de
  esta sección (el estado ya se capturó a nivel de proyecto en R15, un
  avance no vuelve a pedirlo).
- **R19**: WHEN se evalúa si la sección opcional de "primer avance" está
  parcialmente completa (para deshabilitar el submit, mismo criterio que
  antes pero con un campo menos) THEN el sistema SHALL contar únicamente
  fecha y nota (dos campos, no tres) — parcial significa "uno lleno y el
  otro vacío".

## Campos de avance semanal (`WeeklyUpdateFields.tsx`)

- **R20**: WHEN se renderiza `WeeklyUpdateFields` (usado por
  `AddUpdateForm.tsx`, la sección opcional de `ProjectForm.tsx`, y la
  edición inline de fila en `ProjectTimeline.tsx`) THEN el sistema SHALL
  mostrar únicamente los campos fecha y nota — el campo "Estado" (`<select>`)
  se elimina de este componente en los tres usos simultáneamente (es un
  único componente compartido).
- **R21**: WHEN se evalúa si el formulario de "Agregar avance"
  (`AddUpdateForm.tsx`) está listo para enviar THEN el sistema SHALL
  requerir únicamente fecha y nota no vacías (dos campos, no tres) para
  habilitar el botón de confirmar.
- **R22**: WHEN se evalúa si el formulario de edición inline de una fila
  del timeline (`ProjectTimeline.tsx`) está listo para guardar THEN el
  sistema SHALL requerir únicamente fecha y nota no vacías (dos campos, no
  tres) para habilitar el botón "Guardar".
- **R23**: WHEN el usuario confirma agregar o editar un avance (R21/R22)
  THEN el sistema SHALL enviar únicamente `weekOf` (recalculado como el
  lunes de la fecha elegida, sin cambios respecto al comportamiento
  anterior) y `note` en el payload — sin `status`.

## Badge de estado (`HealthBadge.tsx`, `ProjectCard.tsx`, `ProjectDrawer.tsx`)

- **R24**: WHEN `ProjectCard` renderiza el badge de estado de una tarjeta
  de proyecto THEN el sistema SHALL leer `project.status` directamente —
  SHALL NO llamar a `healthFromTimeline(project.updates)` (función
  eliminada, R11).
- **R25**: WHEN el header de `ProjectDrawer` renderiza el badge de estado
  de un proyecto cargado THEN el sistema SHALL leer `project.status`
  directamente, mismo criterio que R24.
- **R26**: WHEN se define la prop `status` de `HealthBadge` THEN el sistema
  SHALL tipificarla como `HealthStatus` (sin `| null`) — dado que
  `projects.status` es `not null` (R1) y ya no existe ningún punto de la UI
  que le pase `null` (R24/R25 reemplazan los únicos dos call sites que
  antes podían recibir `null` vía `healthFromTimeline`), el caso "Sin
  datos" del componente se retira por ser código muerto. Ver `design.md`
  para la alternativa descartada de mantenerlo de forma defensiva.

## API — `POST`/`PATCH /api/proyectos`

- **R27**: WHEN `POST /api/proyectos` o `PATCH /api/proyectos/<id>` reciben
  un body con `status` ausente o fuera de `["on_track", "at_risk",
  "delayed"]` THEN el sistema SHALL responder `400` sin crear/modificar el
  registro, incluyendo `"status"` en el mensaje de campos
  faltantes/inválidos (mismo formato de mensaje que ya usan estas rutas
  para `name`/`country`/`businessUnit`/`summary`). *(nota 2026-07-29: el
  dominio de valores aquí documentado pasó a `["desarrollo", "piloto",
  "produccion"]` por `specs/project-status-values-rename/` R13 — el
  comportamiento de `400` sin crear/modificar no cambia.)*
- **R28**: WHEN `POST /api/proyectos` recibe un body válido (incluyendo
  `status`) y la sesión es válida THEN el sistema SHALL insertar la fila en
  `projects` incluyendo `status` y SHALL responder `201` con el `Project`
  creado, cuyo `status` refleja el valor enviado.
- **R29**: WHEN `PATCH /api/proyectos/<id>` recibe un body válido
  (incluyendo `status`) para un `id` existente y la sesión es válida THEN
  el sistema SHALL actualizar `status` junto con los demás campos y SHALL
  responder `200` con el `Project` actualizado reflejando el nuevo
  `status`.

## API — `POST /api/proyectos/<id>/avances` y `PATCH .../avances/<updateId>`

- **R30**: WHEN `POST /api/proyectos/<id>/avances` o `PATCH
  /api/proyectos/<id>/avances/<updateId>` reciben un body THEN el sistema
  SHALL NO validar, aceptar, ni persistir ningún campo `status` — solo
  `weekOf` y `note` son relevantes; un `status` presente en el body (p. ej.
  enviado por un cliente desactualizado) SHALL ser ignorado silenciosamente,
  no SHALL causar un `400`.
- **R31**: WHEN `POST /api/proyectos/<id>/avances` recibe un body válido
  (`weekOf` parseable, `note` no vacía) para un proyecto existente y la
  sesión es válida THEN el sistema SHALL insertar la fila en
  `project_weekly_updates` con únicamente `project_id`, `week_of`, `note` —
  sin `status` — y SHALL responder `201` con el `WeeklyUpdate` creado (sin
  campo `status`, R8).
- **R32**: WHEN `PATCH /api/proyectos/<id>/avances/<updateId>` recibe un
  body válido para un `id`/`updateId` existentes y coherentes (mismo
  criterio R17/R18 de `weekly-update-edit-delete`, sin cambios) y la sesión
  es válida THEN el sistema SHALL actualizar únicamente `week_of` y `note`
  de la fila correspondiente y SHALL responder `200` con el `WeeklyUpdate`
  actualizado (sin campo `status`).

## Fuera de alcance (explícito)

- No se toca `project_kpis` ni la sección de KPIs — sigue fuera de alcance,
  mismo criterio que todas las specs anteriores de `/proyectos`.
- No se agrega historial ni auditoría de cambios de `projects.status` (quién
  lo cambió, cuándo, o qué valor tenía antes) — un `PATCH
  /api/proyectos/<id>` sobrescribe el valor anterior sin dejar rastro,
  mismo criterio que ya aplica al resto de campos editables del proyecto.
- No se toca RLS ni el modelo de autenticación (`isAuthenticated()`,
  `spinai_token`) — sin cambios, ver R6.
- No se agrega ningún mecanismo de recuperación del historial de `status`
  por semana que se pierde con R5 (p. ej. una tabla de auditoría aparte) —
  decisión explícita del usuario de aceptar esa pérdida, no una omisión.

## Requirements retirados/modificados de specs previas

Cada ítem abajo fue también anotado in situ en el archivo
`requirements.md` de la spec original, con una nota fechada 2026-07-29 que
apunta de vuelta a esta spec (`project-status-field`) — mismo criterio ya
usado para marcar R8 de `project-status-tracking` como retirado en su
momento. Esta tabla es el resumen consolidado.

### `project-status-tracking`

- **R2** *(modificado)*: ya no aplica "derivarlo del semáforo... de la
  entrada más reciente del timeline" — el estado de salud de la tarjeta
  ahora se lee directo de `project.status` (R24 de esta spec). El resto de
  R2 (badge de estado en la tarjeta) sigue vigente, solo cambia la fuente
  del dato.
- **R3** *(retirado)*: "si un proyecto no tiene ninguna entrada de avance
  semanal, mostrar estado neutro (sin datos)" — ya no aplica: con
  `projects.status not null` (R1), un proyecto siempre tiene un estado
  propio independiente de si tiene avances o no. El caso "sin datos" del
  badge se retira (R26 de esta spec).
- **R6** *(modificado)*: el header del drawer sigue mostrando "badge de
  estado de salud", pero ahora leído de `project.status` en vez de
  derivado del timeline (R25 de esta spec). Sin otros cambios a R6.

### `project-crud`

- **R2** *(modificado)*: el formulario de creación gana un quinto campo
  obligatorio "Estado" (R15 de esta spec), además de los 4 ya existentes.
- **R3** *(modificado)*: el payload de `POST /api/proyectos` ahora incluye
  `status` (R16/R28 de esta spec).
- **R4** *(modificado)*: la habilitación del botón de confirmar ahora
  considera 5 campos requeridos, no 4.
- **R7** *(modificado)*: el formulario de edición prellenado ahora incluye
  también el `status` actual del proyecto (R17 de esta spec).
- **R8** *(modificado)*: la confirmación de edición ahora envía 5 campos
  editables, no 4 (incluye `status`).
- **R17** *(modificado)*: la validación de `POST /api/proyectos` ahora
  incluye `status` en la lista de campos requeridos (R27 de esta spec).
- **R18** *(modificado)*: el insert en `projects` ahora incluye `status`
  (R28 de esta spec).
- **R20** *(modificado)*: la validación de `PATCH /api/proyectos/<id>`
  ahora incluye `status` (R27 de esta spec).
- **R21** *(modificado)*: el update en `projects` ahora incluye `status`
  (R29 de esta spec).

### `weekly-update-entry`

- **R1** *(modificado)*: la sección "Primer avance semanal (opcional)"
  pierde el campo "estado" — pasa de tres campos (fecha/estado/nota) a dos
  (fecha/nota), R18 de esta spec.
- **R2**/**R3** *(modificados)*: el conteo de campos llenos/parciales de la
  sección de avance pasa de tres a dos (R19 de esta spec).
- **R4** *(modificado)*: al crear el primer avance ya no se envía `status`
  en el payload de `POST /api/proyectos/<id>/avances` (R23/R31 de esta
  spec).
- **R9** *(modificado)*: la habilitación del botón "Agregar avance" ahora
  considera dos campos (fecha/nota), no tres (R21 de esta spec).
- **R10** *(modificado)*: al agregar un avance desde el drawer, el payload
  ya no incluye `status` (R23/R31 de esta spec).
- **R16** *(modificado)*: `POST /api/proyectos/<id>/avances` ya no valida
  ni exige `status` — solo `weekOf` y `note` (R30/R31 de esta spec).
- **R18** *(modificado)*: el insert en `project_weekly_updates` ya no
  incluye `status` — la columna ni siquiera existe tras esta feature (R5,
  R31 de esta spec).

### `weekly-update-edit-delete`

- **R2** *(modificado)*: el formulario de edición de una fila del timeline
  ahora precarga y edita solo `weekOf`/`note`, no `status` (R20 de esta
  spec).
- **R4** *(modificado)*: la habilitación del botón "Guardar" de la edición
  inline ahora considera dos campos (fecha/nota), no tres (R22 de esta
  spec).
- **R5** *(modificado)*: el payload de `PATCH
  /api/proyectos/<id>/avances/<updateId>` ya no incluye `status` (R23/R32
  de esta spec). El resto de R5 (actualizar `project.updates` en memoria,
  refrescar el badge) sigue vigente, salvo que el badge ahora se refresca
  vía `project.status` propio del proyecto (no cambia con la edición de un
  avance) — ver nota en `design.md` sobre esta consecuencia de UX.
- **R16** *(modificado)*: `PATCH
  /api/proyectos/<id>/avances/<updateId>` ya no valida ni exige `status` —
  solo `weekOf` y `note` (R30/R32 de esta spec).
- **R19** *(modificado)*: el update en `project_weekly_updates` ya no
  incluye `status` — la columna ya no existe (R5, R32 de esta spec).
