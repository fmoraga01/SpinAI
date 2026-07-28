# Implementación — project-status-tracking

## Resumen

Implementadas las rutas `/proyectos` (listado) y `/proyectos/[id]` (detalle),
la migración de Supabase con seed, las rutas API server-side que las
respaldan, y el link de navegación en `Nav`. `npm run verify` pasa completo
(lint + build + test + check-sdd-state).

**Bloqueado, en manos del humano** (ver detalle al final):
1. Aplicar `supabase/migrations/20260728120000_crear_projects.sql` en el SQL
   Editor del proyecto Supabase de **dev**.
2. Setear `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y en las env vars de
   Vercel (dev y prod).

Sin esos dos pasos, `/api/proyectos` y `/api/proyectos/[id]` no pueden
devolver datos reales todavía (fallan al construir el cliente Supabase
admin), pero el código compila, lintea, y el gate de autenticación (R16) se
verificó funcionando de punta a punta sin necesitarlos.

## Archivos tocados

- `supabase/migrations/20260728120000_crear_projects.sql` — nueva migración:
  tablas `projects`, `project_kpis`, `project_weekly_updates`, índices, RLS
  habilitado sin policy para `anon`/`authenticated`, y seed de 4 proyectos
  dummy (2 en "Paris", 2 en "Easy", todos "Chile", cada uno con 2 KPIs y 3
  avances semanales con distintos `status`).
- `lib/types.ts` — agrega `ProjectKpi`, `HealthStatus`, `WeeklyUpdate`,
  `Project`.
- `lib/auth.ts` (nuevo) — `isAuthenticated(req)`, extraída de
  `app/api/auth/check/route.ts`.
- `app/api/auth/check/route.ts` — refactorizado para usar `isAuthenticated()`
  (mismo comportamiento externo).
- `lib/supabaseAdmin.ts` (nuevo) — `getSupabaseAdmin()`, cliente server-only
  con `SUPABASE_SERVICE_ROLE_KEY`; lanza un error explícito y descriptivo si
  la env var falta, en vez de fallar silenciosamente.
- `lib/projects.ts` (nuevo) — `rowToProject`/`rowToKpi`/`rowToUpdate`
  (mappers snake_case → camelCase), `healthFromTimeline()`,
  `loadProjects()`/`loadProject(id)` (fetch a las rutas API internas).
- `lib/projects.test.ts` (nuevo) — 4 tests de `healthFromTimeline`.
- `app/api/proyectos/route.ts` (nuevo) — `GET`, `isAuthenticated` + query
  anidado a Supabase.
- `app/api/proyectos/[id]/route.ts` (nuevo) — `GET`, mismo chequeo, filtrado
  por `id`, `404` si no existe.
- `app/proyectos/HealthBadge.tsx` (nuevo).
- `app/proyectos/ProjectCard.tsx` (nuevo).
- `app/proyectos/page.tsx` (nuevo) — listado.
- `app/proyectos/[id]/KpiList.tsx` (nuevo).
- `app/proyectos/[id]/ProjectTimeline.tsx` (nuevo).
- `app/proyectos/[id]/page.tsx` (nuevo) — detalle.
- `app/components/Nav.tsx` — agrega `proyectosActive` + link "Status de
  Proyectos" entre "Noticias de IA" y "State of AI".

## Traceability por requisito

- **R1** (listado con nombre/país/negocio/badge/fecha): manual QA —
  `app/proyectos/page.tsx` + `ProjectCard.tsx` renderizan los 5 campos;
  verificado por lectura de código y build exitoso (no hay datos reales
  todavía, ver bloqueo).
- **R2** (salud derivada de la entrada más reciente del timeline): test
  automatizado, `lib/projects.test.ts` — "returns the status of the single
  entry...", "returns the status of the most recent weekOf...".
- **R3** (sin entradas → estado neutro, no asumir `on_track`): test
  automatizado, `lib/projects.test.ts` — "returns null for an empty
  timeline".
- **R4** (click en tarjeta navega al detalle): manual QA — `ProjectCard` es
  un `<Link href={\`/proyectos/${project.id}\`}>`; verificado por lectura de
  código.
- **R5** (empty state si 0 proyectos): manual QA — `page.tsx` renderiza el
  bloque de icono + texto cuando `projects.length === 0`, mismo patrón que
  `noticias/page.tsx`; código revisado, no se pudo forzar el caso "0
  proyectos reales" sin la migración aplicada, pero la rama de código es
  idéntica a la de `noticias/` ya validada en producción.
- **R6** (detalle con nombre/resumen/país/negocio/KPIs/timeline): manual QA
  — `[id]/page.tsx` compone header + resumen + `KpiList` + `ProjectTimeline`;
  verificado por lectura de código y build.
- **R7** (id inválido → "no encontrado", sin crash): manual QA — `curl`
  contra `/api/proyectos/00000000-0000-0000-0000-000000000000` sin cookie
  devuelve `401` (gate de auth se prueba primero, ver R16); el camino
  `data === null → 404` en la ruta API y el bloque "Proyecto no encontrado"
  en `[id]/page.tsx` se verificaron por lectura de código — no se pudo
  probar con datos reales sin la migración aplicada. **Corrección post-review**:
  el review independiente notó que un `id` no-UUID (ej. `/api/proyectos/abc`)
  hacía que Postgres devolviera el error `22P02` y la ruta lo mapeaba a
  `500` en vez de `404` — el usuario veía "No se pudo cargar el proyecto"
  en vez de "Proyecto no encontrado". Se agregó un chequeo explícito de
  `error.code === "22P02"` en `app/api/proyectos/[id]/route.ts` para
  devolver `404` en ese caso también.
- **R8** (proyecto sin KPIs → sección omitida/estado vacío explícito):
  manual QA — `KpiList.tsx` renderiza un tile "todavía no tiene KPIs
  registrados" si `kpis.length === 0`; verificado por lectura de código.
- **R9** (timeline agrupado por semana, orden descendente, con
  fecha/estado/texto): manual QA — `ProjectTimeline.tsx` ordena por
  `weekOf` descendente y renderiza fecha + `HealthBadge` + nota por fila;
  verificado por lectura de código.
- **R10** (timeline vacío → estado vacío explícito): manual QA —
  `ProjectTimeline.tsx` renderiza "todavía no tiene avances semanales
  registrados" si `updates.length === 0`; verificado por lectura de código.
- **R11** (seed de 4 proyectos, Chile, Paris/Easy distribuidos, ≥2 KPIs,
  ≥3 avances): **corregido y verificado por ejecución real**, no por
  lectura. La primera versión de este archivo declaraba esto verificado
  por lectura del `.sql`, pero el review independiente
  (`progress/review_project-status-tracking.md`) detectó y demostró que
  los CTEs `kpis`/`updates` no tenían `returning`, así que en Postgres no
  formaban tabla temporal y el `insert` completo abortaba al ejecutarse —
  0 filas, no las declaradas. Se corrigió agregando `returning 1` a ambos
  CTEs y se verificó aplicando el `.sql` corregido contra un Postgres 16
  real (`createdb` + `psql -f`): resultado `projects=4`, `project_kpis=8`,
  `project_weekly_updates=12`, distribución `country=Chile` en las 4,
  `business_unit` 2×"Paris"/2×"Easy". Pendiente solo lo ya documentado en
  `design.md`: aplicar este mismo archivo (ya corregido) contra el
  proyecto Supabase real de dev — el humano debe saber que un intento
  anterior con el archivo roto pudo haber dejado las 3 tablas ya creadas
  pero vacías, y que el `insert` del seed no es idempotente (no correr el
  archivo dos veces sobre datos ya sembrados).
- **R12** (país como texto libre, no enum): manual QA — `country: text not
  null` en el DDL, `country: string` en `lib/types.ts`; verificado por
  lectura de código.
- **R13** (KPIs como filas de tabla relacionada, no columnas fijas): manual
  QA — tabla `project_kpis` con `project_id`/`label`/`value`/`position`;
  verificado por lectura de código.
- **R14** (link "Status de Proyectos" en `Nav`, mismo patrón que los demás):
  manual QA — `Nav.tsx` agrega `proyectosActive` + `NavLink` reutilizando el
  componente existente; `design-check` corrido (ver sección abajo), sin
  findings porque el diff solo reutiliza `NavLink` sin estilos nuevos.
- **R15** (datos de proyectos solo vía `/api/proyectos*`, nunca Supabase
  directo desde el browser): manual QA — `lib/projects.ts` usa `fetch()` a
  las rutas internas, no importa `getSupabase()`/`getSupabaseAdmin()`;
  verificado por lectura de código y por el grep de `SUPABASE_SERVICE_ROLE_KEY`
  contra `.next/static` (ver R17).
- **R16** (401 sin cuerpo de datos si falta `spinai_token`): verificación
  manual real — `npm run dev` + `curl -s -w "%{http_code}"` contra
  `http://localhost:3000/api/proyectos` y
  `http://localhost:3000/api/proyectos/00000000-0000-0000-0000-000000000000`
  sin cookie → ambos devolvieron `STATUS:401` con cuerpo
  `{"error":"No autorizado"}`, sin datos de proyectos. Este chequeo no
  depende de que la migración esté aplicada, porque `isAuthenticated()` se
  evalúa antes de tocar Supabase.
- **R17** (sin policy de RLS para `anon`/`authenticated`): la migración no
  incluye ningún `create policy` para esas tablas (deny por defecto) —
  verificado por lectura del `.sql`. **Bloqueado**: no se pudo confirmar en
  el dashboard de Supabase (Table Editor → Policies) porque no hay acceso al
  proyecto real; queda como verificación pendiente del humano tras aplicar
  la migración. Adicionalmente se confirmó que `SUPABASE_SERVICE_ROLE_KEY`
  no aparece en ningún chunk de `.next/static` (bundle del cliente) tras
  `npm run build` + `npm run dev` — solo en `.next/server` — así que la key
  nunca llega al navegador.

## `design-check`

Corrido sobre `git diff origin/main -- app/components/'*.tsx'` (único
archivo tocado bajo `app/components/`: `Nav.tsx`). El diff solo agrega una
variable `proyectosActive` y un `<NavLink>` adicional reutilizando el
componente `NavLink` existente sin introducir estilos, colores ni radios
nuevos — sin findings.

## Verificación automatizada

```
npm run lint    → sin errores
npm run build   → compila, TS check ok, incluye /proyectos, /proyectos/[id],
                  /api/proyectos, /api/proyectos/[id] en el route map
npm run test    → 9 tests pasan (incluye los 4 de lib/projects.test.ts)
npm run check-sdd-state → ok (una sola feature in_progress, spec completa)
```

## Verificación manual de seguridad (T9)

- `curl` sin cookie a `/api/proyectos` → `401`, `{"error":"No autorizado"}`.
- `curl` sin cookie a `/api/proyectos/<uuid-inexistente>` → `401`,
  `{"error":"No autorizado"}` (el gate de auth corta antes de llegar al
  chequeo de existencia del proyecto).
- `grep -rl SUPABASE_SERVICE_ROLE_KEY .next/static/**/*.js` → 0 archivos;
  la misma búsqueda contra `.next/server` sí encuentra el símbolo (código
  server-only, como se espera).
- **No verificado** (bloqueado, ver abajo): policies de RLS en el dashboard
  de Supabase para `projects`/`project_kpis`/`project_weekly_updates`.

## Bloqueado — pasos manuales pendientes del humano

1. **Aplicar la migración**: `supabase/migrations/20260728120000_crear_projects.sql`
   debe ejecutarse en el SQL Editor del proyecto Supabase de **dev** (ver
   `supabase/migrations/README.md`). No se hizo — no hay credenciales de
   Supabase disponibles en este entorno de implementación. Sin este paso,
   `/api/proyectos` y `/api/proyectos/[id]` no tienen tabla contra la cual
   consultar.
2. **Setear `SUPABASE_SERVICE_ROLE_KEY`**: nueva env var server-only
   (dashboard de Supabase → Project Settings → API) que debe agregarse a
   `.env.local` y a las env vars del proyecto en Vercel (dev y prod, por
   separado). `getSupabaseAdmin()` lanza un error explícito
   (`"Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY..."`) si
   falta, en vez de fallar silenciosamente o exponer datos.
3. **Confirmar en el dashboard de Supabase** (Table Editor → Policies) que
   las 3 tablas nuevas no tienen ninguna policy activa para
   `anon`/`authenticated`, una vez aplicada la migración — el `.sql` no
   define ninguna a propósito, pero esto no se pudo confirmar contra un
   proyecto real desde este entorno.

No se improvisó ningún workaround (p. ej. volver a `anon full access`) para
sortear estos bloqueos — el código queda escrito y verificado hasta donde es
posible sin credenciales, y estos tres puntos quedan explícitamente en manos
del humano.
