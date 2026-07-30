# Tasks — supabase-rls-lockdown

Orden sugerido: primero el código (rutas API + `lib/*.ts` reescritos +
cron routes migrados), recién al final la migración SQL — ver nota de
`design.md` sobre por qué el orden importa (no romper prod si el usuario
aplica la migración antes de que el código nuevo esté desplegado).

## 1. Rutas API protegidas — equipo/asignaciones/plantillas/logs (R5–R8)

- [x] 1.1 Crear `app/api/team/route.ts` con `GET` — reemplaza `loadData()`.
      Incluye la lógica de limpieza de asignaciones huérfanas y sync de
      `member_name` que hoy vive en `loadData()`. `isAuthenticated` + 401.
- [x] 1.2 Crear `app/api/team/members/route.ts` con `POST` — reemplaza
      `addMember(name, email?)`, incluyendo el cálculo del próximo viernes
      libre y la inserción de la asignación asociada. `isAuthenticated` + 401.
- [x] 1.3 Crear `app/api/team/members/[id]/route.ts` con `PATCH`
      (reemplaza `updateMemberName`/`updateMemberEmail`, ver mapeo en
      `design.md`) y `DELETE` (reemplaza `removeMember`, incluyendo marcar
      futuras como no asignadas / borrar pasadas / limpiar logs si quedan
      0 asignaciones). `isAuthenticated` + 401.
- [x] 1.4 Crear `app/api/team/members/[id]/toggle/route.ts` con `POST` —
      reemplaza `toggleMember`. `isAuthenticated` + 401.
- [x] 1.5 Crear `app/api/team/assignments/[id]/route.ts` con `DELETE` —
      reemplaza `removeAssignment` (incluye limpiar logs si quedan 0
      asignaciones). `isAuthenticated` + 401.
- [x] 1.6 Crear `app/api/team/assignments/swap/route.ts` con `POST` —
      reemplaza `swapAssignmentMembers`, incluyendo el insert en
      `assignment_logs`. `isAuthenticated` + 401.
- [x] 1.7 Crear `app/api/team/assignments/bulk-preview/route.ts` con `GET`
      y `app/api/team/assignments/bulk-confirm/route.ts` con `POST` —
      reemplazan `buildBulkAssignmentPreview`/`confirmBulkAssignment`.
      `isAuthenticated` + 401 en ambas.
- [x] 1.8 Crear `app/api/team/templates/[assignmentId]/route.ts` con `GET`
      (reemplaza `loadTemplate`, null si no existe) y `PUT` (reemplaza
      `saveTemplate`, incluyendo `sanitizeTiming`). `isAuthenticated` + 401.
- [x] 1.9 Crear `app/api/team/logs/route.ts` con `GET` — reemplaza
      `loadLogs()`, incluyendo la limpieza previa si no hay asignaciones.
      `isAuthenticated` + 401.

## 2. Reescribir `lib/storage.ts` (R9, R10)

- [x] 2.1 Reemplazar cada función exportada para que haga `fetch` a la
      ruta correspondiente de la tabla del punto 1, conservando firma
      (nombre, parámetros, tipo de retorno) idéntica a la actual.
      `getNextFridays` se queda igual (lógica pura, sin red).
- [x] 2.2 En cada función, si la respuesta no es OK, lanzar
      `new Error(<mensaje de la API>)` — mismo contrato de errores que
      hoy, para no romper el manejo de errores en los componentes
      consumidores.
- [ ] 2.3 Verificar manualmente (QA en navegador con PIN) que
      `Drawer.tsx`, `MembersPanel.tsx`, `Roulette.tsx`, `Schedule.tsx`,
      `ChangeLog.tsx`, `TemplateEditor.tsx`, `Nav.tsx`, `HeroChip.tsx`,
      `HomeCTAs.tsx` siguen funcionando sin cambios de código propios más
      allá de los imports ya existentes de `lib/storage.ts`.
      PENDIENTE — no ejercitable en este sandbox (sin PIN/browser tool ni
      credenciales Supabase reales). Ver `progress/impl_supabase-rls-lockdown.md`.

## 3. Rutas API públicas de solo lectura (R11–R14)

- [x] 3.1 Crear `app/api/public/news/route.ts` con `GET` (query `page`) —
      reemplaza el acceso a Supabase de `loadNews`. Sin auth.
- [x] 3.2 Crear `app/api/public/research/route.ts` con `GET` (query
      `limit`) — reemplaza el acceso a Supabase de `loadResearchPapers`.
      Sin auth.
- [x] 3.3 Crear `app/api/public/hf-trending/route.ts` con `GET` —
      reemplaza el acceso a Supabase de `loadHfTrending`. Sin auth.
- [x] 3.4 Crear `app/api/public/ai-models/route.ts` con `GET` — reemplaza
      el acceso a Supabase de `loadAiModels`. Sin auth.
- [x] 3.5 Reescribir `lib/news.ts`, `lib/research.ts`, `lib/hfTrending.ts`,
      `lib/stateOfAi.ts` para que sus funciones de carga hagan `fetch` a
      las rutas del punto 3 en vez de `getSupabase()` directo, conservando
      firma y comportamiento. Las funciones puras de cada módulo
      (`bestVariantPerSlug`, `formatPrice`, `formatIndex`,
      `formatReleaseDate`, `buildExecutiveSummary`,
      `monthlyReleaseCounts`, mapeos `rowTo*`) no cambian de
      comportamiento (pueden moverse server-side si el mapeo de fila cruda
      ya no aplica del lado del cliente).
- [ ] 3.6 Verificar manualmente que `Research.tsx`, `HfTrending.tsx`,
      `noticias/page.tsx`, `state-of-ai/page.tsx` y los componentes de
      `app/state-of-ai/*` que consumen `loadAiModels` siguen funcionando
      (con y sin PIN, ya que son datos públicos).
      PENDIENTE — no ejercitable en este sandbox (sin PIN/browser tool ni
      credenciales Supabase reales). Ver `progress/impl_supabase-rls-lockdown.md`.

## 4. Migrar cron routes y `/api/notify` a `getSupabaseAdmin()` (R16, R17)

- [x] 4.1 `app/api/cron/refresh-news/route.ts`: reemplazar
      `getSupabase()` por `getSupabaseAdmin()`.
- [x] 4.2 `app/api/cron/refresh-research/route.ts`: idem.
- [x] 4.3 `app/api/cron/refresh-hf-trending/route.ts`: idem.
- [x] 4.4 `app/api/cron/refresh-state-of-ai/route.ts`: idem.
- [x] 4.5 `app/api/cron/notify/route.ts`: idem.
- [x] 4.6 `app/api/notify/route.ts`: idem.
- [x] 4.7 Verificación manual: documentar en `progress/impl_<feature>.md`
      que estos 6 routes no se pueden ejercitar end-to-end sin
      credenciales reales de Supabase/cron en este entorno (mismo
      limitante que features previas de `/proyectos`) — dejar constancia
      de que el cambio es mecánico (mismo query/insert/upsert, solo
      cambia el cliente Supabase) y de que la verificación real queda
      para cuando el usuario despliegue a dev.

## 5. Migración SQL (R1–R4) — al final, con advertencia de orden de despliegue

- [x] 5.1 Crear
      `supabase/migrations/<timestamp>_bloquear_acceso_anon.sql` con los
      `drop policy` + `create policy` descritos en `design.md`, siguiendo
      el convenio de nombre de `supabase/migrations/README.md`.
- [x] 5.2 Documentar en el propio archivo `.sql` (comentario) el hallazgo
      de auditoría y referencia a este spec, siguiendo el estilo de
      comentarios de migraciones ya existentes.
- [x] 5.3 Dejar explícito en `progress/impl_<feature>.md` — en mayúsculas
      si hace falta — que esta migración **no debe aplicarse en Supabase
      dev hasta que el código de los puntos 1–4 esté desplegado en esa
      misma rama/entorno**, porque de lo contrario el CRUD de
      equipo/asignaciones/templates/logs se rompe para cualquiera que siga
      usando el código viejo (`lib/storage.ts` con `getSupabase()`
      directo) contra una base con RLS ya bloqueado.

## 6. Verificación general (R18, R19)

- [x] 6.1 `npm run verify` pasa (lint + build + test + check-sdd-state).
      No se anticipan cambios de lógica pura nueva en `lib/` que requieran
      tests Vitest nuevos — todo lo que se mueve a rutas API deja de ser
      código `lib/` puro (helpers de mapeo `rowTo*` migran a las rutas, no
      quedan exportados desde `lib/*.ts` para tests unitarios salvo que se
      decida re-exportarlos por conveniencia). Si `implementer` conserva
      algún helper puro no trivial en `lib/` (ej. `sanitizeTiming`,
      `nextFridayAfter`), agregarle test Vitest siguiendo la sección de
      trazabilidad de `docs/specs.md`.
      Se conservaron `sanitizeTiming`, `nextFridayAfter`, `getNextFridays`
      y los mapeos `rowToMember`/`rowToAssignment`/`rowToLog` en
      `lib/teamRows.ts` (nuevo módulo server-side compartido) — se agregó
      `lib/teamRows.test.ts` con 10 tests nuevos (22 tests totales en el
      repo, todos verdes).
- [ ] 6.2 QA manual completa (documentada en `progress/impl_<feature>.md`
      con lo verificado y el resultado): sin cookie válida, `/api/team*`
      responde 401 (curl); con PIN válido en el navegador, ejercitar
      agregar/editar/activar-desactivar/eliminar miembro, editar/
      intercambiar asignación, asignación masiva, ver/editar plantilla,
      ver logs — confirmar que no hay regresión funcional.
      PARCIAL: la parte de curl (401 sin cookie) se verificó real contra
      `npm run dev` para las 18 rutas nuevas + notify/cron. La parte de
      navegador con PIN queda PENDIENTE (ver 6.3).
- [x] 6.3 Si algún paso de QA no se puede ejercitar en este sandbox por
      falta de credenciales Supabase/PIN (mismo patrón que features
      previas de `/proyectos`), documentarlo explícitamente como
      pendiente en la nota de `feature_list.json`, no como "hecho".
