# Design — Status de Proyectos

## Contexto (research UX ya hecha, referenciada, no repetida)

El listado usa progressive disclosure (tarjeta con lo mínimo para decidir
qué abrir), el detalle usa un badge de salud visible de un vistazo, y el
timeline de avances reutiliza el patrón vertical ya validado en
`app/state-of-ai/Timeline.tsx` (riel + punto + línea conectora, agrupado),
adaptado de agrupar por mes a agrupar por semana. Estas decisiones ya
estaban tomadas al momento de escribir esta spec; se documentan aquí en
términos de implementación, no se re-derivan.

## Alcance técnico

Nueva sección de rutas Next.js App Router:

```
app/proyectos/
  page.tsx              # listado: fetch de proyectos + grid de ProjectCard
  ProjectCard.tsx        # tarjeta individual del listado (progressive disclosure)
  HealthBadge.tsx         # badge de estado (on_track / at_risk / delayed / sin datos), compartido entre listado y detalle
  [id]/
    page.tsx              # detalle de proyecto
    ProjectTimeline.tsx    # timeline vertical semanal, adaptado de state-of-ai/Timeline.tsx
    KpiList.tsx             # lista clave-valor de KPIs

lib/
  projects.ts             # tipos + loadProjects() / loadProject(id) + 4 proyectos dummy + healthFromTimeline()
```

Sigue exactamente el patrón de `app/noticias/` (una sola carpeta de ruta,
componentes hijos co-ubicados, un módulo en `lib/`) y de `app/state-of-ai/`
(subcarpeta con varios componentes + `page.tsx` de composición), en vez de
inventar una nueva convención de carpetas.

## Esquema Supabase

Nueva migración `supabase/migrations/<timestamp>_crear_projects.sql`,
siguiendo el convenio de `supabase/migrations/README.md` (timestamp +
descripción corta, nunca se edita una migración ya aplicada) y el mismo
patrón de RLS que `news_items` (política `anon full access`, ya que toda
la app se lee con la anon key detrás de `PinGate`, sin roles adicionales):

```sql
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  summary       text not null,
  country       text not null,
  business_unit text not null,
  created_at    timestamptz not null default now()
);

create table if not exists project_kpis (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label      text not null,
  value      text not null,
  position   integer not null default 0
);

create table if not exists project_weekly_updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  week_of    date not null,
  status     text not null check (status in ('on_track', 'at_risk', 'delayed')),
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_kpis_project_id_idx on project_kpis (project_id);
create index if not exists project_weekly_updates_project_id_idx on project_weekly_updates (project_id);

alter table projects enable row level security;
alter table project_kpis enable row level security;
alter table project_weekly_updates enable row level security;

create policy "anon full access" on projects for all to anon using (true) with check (true);
create policy "anon full access" on project_kpis for all to anon using (true) with check (true);
create policy "anon full access" on project_weekly_updates for all to anon using (true) with check (true);
```

La misma migración incluye los `insert` de los 4 proyectos dummy (R11):
país `"Chile"` en los 4, `business_unit` `"Paris"` o `"Easy"`
distribuidos, cada uno con ≥2 filas en `project_kpis` y ≥3 filas en
`project_weekly_updates` con distintos `status`. No hay tabla ni cron
separado para sembrar datos — a diferencia de `news_items` (que se llena
por un cron), acá no hay fuente externa, así que el `insert` va en la
misma migración.

**Paso manual fuera del alcance de este repo**: aplicar la migración al
proyecto Supabase de dev (SQL Editor) es un paso manual que el humano (o
quien tenga acceso al dashboard de Supabase) debe ejecutar — ningún agente
tiene credenciales de Supabase. `implementer` deja el archivo `.sql` listo
y lo documenta en `progress/impl_project-status-tracking.md`, pero no
puede verificar la feature end-to-end contra datos reales hasta que ese
paso se haga. Esto es igual al flujo ya existente para cualquier otra
migración de este repo (`supabase/migrations/README.md`).

## Modelo de datos (`lib/types.ts` o `lib/projects.ts`)

```ts
export interface ProjectKpi {
  label: string;   // "Adopción"
  value: string;   // "42%" — string libre, no forzamos number para admitir unidades/formato variado
}

export type HealthStatus = "on_track" | "at_risk" | "delayed";

export interface WeeklyUpdate {
  id: string;
  weekOf: string;       // ISO date (lunes de la semana), mismo formato que Assignment.date
  status: HealthStatus;
  note: string;
}

export interface Project {
  id: string;
  name: string;
  summary: string;
  country: string;      // texto libre — hoy siempre "Chile", ver Alternativas
  businessUnit: string;  // texto libre — placeholder, ver Supuestos
  kpis: ProjectKpi[];
  updates: WeeklyUpdate[]; // orden de inserción arbitrario; se ordena al leer
}
```

`healthFromTimeline(updates: WeeklyUpdate[]): HealthStatus | null` en
`lib/projects.ts` — toma la entrada con `weekOf` más reciente y devuelve su
`status`, o `null` si `updates` está vacío (R3). Es una función pura,
exportada, testeable con Vitest sin mocks (cumple la regla de
traceability de `docs/specs.md` para lógica en `lib/`).

`loadProjects(): Promise<Project[]>` y `loadProject(id: string): Promise<Project | null>`
en `lib/projects.ts`, consultando Supabase vía `getSupabase()`
(`lib/supabase.ts`) — mismo patrón que `loadNews()` en `lib/news.ts`:

- `loadProjects()`: `select("*")` sobre `projects`, más un `select("*")`
  sobre `project_kpis` y `project_weekly_updates` filtrados por los ids
  obtenidos (o un solo query con `select` anidado de Supabase,
  `projects(*, project_kpis(*), project_weekly_updates(*))`, a definir por
  `implementer` según lo que rinda mejor) — devuelve `Project[]` ya
  ensamblados vía `rowToProject()`.
- `loadProject(id)`: mismo `select` anidado filtrado por `id`, devuelve
  `Project | null` (`null` si Supabase no encuentra la fila, cumple R7).
- `rowToProject(row)`, `rowToKpi(row)`, `rowToUpdate(row)`: mappers
  snake_case → camelCase, mismo patrón que `rowToNewsItem()` en
  `lib/news.ts`.

## Supuestos a validar con el usuario

- **`businessUnit` confirmado por el usuario**: `"Paris"` y `"Easy"`,
  distribuidos entre los 4 proyectos dummy. Sigue modelado como `string`
  libre (no enum) para poder agregar más negocios después sin migrar el
  tipo.
- **4 proyectos dummy, todos país `"Chile"`**: decisión explícita del
  usuario, documentada en el brief. El modelo soporta múltiples países sin
  cambios de forma (`country: string`), así que agregar proyectos de otros
  países después no requiere una migración.

## Health badge

`HealthBadge.tsx` recibe `status: HealthStatus | null` y renderiza:
- `on_track` → verde (usa un tono consistente con los `--color-*` tokens
  existentes en `app/globals.css`; no hay token verde/ámbar/rojo definido
  hoy, así que se agregan colores puntuales inline igual que
  `SUBSCRIPTION_SOURCES` en `noticias/page.tsx` usa `#F59E0B` sin ser un
  token — mismo patrón, no se inventa un sistema de theming nuevo).
- `at_risk` → ámbar.
- `delayed` → rojo.
- `null` ("sin datos") → gris neutro (`var(--color-tertiary)`), consistente
  con placeholders vacíos existentes en la app.

Reutilizado tal cual entre `ProjectCard` (listado) y el detalle, para que
el color de un mismo estado sea idéntico en ambas vistas.

## Timeline semanal (`ProjectTimeline.tsx`)

Adaptado directamente de `app/state-of-ai/Timeline.tsx`:
- Mismo riel visual (punto + línea conectora vertical), mismo uso de
  `var(--color-border)`, `var(--radius-md)`, mismo patrón de fila con
  hover (`transition` + `transform: translateX(2px)`).
- Cambia la clave de agrupación: de `releaseDate.slice(0, 7)` (mes) a
  `weekOf` completo (una entrada = una semana, no hay múltiples updates
  por semana en el modelo dummy, así que el agrupamiento es 1:1 pero se
  deja la estructura de `Group` por si en el futuro hay más de una
  actualización por semana).
- Cada fila muestra la fecha formateada (`toLocaleDateString("es-CL", ...)`,
  igual que el resto de la app), el `HealthBadge` correspondiente, y el
  texto de la actualización. No es un link externo (a diferencia de
  `Timeline.tsx` que linkea a `artificialanalysis.ai`) — es texto estático,
  así que la fila no es un `<a>`, es un `<div>`.
- Orden descendente (más reciente primero) vía `.sort()` sobre `weekOf`,
  igual criterio que `Timeline.tsx` usa para `releaseDate`.

## Listado (`page.tsx` + `ProjectCard.tsx`)

- Grid de tarjetas (`grid grid-cols-1 md:grid-cols-2 gap-3` o similar,
  siguiendo las clases Tailwind ya usadas en `state-of-ai/page.tsx` para
  stat tiles) en vez de una lista vertical como `noticias/` — las tarjetas
  de proyecto tienen más "peso" visual (badge + 4 campos) que una fila de
  noticia, y un grid de 2 columnas es más legible con solo 4 proyectos.
- Cada `ProjectCard` es un `<Link href={`/proyectos/${p.id}`}>` estilizado
  como `var(--color-surface-elevated)` + `var(--color-border)`, mismo
  lenguaje visual que `NewsCard`.
- Loading state: skeleton igual criterio que `NewsCardSkeleton`.
- Empty state (R5): reutiliza el mismo patrón de icono + texto de
  `noticias/page.tsx` (SVG inline, título + subtítulo), no un componente
  nuevo de empty state genérico — no se justifica extraer uno para un solo
  caso de uso adicional.

## Detalle (`[id]/page.tsx`)

- `useEffect` con `loadProject(id)` desde `useParams()`, mismo patrón que
  `noticias/page.tsx` usa `useEffect` + `loadNews()`.
- Layout: header con nombre + país + negocio + `HealthBadge`, luego resumen
  (párrafo), luego `KpiList` (grid simple de pares clave-valor en tarjetas
  pequeñas, mismo estilo `tileStyle` que `state-of-ai/page.tsx`), luego
  `ProjectTimeline`.
- `R7` (id inválido): si `loadProject` devuelve `null`, renderiza el mismo
  tipo de bloque "no encontrado" que usa `state-of-ai/page.tsx` para su
  estado de error (`tileStyle` + texto centrado), no una redirect ni un
  `notFound()` de Next — mantiene consistencia visual con el resto de la
  app y evita una página 404 genérica sin `Nav`.

## Navegación (`Nav.tsx`)

- Se agrega `proyectosActive = pathname?.startsWith("/proyectos") ?? false`
  y un `<NavLink href="/proyectos" active={proyectosActive}>Status de
  Proyectos</NavLink>` entre los links existentes de "Noticias de IA" y
  "State of AI" — mismo componente `NavLink` ya existente, sin
  modificarlo.
- Como `Nav.tsx` es `app/components/*.tsx`, `implementer` debe correr el
  skill `design-check` después de este cambio (regla ya existente en
  `docs/specs.md`).

## Alternativas consideradas y descartadas

- **Dummy data hardcodeada en `lib/projects.ts`, sin Supabase** — descartado:
  primera decisión de esta spec, pero el usuario pidió explícitamente que
  esta primera versión ya use Supabase. Se reemplaza por la migración con
  seed descrita arriba; el modelo de datos (`Project`, `ProjectKpi`,
  `WeeklyUpdate`) no cambia, solo de dónde vienen las filas.
- **Listado como lista vertical (como `noticias/`) en vez de grid** —
  descartado: con solo 4 tarjetas y más campos por tarjeta (nombre, país,
  negocio, badge, fecha), un grid de 2 columnas usa mejor el espacio
  horizontal disponible sin scroll extra.
- **Timeline como nuevo componente desde cero** — descartado explícitamente
  por el usuario: se reutiliza el patrón de `state-of-ai/Timeline.tsx`
  (riel + punto + agrupado), solo cambia la clave de agrupación de mes a
  semana.
- **`country` como union type cerrado (`"Chile"`)** — descartado: el
  usuario fue explícito en que se van a agregar más países después: un
  `string` libre evita una migración de tipos cuando eso pase, a costa de
  perder autocompletado — trade-off aceptable dado el requisito explícito.
- **Usar `notFound()` de Next.js para R7** — descartado: rompería el layout
  compartido (`Nav`, fondo, contenedor) que el resto de la app mantiene en
  sus estados de error; un bloque de error inline dentro del mismo
  `page.tsx` es consistente con cómo `state-of-ai/page.tsx` maneja su
  propio estado de error.

## Supabase / auth / cron

- **Sí hay cambio de schema** (ver "Esquema Supabase" arriba): 3 tablas
  nuevas (`projects`, `project_kpis`, `project_weekly_updates`), con RLS
  `anon full access` igual que el resto de las tablas de la app. Requiere
  el paso manual de aplicar la migración en el proyecto Supabase de dev
  (ver nota arriba) antes de que `implementer` pueda dar por verificada la
  feature contra datos reales.
- Auth: no aplica — la ruta hereda `PinGate` sin modificaciones.
- Cron: no aplica — no hay ningún cron job asociado a esta feature; la
  data se siembra una sola vez en la migración, no se refresca
  periódicamente.
