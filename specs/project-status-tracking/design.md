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
  page.tsx              # listado: fetch de /api/proyectos + grid de ProjectCard + estado del drawer
  ProjectCard.tsx        # tarjeta individual del listado (progressive disclosure); onSelect en vez de <Link>
  ProjectDrawer.tsx       # [nuevo 2026-07-29] detalle en drawer deslizante, reemplaza la ruta [id]/
  ProjectTimeline.tsx     # [movido 2026-07-29, antes en [id]/] timeline vertical semanal
  HealthBadge.tsx         # badge de estado (on_track / at_risk / delayed / sin datos), compartido entre card/drawer

app/api/proyectos/
  route.ts               # GET: valida sesión (R16) + getSupabaseAdmin() + devuelve Project[]
  [id]/route.ts           # GET: valida sesión (R16) + getSupabaseAdmin() + devuelve Project | 404 — SIGUE
                          # existiendo (el drawer la consume); solo la página [id]/ se eliminó

lib/
  projects.ts             # tipos + loadProjects()/loadProject(id) (fetch a /api/proyectos) + healthFromTimeline()
  supabaseAdmin.ts         # getSupabaseAdmin() — cliente server-only con service role key
  auth.ts                  # isAuthenticated(req) — verificación de spinai_token, compartida con /api/auth/check
```

**[2026-07-29] `app/proyectos/[id]/page.tsx` y `KpiList.tsx` ya no
existen** — ver "Detalle (drawer)" más abajo para la arquitectura
vigente. `app/api/proyectos/[id]/route.ts` (la API, no la página) **no**
se tocó.

Sigue exactamente el patrón de `app/noticias/` (una sola carpeta de ruta,
componentes hijos co-ubicados, un módulo en `lib/`) y de `app/state-of-ai/`
(subcarpeta con varios componentes + `page.tsx` de composición), en vez de
inventar una nueva convención de carpetas.

## Esquema Supabase

Nueva migración `supabase/migrations/<timestamp>_crear_projects.sql`,
siguiendo el convenio de `supabase/migrations/README.md` (timestamp +
descripción corta, nunca se edita una migración ya aplicada).

**RLS deliberadamente distinto al resto del repo**: `news_items` y las
demás tablas usan la política `anon full access` porque su contenido es
público. Esta feature maneja información confidencial de negocio, así que
las 3 tablas nuevas **no otorgan ningún acceso al rol `anon`** (RLS
habilitado, sin políticas para `anon`/`authenticated` → deny por defecto).
Solo el `service_role` key (que Supabase siempre deja bypass-ear RLS, sin
necesidad de política) puede leer/escribir, y ese key solo se usa
server-side dentro de las rutas API de esta feature — nunca llega al
navegador (ver "Seguridad y acceso a datos" más abajo):

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

-- Sin `create policy` para anon/authenticated a propósito (R17): esta
-- data es confidencial. Solo service_role (server-side) puede leer/escribir.
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

## Seguridad y acceso a datos

El resto de la app confía en la anon key + RLS abierto porque su data es
pública; acá no aplica ese patrón (ver R16/R17). Flujo real:

1. **`lib/auth.ts`** — extrae la verificación de JWT que hoy vive inline
   en `app/api/auth/check/route.ts` (`jwtVerify` sobre la cookie
   `spinai_token` con `jose`) a una función compartida
   `isAuthenticated(req: NextRequest): Promise<boolean>`. `check/route.ts`
   se refactoriza para usarla (mismo comportamiento, sin duplicar lógica
   de verificación de JWT en 3 archivos distintos).
2. **`lib/supabaseAdmin.ts`** — `getSupabaseAdmin()`, análogo a
   `getSupabase()` pero usando `SUPABASE_SERVICE_ROLE_KEY` (variable de
   entorno **nueva**, server-only — sin prefijo `NEXT_PUBLIC_`, así que
   Next.js nunca la incluye en el bundle del cliente). Este client
   bypassea RLS por diseño de Supabase; por eso las tablas no necesitan
   política para `anon`.
3. **`app/api/proyectos/route.ts`** y **`app/api/proyectos/[id]/route.ts`**
   — `GET`: primero `isAuthenticated(req)`; si es `false`, `401` sin
   cuerpo de datos (R16). Si es `true`, consulta con `getSupabaseAdmin()`
   y devuelve el JSON.
4. **`lib/projects.ts`** — `loadProjects()`/`loadProject(id)` dejan de
   llamar a Supabase directo: hacen `fetch("/api/proyectos")` /
   `fetch(`/api/proyectos/${id}`)`. Como es same-origin, el navegador
   manda la cookie `spinai_token` automáticamente — no hay que pasar token
   a mano. Si el fetch devuelve `401` (sesión vencida), se propaga como
   error y `page.tsx` puede redirigir a la raíz para que `PinGate` vuelva
   a pedir el PIN (mismo comportamiento que ya ocurre si `/api/auth/check`
   falla en cualquier otra página).

Con esto, la anon key de Supabase (pública en el bundle) **nunca** tiene
acceso a `projects`/`project_kpis`/`project_weekly_updates` — ni por RLS
ni por policy — y los datos de proyecto no salen del servidor sin pasar
primero por la verificación del PIN.

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
en `lib/projects.ts` — ver "Seguridad y acceso a datos" arriba, hacen
`fetch()` a las rutas API internas, **no** llaman a `getSupabase()`
directo (deviación intencional del patrón de `loadNews()`, justificada
por confidencialidad).

Dentro de las rutas API (server-side), el query a Supabase sí usa el
mismo estilo que `lib/news.ts`: `select` anidado
`projects(*, project_kpis(*), project_weekly_updates(*))` (o dos queries
separados si el anidado no rinde bien, a criterio de `implementer`), con
`rowToProject(row)` / `rowToKpi(row)` / `rowToUpdate(row)` como mappers
snake_case → camelCase, mismo patrón que `rowToNewsItem()`. Estos mappers
viven en `lib/projects.ts` y los usan las rutas API (import server-side es
válido, no hay problema de "cliente" ahí).

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
- Cada `ProjectCard` estilizado como `var(--color-surface-elevated)` +
  `var(--color-border)`, mismo lenguaje visual que `NewsCard`.
  **[2026-07-29]** Ya no es un `<Link>` — es un `<button onClick={() =>
  onSelect(project.id)}>` (con `style={{ all: "unset" }}` para no heredar
  estilos nativos de `<button>`) que abre `ProjectDrawer` en vez de
  navegar. `page.tsx` guarda `selectedId` en estado local y se lo pasa a
  `ProjectDrawer`.
- Loading state: skeleton igual criterio que `NewsCardSkeleton`.
- Empty state (R5): reutiliza el mismo patrón de icono + texto de
  `noticias/page.tsx` (SVG inline, título + subtítulo), no un componente
  nuevo de empty state genérico — no se justifica extraer uno para un solo
  caso de uso adicional.

## Detalle (drawer) — reescrito 2026-07-29

**Decisión previa (ya no vigente)**: el detalle vivía en
`app/proyectos/[id]/page.tsx`, una ruta propia con `useParams()`. A
pedido explícito del usuario, se reemplazó por un **drawer** deslizante
desde la derecha (`ProjectDrawer.tsx`), replicando exactamente el patrón
visual/de interacción de `app/components/Drawer.tsx` (el drawer global
que ya usan "Equipo", "Ruleta", "Calendario de asignados" y "Log de
cambios" desde la home): backdrop `rgba(0,0,0,0.6)` + `blur(4px)`, panel
`width: min(520px, 100vw)` con `border-left`, `transform: translateX`
animado en 320ms `cubic-bezier(0.4, 0, 0.2, 1)`, header con título +
botón "✕", cierre con click en el backdrop, el botón, o tecla `Escape`.

`ProjectDrawer` **no** se integra al `DrawerContext`/`Drawer.tsx`
globales (esos están acoplados a `AppData` — miembros/asignaciones de
`lib/storage.ts`, un dominio de datos distinto). Es un componente
autocontenido en `app/proyectos/`, con su propio estado local:

- Props: `{ projectId: string | null; onClose: () => void }`.
- `page.tsx` (listado) mantiene `selectedId` en `useState`; cada
  `ProjectCard` llama `onSelect(project.id)` en vez de navegar.
- Al recibir un `projectId` no nulo, el drawer hace `loadProject(id)`
  (mismo `lib/projects.ts` de siempre — sin cambios ahí) y maneja
  loading/error/no-encontrado igual que antes lo hacía la página.
- Layout interno: header del drawer = nombre del proyecto (o "Cargando…"
  / "Proyecto"); contenido = `HealthBadge` + país/negocio + resumen +
  `ProjectTimeline`. La sección de KPIs sigue sin mostrarse (retirada
  antes, mismo día, por un pedido separado — ver R6/R8 y la nota en
  "Fuera de alcance" de `requirements.md`).
- `R7` (id inválido / fetch falla): el drawer muestra el bloque "no
  encontrado" / "no se pudo cargar" **dentro del panel**, no en una
  página aparte — mismo texto que usaba `[id]/page.tsx`.
- Animación de entrada/salida: mismo patrón de `mounted`/`visible` con
  `requestAnimationFrame` + `setTimeout(320ms)` para desmontar que usa
  `app/components/Drawer.tsx` — no se inventó una animación nueva.
- `ProjectTimeline.tsx` se movió de `[id]/` a `app/proyectos/` (ya no hay
  carpeta `[id]/` para componentes de página) — mismo archivo, mismo
  contenido, solo el import de `HealthBadge` cambia de `../HealthBadge` a
  `./HealthBadge`.

**La ruta API `/api/proyectos/[id]/route.ts` no cambió** — sigue siendo
el mismo endpoint `GET` con `isAuthenticated()` + `getSupabaseAdmin()`
(R16/R17 intactos); solo dejó de tener una página que la consuma desde
una URL propia, ahora la consume el drawer.

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
- **Cliente consulta Supabase directo con la anon key, mismo patrón que
  `lib/news.ts`** — descartado: fue la primera versión de este design.md,
  pero el usuario pidió explícitamente revisar la seguridad porque la
  data es confidencial. La anon key es pública (va en el bundle del
  navegador), así que "directo + RLS `anon full access`" expondría los
  proyectos a cualquiera sin pasar por el PIN. Se reemplaza por rutas API
  propias que verifican la sesión y usan el service role key server-side.
- **RLS con policy para `authenticated` en vez de deny-by-default** —
  descartado: este repo no usa Supabase Auth (el PIN genera un JWT propio,
  no una sesión de `auth.uid()`), así que Supabase no tiene forma de saber
  si la request "está autenticada" en términos de PinGate — el rol
  `authenticated` de Supabase no aplica acá. La única distinción real que
  Supabase puede hacer es anon vs. service_role, por eso el gate de acceso
  vive en la ruta API (`isAuthenticated()`), no en una policy de RLS.
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
- **[2026-07-29] Mantener `/proyectos/<id>` como ruta y además agregar el
  drawer** (las dos formas de ver el detalle a la vez) — descartado
  explícitamente por el usuario cuando se le preguntó: eligió que el
  drawer reemplace del todo la ruta, no que convivan, igual que
  "Equipo"/"Calendario" no tienen URL propia. Pierde deep-linking a un
  proyecto específico, a cambio de consistencia total con el patrón de
  interacción ya establecido en el resto de la app.
- **Integrar el detalle al `DrawerContext`/`Drawer.tsx` globales** (agregar
  un nuevo `DrawerView` tipo `"proyecto"`) — descartado: ese drawer global
  está acoplado al dominio de datos de la home (`AppData` vía
  `lib/storage.ts` — miembros y asignaciones), no a proyectos/Supabase.
  Forzar ese acople habría significado que el `Drawer.tsx` global cargue
  datos de dos dominios completamente distintos. Un componente
  `ProjectDrawer.tsx` autocontenido, que copia el mismo patrón visual pero
  no la misma instancia de contexto, es más simple y no toca código ya
  probado de la home.

## Supabase / auth / cron

- **Sí hay cambio de schema** (ver "Esquema Supabase" arriba): 3 tablas
  nuevas (`projects`, `project_kpis`, `project_weekly_updates`), **sin**
  policy de RLS para `anon` — deny por defecto, solo `service_role`
  accede. Requiere el paso manual de aplicar la migración en el proyecto
  Supabase de dev (ver nota arriba) antes de que `implementer` pueda dar
  por verificada la feature contra datos reales.
- **Sí hay cambio de auth**: nueva variable de entorno server-only
  `SUPABASE_SERVICE_ROLE_KEY` (agregar a `.env.local` y a las env vars del
  proyecto en Vercel — dev y prod por separado, igual que
  `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`; obtenerla del dashboard de
  Supabase, Project Settings → API). La ruta `/proyectos` sigue detrás de
  `PinGate` como el resto de la app, y además las rutas API que exponen
  los datos verifican el mismo JWT (R16) — dos capas, no una sola.
- Cron: no aplica — no hay ningún cron job asociado a esta feature; la
  data se siembra una sola vez en la migración, no se refresca
  periódicamente.
