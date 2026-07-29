# Tasks — Status de Proyectos

Orden sugerido: datos primero (testeable de forma aislada), luego
componentes compartidos, luego listado, luego detalle, luego navegación.

- [x] **T1 — Migración Supabase con seed** (`R11`, `R12`, `R13`, `R17`)
  - Crear `supabase/migrations/<timestamp>_crear_projects.sql` con las
    tablas `projects`, `project_kpis`, `project_weekly_updates` (ver
    `design.md` para el DDL exacto), índices, RLS habilitado **sin**
    policy para `anon`/`authenticated` (R17 — deny por defecto, deviación
    intencional del patrón `anon full access` que usa el resto del repo,
    justificada por confidencialidad).
  - En la misma migración, `insert` de los 4 proyectos dummy: país
    `"Chile"` en los 4, negocio `"Paris"` o `"Easy"` distribuidos entre los
    4 (no los 4 en el mismo negocio), cada uno con ≥2 filas en
    `project_kpis` y ≥3 filas en `project_weekly_updates` con distintos
    `status`.
  - Aplicar la migración al proyecto Supabase de **dev** vía SQL Editor
    (paso manual, ver `supabase/migrations/README.md`) — sin esto no hay
    datos que consultar y T4/T7 no se pueden verificar contra datos reales.
    Si `implementer` no tiene acceso al dashboard de Supabase, dejar el
    `.sql` listo y marcar este paso como bloqueado en
    `progress/impl_project-status-tracking.md`, reportando al humano en
    vez de improvisar un workaround.

- [x] **T1b — Modelo de datos, tipos y mappers** (`R11`, `R12`, `R13`)
  - Agregar `ProjectKpi`, `HealthStatus`, `WeeklyUpdate`, `Project` a
    `lib/types.ts` (o definirlos en `lib/projects.ts` si se prefiere
    co-ubicarlos con el resto del módulo — seguir el criterio que ya usa
    el repo: tipos compartidos en `types.ts`, tipos de un solo módulo
    junto a su lógica).
  - Implementar `healthFromTimeline(updates: WeeklyUpdate[]): HealthStatus | null`
    como función pura exportada.
  - Implementar `rowToProject(row)`, `rowToKpi(row)`, `rowToUpdate(row)` en
    `lib/projects.ts` (mappers snake_case → camelCase, mismo patrón que
    `rowToNewsItem()` en `lib/news.ts`) — los consumen las rutas API de T1d,
    no el cliente.

- [x] **T1c — Verificación de sesión compartida y cliente admin** (`R16`, `R17`)
  - Extraer la verificación de JWT de `app/api/auth/check/route.ts` a
    `lib/auth.ts` como `isAuthenticated(req: NextRequest): Promise<boolean>`
    (misma lógica `jwtVerify` + cookie `spinai_token`, sin duplicarla).
    Refactorizar `check/route.ts` para usar esta función — mismo
    comportamiento externo, sin lógica repetida.
  - Crear `lib/supabaseAdmin.ts` con `getSupabaseAdmin()`, análogo a
    `getSupabase()` pero usando `process.env.SUPABASE_SERVICE_ROLE_KEY`
    (nueva env var server-only, sin prefijo `NEXT_PUBLIC_`). Documentar en
    `progress/impl_project-status-tracking.md` que esta variable debe
    agregarse manualmente en `.env.local` y en las env vars de Vercel
    (dev y prod) — `implementer` no tiene forma de setearla, es un paso
    del humano, igual que aplicar la migración en T1.

- [x] **T1d — Rutas API `/api/proyectos`** (`R15`, `R16`, `R17`)
  - `app/api/proyectos/route.ts` (`GET`): `isAuthenticated(req)` primero
    — si `false`, `401` sin datos; si `true`, consulta con
    `getSupabaseAdmin()` (select anidado `projects(*, project_kpis(*),
    project_weekly_updates(*))` o dos queries, lo que rinda mejor) y
    devuelve `Project[]` vía los mappers de T1b.
  - `app/api/proyectos/[id]/route.ts` (`GET`): mismo chequeo de auth,
    mismo query filtrado por `id`; `404` si Supabase no encuentra la fila
    (cumple R7 desde el server), `401` si no autenticado.
  - `lib/projects.ts`: `loadProjects()` y `loadProject(id)` hacen `fetch()`
    a estas rutas (same-origin, la cookie `spinai_token` viaja sola) — no
    llaman a Supabase directo desde `lib/projects.ts` cuando se ejecuta en
    el cliente.

- [x] **T2 — Test de `healthFromTimeline`** (`R2`, `R3`)
  - `lib/projects.test.ts`: casos — lista vacía devuelve `null`; una sola
    entrada devuelve su status; varias entradas devuelven el status de la
    de `weekOf` más reciente (no la última del array en orden de
    inserción, para cubrir el caso de datos desordenados).

- [x] **T3 — `HealthBadge.tsx`** (`R2`, `R3`)
  - Componente compartido en `app/proyectos/HealthBadge.tsx` que recibe
    `status: HealthStatus | null` y renderiza los 4 estados visuales
    (`on_track`/`at_risk`/`delayed`/`null` → "sin datos") descritos en
    `design.md`.

- [x] **T4 — Listado `/proyectos`** (`R1`, `R4`, `R5`)
  - `app/proyectos/ProjectCard.tsx`: tarjeta con nombre, país, negocio,
    `HealthBadge`, fecha de última actualización; `Link` a
    `/proyectos/<id>`.
  - `app/proyectos/page.tsx`: `Nav` + hero simple + fetch de
    `loadProjects()` + loading skeleton + empty state + grid de
    `ProjectCard`.

- [x] **T5 — `KpiList.tsx`** (`R6`, `R8`) — **[retirado 2026-07-29]**
  - `app/proyectos/[id]/KpiList.tsx`: grid de tarjetas clave-valor; si
    `kpis.length === 0`, omite la sección o muestra un estado vacío
    explícito (no una lista en blanco).
  - Componente eliminado a pedido del usuario (ver `design.md`, sección
    "Detalle" y `requirements.md` R6/R8) — no se muestra más en el
    detalle. Se deja el checkbox marcado porque el trabajo se hizo y se
    verificó en su momento; el retiro queda documentado como cambio
    posterior, no como tarea nueva.

- [x] **T6 — `ProjectTimeline.tsx`** (`R6`, `R9`, `R10`)
  - `app/proyectos/[id]/ProjectTimeline.tsx`, adaptado de
    `app/state-of-ai/Timeline.tsx` según lo descrito en `design.md`
    (agrupado por `weekOf`, orden descendente, fila no-link con
    `HealthBadge` + texto). Si `updates.length === 0`, mostrar estado
    vacío explícito.

- [x] **T7 — Detalle `/proyectos/[id]`** (`R6`, `R7`)
  - `app/proyectos/[id]/page.tsx`: `Nav` + fetch de `loadProject(id)` +
    loading skeleton + estado "no encontrado" si `null` + header
    (nombre/país/negocio/badge) + resumen + ~~`KpiList`~~ + `ProjectTimeline`.
    `KpiList` retirado 2026-07-29 (ver T5).

- [x] **T8 — Navegación** (`R14`)
  - Editar `app/components/Nav.tsx`: agregar `proyectosActive` y el
    `NavLink` a `/proyectos` entre "Noticias de IA" y "State of AI".
  - Correr el skill `design-check` (obligatorio por tocar
    `app/components/*.tsx`) y anotar el resultado en
    `progress/impl_project-status-tracking.md`.

- [x] **T9 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state).
  - Verificación manual específica de seguridad (R16, R17):
    - `curl` (o Network tools sin la cookie) a `/api/proyectos` y
      `/api/proyectos/<id>` sin `spinai_token` → confirmar `401` y que el
      cuerpo de la respuesta no trae datos de proyectos.
    - Confirmar en el dashboard de Supabase (Table Editor → Policies) que
      `projects`/`project_kpis`/`project_weekly_updates` no tienen ninguna
      policy activa para `anon`/`authenticated`.
    - Confirmar que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sigue siendo la única
      key en el bundle del cliente (buscar `SUPABASE_SERVICE_ROLE_KEY` en
      el output de `npm run build` / dev tools no debería aparecer).
  - Escribir `progress/impl_project-status-tracking.md` con, para cada
    `R1`-`R17`: archivo(s) tocados y cómo se verificó (test de Vitest para
    `R2`/`R3` vía T2; QA manual para el resto — navegar `/proyectos`,
    abrir un detalle válido, probar un `id` inexistente, verificar el
    nav link activo/inactivo en cada ruta, más los 3 checks de seguridad
    de arriba para R15/R16/R17).
  - Si T1 quedó bloqueado por falta de acceso al dashboard de Supabase, o
    si `SUPABASE_SERVICE_ROLE_KEY` no está seteada, reportarlo
    explícitamente acá en vez de marcar la feature como lista.
