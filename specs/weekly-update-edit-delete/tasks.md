# Tasks — Editar y eliminar avances semanales (`project_weekly_updates`) desde `/proyectos`

Orden sugerido: rutas API primero (testeables vía curl, sin depender de la
UI), luego `lib/projects.ts`, luego `ProjectTimeline.tsx` (el cambio más
grande), luego cablear `ProjectDrawer.tsx`, luego verificación end-to-end.

- [x] **T1 — `PATCH`/`DELETE /api/proyectos/<id>/avances/<updateId>`** (`R15`-`R20`)
  - Crear `app/api/proyectos/[id]/avances/[updateId]/route.ts` con
    `export async function PATCH(...)` y `export async function
    DELETE(...)` según `design.md`: `isAuthenticated(req)` → `401` si
    falla; helper `findUpdate()` que filtra `project_weekly_updates` por
    `id` **y** `project_id` a la vez (cubre R17 y R18 con una sola query,
    404 "Avance no encontrado" si no hay match o si `error.code ===
    "22P02"`); en `PATCH`, validar `weekOf`/`status`/`note` con las mismas
    reglas que `POST /api/proyectos/<id>/avances` (incluida la validación
    de fecha parseable con `Number.isNaN(new Date(weekOf).getTime())`,
    R16) → `400` si falta o es inválido algo; `update`/`delete` vía
    `getSupabaseAdmin()` → `200` con `rowToUpdate(data)` (`PATCH`) o `{ ok:
    true }` (`DELETE`).
  - No tocar `app/api/proyectos/[id]/avances/route.ts` (el `POST`
    existente) salvo que compartir el array `VALID_STATUSES` requiera
    extraerlo a un lugar común — si se hace, mantenerlo mínimo (una
    constante exportada, no un refactor mayor).
  - Verificación manual: `curl` con y sin cookie; `PATCH` con body
    completo/incompleto/`status` inválido/`weekOf` no parseable; `PATCH`/
    `DELETE` con `id` de proyecto inexistente; `PATCH`/`DELETE` con
    `updateId` inexistente; `PATCH`/`DELETE` con un `updateId` real pero
    que pertenece a **otro** proyecto (confirmar 404, no 200/500) —
    confirmar `401`/`400`/`404`/`200` según corresponda, y que el `200` de
    `PATCH` trae el shape de `WeeklyUpdate` actualizado.

- [x] **T2 — `updateWeeklyUpdate()`/`deleteWeeklyUpdate()` en `lib/projects.ts`** (`R5`, `R11`)
  - Agregar ambas funciones según `design.md` — mismo patrón `fetch()` que
    `createWeeklyUpdate()`, reutilizando `WeeklyUpdateFormValues` ya
    existente. No requieren test de Vitest (no son lógica pura); se
    verifican end-to-end vía T4/T5.

- [x] **T3 — `ProjectTimeline.tsx`: controles de editar/borrar por fila** (`R1`-`R4`, `R6`, `R8`-`R10`, `R12`, `R14`)
  - Agregar los props `onEdit: (id, values) => Promise<void>` y `onDelete:
    (id) => Promise<void>`.
  - Agregar el estado local descrito en `design.md`:
    `editingId`/`editValues`/`editError`/`editSubmitting`,
    `confirmDeleteId`/`deletingId`/`deleteError` (por `id`).
  - Implementar `startEdit`/`cancelEdit`/`confirmEdit` (llama `onEdit`,
    atrapa el error en `editError` sin cerrar el formulario si falla, R7)
    y `setConfirmDeleteId`/auto-revert a 3s/`handleDeleteClick` (llama
    `onDelete`, atrapa el error en `deleteError[id]` sin quitar la fila si
    falla, R13) — mismo patrón `setTimeout` que `MembersPanel.handleRemove`.
  - Renderizar, dentro de cada fila: en modo lectura, el `note` actual +
    controles "Editar"/"Eliminar" con `opacity` controlada por hover de la
    fila (agregar la regla CSS al bloque `<style>` existente, no un
    `<style>` nuevo); en modo edición (`editingId === update.id`),
    `WeeklyUpdateFields` con `editValues` + botones "Cancelar"/"Guardar".
  - Deshabilitar "Editar" de las demás filas mientras `editingId !== null`
    (R3); ocultar "Eliminar" de la fila que está en edición (R12).
  - El empty state existente (R14) no requiere cambios — confirmar que
    sigue apareciendo correctamente tras borrar el último avance (queda
    cubierto por QA manual en T5, no por código nuevo).
  - Correr el skill `design-check` (obligatorio por tocar
    `app/proyectos/*.tsx` con estilos nuevos: controles hover, formulario
    inline por fila) y anotar el resultado en
    `progress/impl_weekly-update-edit-delete.md`.

- [x] **T4 — Cablear `ProjectDrawer.tsx`** (`R5`, `R11`, `R7`, `R13`)
  - Implementar `handleEditUpdate`/`handleDeleteUpdate` según `design.md`
    (no atrapan el error — lo dejan propagar para que `ProjectTimeline` lo
    maneje por fila) y pasarlos como `onEditUpdate`/`onDeleteUpdate` (o los
    nombres de prop que use `ProjectTimeline`) al render de
    `ProjectTimeline`.
  - Confirmar que ni `handleEditUpdate` ni `handleDeleteUpdate` requieren
    ningún `useState` nuevo en `ProjectDrawer` (el estado de interacción
    vive todo en `ProjectTimeline`, según `design.md`) — si durante la
    implementación resulta necesario alguno, documentar por qué se desvía
    del diseño.
  - Verificar manualmente que editar/borrar un avance actualiza el
    `HealthBadge` del header sin recargar (se deriva de
    `healthFromTimeline`, no debería requerir cambio de código, solo
    confirmar que efectivamente se refresca en ambos casos, incluido borrar
    el avance que era el más reciente).

- [x] **T5 — QA manual end-to-end** (parcial — ver `progress/impl_weekly-update-edit-delete.md`: bloqueado por falta de credenciales Supabase/PIN en este sandbox, mismo criterio que `project-crud`/`weekly-update-entry`)
  - Editar un avance cambiando los tres campos (fecha/estado/nota) →
    confirmar que la fila se actualiza sin recargar (R5), que el `weekOf`
    guardado es el lunes de la nueva fecha elegida, y que el `HealthBadge`
    se actualiza si era el avance más reciente.
  - Editar un avance sin cambiar la fecha (mantener el `weekOf` precargado)
    → confirmar que el `PATCH` no falla por reenviar el mismo lunes
    (recálculo de `mondayOf()` sobre un valor que ya es lunes debe ser un
    no-op).
  - Cancelar una edición a medio hacer → confirmar que la fila vuelve a
    mostrar los valores originales, sin llamada a la API (R6).
  - Intentar editar dos filas a la vez (abrir edición en una fila, verificar
    que "Editar" de las demás está deshabilitado, R3) y confirmar que
    "Eliminar" no aparece en la fila que está en edición (R12).
  - Eliminar un avance: primer click ("Eliminar" → "¿Seguro?"), esperar
    >3s sin confirmar → confirmar que revierte solo sin llamar a la API
    (R10). Repetir y esta vez confirmar dentro de la ventana → confirmar
    que la fila desaparece del timeline sin recargar (R11).
  - Eliminar el único avance restante de un proyecto → confirmar que
    aparece el empty state de `ProjectTimeline` (R14).
  - Forzar un error en `PATCH` (ej. nota vacía enviada manualmente vía
    devtools, o desconectar Supabase) → confirmar que el formulario de
    edición de esa fila muestra el error y no pierde los valores ni cierra
    (R7).
  - Forzar un error en `DELETE` (ej. desconectar Supabase entre el primer y
    segundo click) → confirmar que el control revierte a "Eliminar" con un
    mensaje de error visible en la fila, y que el avance sigue en la lista
    (R13).
  - Confirmar con `curl` (sin cookie) que `PATCH` y `DELETE`
    `/api/proyectos/<id>/avances/<updateId>` responden `401` (R15).
  - Confirmar con `curl` que `PATCH`/`DELETE` con un `updateId` real pero
    de **otro** proyecto (distinto del `id` en la URL) responden `404`,
    no `200` ni `500` (R18) — este es el caso más fácil de pasar por alto,
    verificarlo explícitamente con dos proyectos reales en Supabase.

- [x] **T6 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state).
  - Confirmar en el dashboard de Supabase (Table Editor → Policies) que
    `project_weekly_updates` sigue sin ninguna policy para
    `anon`/`authenticated` tras esta feature (R21).
  - Escribir `progress/impl_weekly-update-edit-delete.md` con, para cada
    `R1`-`R21`: el o los archivo(s) tocados y cómo se verificó (QA manual
    para todo — no hay lógica pura nueva en `lib/` que amerite un test de
    Vitest en esta feature, a diferencia de `mondayOf()` en
    `weekly-update-entry`; si `implementer` termina agregando alguna
    función pura nueva, sí necesita su test). Incluir el resultado de
    `design-check` de T3.
  - Si algo se bloquea por falta de acceso al entorno de Supabase de dev
    (credenciales/PIN), reportarlo explícitamente acá en vez de asumir que
    funciona — mismo criterio que dejó pendiente `project-crud` y
    `weekly-update-entry`.
