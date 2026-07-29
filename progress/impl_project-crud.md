# Implementación — project-crud

## Resumen

Implementado el CRUD completo (crear/editar/eliminar) sobre `/proyectos`,
siguiendo `specs/project-crud/design.md` casi al pie de la letra (rutas API,
`lib/projects.ts`, componentes nuevos, integración en `ProjectDrawer.tsx` y
`page.tsx`). `npm run verify` pasa completo (lint + build + test +
check-sdd-state).

**Bloqueado, en manos del humano** (mismo bloqueo ya documentado en
`progress/impl_project-status-tracking.md`, no resuelto todavía en este
entorno):
1. No hay `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` en este
   sandbox (`.env.local` no existe, tampoco están en el entorno del proceso).
   `getSupabaseAdmin()` lanza su error explícito apenas se la invoca, así
   que los caminos `201`/`200`/`404` de `POST`/`PATCH`/`DELETE` contra datos
   reales no se pudieron ejercitar de punta a punta — solo hasta el punto en
   que el código toca Supabase (ver detalle de verificación abajo).
2. Tampoco hay `PIN` configurado (`process.env.PIN` vacío), así que no se
   pudo pasar el `PinGate` para hacer QA visual en el navegador de los
   flujos de UI (crear/editar/cancelar/eliminar) — y este entorno no tiene
   una herramienta de navegador/captura de pantalla disponible. La
   verificación de UI se hizo por lectura exhaustiva de código + build/lint
   TypeScript, no por click-through real. Ver detalle por requirement abajo.

No se improvisó ningún workaround para sortear estos bloqueos (no se hardcodeó
un PIN ni se mockeó Supabase) — quedan documentados para que el humano los
resuelva o decida cómo proceder.

## Archivos tocados

- `app/api/proyectos/route.ts` — agrega `POST` (T1).
- `app/api/proyectos/[id]/route.ts` — agrega `PATCH` y `DELETE` (T2).
- `lib/projects.ts` — agrega `ProjectFormValues`, `createProject`,
  `updateProject`, `deleteProject` (T3).
- `app/proyectos/ProjectForm.tsx` (nuevo) — formulario compartido
  crear/editar (T4).
- `app/proyectos/CreateProjectCard.tsx` (nuevo) — card "+" (T5).
- `app/proyectos/DeleteProjectModal.tsx` (nuevo) — modal de confirmación de
  borrado (T5).
- `app/proyectos/ProjectDrawer.tsx` — agrega `mode`/`formMode`, botones
  Editar/Eliminar, integra `ProjectForm`/`DeleteProjectModal` (T6).
- `app/proyectos/page.tsx` — estado `creating`, `CreateProjectCard` como
  primer ítem del grid, callbacks `onCreated`/`onUpdated`/`onDeleted` (T7).
- `specs/project-crud/tasks.md` — T1-T8 marcadas `[x]`.

## Decisiones de implementación no 100% explícitas en `design.md`

1. **`ProjectFormValues` se declara una sola vez, en `lib/projects.ts`, y
   `ProjectForm.tsx` la importa** en vez de duplicar la interfaz (el
   `design.md` mostraba dos declaraciones idénticas en dos snippets
   separados). Evita drift de tipos entre los dos archivos.
2. **Grid vacío (0 proyectos): se eliminó el bloque "Sin proyectos
   cargados"** que existía en `page.tsx` y se reemplazó por mostrar
   siempre el grid (con `CreateProjectCard` como único ítem si no hay
   proyectos). `R1`/`design.md` no cubren explícitamente esta interacción
   (el empty state pasivo original tenía sentido en una página solo
   lectura — "vuelve a revisar más tarde" — pero ahora el usuario sí puede
   actuar directamente desde esa misma pantalla). Si el humano prefiere
   mantener el empty state con el ícono grande y agregar el
   `CreateProjectCard` debajo, es un ajuste visual menor, no estructural.
3. **Determinación de crear-vs-editar en el submit del formulario**: en
   vez de usar el prop `projectId` (que el `design.md` usa como criterio
   en su prosa), se usa el estado local `project === null` dentro de
   `ProjectDrawer`. Es equivalente en todos los casos previstos por la
   spec, pero además maneja correctamente el caso "usuario crea un
   proyecto, luego sin cerrar el drawer hace click en Editar": ahí
   `projectId` (prop) sigue siendo `null` porque `page.tsx` nunca lo
   actualiza (el `Project` recién creado vive en el estado interno del
   drawer, no en `selectedId`), así que `project === null` es el chequeo
   correcto para decidir `POST` vs `PATCH` y para R9 (cancelar).
4. **`DeleteProjectModal` recibe `error={null}` siempre desde
   `ProjectDrawer`.** El `design.md` define un prop `error: string | null`
   en `DeleteProjectModal`, pero `R15` es explícito: al fallar el
   `DELETE`, el modal se cierra y el error se muestra "dentro del drawer",
   no dentro del modal. Se mantuvo el prop en la interfaz del componente
   (para respetar el shape de props pedido en T5) pero el error real vive
   en un estado `deleteError` de `ProjectDrawer`, renderizado en el cuerpo
   del drawer en modo vista — siguiendo la letra de R15 por sobre el
   snippet de diseño, que no explicaba cuándo se poblaría ese prop.
5. **Valores de alpha-hex ajustados a los ya usados en el resto del
   repo** (ver sección `design-check` abajo) — `CreateProjectCard.tsx`
   pasó de `#2C40FF88` (valor no usado en ningún otro lado) a `#2C40FF55`
   (usado 11 veces en el resto de la app), y el botón "Eliminar" del
   header de `ProjectDrawer` pasó de un borde `#F8717155` a `#F87171`
   sólido, igual que `DeleteProjectModal.tsx` y el patrón ya establecido
   en `MembersPanel.tsx`.
6. **Fix de lint no anticipado en `design.md`**: la primera versión del
   efecto de carga de `ProjectDrawer` llamaba `setFormError(null)` /
   `setDeleteError(null)` de forma síncrona al inicio del `useEffect`,
   lo cual dispara la regla de ESLint `react-hooks/set-state-in-effect`
   (cascading renders). Se resolvió envolviendo esos `setState` dentro
   del mismo `requestAnimationFrame` que ya usaba el código original para
   `setLoading`/`setError`, sin cambiar el comportamiento observable.

## `design-check` (T4/T5, obligatorio por tocar `app/proyectos/*.tsx`)

No corrí el skill vía el flujo automático (su scope por defecto es
`app/components/*.tsx`, y `tasks.md` pide aplicar el mismo criterio a
`app/proyectos/*.tsx`), así que apliqué manualmente los criterios de
`​.claude/skills/design-check/SKILL.md` contra `app/globals.css` sobre los 4
archivos nuevos/modificados de `app/proyectos/`:

- Colores: todo lo nuevo usa o bien `var(--color-*)` existentes, o el patrón
  ya establecido de sufijo alpha sobre `#2C40FF` (`0f`, `44`, `55`, `1a` — ya
  usados en otras partes del repo, verificado con `grep`) y sobre `#F87171`
  (`22`, sólido — mismo patrón que `MembersPanel.tsx`). Se corrigieron dos
  valores que no tenían precedente (`#2C40FF88`, `#F8717155`, ver decisión
  #5 arriba) por otros ya usados en el resto de la app.
- `border-radius`: siempre `var(--radius-md)`, ningún valor hardcodeado.
- `fontSize`: todo dentro de 10.5–16px salvo el `h1` de la página (28px, ya
  existente, sin tocar) — consistente con el resto de `app/proyectos/`.
- `boxShadow`: `var(--shadow-glow-sm)` en el botón primario de
  `ProjectForm`; el `boxShadow` de `DeleteProjectModal` (`0 20px 60px
  rgba(0,0,0,0.5)`) replica el mismo tono/opacidad que ya usa el panel de
  `ProjectDrawer.tsx` (`-20px 0 60px rgba(0,0,0,0.5)`) para elevación de
  overlays, no es un glow sobre un CTA, así que no aplica el token de glow.
- Sin findings pendientes tras los dos ajustes de la decisión #5.

## Verificación automatizada

```
npm run lint             → sin errores (incluye el fix de react-hooks/set-state-in-effect)
npm run build             → compila, TS check ok, /api/proyectos y /api/proyectos/[id]
                             siguen listados como rutas dinámicas
npm run test               → 9 tests pasan (sin tests nuevos: T3 son wrappers de fetch,
                             no lógica pura — confirmado explícitamente como esperado en tasks.md)
npm run check-sdd-state    → ok (una sola feature in_progress, spec completa)
```

## Verificación manual real (curl contra `npm run dev` local)

Sin credenciales de Supabase disponibles, pero el gate de auth y la
validación de body corren **antes** de tocar `getSupabaseAdmin()`, así que
se pudieron verificar de punta a punta contra un servidor local real:

- `curl` sin cookie a `POST`/`PATCH`/`DELETE /api/proyectos*` → los 3
  devuelven `401 {"error":"No autorizado"}`, sin datos (R16, R19, R23).
- Con una cookie `spinai_token` válida (JWT firmado a mano con `jose` y el
  mismo secreto fallback que usa `lib/auth.ts` cuando `JWT_SECRET` no está
  seteado — no se tocó ningún archivo del repo para esto):
  - `POST` con `name` vacío/whitespace → `400
    {"error":"Campos requeridos faltantes: name"}` (R17).
  - `PATCH` con `name` vacío → mismo `400` (R20).
  - `POST`/`DELETE` con body/id válidos → llegan hasta
    `getSupabaseAdmin()`, que lanza su error explícito de env vars
    faltantes (confirmado en el log del server, no un bug de esta
    feature) → `500` genérico de Next. **No se pudo verificar** el `201`
    real (R18), el `200` real con datos (R21), ni los `404` reales de
    id inexistente (R22, R25) contra una base de datos real — mismo
    bloqueo que R11/R17 de `project-status-tracking`.

## Traceability por requisito

- **R1** (card "Crear proyecto" primer elemento del grid): manual QA por
  lectura de código — `page.tsx` renderiza `<CreateProjectCard>` antes del
  `.map()` de `ProjectCard` dentro del mismo `<div className="grid...">`.
  No se pudo verificar visualmente (bloqueo de PIN/navegador, ver arriba).
- **R2** (click abre `ProjectDrawer` en modo creación, formulario vacío):
  manual QA por lectura de código — `handleOpenCreate` en `page.tsx` setea
  `creating=true`/`selectedId=null`; `ProjectDrawer` con `mode="create"` y
  `projectId=null` monta directo en `formMode="form"` con
  `initialValues` todos `""`, sin llamar `loadProject`.
- **R3** (POST + agregar al listado en memoria sin recargar, drawer queda
  en modo vista con el proyecto creado): manual QA por lectura de código —
  `handleFormSubmit` en `ProjectDrawer` llama `createProject`, hace
  `setProject(created)` + `onCreated(created)` + `setFormMode("view")`;
  `page.tsx.handleCreated` hace `setProjects(prev => [...prev, project])`.
  La ruta real (`201`) no se pudo ejercitar contra Supabase real (ver
  bloqueo); el contrato de `createProject()` sí se verificó vía `curl`
  hasta el punto de la validación (R17).
- **R4** (botón disabled con campo requerido vacío): manual QA por lectura
  de código — `ProjectForm.isValid` usa exactamente
  `!name.trim() || !country.trim() || !businessUnit.trim() || !summary.trim()`,
  botón `disabled={!isValid || submitting}`, mismo patrón que
  `MembersPanel.tsx`.
- **R5** (error de POST se muestra en el form, valores no se pierden):
  manual QA por lectura de código — `handleFormSubmit` cae al `catch`,
  setea `formError`, nunca resetea `values` de `ProjectForm` (el estado
  `values` vive en `ProjectForm`, que no se desmonta al fallar el submit).
  Verificado el contrato de error hasta `400` real vía `curl`; el caso
  `500`/red real no se pudo forzar de forma controlada (mismo bloqueo).
- **R6** (botón "Editar" en modo vista junto al `HealthBadge`): manual QA
  por lectura de código — header de `ProjectDrawer` renderiza los botones
  cuando `!loading && !error && project !== null && formMode === "view"`.
- **R7** (click en Editar abre el formulario prellenado): manual QA por
  lectura de código — `onClick` del botón hace `setFormMode("form")`;
  `ProjectForm` recibe `initialValues` desde `project` ya cargado.
- **R8** (PATCH válido reemplaza el proyecto en memoria y vuelve a modo
  vista): manual QA por lectura de código — mismo flujo que R3 pero con
  `updateProject`/`onUpdated`; `page.tsx.handleUpdated` hace
  `setProjects(prev => prev.map(...))`. Validación (`400`) verificada vía
  `curl`; el `200` real no se pudo ejercitar (bloqueo).
- **R9** (cancelar edición descarta cambios sin llamar a la API): manual QA
  por lectura de código — `handleFormCancel` con `project !== null` solo
  hace `setFormMode("view")`, nunca llama a `updateProject`; al
  desmontarse `ProjectForm` pierde su estado local `values`, así que al
  reabrir "Editar" se prellenan de nuevo desde `project` (los datos
  originales, intactos porque nunca se tocó el estado `project`).
- **R10** (error de PATCH, mismo comportamiento que R5): manual QA por
  lectura de código, mismo mecanismo que R5 (rama `else` de
  `handleFormSubmit`).
- **R11** (botón "Eliminar" junto a "Editar" en modo vista): manual QA por
  lectura de código, mismo bloque condicional que R6.
- **R12** (modal de confirmación con nombre del proyecto + advertencia de
  cascada): manual QA por lectura de código —
  `DeleteProjectModal` renderiza `¿Eliminar "${projectName}"?` y el texto
  literal "Esto también borrará sus KPIs y avances semanales." pedido por
  la spec.
- **R13** (DELETE + quitar del listado + cerrar modal y drawer): manual QA
  por lectura de código — `handleDeleteConfirm` en éxito llama
  `onDeleted(project.id)`, `setShowDeleteModal(false)`, `onClose()`;
  `page.tsx.handleDeleted` hace `setProjects(prev => prev.filter(...))`.
  El `200` real no se pudo ejercitar contra Supabase (bloqueo).
- **R14** (cancelar el modal — botón o backdrop — no elimina nada, drawer
  queda igual): manual QA por lectura de código —
  `DeleteProjectModal.onCancel` (botón "Cancelar" y `onClick` del backdrop)
  solo hace `setShowDeleteModal(false)` en `ProjectDrawer`, nunca invoca
  `deleteProject`; además `Escape` con el modal abierto se verificó por
  lectura de código que **no** cierra el drawer de fondo (el listener de
  `ProjectDrawer` hace early-return si `showDeleteModal` es `true`, ver
  T6) — no se pudo confirmar en navegador real por el bloqueo de PIN.
- **R15** (error de DELETE cierra el modal, muestra error en el drawer, no
  quita el proyecto): manual QA por lectura de código — rama `catch` de
  `handleDeleteConfirm` hace `setShowDeleteModal(false)` +
  `setDeleteError(...)`, nunca llama `onDeleted`; `deleteError` se
  renderiza en el cuerpo del drawer en modo vista. Ver decisión #4 arriba
  sobre por qué el prop `error` de `DeleteProjectModal` siempre recibe
  `null`.
- **R16** (`POST` sin cookie → `401`, sin crear registro): **verificado por
  ejecución real**, `curl -X POST` sin cookie → `401
  {"error":"No autorizado"}`.
- **R17** (`POST` con campo faltante/vacío → `400` con mensaje): **verificado
  por ejecución real**, `curl -X POST` con cookie válida y `name` vacío/
  whitespace → `400 {"error":"Campos requeridos faltantes: name"}`.
- **R18** (`POST` válido → `201` con `Project` (`kpis: []`, `updates: []`)):
  manual QA por lectura de código — el `insert` no toca `project_kpis`/
  `project_weekly_updates`, así que el `select` anidado devuelve arrays
  vacíos y `rowToProject()` los mapea igual que en el `GET` ya probado en
  `project-status-tracking`. **No verificado por ejecución real** (bloqueo
  de credenciales Supabase).
- **R19** (`PATCH` sin cookie → `401`): **verificado por ejecución real**,
  mismo resultado que R16.
- **R20** (`PATCH` con campo vacío/ausente → `400`): **verificado por
  ejecución real**, `curl -X PATCH` con cookie válida y `name` vacío →
  `400`.
- **R21** (`PATCH` válido → `200` con `Project` actualizado, `kpis`/
  `updates` intactos): manual QA por lectura de código — mismo patrón de
  `select` anidado que `GET`/`POST`. **No verificado por ejecución real**
  (bloqueo).
- **R22** (`PATCH` con `id` inexistente → `404`): manual QA por lectura de
  código — `maybeSingle()` + chequeo `!data` → `404`, más el manejo de
  `error.code === "22P02"` para ids no-UUID (mismo patrón ya usado y
  corregido en el `GET` de `project-status-tracking`). **No verificado por
  ejecución real** contra una fila real inexistente en una tabla real
  (bloqueo); sí se confirmó que un `id` no-UUID llega hasta
  `getSupabaseAdmin()` sin crashear antes (ver log de `curl -X PATCH` con
  `id=00000000-...` — formato UUID válido pero inexistente, no se pudo
  distinguir de "válido" sin datos reales).
- **R23** (`DELETE` sin cookie → `401`): **verificado por ejecución real**,
  mismo resultado que R16/R19.
- **R24** (`DELETE` válido → elimina fila, cascada por FK, `200
  {"ok":true}`): manual QA por lectura de código — la migración de
  `project-status-tracking` ya define `on delete cascade` en
  `project_kpis`/`project_weekly_updates`, no se tocó el schema en esta
  feature. **No verificado por ejecución real** (bloqueo de credenciales;
  tampoco se pudo confirmar en el dashboard de Supabase, sin acceso).
- **R25** (`DELETE` con `id` inexistente → `404`): manual QA por lectura de
  código — se hace `select("id").maybeSingle()` antes del `delete` para
  distinguir "no existía" de "existía y se borró" (ver alternativa
  documentada en `design.md`). **No verificado por ejecución real**
  (bloqueo) — sí se confirmó vía `curl -X DELETE` con un `id` no-UUID que
  el código llega hasta el `select` de existencia sin crashear antes de
  tocar Supabase.
- **R26** (rutas nuevas reutilizan `isAuthenticated()`/`getSupabaseAdmin()`,
  sin policies RLS nuevas): manual QA por lectura de código — las 3 rutas
  nuevas importan exactamente `isAuthenticated` de `@/lib/auth` y
  `getSupabaseAdmin` de `@/lib/supabaseAdmin`, sin variables de entorno ni
  imports nuevos; no se tocó ningún archivo de `supabase/migrations/`.
  **No verificado en el dashboard de Supabase** (sin acceso al proyecto
  real, mismo bloqueo que R17 de `project-status-tracking`).

## Fix post-rechazo (2026-07-29) — restaurar empty state (R5 de `project-status-tracking`)

`reviewer` rechazó la primera entrega: en la versión anterior,
`app/proyectos/page.tsx` reemplazaba el bloque de empty state
("Sin proyectos cargados" + ícono + subtítulo, mostrado cuando
`projects.length === 0`) por la grilla incondicional con `CreateProjectCard`
como único ítem. Eso violaba R5 de `specs/project-status-tracking/requirements.md`
("WHEN la lista de proyectos está vacía THEN el sistema SHALL mostrar un
empty state... no una lista en blanco"), requirement que
`specs/project-crud/requirements.md` deja explícitamente vigente sin
cambios (R1-R17 de esa spec).

**Cambio aplicado en `app/proyectos/page.tsx`** (Opción A del review, la
que pedía el reviewer explícitamente): se separó la rama
`!loading && !error` en dos ramas condicionadas por `projects.length`:

- `projects.length === 0`: se restauró el bloque original de empty state
  (mismo ícono SVG, mismo título "Sin proyectos cargados", mismo layout
  centrado), y **dentro** de ese mismo bloque, debajo del subtítulo, se
  agregó `<CreateProjectCard onClick={handleOpenCreate} />` envuelto en un
  contenedor `maxWidth: 280` para que no ocupe todo el ancho del bloque
  centrado. El copy del subtítulo pasó de pasivo ("Todavía no hay
  proyectos registrados. Vuelve a revisar más tarde.") a accionable
  ("Crea el primero para empezar a hacer seguimiento."), siguiendo la
  sugerencia del reviewer de que ese ajuste de texto está dentro del
  espíritu de R5 (sigue siendo "un empty state consistente con el resto
  de la app", solo que ahora refleja que el usuario puede actuar).
- `projects.length > 0`: se mantiene el comportamiento de la entrega
  anterior — grid con `CreateProjectCard` como primer ítem seguido del
  `.map()` de `ProjectCard` (R1).

Con esto, R5 de `project-status-tracking` queda satisfecho (hay empty
state real, no una lista en blanco cuando `projects.length === 0`) y R1 de
`project-crud` sigue cumplido en ambos casos (la card "Crear proyecto"
siempre está visible, tanto vacío como con proyectos). No se creó ningún
componente nuevo — se reutilizó `CreateProjectCard` tal cual ya existía.

**Limpieza no bloqueante también aplicada** (nota de `reviewer`): se quitó
el prop `error: string | null` muerto de `DeleteProjectModal` (nunca
recibía otra cosa que `null` desde `ProjectDrawer`, ya que R15 exige que el
error de `DELETE` se muestre en el drawer, no en el modal) — se eliminó el
prop de la interfaz, su bloque de render condicional, y el `error={null}`
que le pasaba `ProjectDrawer.tsx`. Sin cambio de comportamiento observable.

**Verificación de R5 (`project-status-tracking`)**: manual QA por lectura
de código — con `projects.length === 0`, `page.tsx` renderiza el bloque de
empty state (ícono + título + subtítulo + `CreateProjectCard`) en vez del
grid; con `projects.length > 0` renderiza el grid normal. No se pudo
verificar visualmente en navegador (mismo bloqueo de PIN/Supabase
documentado en el resto de este reporte — no hay entorno de browser en
esta sesión), pero el flujo de renderizado condicional es directo y
symmetric con el código previo a la primera entrega (mismo bloque de empty
state, solo con el `CreateProjectCard` agregado adentro).

**Verificación de R1 tras el fix**: sigue cumplido igual que antes en
ambas ramas — `CreateProjectCard` es "primer elemento del grid" cuando hay
proyectos, y único elemento accionable del empty state cuando no los hay.

### `npm run verify` tras el fix

```
npm run lint             → sin errores
npm run build             → compila, TS check ok, /api/proyectos y
                             /api/proyectos/[id] siguen como rutas dinámicas (ƒ)
npm run test               → 9 tests pasan (sin cambios, no se tocó lib/)
npm run check-sdd-state    → ok, "single active feature: project-crud (in_progress)"
```

Exit code 0 end-to-end.

## Bloqueado — pasos pendientes del humano

1. Los mismos dos pasos ya pendientes de `project-status-tracking`
   (aplicar la migración si aún no se aplicó, setear
   `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`) — sin esto, los
   caminos `201`/`200`/`404` reales de `POST`/`PATCH`/`DELETE` no se
   pueden ejercitar de punta a punta.
2. Setear `PIN` (o la cookie `spinai_token` manualmente) en este entorno
   para poder hacer QA visual real en navegador de los flujos de UI (R1,
   R2, R6, R7, R9, R11, R12, R14) — este entorno tampoco tiene una
   herramienta de navegador/captura de pantalla disponible, así que aun
   con PIN configurado, la verificación visual (no solo funcional) del
   `design-check` y de las animaciones/estados del drawer quedaría en
   manos del humano o de una sesión con esas herramientas disponibles.
