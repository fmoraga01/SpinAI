# Tasks — Mover el campo de estado al proyecto

Orden sugerido: migración SQL primero (documentada, no aplicada por
`implementer` — ningún agente tiene credenciales de Supabase, mismo
criterio que las cuatro specs anteriores), luego tipos/`lib/`, luego rutas
API (testeables vía curl), luego componentes de formulario, luego
badge/tarjetas, luego verificación end-to-end.

- [x] **T1 — Migración SQL** (`R1`-`R6`)
  - Crear `supabase/migrations/20260729120000_mover_status_a_projects.sql`
    (ajustar el timestamp del nombre a la hora real de creación del
    archivo si difiere) con el contenido exacto de `design.md` sección
    "Migración SQL": columna nullable → backfill correlacionado por
    proyecto (con `'on_track'` de fallback si un proyecto no tiene
    avances) → `not null` + `check` → `drop column status` en
    `project_weekly_updates`.
  - No aplicar la migración en ningún Supabase real — este sandbox no
    tiene credenciales; dejar el `.sql` listo para que el humano lo corra
    manualmente en el SQL Editor de dev, documentando ese paso en
    `progress/impl_project-status-field.md`.
  - No editar `supabase/migrations/20260728120000_crear_projects.sql` ni
    `20260728140000_reemplazar_seed_projects.sql` — ambas ya aplicadas,
    quedan tal cual.

- [x] **T2 — Tipos y `lib/projects.ts`** (`R7`-`R14`)
  - `lib/types.ts`: `Project` gana `status: HealthStatus`; `WeeklyUpdate`
    pierde `status`.
  - `lib/projects.ts`: `rowToProject()` incluye `status: row.status`;
    `rowToUpdate()` deja de leer `status`; `ProjectFormValues` gana
    `status: HealthStatus`; `WeeklyUpdateFormValues` pierde `status`;
    agregar `export const VALID_STATUSES: HealthStatus[] = ["on_track",
    "at_risk", "delayed"];`; eliminar `healthFromTimeline()`.
  - `lib/projects.test.ts`: eliminar el bloque
    `describe("healthFromTimeline", ...)` completo (4 tests) — no tocar el
    bloque `describe("mondayOf", ...)`.
  - Actualizar los tipos `UpdateRow`/`ProjectRow` internos de
    `lib/projects.ts` (`interface UpdateRow`/`interface ProjectRow`) para
    reflejar el cambio de columnas (agregar `status` a `ProjectRow`,
    quitarlo de `UpdateRow`).
  - Verificación: `npm run test` pasa sin el bloque eliminado; `npm run
    build` no reporta errores de tipos por los usos de `healthFromTimeline`
    que aún no se hayan actualizado en T3-T5 (si build falla acá por eso,
    es esperado hasta completar esas tasks — no es un bug de T2).

- [x] **T3 — Rutas API `/api/proyectos`** (`R27`-`R29`)
  - `app/api/proyectos/route.ts` (`POST`): agregar `status` a la
    desestructuración del body, a la validación (`VALID_STATUSES` de
    `lib/projects.ts`) y al `insert`.
  - `app/api/proyectos/[id]/route.ts` (`PATCH`): mismo cambio en la
    desestructuración, validación y `update`.
  - Verificación manual: `curl` sin `status` (esperar `400` mencionando
    `"status"`), con `status` inválido (`"foo"`, esperar `400`), con
    `status` válido (esperar `201`/`200` con el `Project` reflejando el
    valor enviado) — para ambas rutas.

- [x] **T4 — Rutas API `/api/proyectos/<id>/avances`** (`R30`-`R32`)
  - `app/api/proyectos/[id]/avances/route.ts` (`POST`): quitar `status` de
    la desestructuración/validación/`insert`; eliminar el `VALID_STATUSES`
    local duplicado (usar el de `lib/projects.ts` si sigue haciendo falta
    en el archivo, o quitarlo si ya no se usa ahí).
  - `app/api/proyectos/[id]/avances/[updateId]/route.ts` (`PATCH`): mismo
    cambio en desestructuración/validación/`update`; eliminar el
    `VALID_STATUSES` local duplicado de este archivo también.
  - Verificación manual: `curl` con body `{ weekOf, note }` sin `status`
    (esperar `201`/`200`, ya no `400` por falta de `status`); `curl` con un
    `status` extra en el body (esperar que se ignore, sin `400`, y que la
    fila insertada/actualizada no tenga ese campo en la respuesta).

- [x] **T5 — `WeeklyUpdateFields.tsx`** (`R20`)
  - Eliminar el `<Field label="Estado">` y su `<select>`; eliminar el
    campo `status` de la interfaz `WeeklyUpdateValues`; eliminar imports
    que ya no se usan (`HealthStatus`, `HEALTH_STATUS_LABELS` si dejan de
    ser necesarios en este archivo).
  - Correr el skill `design-check` (obligatorio por tocar
    `app/proyectos/*.tsx` con cambios de layout) y anotar el resultado en
    `progress/impl_project-status-field.md`.

- [x] **T6 — `AddUpdateForm.tsx` y `ProjectTimeline.tsx`** (`R21`-`R23`)
  - `AddUpdateForm.tsx`: `isValid` pasa a `values.date !== "" &&
    values.note.trim() !== ""`; el payload enviado a `onSubmit` deja de
    incluir `status`.
  - `ProjectTimeline.tsx`: `isEditValid` pasa a `editValues.date !== "" &&
    editValues.note.trim() !== ""`; `startEdit()` deja de precargar
    `status`; el payload de `confirmEdit()` deja de incluir `status`.
  - Verificación manual: agregar un avance sin selector de estado visible;
    editar una fila del timeline sin selector de estado visible.

- [x] **T7 — `ProjectForm.tsx`** (`R15`-`R19`)
  - Agregar el campo "Estado" (`<select>` con `HEALTH_STATUS_LABELS`) como
    quinto campo del formulario, con el mismo estilo/`focusHandlers()` que
    los campos existentes; incluir en `isValid` (5 condiciones);
    prellenar con `initialValues.status` en modo edición.
  - `ProjectFormValues` que recibe `initialValues`/envía `onSubmit` ya
    trae `status` desde T2 — conectar el nuevo `<select>` al estado local
    `values.status`.
  - Sección "Primer avance semanal (opcional)": quitar el `<select>` de
    estado (ya lo hizo T5 a nivel de `WeeklyUpdateFields`, acá solo ajustar
    el conteo `updateFieldsFilled`/`updateIsPartial` de 3 a 2 campos, y el
    payload `firstUpdate` construido en `handleSubmit`).
  - `ProjectDrawer.tsx`: pasar `status: project?.status ?? "on_track"` (o
    el valor por defecto que decida `implementer` para modo creación —
    documentar la elección) como parte de `initialValues` al renderizar
    `ProjectForm`.
  - Verificación manual: crear un proyecto nuevo eligiendo cada uno de los
    3 estados y confirmar que el badge de la tarjeta resultante coincide;
    editar un proyecto existente y confirmar que el `<select>` de Estado
    aparece prellenado con el valor actual.

- [x] **T8 — Badge y tarjetas** (`R24`-`R26`)
  - `HealthBadge.tsx`: cambiar la prop a `status: HealthStatus` (sin `|
    null`), eliminar la rama `if (status === null)`.
  - `ProjectCard.tsx`: reemplazar `const status =
    healthFromTimeline(project.updates);` por `const status =
    project.status;` (o inline directo en el JSX).
  - `ProjectDrawer.tsx`: reemplazar `<HealthBadge
    status={healthFromTimeline(project.updates)} />` por `<HealthBadge
    status={project.status} />` en el header.
  - Verificación: `npm run build` sin errores de tipos (confirma que no
    queda ningún caller pasando `null`/`undefined` a `HealthBadge`).

- [x] **T9 — QA manual end-to-end** (parcial — documentar en
  `progress/impl_project-status-field.md` qué se pudo verificar en este
  sandbox sin credenciales de Supabase/PIN, mismo criterio que las cuatro
  specs anteriores; el resto queda pendiente de QA humana antes de dar por
  buena la feature en dev)
  - Con la migración aplicada por el humano en Supabase de dev: cargar
    `/proyectos`, confirmar que "Probador Virtual" muestra el badge
    correcto (`on_track`, heredado del backfill) sin ningún avance nuevo.
  - Crear un proyecto nuevo con estado "En riesgo" y sin avance inicial →
    confirmar que la tarjeta muestra el badge correspondiente
    inmediatamente.
  - Editar un proyecto existente cambiando solo su Estado (sin tocar
    avances) → confirmar que el badge de la tarjeta y del header del
    drawer cambian, sin recargar la página.
  - Agregar/editar/eliminar un avance semanal (fecha + nota únicamente) →
    confirmar que el badge del proyecto **no** cambia como efecto de esa
    acción (consecuencia esperada, ver `design.md`).
  - Confirmar con `curl` que `POST`/`PATCH /api/proyectos...` responden
    `400` si falta `status` o es inválido, y que `POST`/`PATCH
    .../avances...` ya no lo piden.

- [x] **T10 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state).
  - Escribir `progress/impl_project-status-field.md` con, para cada
    `R1`-`R32`: el o los archivo(s) tocados y cómo se verificó (test de
    Vitest para lo que sigue viviendo en `lib/` — notar explícitamente que
    `healthFromTimeline` y sus tests fueron **eliminados**, no que
    "no aplica"; QA manual para el resto). Incluir el resultado de
    `design-check` de T5.
  - Confirmar explícitamente en ese documento que la migración SQL de T1
    **no fue aplicada** por `implementer` (sin credenciales) y que queda
    pendiente de que el humano la corra manualmente en Supabase de dev
    antes de que el código de esta feature pueda funcionar contra datos
    reales — mismo patrón de nota que ya usan `project-crud` y
    `weekly-update-entry` en `feature_list.json`.
