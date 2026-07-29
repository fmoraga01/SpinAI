# Tasks — CRUD de Proyectos (`/proyectos`)

Orden sugerido: rutas API primero (testeable/curl-eable de forma aislada),
luego `lib/projects.ts`, luego componentes de formulario/modal, luego
integración en `page.tsx`/`ProjectDrawer.tsx`, luego verificación.

- [x] **T1 — `POST /api/proyectos`** (`R16`, `R17`, `R18`)
  - Agregar `export async function POST(req: NextRequest)` a
    `app/api/proyectos/route.ts` (junto al `GET` existente, sin tocarlo):
    `isAuthenticated(req)` → `401` si falla; validar `name`/`summary`/
    `country`/`businessUnit` no vacíos tras `trim()` → `400` con mensaje si
    falta alguno; `insert` vía `getSupabaseAdmin()` con `select` anidado
    `*, project_kpis(*), project_weekly_updates(*)` → `201` con
    `rowToProject(data)`.
  - Verificación manual: `curl -X POST` con y sin cookie, con body
    completo/incompleto — confirmar `401`/`400`/`201` según corresponda y
    que el `201` trae `kpis: []`, `updates: []`.

- [x] **T2 — `PATCH` y `DELETE` en `/api/proyectos/[id]`** (`R19`-`R25`)
  - Agregar `export async function PATCH(...)` a
    `app/api/proyectos/[id]/route.ts`: misma validación de auth/campos que
    T1, `update().eq("id", id)` vía `getSupabaseAdmin()`, `maybeSingle()`
    para distinguir `404` (id inexistente) de `200` con el `Project`
    actualizado. Manejar `error.code === "22P02"` igual que el `GET`
    existente (id que no parsea como uuid = "no encontrado", no error 500).
  - Agregar `export async function DELETE(...)` al mismo archivo: auth →
    `401`; verificar existencia (`select("id").maybeSingle()`) → `404` si
    no existe; `delete().eq("id", id)` → `200` con `{ ok: true }`.
  - Verificación manual: `curl -X PATCH`/`curl -X DELETE` con id
    existente/inexistente, con y sin cookie — confirmar los 4 códigos de
    estado (`401`/`400`/`404`/`200`) según el caso. Confirmar en el
    dashboard de Supabase (Table Editor) que borrar un proyecto también
    borra sus filas de `project_kpis`/`project_weekly_updates` (cascada ya
    definida en la migración de `project-status-tracking`, no requiere
    migración nueva acá).

- [x] **T3 — `lib/projects.ts`: `createProject`/`updateProject`/`deleteProject`** (`R3`, `R8`, `R13`)
  - Agregar `ProjectFormValues`, `createProject(values)`,
    `updateProject(id, values)`, `deleteProject(id)` según `design.md` —
    `fetch()` a las rutas de T1/T2, propagando el mensaje de error del
    body de la respuesta cuando `!res.ok`.
  - Si alguna de estas funciones queda como lógica pura testeable sin red
    (por ejemplo, un futuro helper de validación de `ProjectFormValues`
    compartido entre cliente y servidor), agregar su test en
    `lib/projects.test.ts`; las funciones de fetch en sí no son pure
    functions — no requieren Vitest, se verifican manualmente vía T1/T2 +
    T6 (QA end-to-end).

- [x] **T4 — `ProjectForm.tsx`** (`R2`, `R4`, `R7`, `R8`, `R9`, `R5`, `R10`)
  - Nuevo componente en `app/proyectos/ProjectForm.tsx` según el shape de
    props descrito en `design.md`: 4 campos controlados, botón submit
    disabled mientras falte algún campo (R4), estado `submitting` para
    evitar doble-submit, bloque de error opcional que no limpia los
    valores (R5/R10).
  - Correr el skill `design-check` (obligatorio por tocar
    `app/components/*.tsx`/`app/proyectos/*.tsx` con estilos nuevos) y
    anotar el resultado en `progress/impl_project-crud.md`.

- [x] **T5 — `CreateProjectCard.tsx` y `DeleteProjectModal.tsx`** (`R1`, `R12`, `R14`)
  - `app/proyectos/CreateProjectCard.tsx`: card con ícono `+` y label,
    estilo fill tenue del color primario descrito en `design.md`.
  - `app/proyectos/DeleteProjectModal.tsx`: modal centrado con nombre del
    proyecto + advertencia de cascada, botones Cancelar/Eliminar,
    `Escape`/backdrop cierran sin eliminar (R14), estado `deleting` +
    `error` opcional (R15, verificado junto con T7).
  - Correr `design-check` sobre estos dos componentes también (mismo
    criterio que T4) y anotar el resultado.

- [x] **T6 — Integrar modos en `ProjectDrawer.tsx`** (`R2`, `R6`, `R7`, `R9`, `R11`, `R12`, `R14`)
  - Agregar el estado interno `formMode: "view" | "form"` y el prop
    `mode: "view" | "create"` descritos en `design.md`. Renderizar
    `ProjectForm` en `formMode === "form"` (vacío si viene de "create",
    prellenado si viene de "Editar"); agregar botones "Editar"/"Eliminar"
    al header en `formMode === "view"` (junto al `HealthBadge` existente).
  - Cablear `onSubmit` de `ProjectForm` a `createProject`/`updateProject`
    según si `projectId` es `null` o no; cablear `DeleteProjectModal` al
    click de "Eliminar", con `deleteProject` en su `onConfirm`.
  - Verificar manualmente que `Escape` con `DeleteProjectModal` abierto
    cierra solo el modal, no el drawer de fondo (nota de riesgo señalada
    en `design.md`, sección `DeleteProjectModal.tsx`) — ajustar el
    listener de `keydown` de `ProjectDrawer` si hace falta para que no
    dispare mientras el modal está montado.

- [x] **T7 — Integrar en `page.tsx`** (`R1`, `R3`, `R8`, `R13`, `R15`)
  - Agregar estado `creating: boolean` junto al `selectedId` existente;
    renderizar `CreateProjectCard` como primer ítem del grid (antes del
    `.map()` de `ProjectCard`); pasar `mode`/callbacks `onCreated`/
    `onUpdated`/`onDeleted` a `ProjectDrawer` según lo descrito en
    `design.md` (actualización del array `projects` en memoria, sin
    refetch completo).
  - QA manual completa del flujo: crear un proyecto de punta a punta
    (aparece en el grid sin recargar), editarlo (los campos se reflejan
    en la card y en el drawer), cancelar una edición a medio hacer
    (los valores originales se mantienen, R9), eliminarlo (desaparece del
    grid, drawer se cierra), forzar un error de red/servidor en cada
    operación (desconectar Supabase momentáneamente o similar) y
    confirmar que R5/R10/R15 se cumplen (mensaje de error visible, datos
    no se pierden / proyecto no desaparece prematuramente).

- [x] **T8 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state).
  - Verificación manual específica de seguridad (R16, R19, R23):
    `curl` a `POST`/`PATCH`/`DELETE` sin cookie `spinai_token` → confirmar
    `401` en los 3 casos y que ningún body de respuesta trae datos.
  - Confirmar en el dashboard de Supabase (Table Editor → Policies) que
    `projects`/`project_kpis`/`project_weekly_updates` siguen sin ninguna
    policy para `anon`/`authenticated` tras esta feature (R26 — no debería
    haber cambiado nada acá, es una verificación de que no se introdujo
    una policy nueva por error).
  - Escribir `progress/impl_project-crud.md` con, para cada `R1`-`R26`: el
    o los archivo(s) tocados y cómo se verificó (QA manual para
    prácticamente todos los requirements de esta feature — no hay lógica
    pura nueva en `lib/` más allá de las funciones de fetch de T3, que se
    verifican end-to-end vía T7; si `implementer` extrae alguna función
    pura testeable durante la implementación, agregar su test y anotarlo
    acá también).
  - Si algo de esto se bloquea por falta de acceso al entorno de Supabase
    de dev (por ejemplo, para confirmar la cascada de borrado o las
    policies), reportarlo explícitamente acá en vez de asumir que
    funciona.
