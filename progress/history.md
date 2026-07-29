# History

Append-only journal of completed (or abandoned) features. `leader` adds one
entry per feature when it reaches `done` — never edit past entries, only add
new ones below.

Entry format:

```markdown
## <feature-id> — done YYYY-MM-DD

- Requirements: R1–R<n>, see specs/<feature-id>/requirements.md
- Summary: <one or two sentences of what shipped and why>
- Merged to dev: <date/commit> · Promoted to main: <date/commit, or "pending">
```

---

## changelog-empty-state-animation — done 2026-07-21

- Requirements: R1–R6, see specs/changelog-empty-state-animation/requirements.md
- Summary: piloto de la Fase 1 del flujo SDD. Animación de entrada sutil
  (fade + translateY + scale, 320ms ease-in-out) para el empty state de
  `ChangeLog.tsx`, respetando `prefers-reduced-motion` vía el hook
  existente de `state-of-ai`. Fundamentada en research de UX sobre
  microinteracciones. Cero deps nuevas, cero tokens nuevos. Reviewer
  aprobó sin objeciones — ver progress/review_changelog-empty-state-animation.md.
- Merged to dev: commits d0b8b0f, ea0c96a · Promoted to main: 2026-07-21 (dev → main junto con schedule-content-animation)

## schedule-content-animation — done 2026-07-21

- Requirements: R1–R6, see specs/schedule-content-animation/requirements.md
- Summary: animación de entrada por fila del calendario de asignados en
  `app/components/Schedule.tsx` (fade + `translateY(4px)→0`, 220ms
  ease-in-out) con stagger escalonado (30ms/fila, tope 8), aplicada de forma
  independiente a "Próximos viernes" y "Anteriores". Respeta
  `prefers-reduced-motion` (sin movimiento en primer paint vía snapshot SSR),
  no toca el empty state ni el drag/drop, y no re-dispara la entrada tras
  swap/`onRefresh()` (los `key={a.id}` preservan el nodo DOM). Cero deps
  nuevas, cero tokens nuevos; `design-check` sin hallazgos. Reviewer corrió
  `npm run verify` (lint/build/test 5/5/check-sdd-state) y aprobó sin
  objeciones — ver progress/review_schedule-content-animation.md.
- Merged to dev: commit 325a555 · Promoted to main: 2026-07-21

## template-editor-content-animation — done 2026-07-21

- Requirements: R1–R7, see specs/template-editor-content-animation/requirements.md
- Summary: animación de entrada por sección en `app/components/TemplateEditor.tsx`
  (fade + `translateY(6px)→0`, 260ms ease-in-out) aplicada a cada una de las
  ocho secciones de nivel superior ("Reunión asignada", Título,
  TimingSection, AgendaEditor, ThemePicker, FontPicker, SizePicker, fila de
  acciones), con stagger fijo de 30ms por índice (0–210ms, sin tope porque el
  número de secciones es fijo). Respeta `prefers-reduced-motion` (incluido
  primer paint vía snapshot SSR), garantiza que la interactividad de cada
  control nunca queda bloqueada por la animación (R5, propiedad clave de
  esta feature al ser un formulario y no un estado pasivo), no re-dispara la
  entrada en re-renders ordinarios dentro del mismo montaje (R6), y sí la
  repite íntegramente en cada remount — reapertura del editor o retorno
  desde `PresentationView` vía `key={editorKey}` (R7). Cero deps nuevas,
  cero tokens nuevos, `Drawer.tsx` sin cambios. Reviewer corrió
  `npm run verify` (lint/build/test 5/5/check-sdd-state) y aprobó sin
  objeciones — ver progress/review_template-editor-content-animation.md.
- Merged to dev: commits 45bfd1d, daea385, 93d3a97, 1423e6f · Promoted to main: 2026-07-21

## members-panel-content-animation — done 2026-07-21

- Requirements: R1–R9, see specs/members-panel-content-animation/requirements.md
- Summary: animación de entrada del contenido de la vista "Equipo" en
  `app/components/MembersPanel.tsx` (fade + `translateY→0`, 220ms
  ease-in-out) aplicada a los tres bloques de nivel superior en orden fijo
  — el formulario "Agregar", el bloque lista-o-empty-state, y el contador
  del footer — con stagger de bloque `30ms * index` (0/30/60ms). El bloque
  lista-o-empty-state trata el empty state ("Sin integrantes aún") como una
  sola unidad visual sin sub-stagger, y cada fila de miembro (`<li
  key={m.id}>`) anima individualmente con un stagger propio
  `(1 + min(index, 8)) * 30ms` sobre la base del bloque, con tope en la
  fila 8 para no alargar la entrada en rosters largos. Respeta
  `prefers-reduced-motion` desde el primer paint SSR (reutilizando
  `usePrefersReducedMotion()`), nunca bloquea la interactividad de ningún
  control durante la animación (R7 — toggle, edición inline de
  nombre/email, borrado con confirmación en dos pasos, formulario), no
  repite la entrada en refresh ordinario tras `onAdd`/`onToggle`/`onRemove`/
  `onUpdateEmail`/`onUpdateName` gracias a los `key={m.id}` preexistentes
  (solo la fila nueva agregada por `onAdd` anima, R8), y sí repite la
  entrada completa al remontar la pestaña "equipo" tras salir y volver
  (R9, vía la ausencia de `key` en `Drawer.tsx`). Cero deps nuevas, cero
  tokens nuevos, `Drawer.tsx` sin cambios. Reviewer corrió `npm run verify`
  (lint/build/test 5/5/check-sdd-state) y re-verificó independientemente
  cada R1–R9 contra el diff real, aprobando sin objeciones — ver
  progress/review_members-panel-content-animation.md.
- Merged to dev: commits b1f5ad0, 97cfcf4, 71c30bb, b5d5165 · Promoted to main: 2026-07-21

## project-status-tracking — done 2026-07-28

- Requirements: R1–R17, see specs/project-status-tracking/requirements.md
- Summary: nueva sección "Status de Proyectos" (`/proyectos` listado +
  `/proyectos/[id]` detalle) para trackear iniciativas internas con KPIs y
  avances semanales. Primera feature del repo con datos confidenciales:
  3 tablas Supabase nuevas (`projects`, `project_kpis`,
  `project_weekly_updates`) con RLS habilitado y **sin** policy para
  `anon`/`authenticated` (deviación intencional del patrón `anon full
  access` del resto del repo), servidas solo a través de rutas API propias
  (`/api/proyectos`, `/api/proyectos/[id]`) que verifican el JWT de
  `spinai_token` (`lib/auth.ts`, extraído de `check/route.ts`) antes de
  usar un cliente `service_role` server-only (`lib/supabaseAdmin.ts`). El
  badge de salud (`on_track`/`at_risk`/`delayed`/sin datos) se deriva de la
  entrada más reciente del timeline vía `healthFromTimeline()`
  (`lib/projects.ts`), cubierta por 4 tests de Vitest. Timeline semanal
  adaptado de `state-of-ai/Timeline.tsx`. Nav actualizado con el link
  correspondiente, `design-check` sin hallazgos. `npm run verify` pasa
  completo.
- **Ciclo de revisión real (3 rondas, no una)**:
  1. La implementación inicial (commit `28512f2`) fue revisada por el mismo
     agente/sesión que la escribió (actuando como `implementer` y
     `reviewer` a la vez, por falta de herramienta de subagentes en ese
     momento) — aprobó, con el caveat explícito de no ser una segunda
     lectura independiente.
  2. Un `reviewer` genuinamente independiente (contexto nuevo, sin haber
     escrito el código) rechazó esa aprobación: los CTEs de escritura
     `kpis`/`updates` en `supabase/migrations/20260728120000_crear_projects.sql`
     no tenían `RETURNING`, así que el seed de los 4 proyectos dummy
     **nunca se ejecutaba** contra Postgres real (0 filas, no las 4
     declaradas) — R11 incumplido. Lo detectó ejecutando la migración
     contra un Postgres local, no leyendo el `.sql`. También encontró, no
     bloqueante, que un `id` no-UUID en `/api/proyectos/[id]` devolvía
     `500` en vez de `404`.
  3. Se corrigieron ambos (`returning 1` en los CTEs + manejo de
     `error.code === "22P02"`), verificado ejecutando la migración
     corregida contra Postgres real (4 proyectos, 8 KPIs, 12 avances, 0
     policies). Un segundo pase del mismo `reviewer` independiente
     re-verificó todo desde cero (incluida la corrida contra Postgres) y
     aprobó — ver `progress/review_project-status-tracking.md` para el
     detalle completo de las 3 rondas.
  - Lección para el proceso: para una migración SQL, "leí el archivo" no
    es verificación — hay que ejecutarlo. También se confirmó que la
    migración **no es idempotente** (correrla dos veces duplica el seed) —
    quien la aplique en Supabase debe correrla una sola vez.
- **Quedan dos pasos manuales pendientes del humano, sin los cuales la
  feature no sirve datos reales todavía**: aplicar
  `supabase/migrations/20260728120000_crear_projects.sql` (la versión
  corregida) en el SQL Editor del proyecto Supabase de dev, y setear
  `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`/Vercel. El gate de
  autenticación (R16) y la ausencia de la service role key en el bundle
  del cliente (mitad de R17) se verificaron igual, sin depender de esos
  pasos.
- Merged to dev: commits 28512f2, 5fb30e4 · Promoted to main: pending

## project-crud — done 2026-07-29

- Requirements: R1–R26, see specs/project-crud/requirements.md (R1-R17 de
  project-status-tracking siguen vigentes sin cambios, ninguno retirado
  salvo R8 ya retirado antes de esta feature)
- Summary: CRUD completo (crear, editar, eliminar) para `/proyectos`, que
  hasta ahora era solo lectura. Card "Crear proyecto" como primer elemento
  del grid (`CreateProjectCard.tsx`), reutilizando `ProjectDrawer.tsx`
  existente en tres modos (vista/creación/edición) en vez de un modal
  nuevo, con `ProjectForm.tsx` compartido entre crear y editar (4 campos:
  nombre, país, unidad de negocio, resumen) y `DeleteProjectModal.tsx` con
  confirmación explícita que nombra el proyecto. Rutas nuevas `POST
  /api/proyectos` y `PATCH`/`DELETE /api/proyectos/[id]`, mismo patrón
  `isAuthenticated()` + `getSupabaseAdmin()` que las rutas `GET`
  existentes — sin cambios de RLS (el schema ya dejaba `project_kpis`/
  `project_weekly_updates` con `on delete cascade`, así que el borrado no
  requiere lógica manual). KPIs quedan explícitamente fuera del formulario
  en esta versión (siguen gestionándose vía SQL Editor); `PATCH` elegido
  sobre `PUT` por claridad de API, no por comportamiento — ambas
  decisiones aprobadas por el humano antes de implementar. `npm run
  verify` pasa completo.
- **Ciclo de revisión (2 rondas)**: la primera entrega (commit `e59d793`)
  fue rechazada por `reviewer` independiente — había reemplazado el empty
  state de `/proyectos` (0 proyectos) por la grilla mostrando solo la card
  de crear, violando R5 de `project-status-tracking` (vigente, nunca
  retirado). El resto de la implementación pasó sin objeciones, incluidas
  dos desviaciones de `design.md` evaluadas y aceptadas como mejoras
  (`ProjectDrawer` decide POST-vs-PATCH con `project === null` en vez del
  prop `projectId`, evitando un doble POST al editar sin cerrar el drawer
  tras crear). Fix (commit `b61b0bd`): empty state restaurado con
  `CreateProjectCard` dentro, cumpliendo R5 y R1 a la vez; de paso se
  limpió un prop `error` muerto en `DeleteProjectModal`. Segunda vuelta de
  `reviewer` verificó el fix contra el código real (no el resumen) y
  aprobó — ver `progress/review_project-crud.md` (ambas rondas).
- **Pendiente de QA humana end-to-end antes de uso real en dev**: crear
  (201), editar (200), borrar (200 + confirmar la cascada de
  `project_kpis`/`project_weekly_updates` en el Table Editor de Supabase),
  `PATCH`/`DELETE` con id inexistente (404), y ver el empty state con 0
  proyectos en navegador. No se pudo ejercitar en este sandbox por falta
  de credenciales Supabase (no hay `.env.local`) y de PIN configurado —
  mismo blocker ya aceptado en `project-status-tracking`. Los 401/400 sí
  se verificaron por `curl` real contra rutas API con un JWT firmado a
  mano.
- Merged to dev: commits e59d793, b61b0bd · Promoted to main: pending

## weekly-update-entry — done 2026-07-29

- Requirements: R1–R19, see specs/weekly-update-entry/requirements.md
- Summary: agrega la posibilidad de **crear** (no editar/eliminar) avances
  semanales (`project_weekly_updates`) desde la UI de `/proyectos`, en dos
  puntos: una sección opcional "Primer avance semanal" en `ProjectForm.tsx`
  al crear un proyecto (crea el proyecto y, si se completó, el avance en
  dos pasos — si el avance falla, el proyecto queda igual creado y el
  error se muestra aparte, sin perder ni duplicar nada), y un botón
  "Agregar avance" con formulario inline (`AddUpdateForm.tsx`) en el
  drawer de detalle de un proyecto ya existente. Nueva ruta `POST
  /api/proyectos/[id]/avances`, mismo patrón `isAuthenticated()` +
  `getSupabaseAdmin()` que el resto. La UI garantiza que `week_of` sea
  siempre el lunes de la semana elegida vía una función pura nueva
  `mondayOf()` en `lib/projects.ts` (el usuario nunca elige el lunes a
  mano, ve "Semana del ..." como confirmación) — sin constraint SQL nuevo,
  garantía 100% del lado del cliente, decisión documentada con su
  alternativa en `design.md`. Componente compartido `WeeklyUpdateFields.tsx`
  reutilizado entre ambos puntos de entrada. `mondayOf()` cubierta por 4
  tests de Vitest reales (lunes se mapea a sí mismo, domingo → lunes
  anterior, miércoles mid-week, sábado cruzando fin de mes). `npm run
  verify` pasa completo (13 tests).
- **Ciclo de revisión (2 rondas)**: la primera entrega (commit `8960850`)
  fue rechazada por `reviewer` independiente por un gap acotado en R16 —
  la ruta nueva validaba que `weekOf` estuviera presente, pero no que
  fuera parseable como fecha; un valor como `"banana"` atravesaba la
  validación y terminaba en `500` en vez del `400` que exige el
  requirement (en producción, contra Supabase real, habría sido un error
  de cast de Postgres en la columna `date`, igual de no-manejado). Todo lo
  demás pasó sin objeciones en la primera vuelta, incluida una verificación
  explícita de que la feature **no rompió nada** de `project-crud` ni de
  `project-status-tracking` (el cambio en `lib/projects.ts` es puramente
  aditivo, el empty state del timeline y los tres modos del drawer quedan
  intactos). Fix (commit `5e724dd`): un chequeo de parseabilidad
  (`Number.isNaN(new Date(weekOf).getTime())`) antes de usar el valor.
  Segunda vuelta de `reviewer` reprodujo el fix por `curl` real
  (incluyendo un caso extra no probado por `implementer`, una fecha con
  forma válida pero fuera de rango) y aprobó — ver
  `progress/review_weekly-update-entry.md` (ambas rondas).
- **Pendiente de QA humana end-to-end antes de uso real en dev**: agregar
  el primer avance al crear un proyecto (201), agregar un avance desde el
  drawer de un proyecto existente (201), y confirmar 404 con id de
  proyecto inexistente. Mismo blocker que las dos features anteriores
  (sin `.env.local`/credenciales Supabase, sin PIN configurado en este
  sandbox) — los 401/400 sí se verificaron por `curl` real contra rutas
  API con un JWT firmado a mano.
- Merged to dev: commits 8960850, 5e724dd · Promoted to main: pending

## weekly-update-edit-delete — done 2026-07-29

- Requirements: R1–R21, see specs/weekly-update-edit-delete/requirements.md
- Summary: cierra el hueco dejado a propósito por `weekly-update-entry`
  (solo crear) agregando **editar** y **eliminar** avances semanales
  existentes desde el timeline del drawer de detalle. Edición: la fila se
  expande a un formulario completo reutilizando `WeeklyUpdateFields.tsx`
  (mismo cálculo `mondayOf()` que crear), un solo submit vía `PATCH`.
  Eliminación: confirmación inline de dos pasos con auto-revert a 3s
  (patrón de `MembersPanel.tsx`), no el modal pesado de borrar-proyecto —
  justificado porque un avance individual no tiene cascada. Solo una fila
  editable o con confirmación de borrado a la vez, garantizado
  estructuralmente. Rutas nuevas `PATCH`/`DELETE
  /api/proyectos/[id]/avances/[updateId]`, con `findUpdate()` filtrando
  por `id` **y** `project_id` en una sola query vía `.maybeSingle()` (no
  `.single()`, deliberado — evita que "0 filas" caiga en un 500 en vez del
  404 que exige R18) para cubrir tanto "avance inexistente" como "avance
  de otro proyecto" con la misma respuesta honesta. Reutiliza carácter por
  carácter la validación de `weekOf` parseable que se corrigió en la
  feature anterior — no reintrodujo ese bug. `npm run verify` pasa
  completo (13 tests, sin tests nuevos porque no hay lógica pura nueva en
  `lib/`).
- **Una sola vuelta de revisión, aprobada sin rechazos** — primera vez en
  esta serie de features. `reviewer` verificó con especial cuidado los dos
  puntos que habían causado rechazos en features anteriores (validación de
  fecha no reintroducida, y el caso cross-project de R18 con `maybeSingle()`
  en vez de `single()`) y confirmó ambos por lectura de código, no por el
  reporte de `implementer`. También confirmó cero regresiones sobre
  `project-crud`/`weekly-update-entry` (POST de creación fuera del diff,
  `ProjectDrawer` solo monta `ProjectTimeline` en modo vista, cambios
  puramente aditivos) — ver `progress/review_weekly-update-edit-delete.md`.
  Encontró una inconsistencia menor en `design.md` (nombres de prop
  `onEditUpdate`/`onDeleteUpdate` vs. `onEdit`/`onDelete` reales) corregida
  como seguimiento no bloqueante, sin tocar código.
- **Pendiente de QA humana end-to-end antes de uso real en dev**: editar
  un avance (200), eliminar un avance (200), y en particular el caso R18 —
  pedir un `updateId` que pertenece a otro proyecto debe dar 404, no
  500/200. Mismo blocker de entorno que las tres features anteriores (sin
  `.env.local`/PIN); 401/400 sí verificados por `curl` real.
- Merged to dev: commit 703c684 · Promoted to main: pending

## project-status-field — done 2026-07-29

- Requirements: R1–R32, see specs/project-status-field/requirements.md
  (más una sección explícita de requirements retirados/modificados en las
  4 specs previas — ver abajo)
- Summary: cambio de modelo de datos a pedido explícito del usuario
  ("el estado es propio del proyecto, el avance no debe tener estados").
  El campo `status` (`on_track`/`at_risk`/`delayed`) se muda de
  `project_weekly_updates` a `projects`. Migración nueva
  (`20260729120000_mover_status_a_projects.sql`, **no aplicada por ningún
  agente**, queda como paso manual del humano en el SQL Editor): agrega
  `projects.status` nullable, hace backfill por proyecto desde el `status`
  del avance más reciente (subquery correlacionada, sin hardcodear
  "Probador Virtual" ni asumir un solo proyecto, `coalesce` a `'on_track'`
  si un proyecto no tiene avances), recién ahí aplica `not null` + el
  mismo `check` de 3 valores, y por último elimina `status` de
  `project_weekly_updates` (irreversible, decisión consciente del
  usuario). `healthFromTimeline()` se elimina junto con sus tests viejos
  — el badge de estado (`ProjectCard`/`ProjectDrawer`) pasa a leer
  `project.status` directo, ya no se deriva del timeline. `ProjectForm.tsx`
  gana "Estado" como quinto campo obligatorio; `WeeklyUpdateFields.tsx`
  pierde su selector de estado en los tres lugares donde se usa (sección
  opcional de creación, agregar avance, editar avance). Las 4 rutas API
  de `/proyectos` ganan validación/persistencia de `status`; las 2 rutas
  de `/avances` la pierden (un `status` en el body ahora se ignora en
  silencio, no rechaza con 400). `VALID_STATUSES` se centraliza en
  `lib/projects.ts` en vez de seguir duplicado en 4 archivos.
  **Consecuencia de UX documentada**: editar/eliminar un avance semanal
  ya no mueve el badge del proyecto (se desacopló del timeline).
- **Ciclo de revisión (2 rondas)**. Primera vuelta (commit `3b22702`)
  rechazada por un único gap acotado: los cambios de lógica en
  `lib/projects.ts` (`rowToProject()` ahora mapea `status`, `rowToUpdate()`
  dejó de mapearlo, `VALID_STATUSES` nuevo) no tenían test de Vitest —
  "verificado por lectura de código" no satisface `docs/specs.md` para
  lógica en `lib/`. La migración SQL, que era el riesgo real de esta
  feature (schema contra datos de producción), fue auditada línea por
  línea en la primera vuelta y aprobada sin objeciones — secuencia
  backfill-antes-de-`not null` correcta, sin `not null`/`default`
  prematuro, `drop column` al final. Fix (commit `a38925c`): 3 tests
  nuevos en `lib/projects.test.ts`. Segunda vuelta de `reviewer` no se
  conformó con que los tests existieran y pasaran — **revirtió
  `lib/projects.ts` a la versión pre-feature mutación por mutación** y
  confirmó que las 4 mutaciones (quitar el mapeo de `status`, reintroducir
  `status` en `rowToUpdate`, agregar un 4º valor a `VALID_STATUSES`,
  reordenarlo) hacen fallar los tests nuevos. Encontró además que una de
  las aserciones (`toEqual`) era débil por cómo Vitest ignora claves
  `undefined`, y que la aserción `not.toHaveProperty("status")` — que
  parecía redundante — es en realidad la única que cubre esa regresión;
  quedó anotado en el review para que nadie la "limpie" después. Aprobó
  — ver `progress/review_project-status-field.md` (ambas rondas).
- **Acción requerida del humano antes de usar `/proyectos` en dev — no es
  QA opcional como en features anteriores**: aplicar
  `supabase/migrations/20260729120000_mover_status_a_projects.sql`
  manualmente en el SQL Editor de Supabase. El código ya asume que
  `projects.status` existe; sin la migración aplicada, el badge de
  estado se rompe (columna inexistente en la fila real). Después de
  aplicarla, confirmar que "Probador Virtual" quedó con `status
  'on_track'` (el backfill lo deriva de su único avance existente) y
  hacer QA end-to-end de crear/editar proyecto y de agregar/editar
  avance.
- Merged to dev: commits 3b22702, a38925c · Promoted to main: pending
