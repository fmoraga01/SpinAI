# Tasks — Status de Proyectos

Orden sugerido: datos primero (testeable de forma aislada), luego
componentes compartidos, luego listado, luego detalle, luego navegación.

- [ ] **T1 — Migración Supabase con seed** (`R11`, `R12`, `R13`)
  - Crear `supabase/migrations/<timestamp>_crear_projects.sql` con las
    tablas `projects`, `project_kpis`, `project_weekly_updates` (ver
    `design.md` para el DDL exacto), índices, RLS `anon full access`.
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

- [ ] **T1b — Modelo de datos y query module** (`R11`, `R12`, `R13`, `R15`)
  - Agregar `ProjectKpi`, `HealthStatus`, `WeeklyUpdate`, `Project` a
    `lib/types.ts` (o definirlos en `lib/projects.ts` si se prefiere
    co-ubicarlos con el resto del módulo — seguir el criterio que ya usa
    el repo: tipos compartidos en `types.ts`, tipos de un solo módulo
    junto a su lógica).
  - Implementar `healthFromTimeline(updates: WeeklyUpdate[]): HealthStatus | null`
    como función pura exportada.
  - Implementar `loadProjects(): Promise<Project[]>` y
    `loadProject(id: string): Promise<Project | null>` en `lib/projects.ts`
    consultando Supabase vía `getSupabase()`, con `rowToProject()` /
    `rowToKpi()` / `rowToUpdate()` (mismo patrón que `lib/news.ts`).

- [ ] **T2 — Test de `healthFromTimeline`** (`R2`, `R3`)
  - `lib/projects.test.ts`: casos — lista vacía devuelve `null`; una sola
    entrada devuelve su status; varias entradas devuelven el status de la
    de `weekOf` más reciente (no la última del array en orden de
    inserción, para cubrir el caso de datos desordenados).

- [ ] **T3 — `HealthBadge.tsx`** (`R2`, `R3`)
  - Componente compartido en `app/proyectos/HealthBadge.tsx` que recibe
    `status: HealthStatus | null` y renderiza los 4 estados visuales
    (`on_track`/`at_risk`/`delayed`/`null` → "sin datos") descritos en
    `design.md`.

- [ ] **T4 — Listado `/proyectos`** (`R1`, `R4`, `R5`)
  - `app/proyectos/ProjectCard.tsx`: tarjeta con nombre, país, negocio,
    `HealthBadge`, fecha de última actualización; `Link` a
    `/proyectos/<id>`.
  - `app/proyectos/page.tsx`: `Nav` + hero simple + fetch de
    `loadProjects()` + loading skeleton + empty state + grid de
    `ProjectCard`.

- [ ] **T5 — `KpiList.tsx`** (`R6`, `R8`)
  - `app/proyectos/[id]/KpiList.tsx`: grid de tarjetas clave-valor; si
    `kpis.length === 0`, omite la sección o muestra un estado vacío
    explícito (no una lista en blanco).

- [ ] **T6 — `ProjectTimeline.tsx`** (`R6`, `R9`, `R10`)
  - `app/proyectos/[id]/ProjectTimeline.tsx`, adaptado de
    `app/state-of-ai/Timeline.tsx` según lo descrito en `design.md`
    (agrupado por `weekOf`, orden descendente, fila no-link con
    `HealthBadge` + texto). Si `updates.length === 0`, mostrar estado
    vacío explícito.

- [ ] **T7 — Detalle `/proyectos/[id]`** (`R6`, `R7`)
  - `app/proyectos/[id]/page.tsx`: `Nav` + fetch de `loadProject(id)` +
    loading skeleton + estado "no encontrado" si `null` + header
    (nombre/país/negocio/badge) + resumen + `KpiList` + `ProjectTimeline`.

- [ ] **T8 — Navegación** (`R14`)
  - Editar `app/components/Nav.tsx`: agregar `proyectosActive` y el
    `NavLink` a `/proyectos` entre "Noticias de IA" y "State of AI".
  - Correr el skill `design-check` (obligatorio por tocar
    `app/components/*.tsx`) y anotar el resultado en
    `progress/impl_project-status-tracking.md`.

- [ ] **T9 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state).
  - Escribir `progress/impl_project-status-tracking.md` con, para cada
    `R1`-`R15`: archivo(s) tocados y cómo se verificó (test de Vitest para
    `R2`/`R3` vía T2; QA manual para el resto — navegar `/proyectos`,
    abrir un detalle válido, probar un `id` inexistente, verificar el
    nav link activo/inactivo en cada ruta, confirmar en las Network tools
    o logs que `/proyectos` efectivamente consulta Supabase y no data
    hardcodeada para R15).
  - Si T1 quedó bloqueado por falta de acceso al dashboard de Supabase,
    reportarlo explícitamente acá en vez de marcar la feature como lista.
