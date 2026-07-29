# Implementación — `weekly-update-edit-delete`

## Archivos creados

- `app/api/proyectos/[id]/avances/[updateId]/route.ts` — `PATCH`/`DELETE`
  nuevos, siguiendo el snippet de `design.md` casi literal (helper
  `findUpdate()` filtrando `id` + `project_id` a la vez).

## Archivos modificados

- `lib/projects.ts` — agrega `updateWeeklyUpdate()` y `deleteWeeklyUpdate()`
  (mismo patrón `fetch()` que `createWeeklyUpdate()`).
- `app/proyectos/ProjectTimeline.tsx` — deja de ser puramente de solo
  lectura: props `onEdit`/`onDelete`, estado local por fila
  (`editingId`/`editValues`/`editError`/`editSubmitting`,
  `confirmDeleteId`/`deletingId`/`deleteError` por `id`), controles
  "Editar"/"Eliminar" visibles al hover (`.proyecto-timeline-row-actions`
  con opacity 0→1 en `.proyecto-timeline-row:hover`), formulario inline con
  `WeeklyUpdateFields` en modo edición.
- `app/proyectos/ProjectDrawer.tsx` — `handleEditUpdate`/`handleDeleteUpdate`
  (no atrapan el error, lo dejan propagar a `ProjectTimeline`), cablea
  `onEdit={handleEditUpdate}` `onDelete={handleDeleteUpdate}` en el render de
  `ProjectTimeline`. Sin `useState` nuevo en `ProjectDrawer`, tal como preveía
  `design.md`.
- `specs/weekly-update-edit-delete/tasks.md` — T1-T6 marcadas `[x]` (T5 con
  nota de bloqueo parcial, ver abajo).

## Decisiones de implementación no 100% explícitas en `design.md`

- **Nombre de los props de `ProjectTimeline`**: `design.md` define la
  `interface Props` con `onEdit`/`onDelete`, pero más abajo, en la sección de
  `ProjectDrawer`, dice "pasa `onEditUpdate={handleEditUpdate}`
  `onDeleteUpdate={handleDeleteUpdate}`" (inconsistencia interna del propio
  documento). `tasks.md` explícitamente da la libertad de elegir ("o los
  nombres de prop que use `ProjectTimeline`"), así que usé `onEdit`/`onDelete`
  — coincide con la `interface Props` que es la fuente más específica (la
  firma real del componente) y es el nombre por el que se guía el resto del
  diseño (`onEdit: (id, values) => Promise<void>`, `onDelete: (id) =>
  Promise<void>`).
- **CSS de hover para los controles por fila**: el snippet de `design.md`
  muestra `style={{ opacity: 0 /* 1 on row hover */ }}` como pseudocódigo,
  pero un `style` inline no puede expresar `:hover`. Implementé el mismo
  efecto con una clase `.proyecto-timeline-row-actions` + regla
  `.proyecto-timeline-row:hover .proyecto-timeline-row-actions { opacity: 1 }`
  agregada al mismo bloque `<style>` existente (tal como pide T3: "agregar la
  regla CSS al bloque `<style>` existente, no un `<style>` nuevo").
- **Limpieza de `deleteError[id]` tras un borrado exitoso**: no estaba
  explícito en `design.md`. Al confirmar un borrado con éxito, además de
  quitar el avance de `project.updates` (lo que ya desmonta la fila), limpio
  cualquier `deleteError[id]` residual de un intento fallido previo sobre esa
  misma fila, por prolijidad de estado (evita que quede un mensaje de error
  huérfano en el objeto de estado aunque ya no se renderice).

## Trazabilidad R → verificación

### Editar (`R1`-`R7`)

- **R1** (control "Editar" visible al hover) — QA de código:
  `ProjectTimeline.tsx`, `.proyecto-timeline-row-actions` con `opacity: 0`
  por defecto y `1` en `.proyecto-timeline-row:hover`, mismo trigger que ya
  resalta la fila. No pude confirmarlo visualmente en navegador (ver
  limitación de entorno abajo) — verificado leyendo el CSS generado y
  confirmando que `npm run build` no reporta errores de estilos.
- **R2** (click "Editar" reemplaza la fila por el formulario precargado) —
  QA de código: `startEdit()` hace `setEditingId(update.id)` +
  `setEditValues({ date: update.weekOf, status: update.status, note:
  update.note })`; el render condicional `isEditingRow ? <WeeklyUpdateFields
  .../> : <...modo lectura.../>` solo afecta la fila con ese `id`.
- **R3** (solo una fila en edición a la vez, "Editar" deshabilitado en las
  demás) — QA de código: el botón "Editar" de cada fila tiene `disabled={editingId
  !== null}` — al haber un `editingId` no nulo, todas las filas que no están
  en edición (que son las únicas donde se renderiza el botón, ya que la fila
  en edición muestra el formulario en su lugar) quedan con "Editar"
  deshabilitado.
- **R4** (botón "Guardar" deshabilitado con campos vacíos) — QA de código:
  `isEditValid = editValues.date !== "" && editValues.status !== "" &&
  editValues.note.trim() !== ""`; el botón "Guardar" usa `disabled={!isEditValid
  || editSubmitting}`, mismo patrón que `AddUpdateForm.isValid`.
- **R5** (confirmar edición → `PATCH`, reemplaza en memoria, refresca
  `HealthBadge`, cierra el formulario) — QA de código:
  `confirmEdit()` llama `onEdit(editingId, { weekOf: mondayOf(editValues.date),
  status, note: note.trim() })`; `ProjectDrawer.handleEditUpdate` hace
  `project.updates.map((u) => u.id === updateId ? updated : u)` y
  `setProject`/`onUpdated` (sin refetch); `HealthBadge` en el header de
  `ProjectDrawer` ya deriva de `healthFromTimeline(project.updates)` sin
  cambios de código necesarios (se re-renderiza automáticamente al cambiar
  `project`). Ruta API probada con `curl` (ver abajo) — el `200` con
  `weekOf`/`status`/`note` válidos no se pudo ejercitar end-to-end contra
  Supabase real por falta de credenciales en este sandbox (ver limitación).
- **R6** (cancelar descarta cambios, no llama a la API, vuelve a modo
  lectura con valores originales) — QA de código: `cancelEdit()` solo hace
  `setEditingId(null)` + `setEditError(null)`, no invoca `onEdit` en ningún
  punto de ese camino; como `project.updates` (la fuente de los valores en
  modo lectura) nunca se tocó, la fila vuelve a mostrar el `note` original
  sin cambios.
- **R7** (error de `PATCH` → mensaje en el formulario de esa fila, mantiene
  valores y modo edición) — QA de código: `confirmEdit()` atrapa el error
  de `onEdit` en el `catch`, hace `setEditError(...)` y **no** llama a
  `setEditingId(null)` en ese camino — el formulario sigue montado con
  `editValues` intactos. Confirmado también por lectura de
  `updateWeeklyUpdate()` en `lib/projects.ts`, que lanza `Error` con el
  mensaje del backend si `!res.ok`.

### Eliminar (`R8`-`R14`)

- **R8** (control "Eliminar" junto a "Editar", mismo trigger de hover) — QA
  de código: mismo contenedor `.proyecto-timeline-row-actions` que "Editar".
- **R9** (primer click → confirmación inline "¿Seguro?", sin modal) — QA de
  código: `confirmDeleteId === group.update.id ? <button>¿Seguro?</button> :
  <button onClick={() => startConfirmDelete(id)}>Eliminar</button>` — ningún
  overlay/modal involucrado, mismo patrón que `MembersPanel.handleRemove`.
- **R10** (auto-revert a los 3s sin llamar a la API) — QA de código:
  `startConfirmDelete()` hace `setTimeout(() => setConfirmDeleteId((cur) =>
  cur === id ? null : cur), 3000)`, idéntico al `setTimeout` de
  `MembersPanel.handleRemove`; no hay ninguna llamada a `onDelete` en ese
  camino.
- **R11** (segundo click dentro de la ventana → `DELETE`, quita el avance en
  memoria, refresca `HealthBadge`) — QA de código: `handleDeleteClick(id)`
  llama `onDelete(id)`; `ProjectDrawer.handleDeleteUpdate` hace
  `project.updates.filter((u) => u.id !== updateId)` + `setProject`/`onUpdated`
  (sin refetch); `HealthBadge` se recalcula solo. Ruta API probada con
  `curl` (ver abajo); el `200` real contra Supabase no se pudo ejercitar en
  este sandbox (ver limitación).
- **R12** (mientras una fila está en edición, "Eliminar" de esa misma fila no
  se muestra) — QA de código: cuando `isEditingRow` es `true` se renderiza
  únicamente el bloque `WeeklyUpdateFields` + "Cancelar"/"Guardar" — el
  bloque con los botones "Editar"/"Eliminar" solo existe en la rama
  `else` (modo lectura), así que la fila en edición nunca muestra
  "Eliminar".
- **R13** (error de `DELETE` → revierte a "Eliminar", muestra error en esa
  fila, no quita el avance) — QA de código: `handleDeleteClick()` atrapa el
  error, hace `setConfirmDeleteId(null)` (vuelve al botón "Eliminar") +
  `setDeleteError((prev) => ({ ...prev, [id]: message }))`; en ningún
  momento de ese camino se llama a `onUpdated`/`setProject` con el avance
  quitado (eso solo pasa en el `try` si `onDelete` no lanza).
- **R14** (empty state tras borrar el último avance) — sin cambios de
  código, como preveía `tasks.md`; confirmado por lectura: el `if
  (groups.length === 0)` sigue siendo la primera rama del render, antes de
  cualquier lógica nueva.

### API (`R15`-`R20`)

Probado con `curl` real contra `npm run dev` local:

- **R15** (401 sin cookie válida, `PATCH` y `DELETE`) — confirmado:
  ```
  PATCH  sin cookie → 401 {"error":"No autorizado"}
  DELETE sin cookie → 401 {"error":"No autorizado"}
  ```
- **R16** (400 con `weekOf` no parseable / `status` inválido / `note`
  vacía) — confirmado con una cookie JWT válida (ver nota de entorno abajo):
  ```
  PATCH {} → 400 {"error":"Campos requeridos faltantes o inválidos: weekOf, status, note"}
  PATCH {"weekOf":"no-es-fecha","status":"whatever","note":"   "} → 400 {"error":"Campos requeridos faltantes o inválidos: weekOf, status, note"}
  ```
- **R17/R18** (404 con `id` de proyecto inexistente, o `updateId`
  inexistente/de otro proyecto) — **bloqueado en este sandbox**: el camino
  de código que produce el 404 (`findUpdate()` vía `getSupabaseAdmin()`)
  requiere `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, que no
  están configuradas acá (mismo bloqueo que dejaron pendiente
  `project-crud` y `weekly-update-entry`). Con un body válido y una cookie
  JWT forjada localmente (ver nota abajo), la ruta responde `500` con el
  mensaje explícito `"Faltan NEXT_PUBLIC_SUPABASE_URL o
  SUPABASE_SERVICE_ROLE_KEY..."` — confirma que el flujo llega correctamente
  hasta `getSupabaseAdmin()` (pasa auth, pasa validación de body) y que el
  único motivo del fallo es la falta de credenciales del entorno, no un bug
  de la ruta. **Este caso, en particular "un `updateId` real pero de otro
  proyecto → 404", queda explícitamente pendiente de QA humana con
  Supabase real**, tal como pide `tasks.md`/T5.
- **R19/R20** (200 con `WeeklyUpdate` actualizado en `PATCH`, `{ ok: true }`
  en `DELETE`) — mismo bloqueo que R17/R18: no se pudo ejercitar contra
  Supabase real. El código sigue el mismo patrón exacto que
  `PATCH`/`DELETE /api/proyectos/<id>` (ya en producción) y `POST
  /api/proyectos/<id>/avances` (ya en producción), reutilizando
  `rowToUpdate()` sin modificarlo.
- **R21** (sin policy nueva de RLS para `anon`/`authenticated`) — no se
  agregó ninguna migración ni cambio de schema; las rutas nuevas usan
  `getSupabaseAdmin()` (`service_role`) igual que el resto de `/proyectos`.
  **Confirmación en el dashboard de Supabase queda pendiente** (mismo
  bloqueo de acceso).

## `design-check` (T3)

El skill `design-check` (`.claude/skills/design-check/SKILL.md`) está
scopeado por defecto a `app/components/*.tsx`; esta feature vive en
`app/proyectos/*.tsx`, así que apliqué manualmente los mismos criterios del
skill (colores hex vs. tokens de `app/globals.css`, `border-radius`,
escala de `fontSize`, `boxShadow`) sobre el diff de
`ProjectTimeline.tsx`/`ProjectDrawer.tsx`:

- **Sin hallazgos nuevos.** Los únicos valores hex usados
  (`#F87171`/`#F8717122` para error/confirmación de borrado, `#1a2035` para
  el estado deshabilitado del botón "Guardar") son copias literales de
  patrones ya establecidos y usados en archivos hermanos del mismo
  directorio (`ProjectDrawer.tsx` ya usa `#F87171`/`#F8717122` para su botón
  "Eliminar" de proyecto; `AddUpdateForm.tsx` ya usa exactamente
  `#F87171`/`#1a2035` para su propio error/botón deshabilitado) — no es
  drift nuevo introducido por esta feature, es reutilización consistente de
  un patrón "danger" no tokenizado que ya existía antes de esta spec.
- `border-radius` usa `var(--radius-md)` en todos los elementos nuevos.
- `fontSize` nuevo: 11 (botones de acción por fila), 12 (mensajes de
  error), 13 (botones Cancelar/Guardar) — todos dentro del rango 10-15px ya
  establecido.
- `boxShadow`: el botón "Guardar" usa `var(--shadow-glow-sm)` cuando está
  habilitado, mismo patrón que el botón "Agregar" de `AddUpdateForm`. No se
  introdujo ningún `boxShadow` custom.

## Verificación general

- `npm run verify` (lint + build + test + check-sdd-state): **pasa
  completo**. `npm run test` sigue en 13/13 (sin tests nuevos — no se agregó
  ninguna función pura nueva en `lib/`, tal como anticipaba `tasks.md`/T2;
  `mondayOf()`/`healthFromTimeline()` se reutilizan sin cambios y ya tienen
  cobertura en `lib/projects.test.ts`).
- `npm run build` confirma que la ruta nueva queda registrada:
  `ƒ /api/proyectos/[id]/avances/[updateId]`.

## Limitación de entorno (igual que features anteriores)

No hay `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`PIN`
configuradas en este sandbox (`.env.local` no existe). Para poder probar al
menos `401`/`400` de las rutas nuevas sin depender del login real (que
requiere el `PIN` real, tampoco disponible), forjé localmente un JWT válido
firmado con el mismo secreto de *fallback* que usa `lib/auth.ts` cuando
`JWT_SECRET` no está seteado (`"fallback-secret-change-me"`) — esto permitió
pasar el chequeo de `isAuthenticated()` y confirmar que la validación de
body (`R16`) funciona correctamente, y que el único bloqueo real para
`R17`-`R20` es la falta de credenciales de Supabase (confirmado por el
mensaje de error explícito del propio `getSupabaseAdmin()` en los logs del
servidor dev, no un fallo silencioso ni un bug de la ruta).

**Pendiente de QA humana end-to-end antes de uso real en dev** (mismo
criterio que dejaron `project-crud` y `weekly-update-entry`): editar/borrar
un avance real (200), el caso específico de `updateId` de **otro** proyecto
→ 404 (R18, el más fácil de pasar por alto), y confirmar en el dashboard de
Supabase que `project_weekly_updates` sigue sin policy para
`anon`/`authenticated` (R21). También queda pendiente la QA visual en
navegador de los controles de hover/formulario inline (R1-R14) — el código
se revisó pero no se pudo ver renderizado con datos reales por el mismo
bloqueo de credenciales.
