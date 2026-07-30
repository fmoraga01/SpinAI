# Design — supabase-rls-lockdown

## Resumen del approach

1. **Migración Supabase** (`supabase/migrations/<timestamp>_bloquear_acceso_anon.sql`):
   - `drop policy "anon full access" on members/assignments/templates/assignment_logs;`
     — sin política de reemplazo para `anon` (deny total, mismo patrón que
     `projects` en `20260728120000_crear_projects.sql`). RLS ya está
     habilitado en esas 4 tablas desde `20260702000000_esquema_inicial.sql`,
     así que no hace falta `alter table ... enable row level security`
     otra vez.
   - `drop policy "anon full access" on news_items/ai_models/research_papers/hf_trending;`
     seguido de `create policy "anon read access" on <tabla> for select to anon using (true);`
     en cada una — lectura pública se mantiene, escritura/borrado quedan
     denegados a `anon`.
   - Comentario en la migración explicando el hallazgo de auditoría y
     referenciando este spec, siguiendo el estilo de comentarios ya usado
     en las migraciones existentes del repo.

2. **Rutas API protegidas nuevas bajo `app/api/team/**`** — reemplazan el
   acceso directo de `lib/storage.ts` a `members`/`assignments`/
   `templates`/`assignment_logs`, replicando exactamente el patrón de
   `app/api/proyectos/**` (`isAuthenticated(req)` + `getSupabaseAdmin()`,
   401 si no autenticado, 400 en payload inválido, 404 si el recurso no
   existe donde aplique). Mapeo función actual → ruta:

   | Función hoy en `lib/storage.ts` | Ruta nueva | Método |
   |---|---|---|
   | `loadData()` | `/api/team` | `GET` |
   | `addMember(name, email?)` | `/api/team/members` | `POST` |
   | `updateMemberName(id, name)` | `/api/team/members/[id]` | `PATCH` (body `{ name }`) |
   | `updateMemberEmail(id, email)` | `/api/team/members/[id]` | `PATCH` (body `{ email }`) |
   | `toggleMember(id)` | `/api/team/members/[id]/toggle` | `POST` |
   | `removeMember(id)` | `/api/team/members/[id]` | `DELETE` |
   | `removeAssignment(id)` | `/api/team/assignments/[id]` | `DELETE` |
   | `swapAssignmentMembers(idA, idB)` | `/api/team/assignments/swap` | `POST` (body `{ idA, idB }`) |
   | `buildBulkAssignmentPreview()` | `/api/team/assignments/bulk-preview` | `GET` |
   | `confirmBulkAssignment(previews)` | `/api/team/assignments/bulk-confirm` | `POST` (body `{ previews }`) |
   | `loadTemplate(assignmentId)` | `/api/team/templates/[assignmentId]` | `GET` |
   | `saveTemplate(template)` | `/api/team/templates/[assignmentId]` | `PUT` |
   | `loadLogs()` | `/api/team/logs` | `GET` |

   `updateMemberName`/`updateMemberEmail` comparten una sola ruta
   `PATCH /api/team/members/[id]` en vez de dos, para no duplicar la ruta
   de recurso — el handler distingue por las claves presentes en el body
   (`name` y/o `email`), igual de fácil de llamar desde `lib/storage.ts`
   manteniendo las dos funciones separadas del lado del cliente.

   `getNextFridays(count)` es lógica pura (fechas, sin Supabase) — se
   queda tal cual en `lib/storage.ts`, sin ruta API ni cambios.

3. **`lib/storage.ts` reescrito**: cada función exportada conserva su
   firma actual, pero internamente hace `fetch("/api/team/...")` en vez de
   `getSupabase()...`. `rowToMember`/`rowToAssignment` y el resto de
   helpers puros de mapeo se mueven al lado servidor (dentro de las rutas
   nuevas, o a un módulo compartido `lib/teamRows.ts` si el mapeo se repite
   en más de una ruta) — el cliente ya no necesita mapear filas crudas de
   Supabase porque las rutas API devuelven JSON ya en forma de
   `TeamMember`/`Assignment`/`Template`/`LogEntry`. La lógica de negocio no
   trivial de `loadData()` (limpieza de asignaciones huérfanas, sync de
   `member_name` desincronizado) y de `addMember` (calcular el próximo
   viernes libre), `removeMember` (marcar futuras como no asignadas,
   borrar pasadas), `swapAssignmentMembers` (log de intercambio) se mueve
   completa a los handlers de las rutas API — hoy vive en `lib/storage.ts`
   corriendo con el cliente anon desde el navegador, y debe pasar a correr
   server-side con `getSupabaseAdmin()`.

4. **Datos de solo lectura pública** (`lib/hfTrending.ts`, `lib/news.ts`,
   `lib/research.ts`, `lib/stateOfAi.ts`): se agregan rutas API nuevas sin
   autenticación (dato público, ya cubierto por R2/R4 a nivel de RLS de
   todas formas) bajo `app/api/public/**`:

   | Función hoy | Ruta nueva |
   |---|---|
   | `loadNews(page)` | `GET /api/public/news?page=N` |
   | `loadResearchPapers(limit)` | `GET /api/public/research?limit=N` |
   | `loadHfTrending()` | `GET /api/public/hf-trending` |
   | `loadAiModels()` | `GET /api/public/ai-models` |

   Cada función en `lib/*.ts` pasa de `getSupabase().from(...)` a
   `fetch("/api/public/...")`, y las rutas usan `getSupabaseAdmin()` (o,
   dado que estas 4 tablas ahora sí permiten `select` a `anon` vía R2/R4,
   podrían usar `getSupabase()` sin romper nada — se elige igualmente
   `getSupabaseAdmin()` por consistencia con el resto de rutas API del
   repo y para no depender de que la política de lectura pública siga
   existiendo en el futuro). Las funciones puras que no tocan Supabase
   (`rowToItem`, `bestVariantPerSlug`, `formatPrice`, `formatIndex`,
   `formatReleaseDate`, `buildExecutiveSummary`, `monthlyReleaseCounts`)
   no cambian.

5. **Cron routes migran de `getSupabase()` a `getSupabaseAdmin()`**:
   `app/api/cron/refresh-news`, `refresh-research`, `refresh-hf-trending`,
   `refresh-state-of-ai`, `cron/notify`, y `app/api/notify` (autenticado
   por JWT, no por cron secret, pero igual usa `getSupabase()` hoy). Su
   verificación (`x-cron-secret` o `isAuthenticated`) no cambia — solo el
   cliente Supabase que usan internamente, porque tras R1/R2 el cliente
   anon ya no puede escribir en ninguna de esas tablas.

## Alternativas consideradas y descartadas

- **Agregar `middleware.ts` que verifique el JWT en vez de mover todo a
  rutas API.** Descartado: no resuelve el problema real, que es Supabase
  aceptando requests REST directos con la anon key sin pasar por Next.js
  en absoluto — un `middleware.ts` solo protege rutas dentro de la app
  Next, no llamadas hechas por un atacante directo al REST endpoint de
  Supabase. El fix tiene que estar en RLS + mover el acceso a datos a
  server-side, que es justo lo que ya hace `/proyectos`.
- **Dar a `anon` un policy más granular (ej. solo lectura, o solo mientras
  se valide un JWT custom en el request) en vez de deny total.** Descartado:
  Supabase RLS con `to anon` no tiene forma de verificar el JWT propio de
  esta app (es un JWT firmado por `jose`/`JWT_SECRET`, no un JWT de
  Supabase Auth) — no hay gancho de RLS para eso sin migrar a Supabase
  Auth, que es un cambio de alcance mucho mayor y no lo que pide este
  hallazgo. Deny total + rutas API server-side es el patrón ya validado
  en el repo (`projects`).
- **Mover `lib/news.ts`/`lib/research.ts`/`lib/hfTrending.ts`/
  `lib/stateOfAi.ts` a Server Components en vez de rutas API.**
  Descartado por ahora: `Research.tsx`, `HfTrending.tsx`, `noticias/page.tsx`
  y varios componentes de `app/state-of-ai/*` son `"use client"` con
  interacciones (paginación `loadNews(page)`, filtros/comparador sobre
  `loadAiModels()`) que dependen de poder re-fetchear datos desde el
  cliente ante una acción del usuario. Convertirlos a Server Components
  sería un refactor de UI no trivial y fuera del alcance de un hallazgo de
  seguridad — el problema real ahí no es "cliente vs servidor" sino que
  esas tablas están sobre-privilegiadas (RLS `for all` en vez de `for
  select`), que R2/R4 ya resuelve. Rutas API públicas de solo lectura dan
  la misma protección real (nadie puede escribir/borrar via anon key) sin
  tocar la arquitectura de esos componentes.
- **Compartir una sola ruta API "genérica" tipo
  `/api/team?resource=members` en vez de rutas por recurso.** Descartado:
  menos legible, peor trazabilidad de permisos por endpoint, y se aleja
  del patrón ya establecido en `app/api/proyectos/**` (una carpeta por
  recurso, `route.ts` + `[id]/route.ts`).
- **Usar `getSupabase()` (anon) en las rutas públicas nuevas ya que R2/R4
  les da `select` a anon de todas formas.** Considerado brevemente, pero
  se prefiere `getSupabaseAdmin()` en todas las rutas API nuevas
  (protegidas o públicas) para tener un único patrón de acceso a datos
  server-side en todo `app/api/**`, sin depender de que la policy de
  lectura pública de R2/R4 no cambie en el futuro.

## Cosas a las que prestar atención (Supabase / auth / cron, per `docs/architecture.md`)

- La migración debe aplicarse en Supabase **dev** primero (ver
  `supabase/migrations/README.md`) y probarse ahí antes de mergear a
  `main` — igual que toda migración de este repo. `implementer` no puede
  aplicar la migración él mismo (no tiene credenciales de Supabase en este
  sandbox, mismo patrón que las features de `/proyectos` recientes); debe
  dejar el archivo `.sql` listo y documentar en `progress/impl_<feature>.md`
  que la aplicación real en Supabase dev queda pendiente de que el usuario
  la corra, igual que se hizo en `project-status-field` y
  `project-status-values-rename`.
- Antes de que el usuario aplique la migración, **el código debe estar
  desplegado primero** (o al menos las rutas API nuevas + `lib/storage.ts`
  reescrito) — si se aplica la migración antes que el código, la app en
  producción/dev que sigue usando `getSupabase()` directo se rompe
  inmediatamente (todo el CRUD de equipo/asignaciones/templates/logs deja
  de funcionar hasta que el nuevo código esté desplegado). `tasks.md` deja
  esto explícito como advertencia para el humano, no como algo que
  `implementer` deba orquestar (no tiene acceso a Vercel ni a Supabase).
- `getSupabaseAdmin()` ya existe y ya tiene su warning de "nunca importar
  desde código cliente" — las rutas nuevas solo tienen que importarlo,
  no hay que tocar `lib/supabaseAdmin.ts`.
- No se toca `lib/auth.ts` ni el fallback de `JWT_SECRET` (fuera de
  alcance, ver `requirements.md`).
- El diseño de las rutas de equipo (`app/api/team/**`) es plano y no anida
  autorización adicional más allá de "PIN válido" — igual que
  `app/api/proyectos/**` hoy, no hay roles distintos dentro de la app.
