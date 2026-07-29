# Tasks — Agregar avances semanales (`project_weekly_updates`) desde `/proyectos`

Orden sugerido: helper puro + su test primero (rápido de verificar de forma
aislada), luego la ruta API (testeable vía curl), luego los componentes
compartidos/nuevos, luego integración en `ProjectForm.tsx`/
`ProjectDrawer.tsx`, luego verificación end-to-end.

- [x] **T1 — `mondayOf()` en `lib/projects.ts` + test** (`R13`)
  - Agregar `export function mondayOf(dateStr: string): string` según
    `design.md` (mediodía local para evitar corrimiento de timezone,
    formateo con `getFullYear`/`getMonth`/`getDate`, nunca
    `toISOString()`).
  - Agregar tests en `lib/projects.test.ts`: un lunes se mapea a sí mismo,
    un domingo se mapea al lunes anterior (no al siguiente), un miércoles
    a mitad de semana se mapea al lunes de esa semana, y un caso que cruce
    fin de mes (ej. `2026-08-01` sábado → lunes de julio) para confirmar
    que el cálculo de fecha no se rompe en el borde del mes.

- [x] **T2 — `POST /api/proyectos/<id>/avances`** (`R15`-`R18`)
  - Crear `app/api/proyectos/[id]/avances/route.ts` con `export async
    function POST(...)` según `design.md`: `isAuthenticated(req)` → `401`
    si falla; validar `weekOf`/`status` (uno de `on_track`/`at_risk`/
    `delayed`)/`note` (no vacía tras `trim()`) → `400` con mensaje si falta
    o es inválido algo; verificar que el proyecto (`id` de la ruta) existe
    (`select("id").maybeSingle()`, mismo patrón que `PATCH`/`DELETE
    /api/proyectos/<id>` de `project-crud`) → `404` si no; `insert` en
    `project_weekly_updates` vía `getSupabaseAdmin()` → `201` con
    `rowToUpdate(data)`.
  - Verificación manual: `curl -X POST` con y sin cookie, con body
    completo/incompleto/status inválido, y con un `id` de proyecto
    inexistente — confirmar `401`/`400`/`404`/`201` según corresponda, y
    que el `201` trae el shape de `WeeklyUpdate` (`id`, `weekOf`, `status`,
    `note`).

- [x] **T3 — `createWeeklyUpdate()` en `lib/projects.ts`** (`R4`, `R10`)
  - Agregar `WeeklyUpdateFormValues` y `createWeeklyUpdate(projectId,
    values)` según `design.md` — `fetch()` a la ruta de T2, propagando el
    mensaje de error del body de la respuesta cuando `!res.ok`. No
    requiere test de Vitest (no es lógica pura, es fetch); se verifica
    end-to-end vía T5/T6.

- [x] **T4 — `WeeklyUpdateFields.tsx` (componente compartido)** (`R13`, `R14`)
  - Nuevo componente en `app/proyectos/WeeklyUpdateFields.tsx` según
    `design.md`: `<input type="date">`, `<select>` de estado (usando
    `HEALTH_STATUS_LABELS` exportado desde `HealthBadge.tsx` — agregar
    ese export si no existe todavía), `<textarea>` de nota, y el texto
    "Semana del ..." calculado con `mondayOf()` + `weekLabel()` (exportar
    `weekLabel` desde `ProjectTimeline.tsx` si no está exportado).
  - Correr el skill `design-check` (obligatorio por tocar
    `app/proyectos/*.tsx` con estilos nuevos) y anotar el resultado en
    `progress/impl_weekly-update-entry.md`.

- [x] **T5 — Sección opcional en `ProjectForm.tsx` (primer avance al crear)** (`R1`-`R6`)
  - Agregar prop `showFirstUpdateSection: boolean` y el estado interno
    `update: WeeklyUpdateValues` descrito en `design.md`; renderizar
    `WeeklyUpdateFields` dentro de una sección "Primer avance semanal
    (opcional)" solo cuando `showFirstUpdateSection` es `true`.
  - Implementar la lógica de habilitación: los 3 campos vacíos → válido,
    sin avance (R2); parcialmente completo → deshabilita el submit +
    mensaje de ayuda (R3); completo → habilita submit normalmente.
  - Cambiar la firma de `onSubmit` a `(values, firstUpdate) => Promise<void>`,
    calculando `firstUpdate` como `null` o
    `{ weekOf: mondayOf(update.date), status: update.status, note: update.note.trim() }`
    según corresponda.
  - En `ProjectDrawer.tsx`: pasar `showFirstUpdateSection={project ===
    null}`, actualizar `handleFormSubmit` para el flujo en dos pasos de
    `design.md` (crear proyecto → si `firstUpdate` no es `null`, crear el
    avance con `createWeeklyUpdate`), agregar el estado
    `firstUpdateError` y su bloque de error en modo vista (R6), resetearlo
    junto con `formError`/`deleteError` en el cierre del drawer.
  - Correr `design-check` sobre `ProjectForm.tsx` de nuevo (cambios de
    estilo por la sección nueva) y anotar el resultado.

- [x] **T6 — `AddUpdateForm.tsx` + botón "Agregar avance" en `ProjectDrawer.tsx`** (`R7`-`R12`)
  - Nuevo componente `app/proyectos/AddUpdateForm.tsx`: envuelve
    `WeeklyUpdateFields` con botones "Cancelar"/"Agregar" (mismo lenguaje
    visual que `ProjectForm.tsx`), disabled mientras falte algún campo
    (R9) o mientras `onSubmit` esté pendiente, bloque de error opcional
    (R12) que no limpia los valores.
  - En `ProjectDrawer.tsx`: agregar estado `addingUpdate`/
    `addUpdateError`, botón "Agregar avance" junto al título "Avance
    semanal" (visible solo cuando `!addingUpdate`), renderizar
    `AddUpdateForm` encima de `ProjectTimeline` cuando `addingUpdate` es
    `true`, implementar `handleAddUpdate` según `design.md` (actualiza
    `project.updates` en memoria con el `WeeklyUpdate` devuelto, llama
    `onUpdated`, cierra el formulario en éxito).
  - Verificar manualmente que agregar un avance actualiza el
    `HealthBadge` del header sin recargar (se deriva de
    `healthFromTimeline`, no debería requerir cambio de código, solo
    confirmar que efectivamente se refresca).
  - Correr `design-check` sobre `AddUpdateForm.tsx`/`ProjectDrawer.tsx` y
    anotar el resultado.

- [x] **T7 — QA manual end-to-end**
  - Crear un proyecto **sin** avance (sección vacía) → confirmar que se
    crea normal, sin llamar a la ruta de avances (R2).
  - Crear un proyecto completando **parcialmente** la sección de avance
    (ej. solo la nota) → confirmar que el submit queda deshabilitado con
    el mensaje de ayuda visible (R3).
  - Crear un proyecto **con** avance completo → confirmar que aparece en
    `ProjectTimeline` apenas se abre el drawer en modo vista, sin
    recargar la página (R4), y que el `weekOf` guardado es el lunes de la
    semana elegida (verificar en Supabase Table Editor o vía el texto
    "Semana del ..." antes de confirmar).
  - Forzar un error en la creación del avance tras crear el proyecto
    exitosamente (ej. desconectar Supabase momentáneamente entre el paso
    1 y 2, o simular con devtools) → confirmar que el proyecto igual
    queda creado y visible, con el mensaje de error de R6 visible y
    distinguible del error de creación del proyecto.
  - Desde el drawer de un proyecto existente: agregar un avance nuevo vía
    "Agregar avance" → confirmar que aparece en la lista sin recargar
    (R10), que el `HealthBadge` del header se actualiza si el nuevo
    avance es el más reciente, y que cancelar el formulario (R11) no dejó
    ningún registro en Supabase.
  - Forzar un error en `POST /api/proyectos/<id>/avances` (ej. nota vacía
    enviada manualmente vía devtools, o desconectar Supabase) → confirmar
    que el formulario inline muestra el error y no pierde los valores
    ingresados (R12).
  - Confirmar con `curl` (sin cookie) que `POST
    /api/proyectos/<id>/avances` responde `401` en los 3 flujos de
    entrada (R15/R19).

- [x] **T8 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state) —
    debe incluir los tests nuevos de `mondayOf()` de T1.
  - Confirmar en el dashboard de Supabase (Table Editor → Policies) que
    `project_weekly_updates` sigue sin ninguna policy para
    `anon`/`authenticated` tras esta feature (R19).
  - Escribir `progress/impl_weekly-update-entry.md` con, para cada
    `R1`-`R19`: el o los archivo(s) tocados y cómo se verificó (test de
    Vitest para R13 vía `mondayOf()`, QA manual para el resto). Incluir
    los resultados de `design-check` de T4/T5/T6.
  - Si algo se bloquea por falta de acceso al entorno de Supabase de dev
    (por ejemplo, para confirmar que el `INSERT` respeta el `check` de
    `status` o las policies), reportarlo explícitamente acá en vez de
    asumir que funciona — mismo criterio que dejó pendiente
    `project-crud`.
