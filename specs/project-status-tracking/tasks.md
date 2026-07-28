# Tasks — Status de Proyectos

Orden sugerido: datos primero (testeable de forma aislada), luego
componentes compartidos, luego listado, luego detalle, luego navegación.

- [ ] **T1 — Modelo de datos y dummy data** (`R11`, `R12`, `R13`)
  - Agregar `ProjectKpi`, `HealthStatus`, `WeeklyUpdate`, `Project` a
    `lib/types.ts` (o definirlos en `lib/projects.ts` si se prefiere
    co-ubicarlos con el resto del módulo — seguir el criterio que ya usa
    el repo: tipos compartidos en `types.ts`, tipos de un solo módulo
    junto a su lógica).
  - Crear `lib/projects.ts` con los 4 proyectos dummy (país `"Chile"` en
    los 4, negocio `"Paris"` o `"Easy"` distribuidos entre los 4 — no los
    4 en el mismo negocio), cada uno con al menos 2 KPIs y al menos 3
    entradas de timeline semanal con distintos `status`.
  - Implementar `healthFromTimeline(updates: WeeklyUpdate[]): HealthStatus | null`
    como función pura exportada.
  - Implementar `loadProjects(): Promise<Project[]>` y
    `loadProject(id: string): Promise<Project | null>`.

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
    `R1`-`R14`: archivo(s) tocados y cómo se verificó (test de Vitest para
    `R2`/`R3` vía T2; QA manual para el resto — navegar `/proyectos`,
    abrir un detalle válido, probar un `id` inexistente, verificar el
    nav link activo/inactivo en cada ruta).
