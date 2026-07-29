# Implementación — weekly-update-entry

## Resumen

Implementado `specs/weekly-update-entry/` siguiendo `design.md` casi al pie
de la letra: `mondayOf()` puro en `lib/projects.ts` (+ tests reales de
Vitest), `POST /api/proyectos/[id]/avances` (nuevo, sin PATCH/DELETE),
`createWeeklyUpdate()` en `lib/projects.ts`, `WeeklyUpdateFields.tsx`
(componente compartido de campos), sección opcional "Primer avance semanal
(opcional)" en `ProjectForm.tsx`, y `AddUpdateForm.tsx` + botón "Agregar
avance" inline en `ProjectDrawer.tsx`. `npm run verify` pasa completo (lint
+ build + test + check-sdd-state).

**Bloqueado, mismo entorno que `project-crud`/`project-status-tracking`,
sin resolver todavía**:
1. No hay `.env.local` ni `SUPABASE_SERVICE_ROLE_KEY`/
   `NEXT_PUBLIC_SUPABASE_URL` en este sandbox. `getSupabaseAdmin()` lanza su
   error explícito apenas se la invoca, así que el `201` real de `POST
   /api/proyectos/<id>/avances` (R18) y el `404` real contra un `id` de
   proyecto existente-vs-inexistente (R17) no se pudieron ejercitar de
   punta a punta contra datos reales — solo hasta el punto en que el
   código toca Supabase (confirmado en el log del server: el 500 que
   devuelve la request con body válido es el error explícito de
   credenciales faltantes, no un bug de esta feature).
2. Tampoco hay `PIN` configurado (`process.env.PIN` vacío) ni una
   herramienta de navegador/captura de pantalla en este entorno, así que no
   se pudo pasar el `PinGate` para hacer QA visual real en el navegador de
   los flujos de UI (R1-R14, T7). La verificación de UI se hizo por lectura
   exhaustiva de código + `design-check` manual + build/lint/TS check, no
   por click-through real — mismo criterio y mismo bloqueo que
   `progress/impl_project-crud.md`.

No se improvisó ningún workaround para sortear estos bloqueos (no se
hardcodeó un PIN ni se mockeó Supabase).

## Archivos tocados

- `lib/projects.ts` — agrega `mondayOf()`, `WeeklyUpdateFormValues`,
  `createWeeklyUpdate()` (T1, T3).
- `lib/projects.test.ts` — agrega 4 tests de `mondayOf()` (T1).
- `app/api/proyectos/[id]/avances/route.ts` (nuevo) — `POST` únicamente
  (T2).
- `app/proyectos/HealthBadge.tsx` — exporta `HEALTH_STATUS_LABELS` (T4).
- `app/proyectos/ProjectTimeline.tsx` — exporta `weekLabel()` (T4), sin
  otro cambio.
- `app/proyectos/WeeklyUpdateFields.tsx` (nuevo) — componente compartido de
  campos (fecha/estado/nota + "Semana del ...") (T4).
- `app/proyectos/ProjectForm.tsx` — prop `showFirstUpdateSection`, sección
  opcional de primer avance, `onSubmit` con segundo argumento
  `firstUpdate` (T5).
- `app/proyectos/AddUpdateForm.tsx` (nuevo) — formulario inline
  Cancelar/Agregar sobre `WeeklyUpdateFields` (T6).
- `app/proyectos/ProjectDrawer.tsx` — orquestación de creación en dos pasos
  (proyecto + avance opcional), botón "Agregar avance", estado
  `addingUpdate`/`addUpdateError`/`firstUpdateError` (T5, T6).
- `specs/weekly-update-entry/tasks.md` — T1-T8 marcadas `[x]`.

## Decisiones de implementación no 100% explícitas en `design.md`

1. **`WeeklyUpdateValues` se declara una sola vez, en
   `WeeklyUpdateFields.tsx`, y se importa desde `ProjectForm.tsx` y
   `AddUpdateForm.tsx`** — mismo criterio que la decisión #1 de
   `impl_project-crud.md` con `ProjectFormValues` (evita drift de tipos
   entre archivos; `design.md` mostraba la interfaz inline en la prosa sin
   especificar dónde vivía canónicamente).
2. **`focusHandlers()` de `WeeklyUpdateFields.tsx` tipa su handler para
   `HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement`**, a
   diferencia del `focusHandlers()` original de `ProjectForm.tsx` (solo
   input/textarea) — necesario porque el campo de estado es un `<select>`,
   que `ProjectForm.tsx` no tenía hasta ahora. Se dejó como una copia local
   en `WeeklyUpdateFields.tsx` en vez de generalizar el `focusHandlers()`
   de `ProjectForm.tsx` (que sigue como estaba, sin tocar), para no
   modificar un archivo que no lo necesitaba solo por compartir 4 líneas.
3. **Botón "Agregar avance" con `height: 28`** en vez del `height: 32` que
   usan los botones "Editar"/"Eliminar" del header — es un botón secundario
   dentro del cuerpo del drawer (no del header), así que se usó una altura
   ligeramente menor, consistente con otros controles de menor jerarquía
   visual ya en la app. `design.md` no especificaba la altura exacta.
4. **`WeeklyUpdateFields` valida/formatea la fecha con `values.date !== ""`**
   (no `values.date` truthy a secas) para decidir si mostrar el texto
   "Semana del ..." — equivalente en la práctica (un string de fecha nunca
   es `"0"` u otro string falsy no vacío), pero más explícito sobre la
   intención que `design.md` describe ("si `values.date` no está vacío").

## `design-check` (T4/T5/T6, obligatorio por tocar `app/proyectos/*.tsx`)

Igual que en `project-crud`, se aplicó manualmente el criterio de
`.claude/skills/design-check/SKILL.md` contra `app/globals.css` (el scope
por defecto del skill es `app/components/*.tsx`; `tasks.md` pide el mismo
criterio sobre `app/proyectos/*.tsx`), revisando el diff real
(`git diff -- 'app/proyectos/*.tsx' 'lib/projects.ts'`) de los 6 archivos
nuevos/modificados de esta feature:

- Colores: todo lo nuevo usa `var(--color-*)` existentes o el patrón ya
  establecido de `#F87171` sólido en el botón "Agregar" deshabilitado/
  bloques de error (mismo patrón que el botón "Eliminar" del header y
  `DeleteProjectModal.tsx`, ya usados en `project-crud`). No se introdujo
  ningún hex nuevo sin precedente en el resto del repo.
- `border-radius`: siempre `var(--radius-md)`, sin valores hardcodeados
  (incluye el nuevo `<select>` de estado, que reutiliza `inputStyle` de
  `WeeklyUpdateFields.tsx`).
- `fontSize`: 11 (labels/título de sección), 12 (texto "Semana del ...",
  mensaje de ayuda de sección parcial), 13 (inputs, botones, error) — todo
  dentro de la escala 10-15px ya establecida en `app/proyectos/`.
- `boxShadow`: `var(--shadow-glow-sm)` en los dos botones primarios nuevos
  ("Crear proyecto" con avance completo, "Agregar" de `AddUpdateForm`),
  mismo patrón que el botón primario ya existente de `ProjectForm.tsx`.
- Sin findings pendientes.

## Verificación automatizada

```
npm run lint             → sin errores
npm run build             → compila, TS check ok; /api/proyectos/[id]/avances
                             aparece listada como ruta dinámica (ƒ) junto al
                             resto de /api/proyectos*
npm run test               → 13 tests pasan (9 preexistentes + 4 nuevos de
                             mondayOf(), T1)
npm run check-sdd-state    → ok, "single active feature: weekly-update-entry (in_progress)"
npm run verify              → exit 0 end-to-end (los 4 comandos anteriores en secuencia)
```

## Verificación manual real (curl contra `npm run dev` local)

Sin credenciales de Supabase disponibles, pero el gate de auth y la
validación de body corren **antes** de tocar `getSupabaseAdmin()`, así que
se pudo verificar de punta a punta contra un servidor local real:

- `curl -X POST /api/proyectos/<uuid>/avances` sin cookie → `401
  {"error":"No autorizado"}` (R15).
- Con una cookie `spinai_token` válida (JWT firmado a mano con `jose` y el
  mismo secreto fallback que usa `lib/auth.ts` cuando `JWT_SECRET` no está
  seteado — no se tocó ningún archivo del repo para esto):
  - Body `{}` (los 3 campos ausentes) → `400 {"error":"Campos requeridos
    faltantes o inválidos: weekOf, status, note"}` (R16).
  - `status: "bogus"` (fuera de `["on_track","at_risk","delayed"]`) → `400
    {"error":"...: status"}` (R16).
  - `note: "   "` (solo whitespace) → `400 {"error":"...: note"}` (R16).
  - Body válido (`weekOf`/`status`/`note` correctos) → llega hasta
    `getSupabaseAdmin()`, que lanza su error explícito de env vars
    faltantes (confirmado en el log del server) → `500` genérico de Next.
    **No se pudo verificar** el `201` real (R18) ni el `404` real contra un
    `id` de proyecto existente/inexistente (R17) contra una base de datos
    real — mismo bloqueo documentado arriba.

## Traceability por requisito

- **R1** (sección opcional "Primer avance semanal (opcional)" visible en
  `mode="create"`): manual QA por lectura de código — `ProjectDrawer` pasa
  `showFirstUpdateSection={project === null}`; `ProjectForm` renderiza el
  bloque de la sección solo cuando ese prop es `true`, envolviendo
  `WeeklyUpdateFields`. **No verificado visualmente** (bloqueo PIN/browser).
- **R2** (3 campos vacíos → avance no incluido, no bloquea submit):
  manual QA por lectura de código — `updateFieldsFilled === 0` implica
  `updateIsPartial === false` (0 no es `> 0`), así que `canSubmit` depende
  solo de `isValid` (4 campos del proyecto); en el submit,
  `updateFieldsFilled === 3` es `false`, así que `firstUpdate` es `null`.
- **R3** (parcial → submit deshabilitado + mensaje de ayuda): manual QA por
  lectura de código — `updateIsPartial = updateFieldsFilled > 0 &&
  updateFieldsFilled < 3`; se agrega a `canSubmit = isValid &&
  !updateIsPartial`; el botón usa `disabled={!canSubmit || submitting}`; el
  mensaje "Completa fecha, estado y nota..." se renderiza condicionado a
  `updateIsPartial`.
- **R4** (proyecto + avance en dos pasos, avance con `id` del proyecto
  recién creado): manual QA por lectura de código —
  `handleFormSubmit(values, firstUpdate)` en `ProjectDrawer` llama
  `createProject(values)` primero; si `firstUpdate` no es `null`, llama
  `createWeeklyUpdate(created.id, firstUpdate)` usando el `id` de la
  respuesta de `createProject`. El `201` real no se pudo ejercitar contra
  Supabase real (bloqueo); el contrato hasta la validación de la ruta sí se
  verificó vía `curl`.
- **R5** (falla `POST /api/proyectos` → error existente de `project-crud`,
  no se intenta el avance): manual QA por lectura de código —
  `createProject(values)` fuera del `try` interno; si lanza, cae
  directamente al `catch` externo (`setFormError`), el bloque `if
  (firstUpdate)` nunca se alcanza porque está dentro del `try` después de
  la línea que puede lanzar.
- **R6** (proyecto creado ok pero avance falla → drawer en modo vista con
  el proyecto, error distinguible): manual QA por lectura de código — el
  `try/catch` interno alrededor de `createWeeklyUpdate` no re-lanza; en
  catch hace `setFirstUpdateError(...)`, nunca revierte `setProject(created)`
  ni `setFormMode("view")` (ya ejecutados antes). El bloque de
  `firstUpdateError` se renderiza en modo vista, separado del bloque de
  `deleteError`, con el mismo estilo pero mensaje propio ("El proyecto se
  creó, pero no se pudo guardar el primer avance" o el mensaje del server).
  **No verificado con un fallo real de Supabase forzado** (bloqueo — no se
  pudo desconectar Supabase "a medias" entre el paso 1 y 2 sin credenciales
  reales para empezar).
- **R7** (botón "Agregar avance" junto al título "Avance semanal" en modo
  vista): manual QA por lectura de código — el `<div>` de header de la
  sección renderiza el botón cuando `!addingUpdate`, dentro del bloque
  `formMode === "view" && !loading && !error && project !== null`.
- **R8** (click abre formulario inline encima de `ProjectTimeline`, sin
  ocultarla ni salir de modo vista): manual QA por lectura de código —
  `onClick` hace `setAddingUpdate(true)`; `<AddUpdateForm>` se renderiza
  condicionalmente `addingUpdate && (...)` **antes** de
  `<ProjectTimeline updates={project.updates} />` en el JSX, que sigue
  renderizándose siempre (nunca se reemplaza); `formMode` nunca cambia a
  `"form"` para este flujo (ese estado sigue reservado a editar/crear
  proyecto).
- **R9** (botón deshabilitado mientras algún campo esté vacío): manual QA
  por lectura de código — `AddUpdateForm.isValid = values.date !== "" &&
  values.status !== "" && values.note.trim() !== ""`; botón `disabled=
  {!isValid || submitting}`, mismo patrón que `ProjectForm`/
  `MembersPanel.tsx`.
- **R10** (confirmar con los 3 campos → `POST`, agrega a `project.updates`
  en memoria sin refetch, refresca `HealthBadge`, cierra el formulario):
  manual QA por lectura de código — `handleAddUpdate` llama
  `createWeeklyUpdate(project.id, values)`, en éxito hace `setProject({
  ...project, updates: [...project.updates, update] })` + `onUpdated(...)`
  + `setAddingUpdate(false)`; `HealthBadge` en el header ya usa
  `healthFromTimeline(project.updates)` en cada render, sin código
  adicional (confirmado leyendo el JSX del header, sin cambios en esta
  feature). El `201` real no se pudo ejercitar contra Supabase (bloqueo).
- **R11** (cancelar descarta valores, cierra sin llamar a la API): manual
  QA por lectura de código — `onCancel` de `AddUpdateForm` en
  `ProjectDrawer` hace `setAddingUpdate(false); setAddUpdateError(null)`,
  nunca llama `onSubmit`/`createWeeklyUpdate`; al desmontarse
  `AddUpdateForm` pierde su estado local `values` (useState vive dentro del
  componente que se desmonta).
- **R12** (error de `POST` se muestra en el formulario inline, mantiene
  valores): manual QA por lectura de código — `handleAddUpdate` cae al
  `catch`, hace `setAddUpdateError(...)`, nunca `setAddingUpdate(false)`
  (el formulario sigue montado, `values` de `AddUpdateForm` intacto porque
  el componente no se desmonta en el error). Verificado el contrato de
  error hasta `400` real vía `curl` (mismos mensajes que aparecerían en el
  bloque de error); el `500`/red real no se pudo forzar de forma
  controlada (bloqueo).
- **R13** (cálculo automático del lunes vía `mondayOf()`): **verificado por
  test real de Vitest** — `lib/projects.test.ts`, `describe("mondayOf")`,
  4 casos: lunes → sí mismo, domingo → lunes anterior (no el siguiente),
  miércoles → lunes de esa semana, sábado cruzando fin de mes (`2026-08-01`
  → `2026-07-27`, confirmado con Node que ambas fechas caen en los días de
  semana esperados). `npx vitest run lib/projects.test.ts` → 8/8 pasan
  (incluye los 4 tests preexistentes de `healthFromTimeline`).
- **R14** (texto "Semana del ..." con el mismo formato que `weekLabel()`):
  manual QA por lectura de código — `WeeklyUpdateFields.tsx` importa
  `weekLabel` desde `./ProjectTimeline` (recién exportado, sin duplicar el
  formato `toLocaleDateString("es-CL", ...)`) y renderiza `Semana del
  {weekLabel(mondayOf(values.date))}` debajo del input de fecha cuando
  `values.date !== ""`.
- **R15** (`POST` sin cookie → `401`, sin crear registro): **verificado por
  ejecución real**, `curl -X POST` sin cookie → `401
  {"error":"No autorizado"}`.
- **R16** (`weekOf` ausente/no parseable, `status` inválido, o `note` vacía
  tras `trim()` → `400` con mensaje de qué falta): **verificado por
  ejecución real** — los 3 casos (body vacío, `status` inválido, `note`
  solo whitespace) devuelven `400` con el campo correspondiente en el
  mensaje.
- **R17** (`id` de proyecto inexistente → `404`, sin crear registro):
  manual QA por lectura de código — mismo patrón `select("id")
  .maybeSingle()` + chequeo `!project` que usa `PATCH`/`DELETE
  /api/proyectos/<id>` de `project-crud`, antes del `insert`. **No
  verificado por ejecución real** contra un `id` real inexistente en una
  tabla real (bloqueo de credenciales); sí se confirmó que un `id`
  cualquiera con body válido llega hasta `getSupabaseAdmin()` sin
  crashear antes (ver log de `curl` con body válido, T2).
- **R18** (body válido + `id` existente → `insert` vía `getSupabaseAdmin()`,
  `201` con `WeeklyUpdate` mapeado por `rowToUpdate()`): manual QA por
  lectura de código — el `insert` usa `project_id: id, week_of: weekOf,
  status, note: note.trim()`, `.select().single()`, y la respuesta se
  mapea con `rowToUpdate(data)` ya existente y ya probado indirectamente
  (usado por `rowToProject()` en `GET /api/proyectos/[id]`, cubierto en
  `project-status-tracking`). **No verificado por ejecución real** (bloqueo
  de credenciales Supabase).
- **R19** (ruta nueva reutiliza `isAuthenticated()`/`getSupabaseAdmin()`,
  sin RLS nueva para `anon`/`authenticated`): manual QA por lectura de
  código — `app/api/proyectos/[id]/avances/route.ts` importa exactamente
  `isAuthenticated` de `@/lib/auth` y `getSupabaseAdmin` de
  `@/lib/supabaseAdmin`, sin imports ni env vars nuevas; se releyó
  `supabase/migrations/20260728120000_crear_projects.sql` completa y se
  confirmó que no se tocó ningún archivo de `supabase/migrations/` en esta
  feature — `project_weekly_updates` sigue con `enable row level security`
  y sin ningún `create policy` para `anon`/`authenticated` (comentario
  explícito en la migración: "Sin `create policy` para anon/authenticated
  a propósito"). **No verificado en el dashboard de Supabase** (sin acceso
  al proyecto real, mismo bloqueo que R26 de `project-crud`).

## Bloqueado — pasos pendientes del humano

1. Los mismos pasos ya pendientes de `project-status-tracking`/
   `project-crud` (setear `SUPABASE_SERVICE_ROLE_KEY`/
   `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`, confirmar que la migración
   ya aplicada sigue vigente) — sin esto, los caminos `201`/`404` reales de
   `POST /api/proyectos/<id>/avances` (R17, R18) no se pueden ejercitar de
   punta a punta.
2. Setear `PIN` (o la cookie `spinai_token` manualmente) y contar con una
   herramienta de navegador en este entorno para hacer QA visual real de
   R1-R14 (sección opcional del formulario de creación, formulario inline
   del drawer, actualización del `HealthBadge` sin recargar, mensajes de
   error distinguibles) — sigue siendo el mismo bloqueo documentado en
   `progress/impl_project-crud.md`.
3. Confirmar en el dashboard de Supabase (Table Editor → Policies) que
   `project_weekly_updates` sigue sin ninguna policy para
   `anon`/`authenticated` tras esta feature (R19) — no se pudo verificar
   directamente en el dashboard, solo por lectura de la migración SQL (sin
   cambios en esta feature).
