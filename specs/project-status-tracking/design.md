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
en `lib/projects.ts`, devolviendo los 4 proyectos dummy hardcodeados en el
mismo archivo (no hay tabla Supabase todavía). Se modelan como funciones
async aunque hoy sean síncronas internamente, para que migrar a Supabase
después (ver Alternativas) sea un cambio de implementación interna, no de
la interfaz que consume `page.tsx` — mismo patrón que `loadNews()` en
`lib/news.ts`.

## Supuestos a validar con el usuario

- **`businessUnit` es un placeholder**: se usa un conjunto razonable
  (Retail, Banca, Seguros, Telco) sin que el usuario haya confirmado una
  taxonomía real de negocios. Fácil de ajustar después — es solo texto
  libre en el modelo, no un enum. Marcado explícitamente aquí para que
  quede claro en la revisión humana del spec.
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

- **Persistir proyectos en Supabase desde ya** (tabla `projects` +
  `project_weekly_updates`) — descartado por ahora: el usuario pidió dummy
  data explícitamente ("Data: dummy data por ahora"); una migración a
  Supabase es un cambio de implementación interna en `lib/projects.ts`
  contenido, no bloquea nada de la UI, y se puede hacer como feature
  separada cuando haya datos reales.
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

No aplica — no hay cambios de schema, la ruta hereda `PinGate` sin
modificaciones, y no hay ningún cron job asociado a esta feature.
