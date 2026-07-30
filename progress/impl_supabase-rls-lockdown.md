# Implementación — supabase-rls-lockdown

Ejecutado `specs/supabase-rls-lockdown/tasks.md` §1 a §6, en orden (código
primero, migración SQL al final, ver razón en `design.md`).

## Archivos nuevos

- `app/api/team/route.ts` (`GET`)
- `app/api/team/members/route.ts` (`POST`)
- `app/api/team/members/[id]/route.ts` (`PATCH`, `DELETE`)
- `app/api/team/members/[id]/toggle/route.ts` (`POST`)
- `app/api/team/assignments/[id]/route.ts` (`DELETE`)
- `app/api/team/assignments/swap/route.ts` (`POST`)
- `app/api/team/assignments/bulk-preview/route.ts` (`GET`)
- `app/api/team/assignments/bulk-confirm/route.ts` (`POST`)
- `app/api/team/templates/[assignmentId]/route.ts` (`GET`, `PUT`)
- `app/api/team/logs/route.ts` (`GET`)
- `app/api/public/news/route.ts` (`GET`, sin auth)
- `app/api/public/research/route.ts` (`GET`, sin auth)
- `app/api/public/hf-trending/route.ts` (`GET`, sin auth)
- `app/api/public/ai-models/route.ts` (`GET`, sin auth)
- `lib/teamRows.ts` — módulo server-side compartido por `app/api/team/**`:
  mapeos `rowToMember`/`rowToAssignment`/`rowToLog`, helpers puros
  `nextFridayAfter`/`getNextFridays`/`sanitizeTiming`, y la lógica de
  negocio no trivial movida desde `lib/storage.ts`
  (`clearLogsIfNoAssignments`, `loadTeamData`, `buildBulkPreview`).
- `lib/teamRows.test.ts` — 10 tests Vitest nuevos para los helpers puros
  que quedaron en `lib/` (`nextFridayAfter`, `getNextFridays`,
  `sanitizeTiming`, los 3 mapeos `rowTo*`).
- `supabase/migrations/20260730120000_bloquear_acceso_anon.sql` — **NO
  APLICADA** (ver advertencia al final de este documento).

## Archivos modificados

- `lib/storage.ts` — reescrito: todas las funciones exportadas conservan
  firma idéntica, pero ahora hacen `fetch` contra `app/api/team/**` en vez
  de `getSupabase()` directo. `getNextFridays` delega a la implementación
  compartida de `lib/teamRows.ts` (misma lógica, sin red).
- `lib/news.ts`, `lib/research.ts`, `lib/hfTrending.ts` — reescritos:
  `loadNews`/`loadResearchPapers`/`loadHfTrending` ahora hacen `fetch`
  contra `app/api/public/**`, mismas firmas y shapes de retorno.
- `lib/stateOfAi.ts` — `loadAiModels` reescrita para hacer `fetch` contra
  `/api/public/ai-models`; las funciones puras (`bestVariantPerSlug`,
  `formatPrice`, `formatIndex`, `formatReleaseDate`, `buildExecutiveSummary`,
  `monthlyReleaseCounts`) no cambiaron.
- `app/api/cron/refresh-news/route.ts`,
  `app/api/cron/refresh-research/route.ts`,
  `app/api/cron/refresh-hf-trending/route.ts`,
  `app/api/cron/refresh-state-of-ai/route.ts`,
  `app/api/cron/notify/route.ts`, `app/api/notify/route.ts` — migrados de
  `getSupabase()` (cliente anon) a `getSupabaseAdmin()` (service role).
  Solo cambió el cliente; la verificación (`x-cron-secret` / JWT) no se
  tocó.
- `specs/supabase-rls-lockdown/tasks.md` — checklist marcado.

## Ajuste no anticipado por el spec (documentado, no expande alcance)

`design.md` sugería mover los helpers puros y de mapeo "a las rutas
nuevas, o a un módulo compartido `lib/teamRows.ts` si el mapeo se repite
en más de una ruta". Se optó por `lib/teamRows.ts` porque el mapeo y la
lógica de negocio (`loadTeamData`, `clearLogsIfNoAssignments`,
`buildBulkPreview`) se repiten en 6+ de las 10 rutas de `app/api/team/**`
— ponerlos inline en cada `route.ts` hubiera duplicado ~150 líneas.
`lib/teamRows.ts` solo se importa desde `app/api/team/**` (server-side) y,
para el único caso de `getNextFridays` (lógica pura sin Supabase), también
desde `lib/storage.ts` para no duplicar esa función en dos archivos — no
importa `getSupabaseAdmin()` ni tiene acceso a env vars server-only, solo
recibe el cliente Supabase como parámetro tipado (`import type
{ SupabaseClient }`).

`lib/supabase.ts` (`getSupabase()`, cliente anon) quedó sin ningún
consumidor tras esta migración (confirmado con grep: cero imports en todo
el repo). No estaba en el alcance de `tasks.md` eliminarlo, así que se
dejó tal cual — queda como candidato a limpieza en una feature futura, no
se tocó para no expandir el alcance de este fix de seguridad.

Se descubrió además que `middleware.ts` sí existe en el repo bajo el
nombre `proxy.ts` (Next.js 16 renombró `middleware.ts` → `proxy.ts`, ver
nota en `AGENTS.md` sobre breaking changes de esta versión de Next). No
cambia nada de lo implementado: `proxy.ts` solo setea un header
(`x-spinai-auth: 0`) para que `PinGate.tsx` muestre el overlay — nunca
bloquea la request a nivel de red, confirmando exactamente el hallazgo de
`requirements.md` de que la protección real tenía que estar en
RLS + rutas API server-side, no en middleware/proxy.

## Trazabilidad requisito → verificación

- **R1** (deny total `anon` en members/assignments/templates/assignment_logs):
  Verificado por lectura de
  `supabase/migrations/20260730120000_bloquear_acceso_anon.sql` —
  `drop policy "anon full access"` en las 4 tablas, sin `create policy`
  de reemplazo. **NO aplicado en Supabase** (ver advertencia abajo);
  pendiente de que el usuario la corra.
- **R2** (política `for select` en news_items/ai_models/research_papers/hf_trending):
  Verificado por lectura de la misma migración — `drop policy` + `create
  policy "anon read access" ... for select to anon using (true)` en las 4
  tablas. **NO aplicado** (ver advertencia).
- **R3** (INSERT/UPDATE/DELETE directo con anon key rechazado por RLS):
  No ejercitable contra Supabase real en este sandbox (sin credenciales).
  Verificado por lectura de la migración (política eliminada sin
  reemplazo para write) — pendiente de confirmación real post-aplicación
  en Supabase dev.
- **R4** (SELECT directo con anon key sigue permitido): igual que R3 —
  verificado por lectura de la migración (`for select to anon using
  (true)`), pendiente de confirmación real post-aplicación.
- **R5** (`GET /api/team` sin cookie → 401): verificado con `curl` real
  contra `npm run dev` local: `GET /api/team` → `401`.
- **R6** (`GET /api/team` con cookie devuelve `{members, assignments}`
  con el mismo saneamiento que `loadData()`): verificado por revisión de
  código — `app/api/team/route.ts` llama a `loadTeamData(db)` en
  `lib/teamRows.ts`, que es una copia line-by-line de la lógica de
  `loadData()` original (limpieza de huérfanas + sync de `member_name`).
  No ejercitable end-to-end con datos reales en este sandbox (sin PIN ni
  credenciales Supabase) — **pendiente de QA humana**.
- **R7** (rutas nuevas sin cookie → 401, no tocan Supabase): verificado
  con `curl` real contra `npm run dev` local para las 12 rutas de
  `app/api/team/**` (GET/POST/PATCH/DELETE/PUT según corresponda) — todas
  `401`. Como `isAuthenticated` corta antes de cualquier
  `getSupabaseAdmin()`/query, no tocan Supabase en el camino no
  autenticado (revisión de código: el `return` del 401 precede a toda
  lógica de Supabase en los 10 archivos).
- **R8** (con cookie + payload válido, mismo efecto que las funciones
  originales de `lib/storage.ts`): verificado por revisión de código
  línea a línea — cada handler es una traducción directa de la función
  correspondiente (mismo `.from()`/`.update()`/`.insert()`/`.delete()`,
  mismos filtros). No ejercitable end-to-end con Supabase real en este
  sandbox — **pendiente de QA humana** (ver tasks.md 6.2/6.3).
- **R9** (firmas de `lib/storage.ts` sin cambios): verificado por
  comparación de firmas antes/después — mismos nombres, parámetros y
  tipos de retorno para las 12 funciones listadas en el requisito. `npm
  run build` (TypeScript) pasa, lo que confirma que los 8 componentes
  consumidores (`Drawer.tsx`, `MembersPanel.tsx`, `Roulette.tsx`,
  `Schedule.tsx`, `ChangeLog.tsx`, `TemplateEditor.tsx`, `Nav.tsx`,
  `HeroChip.tsx`, `HomeCTAs.tsx`) siguen compilando sin cambios de código
  propios.
- **R10** (respuesta no-OK → `Error` con mensaje utilizable): verificado
  por revisión de código — cada función de `lib/storage.ts` usa el mismo
  helper `errorMessage()` que lanza `new Error(<mensaje>)` a partir del
  body JSON de error de la API o un fallback legible.
- **R11–R14** (rutas/lib públicas con mismo shape, sin auth): verificado
  con `curl` real contra `npm run dev` local — las 4 rutas
  `/api/public/**` responden sin `401` (responden `500` porque este
  sandbox no tiene `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`
  configurados, mismo limitante que features previas de `/proyectos`, NO
  un problema de autenticación). Shapes de retorno verificados por lectura
  de código (idénticos a los `rowTo*` originales de cada `lib/*.ts`).
  `npm run build` confirma que `Research.tsx`, `HfTrending.tsx`,
  `noticias/page.tsx`, `app/state-of-ai/*` siguen compilando sin cambios
  propios (R15).
- **R15** (mismas firmas en `lib/hfTrending.ts`/`lib/news.ts`/
  `lib/research.ts`/`lib/stateOfAi.ts`, ningún Server Component nuevo):
  verificado — no se movió ninguna lectura a Server Component (alternativa
  descartada explícitamente en `design.md`), las 4 funciones de carga
  mantienen su firma exacta. `npm run build` pasa.
- **R16** (cron routes migran a `getSupabaseAdmin()`, siguen funcionando
  con `x-cron-secret`): verificado por revisión de código (cambio
  mecánico: mismo query/insert/upsert, solo el cliente) y con `curl` real
  contra `npm run dev` local — los 5 cron routes responden `401` sin
  `x-cron-secret` (la verificación del secret no se tocó). **No
  ejercitable con secret real ni escritura real en Supabase en este
  sandbox** — pendiente de que el usuario lo corra en dev con
  credenciales reales.
- **R17** (`/api/notify` migra a `getSupabaseAdmin()`, sigue funcionando
  autenticado por JWT): mismo criterio que R16 — `curl` real confirma
  `401` sin cookie; cambio de cliente verificado por revisión de código.
  Pendiente de QA con sesión real.
- **R18** (comportamiento del `PinGate` sin cambios; datos cargan bien
  autenticado): **PENDIENTE de QA humana en navegador** — no ejercitable
  en este sandbox por falta de PIN real y credenciales Supabase (mismo
  limitante documentado en `project-crud`, `weekly-update-entry`, etc.).
- **R19** (todas las funciones de `lib/storage.ts` operan igual tras
  login): **PENDIENTE de QA humana en navegador**, mismo motivo que R18.

## ADVERTENCIA — orden de despliegue de la migración SQL

**LA MIGRACIÓN `supabase/migrations/20260730120000_bloquear_acceso_anon.sql`
NO DEBE APLICARSE EN SUPABASE DEV HASTA QUE EL CÓDIGO DE LOS PUNTOS 1–4
(RUTAS API NUEVAS + `lib/storage.ts`/`lib/news.ts`/`lib/research.ts`/
`lib/hfTrending.ts`/`lib/stateOfAi.ts` REESCRITOS + CRON ROUTES MIGRADOS)
ESTÉ DESPLEGADO EN ESE MISMO ENTORNO.** Si se aplica antes, cualquier
instancia de la app que siga sirviendo el código viejo (`getSupabase()`
directo desde el navegador) pierde inmediatamente el CRUD de
equipo/asignaciones/plantillas/logs, porque RLS empezaría a rechazar todas
esas queries con la anon key.

`implementer` no tiene credenciales de Supabase en este sandbox (mismo
patrón que `project-status-field`/`project-status-values-rename`/
`project-crud`) — la aplicación real de esta migración en Supabase dev
queda pendiente de que el usuario la corra manualmente, **después** de
desplegar este código.

## Verificación general

- `npm run verify` (lint + build + test + check-sdd-state): **verde**.
  `npm run build` genera las 27 rutas de `app/api/**` esperadas (incluidas
  las 14 nuevas de este feature). `npm run test`: 22/22 tests pasan (12
  preexistentes + 10 nuevos de `lib/teamRows.test.ts`).
- `curl` real contra `npm run dev` local (puerto 3000, sin cookie/secret):
  - 12 rutas de `app/api/team/**` (todas las combinaciones GET/POST/PATCH/
    PUT/DELETE de tasks.md §1) → `401`.
  - 5 cron routes + `/api/notify` → `401` sin `x-cron-secret`/cookie.
  - 4 rutas `/api/public/**` → sin `401` (500 por falta de credenciales
    Supabase reales en este sandbox, esperado).
- QA manual en navegador con PIN real (tasks.md 2.3, 3.6, 6.2 parcial,
  6.3): **PENDIENTE**, no ejercitable en este sandbox — sin PIN ni
  credenciales Supabase reales, mismo limitante que toda la serie de
  features de `/proyectos` en este repo. Requiere que el usuario:
  1. Despliegue el código de esta feature a un entorno con Supabase dev
     real y `JWT_SECRET`/`SUPABASE_SERVICE_ROLE_KEY` configurados.
  2. Confirme en el navegador, con el PIN correcto: agregar/editar/
     activar-desactivar/eliminar miembro, editar/intercambiar asignación,
     asignación masiva, ver/editar plantilla, ver logs, y que las
     secciones públicas (Noticias, Research, HF Trending, State of AI)
     siguen cargando sin PIN.
  3. Recién entonces aplicar `supabase/migrations/20260730120000_bloquear_acceso_anon.sql`
     en Supabase dev (ver advertencia arriba).
