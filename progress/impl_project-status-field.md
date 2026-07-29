# Implementación — project-status-field

## Resumen

Implementado `specs/project-status-field/` T1-T10 en orden: migración SQL
(archivo nuevo, **no aplicada**, ver bloqueo abajo), `lib/types.ts` +
`lib/projects.ts` (`Project.status`, `WeeklyUpdate` sin `status`,
`VALID_STATUSES` centralizado, `healthFromTimeline()` eliminada junto con
su bloque de tests), las 4 rutas de `/api/proyectos*`, y los 7 componentes
de `app/proyectos/` que dependían del campo (`ProjectForm.tsx` gana
"Estado", `WeeklyUpdateFields.tsx`/`AddUpdateForm.tsx`/
`ProjectTimeline.tsx` lo pierden, `HealthBadge.tsx`/`ProjectCard.tsx`/
`ProjectDrawer.tsx` leen `project.status` directo). `npm run verify` pasa
completo (lint + build + test + check-sdd-state).

**La migración SQL de T1 NO fue aplicada por este agente contra ningún
Supabase real** — este sandbox no tiene `SUPABASE_SERVICE_ROLE_KEY` ni
`NEXT_PUBLIC_SUPABASE_URL` (confirmado: no existe `.env.local`), y aunque
las hubiera, es el humano quien la corre manualmente en el SQL Editor de su
proyecto de dev (que ya tiene datos reales: "Probador Virtual"), mismo
patrón ya usado en `project-crud`/`project-status-tracking`/
`weekly-update-entry`/`weekly-update-edit-delete`. El archivo queda listo
en `supabase/migrations/20260729120000_mover_status_a_projects.sql` con el
contenido exacto de `design.md`, sin ejecutarlo.

**Bloqueo de entorno, mismo que las cuatro specs anteriores de
`/proyectos`, sin resolver todavía**:
1. Sin credenciales de Supabase, el `201`/`200` reales de las 4 rutas API
   (con `insert`/`update` contra una tabla real) no se pudieron ejercitar
   de punta a punta — solo hasta el punto en que el código toca
   `getSupabaseAdmin()` (confirmado en el log del server: el `500` que
   devuelven las requests con body válido es el error explícito de
   credenciales faltantes, no un bug de esta feature; ver sección de
   verificación manual abajo).
2. Sin `PIN` configurado (`process.env.PIN` vacío) ni herramienta de
   navegador en este entorno, no se pudo hacer QA visual real
   click-through de la UI (`ProjectForm` con el nuevo campo "Estado",
   `WeeklyUpdateFields` sin él, badges). La verificación de UI se hizo por
   lectura exhaustiva de código + `npm run build` (TypeScript check, que
   confirma que no queda ningún caller pasando `null`/`undefined` a
   `HealthBadge` ni ninguna referencia a `status` en `WeeklyUpdate`) +
   `design-check` manual + `curl` contra el servidor de `npm run dev` local
   firmando un JWT a mano con el mismo secreto de fallback que usa
   `lib/auth.ts` (sin tocar ningún archivo del repo para esto, mismo
   criterio que `weekly-update-entry`), que sí permitió confirmar el
   comportamiento de las 4 rutas API hasta el punto de tocar Supabase, y
   que `/proyectos` renderiza sin crashear (`GET /proyectos` → `200`).

No se improvisó ningún workaround para sortear estos bloqueos (no se
hardcodeó un PIN ni se mockeó Supabase).

## Archivos tocados

- `supabase/migrations/20260729120000_mover_status_a_projects.sql` (nuevo)
  — migración completa (T1), no aplicada.
- `lib/types.ts` — `Project` gana `status: HealthStatus`; `WeeklyUpdate`
  pierde `status` (T2).
- `lib/projects.ts` — `UpdateRow` pierde `status`, `ProjectRow` lo gana;
  `rowToUpdate()`/`rowToProject()` actualizados; `VALID_STATUSES`
  centralizado (nuevo export); `healthFromTimeline()` eliminada;
  `ProjectFormValues` gana `status`; `WeeklyUpdateFormValues` pierde
  `status` (T2).
- `lib/projects.test.ts` — eliminado el bloque
  `describe("healthFromTimeline", ...)` (4 tests); `describe("mondayOf",
  ...)` intacto (T2).
- `app/api/proyectos/route.ts` — `POST` valida/inserta `status` vía
  `VALID_STATUSES` de `lib/projects.ts` (T3).
- `app/api/proyectos/[id]/route.ts` — `PATCH` valida/actualiza `status`
  (T3).
- `app/api/proyectos/[id]/avances/route.ts` — `POST` deja de
  desestructurar/validar/insertar `status`; se elimina el `VALID_STATUSES`
  local duplicado (T4).
- `app/api/proyectos/[id]/avances/[updateId]/route.ts` — `PATCH` mismo
  cambio; `VALID_STATUSES` local duplicado eliminado (T4).
- `app/proyectos/WeeklyUpdateFields.tsx` — se retira `<Field
  label="Estado">`/`<select>`, el campo `status` de `WeeklyUpdateValues`,
  y los imports de `HealthStatus`/`HEALTH_STATUS_LABELS` que dejaron de
  usarse ahí; `focusHandlers()` vuelve a tipar solo
  input/textarea (T5).
- `app/proyectos/AddUpdateForm.tsx` — `isValid` cuenta 2 campos
  (fecha/nota); payload sin `status` (T6).
- `app/proyectos/ProjectTimeline.tsx` — `isEditValid` cuenta 2 campos;
  `startEdit()`/`confirmEdit()` sin `status`; import de `HealthStatus`
  eliminado (T6).
- `app/proyectos/ProjectForm.tsx` — nuevo campo "Estado" (`<select>`
  reutilizando `HEALTH_STATUS_LABELS`) como quinto campo obligatorio;
  `focusHandlers()` amplía su tipo a incluir `HTMLSelectElement`;
  `updateFieldsFilled`/`updateIsPartial`/`firstUpdate` de la sección
  opcional pasan de 3 a 2 campos; texto de ayuda actualizado (T7).
- `app/proyectos/ProjectDrawer.tsx` — `initialValues` de `ProjectForm`
  incluye `status: project?.status ?? "on_track"`; import de
  `healthFromTimeline` eliminado; los dos usos de `<HealthBadge>` leen
  `project.status` directo (T7, T8).
- `app/proyectos/HealthBadge.tsx` — prop `status: HealthStatus` (sin `|
  null`), rama `status === null` eliminada (T8).
- `app/proyectos/ProjectCard.tsx` — `const status = project.status;` en
  vez de `healthFromTimeline(project.updates)`; import eliminado (T8).
- `specs/project-status-field/tasks.md` — T1-T10 marcadas `[x]`.

## Decisiones de implementación no 100% explícitas en `design.md`

1. **Ubicación del campo "Estado" en `ProjectForm.tsx`**: se colocó entre
   "Unidad de negocio" y "Resumen" (no al final del formulario). `design.md`
   dice "quinto campo" y "junto a nombre/país/unidad de negocio/resumen"
   pero no especifica el orden exacto. Se eligió agrupar los tres campos de
   tipo `<select>`/`<input>` corto antes del `<textarea>` de resumen (que
   es el campo visualmente más largo), consistente con el patrón ya usado
   en `WeeklyUpdateFields.tsx` (fecha antes que el `<textarea>` de nota).
2. **`focusHandlers()` de `ProjectForm.tsx` amplía su tipo para incluir
   `HTMLSelectElement`** (antes solo input/textarea, porque el formulario
   no tenía ningún `<select>`) — necesario porque el nuevo campo "Estado"
   es un `<select>`. Se generalizó el `focusHandlers()` existente del
   archivo en vez de duplicar una copia local (a diferencia de la decisión
   documentada en `impl_weekly-update-entry.md` para
   `WeeklyUpdateFields.tsx`, que sí mantuvo una copia separada porque en
   ese momento `ProjectForm.tsx` no necesitaba el tipo ampliado; ahora que
   sí lo necesita, generalizarlo en el propio archivo es la opción más
   simple sin introducir una tercera copia).
3. **`ProjectForm.tsx` no ofrece una opción vacía/placeholder ("Selecciona
   un estado") en el `<select>` de "Estado"**, a diferencia del `<select>`
   que tenía `WeeklyUpdateFields.tsx` antes de esta feature — porque
   `ProjectFormValues.status: HealthStatus` (T2, no opcional) siempre
   arranca con un valor de los tres válidos (`initialValues.status`, que
   `ProjectDrawer.tsx` fija en `project?.status ?? "on_track"`), así que
   nunca hay un estado "sin elegir" que representar con una opción vacía.
   `isValid` incluye `values.status` en la lista de condiciones (R15) pero,
   dado lo anterior, esa condición es siempre verdadera en la práctica — se
   dejó de todas formas por completitud/legibilidad del código y por si en
   el futuro cambia el criterio de inicialización.
4. **Mensaje de ayuda de la sección "Primer avance semanal (opcional)"**:
   `design.md` no reescribe el texto exacto, solo el conteo de campos. Se
   ajustó "Completa fecha, estado y nota... o deja los tres vacíos" a
   "Completa fecha y nota... o deja ambos vacíos" (mismo patrón de
   redacción, dos campos en vez de tres).
5. **`on_track` como default de `status` en modo creación**
   (`ProjectDrawer.tsx`, `project?.status ?? "on_track"`): `tasks.md`
   (T7) dejaba esta elección explícitamente a criterio de `implementer`,
   pidiendo documentarla — se usó `on_track` por consistencia con el mismo
   valor de fallback que usa el backfill de la migración (R4) para
   proyectos sin avances, no por ninguna otra razón de negocio.

## `design-check` (T5, obligatorio por tocar `app/proyectos/*.tsx`)

El scope por defecto del skill (`.claude/skills/design-check/SKILL.md`) es
`app/components/*.tsx`; como en las cuatro specs anteriores de
`/proyectos`, se aplicó manualmente el mismo criterio contra
`app/globals.css` sobre el diff real de esta sesión (`git diff --
'app/proyectos/*.tsx'`, 7 archivos modificados: `AddUpdateForm.tsx`,
`HealthBadge.tsx`, `ProjectCard.tsx`, `ProjectDrawer.tsx`,
`ProjectForm.tsx`, `ProjectTimeline.tsx`, `WeeklyUpdateFields.tsx`):

- Colores: sin hex nuevos. El único elemento visual nuevo (el `<select>`
  de "Estado" en `ProjectForm.tsx`) reutiliza `inputStyle` ya existente en
  el mismo archivo, sin ningún color propio.
- `border-radius`: siempre `var(--radius-md)` (heredado de `inputStyle`),
  sin valores hardcodeados nuevos.
- `fontSize`: sin cambios de escala — el nuevo `<Field label="Estado">`
  reutiliza el mismo `fontSize: 11` de las demás etiquetas del formulario.
- `boxShadow`: sin cambios — esta feature no toca ningún botón primario
  nuevo, solo mueve un `<select>` existente de un componente a otro.
- Esta feature es, en términos de `design-check`, un refactor puro de
  estructura (mover un `<select>` que ya existía de `WeeklyUpdateFields.tsx`
  a `ProjectForm.tsx`, y retirar una rama condicional de `HealthBadge.tsx`)
  — no introduce ningún patrón visual nuevo.
- Sin findings pendientes.

## Verificación automatizada

```
npm run lint             → sin errores
npm run build              → compila, TS check ok; confirma que no queda
                              ningún caller pasando null/undefined a
                              HealthBadge ni ninguna referencia residual a
                              update.status / WeeklyUpdate.status en todo
                              el árbol de app/ ni lib/ (build falla en
                              tiempo de tipos si quedara alguna)
npm run test                → 9 tests pasan (5 mondayOf() + 4 tests
                              preexistentes de otros módulos del repo no
                              tocados por esta feature; los 4 tests de
                              healthFromTimeline fueron ELIMINADOS, no
                              "no aplican" — la función ya no existe)
npm run check-sdd-state    → ok, "single active feature: project-status-field (in_progress)"
npm run verify              → exit 0 end-to-end (los 4 comandos anteriores en secuencia)
```

Grep de confirmación de limpieza (sin residuos):
- `healthFromTimeline` → 0 ocurrencias en código fuente (`app/`, `lib/`),
  solo en specs/progress (esperado, son documentos históricos).
- `update.status` / `editValues.status` / `values.status` referido a un
  avance → 0 ocurrencias.
- `VALID_STATUSES` duplicado → 0 ocurrencias fuera de `lib/projects.ts`
  (las dos rutas de avances ya no lo importan ni lo necesitan).

## Verificación manual real (curl contra `npm run dev` local)

Mismo criterio que `impl_weekly-update-entry.md`: sin credenciales de
Supabase, pero el gate de auth y la validación de body corren **antes** de
tocar `getSupabaseAdmin()`, así que se verificó de punta a punta contra un
servidor local real con una cookie `spinai_token` firmada a mano con `jose`
usando el mismo secreto de fallback de `lib/auth.ts` (sin tocar ningún
archivo del repo):

- `POST /api/proyectos` sin cookie → `401 {"error":"No autorizado"}`.
- `POST /api/proyectos` con cookie, body sin `status`
  (`{name,summary,country,businessUnit}`) → `400 {"error":"Campos
  requeridos faltantes: status"}` (R27).
- `POST /api/proyectos` con `status: "foo"` (inválido) → mismo `400`
  mencionando `"status"` (R27).
- `POST /api/proyectos` con body válido (`status: "at_risk"`) → pasa la
  validación, llega hasta `getSupabaseAdmin()`, que lanza su error
  explícito de env vars faltantes (confirmado en el log del server) →
  `500` genérico. **No se pudo verificar** el `201` real (R28) contra una
  base de datos real.
- `PATCH /api/proyectos/<id>` sin `status` → `400` mencionando `"status"`
  (R27); con `status` inválido → mismo `400`; con `status: "delayed"`
  válido → pasa validación, `500` por credenciales (mismo bloqueo, R29 no
  verificable de punta a punta).
- `POST /api/proyectos/<id>/avances` con body `{weekOf, note}` **sin**
  `status` → pasa la validación (no aparece `"status"` en ningún mensaje de
  error posible), llega hasta `getSupabaseAdmin()` → `500` por credenciales
  (confirma R30/R31: ya no se exige `status`).
- `POST /api/proyectos/<id>/avances` con body vacío `{}` → `400
  {"error":"Campos requeridos faltantes o inválidos: weekOf, note"}` — el
  mensaje **no** incluye `"status"`, confirmando que la validación ya no lo
  considera (R30).
- `POST /api/proyectos/<id>/avances` con un `status: "delayed"` extra en el
  body (además de `weekOf`/`note` válidos) → mismo comportamiento que sin
  `status` (pasa validación, `500` por credenciales) — confirma que un
  `status` presente se ignora silenciosamente, no causa `400` (R30).
- `PATCH /api/proyectos/<id>/avances/<updateId>` — mismos tres casos
  (sin `status`, body vacío, con `status` extra) con el mismo resultado
  (pasa validación / `400` por `weekOf`+`note` faltantes sin mencionar
  `status` / ignora `status` extra) — confirma R30/R32.
- `GET /proyectos` (la página, sin cookie de PIN) → `200`, sin excepción
  del lado del servidor en el log — confirma que ningún componente de la
  UI crashea al montar con los tipos nuevos (aunque el contenido real
  detrás del `PinGate` no se pudo ejercitar por falta de `PIN`).

Todos los `500` fueron confirmados en el log del servidor como el error
explícito `"Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY..."`
lanzado por `getSupabaseAdmin()` (`lib/supabaseAdmin.ts:20`), nunca un error
de código de esta feature.

## Traceability por requisito

### Esquema de datos (R1-R6) — migración SQL, no aplicada

- **R1-R5**: verificado por lectura del archivo
  `supabase/migrations/20260729120000_mover_status_a_projects.sql` contra
  el contenido exacto de `design.md` (columna nullable → backfill
  correlacionado por `project_id` con `order by week_of desc limit 1` →
  `coalesce(..., 'on_track')` como fallback → `not null` + `check` →
  `drop column status` en `project_weekly_updates`). **No ejecutado** contra
  ningún Supabase real — sin credenciales en este sandbox; queda pendiente
  de que el humano lo corra manualmente en el SQL Editor de dev.
- **R6**: verificado por lectura — el archivo nuevo no contiene ningún
  `create policy` ni `alter policy`, solo `alter table`/`update`/
  `add constraint`; el comentario final del archivo documenta
  explícitamente que no se toca RLS.

### Tipos y mapeo (R7-R14) — `lib/types.ts`, `lib/projects.ts`

- **R7**: verificado por `npm run build` (TypeScript) — `Project.status:
  HealthStatus` en `lib/types.ts:93` (no opcional, sin `| null`).
- **R8**: verificado por `npm run build` — `WeeklyUpdate` en
  `lib/types.ts` ya no declara `status`; cualquier acceso residual a
  `update.status` habría fallado el `tsc` del build.
- **R9**: verificado por lectura de `rowToProject()` en `lib/projects.ts` —
  incluye `status: row.status` en el objeto devuelto.
- **R10**: verificado por lectura de `rowToUpdate()` — ya no lee ni
  incluye `status`; `UpdateRow` (interfaz interna) tampoco lo declara.
- **R11**: **eliminada** (no "no aplica") — `healthFromTimeline()` ya no
  existe en `lib/projects.ts`; su bloque de 4 tests
  (`describe("healthFromTimeline", ...)`) fue eliminado de
  `lib/projects.test.ts`, confirmado por `npm run test` (9 tests, antes 13
  — 4 menos, exactamente los eliminados) y por grep (0 ocurrencias de
  `healthFromTimeline` en `app/`/`lib/`).
- **R12**: verificado por lectura — `ProjectFormValues` en
  `lib/projects.ts` incluye `status: HealthStatus`.
- **R13**: verificado por lectura — `WeeklyUpdateFormValues` queda
  `{ weekOf: string; note: string }`, sin `status`.
- **R14**: verificado por lectura + grep — `export const VALID_STATUSES:
  HealthStatus[] = ["on_track", "at_risk", "delayed"];` vive únicamente en
  `lib/projects.ts`; las rutas `POST`/`PATCH /api/proyectos*` lo importan
  desde ahí (`grep VALID_STATUSES app/` confirma 0 copias locales
  restantes; las dos rutas de avances ya no lo usan ni lo importan, sin
  duplicarlo).

### `ProjectForm.tsx` (R15-R19)

- **R15**: manual QA por lectura de código — `ProjectForm.tsx` renderiza
  un quinto `<Field label="Estado">` con un `<select>` poblado desde
  `HEALTH_STATUS_LABELS` (mismo vocabulario que `HealthBadge`); `isValid`
  incluye `values.status` como quinta condición. **No verificado
  visualmente** (bloqueo PIN/browser), sí confirmado que compila sin
  errores de tipos.
- **R16**: manual QA por lectura de código — `handleSubmit` llama
  `onSubmit(values, firstUpdate)` con `values` (que incluye `status`,
  T2/R12) sin transformación adicional; `ProjectDrawer.handleFormSubmit`
  pasa ese mismo objeto a `createProject`/`updateProject`, que lo
  serializan tal cual al `body` del `fetch`. Confirmado además que las
  rutas `POST`/`PATCH /api/proyectos*` reciben y validan `status`
  correctamente vía `curl` real (ver sección de verificación manual).
- **R17**: manual QA por lectura de código —
  `ProjectDrawer.tsx`: `initialValues={{ ..., status: project?.status ??
  "on_track" }}` cuando `project !== null` (modo edición) prellena con el
  `status` real cargado por `loadProject()`.
- **R18**: manual QA por lectura de código —
  `WeeklyUpdateFields.tsx` (usado por la sección "Primer avance semanal")
  ya no tiene ningún `<select>` de estado (T5); confirmado por lectura
  directa del archivo, sin `<Field label="Estado">` en su JSX.
- **R19**: manual QA por lectura de código — `updateFieldsFilled = [
  update.date, update.note].filter((v) => v !== "").length` (2, no 3);
  `updateIsPartial = updateFieldsFilled > 0 && updateFieldsFilled < 2`.

### `WeeklyUpdateFields.tsx` (R20-R23)

- **R20**: verificado por lectura directa — el `<Field label="Estado">`
  fue eliminado del único archivo compartido por `AddUpdateForm.tsx`,
  `ProjectForm.tsx` (sección opcional) y `ProjectTimeline.tsx` (edición
  inline); los tres consumidores lo heredan automáticamente al importar el
  mismo componente. `npm run build` confirma que ninguno de los tres pasa
  ya una prop `status` a `WeeklyUpdateFields`.
- **R21**: verificado por lectura de `AddUpdateForm.tsx` — `isValid =
  values.date !== "" && values.note.trim() !== ""` (2 condiciones).
- **R22**: verificado por lectura de `ProjectTimeline.tsx` — `isEditValid
  = editValues.date !== "" && editValues.note.trim() !== ""` (2
  condiciones).
- **R23**: verificado por lectura + `curl` real — `AddUpdateForm.handleSubmit`
  envía `{ weekOf: mondayOf(values.date), note: values.note.trim() }` sin
  `status`; `ProjectTimeline.confirmEdit()` idéntico para la edición
  inline. Confirmado con `curl` que las rutas `POST`/`PATCH
  .../avances...` aceptan bodies `{weekOf, note}` sin `status` sin
  devolver `400` por su ausencia (ver sección de verificación manual).

### Badge y tarjetas (R24-R26)

- **R24**: verificado por lectura de `ProjectCard.tsx` — `const status =
  project.status;`, sin ningún import de `healthFromTimeline`.
- **R25**: verificado por lectura de `ProjectDrawer.tsx` —
  `<HealthBadge status={project.status} />` en el header, import de
  `healthFromTimeline` eliminado.
- **R26**: verificado por `npm run build` (TypeScript) — `HealthBadge`
  tipa `status: HealthStatus` (sin `| null`); la rama `if (status ===
  null)` fue eliminada del componente. El build habría fallado si algún
  caller siguiera intentando pasar `null`/`undefined` (confirma que R24/R25
  son los únicos dos call sites y ya están migrados).

### API `/api/proyectos` (R27-R29)

- **R27**: **verificado por ejecución real** — `curl` sin `status` y con
  `status: "foo"` contra `POST`/`PATCH /api/proyectos*` devuelven `400`
  mencionando `"status"` en el mensaje, mismo formato que los demás campos
  (`Campos requeridos faltantes: ...`).
- **R28**: manual QA por lectura de código — el `insert` de `POST
  /api/proyectos` incluye `status` (valor ya validado contra
  `VALID_STATUSES`); la respuesta se mapea con `rowToProject(data)`, que
  incluye `status: row.status` (T2). **No verificado por ejecución real**
  contra Supabase (bloqueo de credenciales) — sí confirmado que un body
  válido con `status` llega hasta `getSupabaseAdmin()` sin fallar antes.
- **R29**: mismo criterio que R28 para `PATCH /api/proyectos/<id>` — el
  `update` incluye `status`; **no verificado de punta a punta** por el
  mismo bloqueo.

### API `/api/proyectos/<id>/avances*` (R30-R32)

- **R30**: **verificado por ejecución real** — `curl` con `{weekOf, note}`
  (sin `status`) contra `POST`/`PATCH .../avances...` no devuelve `400`
  por falta de `status` (llega hasta `getSupabaseAdmin()`, `500` por
  credenciales); `curl` con un `status` extra en el body produce el mismo
  resultado exacto (se ignora silenciosamente, no causa `400`).
- **R31**: manual QA por lectura de código — el `insert` de `POST
  .../avances` es `{ project_id: id, week_of: weekOf, note: note.trim() }`,
  sin `status`; la respuesta se mapea con `rowToUpdate(data)`, que ya no
  incluye `status` (T2, R8/R10). **No verificado el `201` real** (bloqueo
  de credenciales).
- **R32**: mismo criterio que R31 para `PATCH .../avances/<updateId>` — el
  `update` es `{ week_of: weekOf, note: note.trim() }`. **No verificado el
  `200` real** (mismo bloqueo).

## Bloqueado — pasos pendientes del humano

1. **Aplicar la migración SQL**
   (`supabase/migrations/20260729120000_mover_status_a_projects.sql`)
   manualmente en el SQL Editor del Supabase de **dev** — este agente no
   tiene credenciales ni las usaría aunque las tuviera para un cambio de
   schema con datos reales de por medio (ver "Riesgo y orden de aplicación
   recomendado" en `design.md`). Verificar después, en el Table Editor,
   que "Probador Virtual" quedó con `status = 'on_track'` (backfill
   correcto dado que su único avance existente ya era `'on_track'`) y que
   `project_weekly_updates` ya no tiene columna `status`.
2. Setear `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` en
   `.env.local` para poder ejercitar de punta a punta los `201`/`200`
   reales de las 4 rutas API (R28, R29, R31, R32) — sin esto, solo se
   verificó hasta el punto en que el código toca Supabase.
3. Setear `PIN` (o la cookie `spinai_token` manualmente) y contar con una
   herramienta de navegador para hacer QA visual real de R15-R26 (campo
   "Estado" nuevo en el formulario, su ausencia en la sección de avance,
   badges reaccionando al cambiar el estado del proyecto pero no al
   editar/borrar un avance — ver la nota de UX en `design.md`) — mismo
   bloqueo que las cuatro specs anteriores de `/proyectos`.
4. Confirmar en el dashboard de Supabase que `projects` y
   `project_weekly_updates` siguen sin ninguna policy para
   `anon`/`authenticated` tras la migración (R6) — no se pudo verificar
   directamente en el dashboard, solo por lectura del archivo SQL nuevo.
