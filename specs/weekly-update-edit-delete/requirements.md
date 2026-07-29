# Requirements — Editar y eliminar avances semanales (`project_weekly_updates`) desde `/proyectos`

Feature id: `weekly-update-edit-delete`. EARS notation, numbered `R1`, `R2`,
... Contexto previo: `specs/project-status-tracking/` (listado + drawer,
lectura de `updates`, `done`), `specs/project-crud/` (crear/editar/eliminar
`projects`, `done`), `specs/weekly-update-entry/` (crear avances, `done`,
dejó edición/borrado explícitamente fuera de alcance). Esta spec cierra ese
hueco: **solo editar y eliminar** avances ya existentes. No repite
requirements ya cubiertos en esas tres specs anteriores (siguen vigentes sin
cambios) y no toca nada del flujo de creación (`AddUpdateForm.tsx`,
`ProjectForm.tsx`, `POST /api/proyectos/<id>/avances`).

**Alcance explícito**: únicamente el timeline dentro del drawer de detalle
de un proyecto existente (`ProjectDrawer.tsx` → `ProjectTimeline.tsx`). No
aplica a la sección "Primer avance semanal" del formulario de creación de
proyecto — una vez creado el proyecto, ese avance es una fila más del
timeline y se edita/borra desde ahí como cualquier otra.

## Editar un avance existente

- **R1**: WHEN el drawer está en modo vista de un proyecto existente THEN
  el sistema SHALL mostrar, en cada fila de `ProjectTimeline`, un control
  "Editar" visible al hacer hover sobre la fila (mismo trigger visual que ya
  usa `.proyecto-timeline-row:hover` para resaltar la fila) — no un botón
  permanentemente visible, para no saturar visualmente un timeline con
  muchas semanas.
- **R2** *(modificado 2026-07-29 por `project-status-field`)*: WHEN el
  usuario hace click en "Editar" de una fila THEN el sistema SHALL
  reemplazar el contenido de esa fila (y solo esa fila) por un formulario
  con los mismos ~~tres~~ **dos** campos que `WeeklyUpdateFields.tsx`
  (fecha/nota, ~~estado~~ retirado de este componente), pre-cargados con
  los valores actuales del avance (`weekOf`, `note`) — el resto de las
  filas del timeline permanece de solo lectura mientras tanto. Ver
  `specs/project-status-field/requirements.md` R20.
- **R3**: WHILE una fila está en modo edición THEN el sistema SHALL
  deshabilitar el control "Editar" de las demás filas — solo una fila puede
  estar en edición a la vez (evita conflictos de estado y de scroll con
  múltiples formularios abiertos).
- **R4** *(modificado 2026-07-29 por `project-status-field`)*: WHILE el
  formulario de edición de una fila tiene el campo de fecha o nota vacío
  (~~o estado~~, campo retirado) THEN el sistema SHALL deshabilitar su
  botón de confirmar — mismo patrón de habilitación que `AddUpdateForm.tsx`
  (R9 de `weekly-update-entry`). Ver
  `specs/project-status-field/requirements.md` R22.
- **R5** *(modificado 2026-07-29 por `project-status-field`)*: WHEN el
  usuario confirma el formulario de edición de una fila con los ~~tres~~
  **dos** campos completos THEN el sistema SHALL enviar `PATCH
  /api/proyectos/<projectId>/avances/<updateId>` con el payload (`weekOf`
  recalculado como el lunes de la fecha elegida, igual que en creación; ya
  sin `status`), y si la respuesta es `2xx` SHALL reemplazar ese avance en
  `project.updates` en memoria con el `WeeklyUpdate` devuelto (sin refetch
  completo del proyecto), y SHALL cerrar el formulario de edición volviendo
  la fila a modo lectura con los valores actualizados. ~~SHALL refrescar el
  `HealthBadge` del header en consecuencia (deriva de `updates` vía
  `healthFromTimeline`)~~ — **ya no aplica**: el badge ahora se lee de
  `project.status`, independiente de `project.updates`; editar un avance ya
  no afecta el badge (ver `specs/project-status-field/design.md`, sección
  "Consecuencia de UX a documentar").
- **R6**: WHEN el usuario cancela el formulario de edición de una fila
  (botón "Cancelar") THEN el sistema SHALL descartar los valores editados,
  SHALL NOT llamar a la API, y SHALL devolver la fila a modo lectura
  mostrando los valores originales (previos a la edición).
- **R7**: IF `PATCH /api/proyectos/<projectId>/avances/<updateId>` responde
  con error (`4xx`/`5xx`) THEN el sistema SHALL mostrar un mensaje de error
  dentro del formulario de edición de esa fila y SHALL mantener los valores
  editados por el usuario y la fila en modo edición (mismo criterio que
  R12 de `weekly-update-entry` para el formulario de creación).

## Eliminar un avance existente

- **R8**: WHEN el drawer está en modo vista de un proyecto existente THEN
  el sistema SHALL mostrar, en cada fila de `ProjectTimeline`, un control
  "Eliminar" junto al control "Editar" (R1), visible bajo el mismo trigger
  de hover.
- **R9**: WHEN el usuario hace click en "Eliminar" de una fila (primer
  click) THEN el sistema SHALL reemplazar ese control por una confirmación
  inline de dos pasos ("¿Seguro?") en la misma fila, sin abrir ningún modal
  ni overlay — mismo patrón que la confirmación de borrado de integrantes en
  `MembersPanel.tsx` (ver `design.md` para por qué se elige este patrón en
  vez del modal de `DeleteProjectModal.tsx`).
- **R10**: IF el usuario no confirma dentro de los 3 segundos posteriores al
  primer click de "Eliminar" (R9) THEN el sistema SHALL revertir
  automáticamente el control a su estado inicial ("Eliminar") sin haber
  llamado a la API — mismo comportamiento de auto-revert que
  `MembersPanel.tsx`.
- **R11**: WHEN el usuario hace click en "¿Seguro?" (segundo click, dentro
  de la ventana de R10) THEN el sistema SHALL enviar `DELETE
  /api/proyectos/<projectId>/avances/<updateId>`, y si la respuesta es `2xx`
  SHALL quitar ese avance de `project.updates` en memoria (sin refetch
  completo del proyecto) y SHALL refrescar el `HealthBadge` del header en
  consecuencia.
- **R12**: WHILE una fila está en modo edición (R2) THEN el sistema SHALL
  ocultar u ocultar el control "Eliminar" de esa misma fila — no se puede
  editar y borrar la misma fila a la vez (mismo criterio de exclusión mutua
  que R3 aplica entre filas).
- **R13**: IF `DELETE /api/proyectos/<projectId>/avances/<updateId>`
  responde con error (`4xx`/`5xx`) THEN el sistema SHALL revertir el control
  de esa fila a su estado inicial ("Eliminar") y SHALL mostrar un mensaje de
  error visible en esa fila (no un mensaje genérico a nivel de todo el
  drawer), sin quitar el avance de `project.updates` — el timeline queda
  consistente con lo que realmente persiste en Supabase.
- **R14**: WHEN el timeline queda sin ningún avance tras eliminar el
  último THEN el sistema SHALL mostrar el mismo empty state que ya existe
  en `ProjectTimeline.tsx` ("Este proyecto todavía no tiene avances
  semanales registrados.") — comportamiento ya implementado, sin cambios,
  solo confirmado como resultado esperado de esta feature.

## API — `PATCH`/`DELETE /api/proyectos/<id>/avances/<updateId>`

- **R15**: WHEN `PATCH` o `DELETE
  /api/proyectos/<id>/avances/<updateId>` recibe una request sin cookie
  `spinai_token` válida THEN el sistema SHALL responder `401` sin modificar
  ni borrar ningún registro.
- **R16** *(modificado 2026-07-29 por `project-status-field`)*: WHEN
  `PATCH /api/proyectos/<id>/avances/<updateId>` recibe un body con
  `weekOf` ausente/no parseable como fecha, o `note` vacía (tras `trim()`)
  THEN el sistema SHALL responder `400` sin modificar el registro, con un
  mensaje indicando qué campo falta o es inválido — mismas reglas de
  validación que `POST /api/proyectos/<id>/avances` (R16 de
  `weekly-update-entry`, ya modificado), incluyendo la validación de fecha
  parseable que esa feature ya corrigió. ~~`status` ausente o fuera de
  `["on_track", "at_risk", "delayed"]`~~ — ya no se valida ni se acepta
  este campo en esta ruta. Ver
  `specs/project-status-field/requirements.md` R30.
- **R17**: IF `PATCH` o `DELETE /api/proyectos/<id>/avances/<updateId>` se
  invoca con un `id` de proyecto que no corresponde a ningún proyecto
  existente THEN el sistema SHALL responder `404` sin modificar ni borrar
  ningún registro (mismo criterio de "verificar existencia antes de
  escribir" que ya usan `PATCH`/`DELETE /api/proyectos/<id>` de
  `project-crud` y `POST /api/proyectos/<id>/avances` de
  `weekly-update-entry`).
- **R18**: IF `PATCH` o `DELETE /api/proyectos/<id>/avances/<updateId>` se
  invoca con un `updateId` que no existe, o que existe pero pertenece a un
  `project_id` distinto del `id` de la ruta, THEN el sistema SHALL responder
  `404` sin modificar ni borrar ningún registro — un avance de otro
  proyecto se trata igual que uno inexistente, nunca se edita/borra cruzado
  entre proyectos aunque el `updateId` sea válido en otra fila.
- **R19** *(modificado 2026-07-29 por `project-status-field`)*: WHEN
  `PATCH /api/proyectos/<id>/avances/<updateId>` recibe un body válido
  para un `id`/`updateId` existentes y coherentes (R18) y la sesión es
  válida THEN el sistema SHALL actualizar la fila correspondiente en
  `project_weekly_updates` (ya solo `week_of`/`note`, sin columna `status`)
  vía `getSupabaseAdmin()` y SHALL responder `200` con el `WeeklyUpdate`
  actualizado (mapeado con `rowToUpdate()`, ya sin campo `status`). Ver
  `specs/project-status-field/requirements.md` R5/R32.
- **R20**: WHEN `DELETE /api/proyectos/<id>/avances/<updateId>` se invoca
  con un `id`/`updateId` existentes y coherentes (R18) y la sesión es válida
  THEN el sistema SHALL borrar esa fila de `project_weekly_updates` vía
  `getSupabaseAdmin()` y SHALL responder `200` con `{ ok: true }` (mismo
  shape de respuesta que `DELETE /api/proyectos/<id>` de `project-crud`).

## Confidencialidad y control de acceso (heredado, reafirmado)

- **R21**: WHEN se definen las rutas API nuevas (`PATCH`/`DELETE
  /api/proyectos/<id>/avances/<updateId>`) THEN el sistema SHALL reutilizar
  exactamente `isAuthenticated()` (`lib/auth.ts`) y `getSupabaseAdmin()`
  (`lib/supabaseAdmin.ts`) ya existentes — sin agregar ninguna policy de
  RLS nueva para `anon`/`authenticated` en `project_weekly_updates` (sigue
  siendo `service_role`-only, igual que en todas las specs anteriores de
  `/proyectos`).

## Fuera de alcance (explícito)

- **La sección "Primer avance semanal" del formulario de creación de
  proyecto** (`ProjectForm.tsx`) — no gana edición/borrado propio; una vez
  creado el proyecto, ese avance vive en el timeline y se edita/borra desde
  ahí (R1-R14 aplican igual, sin distinción de origen).
- **`POST /api/proyectos/<id>/avances`** (crear) — sin cambios, salvo que
  sea estrictamente necesario para no duplicar la lógica de validación (ver
  `design.md`).
- **KPIs (`project_kpis`)** — sin cambios, sigue fuera de alcance (mismo
  criterio que `project-crud`/`weekly-update-entry`).
- **Historial/auditoría de cambios sobre avances** (quién editó, cuándo, o
  qué valor tenía antes) — no se agrega ningún registro de auditoría; un
  `PATCH` sobrescribe el valor anterior sin dejar rastro, igual que
  `PATCH /api/proyectos/<id>` ya hace con los campos del proyecto.
- **Ningún sistema de permisos granular** — mismo criterio "todo o nada"
  que el resto de `/proyectos`: cualquier sesión autenticada con el PIN
  puede editar/borrar cualquier avance de cualquier proyecto.
