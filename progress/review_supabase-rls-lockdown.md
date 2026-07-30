# Review — `supabase-rls-lockdown`

**Veredicto: APPROVED**

Revisado por una sesión independiente de la que implementó (no escribió este
código). Commit revisado: `42fe7ad` en `dev` (`ac2b50f` encima solo cambia
`feature_list.json` a `in_review`). `npm run verify` corrido de forma
independiente, no tomado del reporte de `implementer`. Los 401/500 de las 18
rutas nuevas/migradas también se verificaron con `curl` real contra
`npm run dev` local, de forma independiente (no confié en el reporte).

Es un fix de seguridad crítico — el foco de esta revisión fue confirmar que
**ninguna** ruta nueva se salteó el chequeo de auth y que **ningún** archivo
`lib/*.ts` siguiera usando el cliente anon, no solo que el build pasara.

---

## Checkpoints — `Before in_review`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS (con matiz)** — 26/29 tareas `[x]`. Las 3 restantes (2.3, 3.6, 6.2 parcial) son QA manual en navegador con PIN real, explícitamente marcadas `PENDIENTE`/`PARCIAL` con la razón (sin credenciales Supabase/PIN en este sandbox), no marcadas `[x]` a la fuerza. Mismo patrón ya aceptado en `review_project-crud.md` y `review_weekly-update-edit-delete.md` (checkbox sin marcar + nota explícita > checkbox marcado sin sustento). |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí, exit 0: `lint` limpio, `build` compila (27 rutas de `app/api/**`, incluidas las 14 nuevas), `test` 22/22 en 3 archivos, `check-sdd-state` OK ("single active feature: supabase-rls-lockdown (in_review)"). |
| 3 | Cambios en `lib/` con test Vitest real | **PASS** — `lib/teamRows.ts` (nuevo, concentra la lógica pura que antes vivía en `lib/storage.ts`) tiene `lib/teamRows.test.ts` con 10 tests: `rowToMember`/`rowToAssignment`/`rowToLog`, `nextFridayAfter` (incluye cruce de mes), `getNextFridays` (cantidad + que caigan todas en viernes), `sanitizeTiming` (null/malformado, padding, `totalMinutes` derivado). Corridos por mí, pasan. |
| 4 | `progress/impl_<feature>.md` con verificación por cada `R<n>` | **PASS** — R1-R19 todas tienen entrada, sin huecos ni "N/A" sin justificar. Las que dependen de Supabase/PIN real (R3, R4, R6, R8, R16-R19) están etiquetadas explícitamente como pendientes de QA humana o de aplicar la migración, no declaradas como verificadas sin sustento. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS (no aplica)** — `git diff 2791d5e..42fe7ad --stat -- 'app/components/*.tsx'` da vacío: ningún archivo de `app/components/` fue tocado por esta feature (todo el diff es `app/api/**`, `lib/*.ts`, migración SQL y docs). |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — solo `supabase-rls-lockdown` en `in_review`; el resto de entradas están en `done`. Confirmado también por `check-sdd-state`. |

## Checkpoints — `Before done`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | `progress/review_<feature>.md` con pass/fail y veredicto | **PASS** — este archivo. |
| 2 | Ningún `R<n>` sin entrada de verificación | **PASS** — ver checkpoint 4 arriba. |
| 3 | Una sola feature activa | **PASS**. |
| 4 | `progress/history.md` con entrada resumen | **PENDIENTE de `leader`** al cierre — no es responsabilidad de `implementer`/`reviewer`. |

---

## Verificación dirigida — el punto crítico de este fix (auth + admin client en las 20 rutas)

Leí el código real de las **14 rutas nuevas** (`app/api/team/**` × 10,
`app/api/public/**` × 4) y los **6 routes migrados**
(`app/api/cron/refresh-{news,research,hf-trending,state-of-ai}`,
`app/api/cron/notify`, `app/api/notify`) — no solo el resumen del reporte.

- **Las 10 rutas de `app/api/team/**`**: en las 10, `isAuthenticated(req)`
  se llama primero y el `return 401` precede a cualquier
  `getSupabaseAdmin()`/query. Confirmado archivo por archivo:
  `app/api/team/route.ts`, `members/route.ts`, `members/[id]/route.ts`
  (`PATCH`+`DELETE`), `members/[id]/toggle/route.ts`,
  `assignments/[id]/route.ts`, `assignments/swap/route.ts`,
  `assignments/bulk-preview/route.ts`, `assignments/bulk-confirm/route.ts`,
  `templates/[assignmentId]/route.ts` (`GET`+`PUT`), `logs/route.ts`.
  Grep de control: `grep -rL "isAuthenticated" app/api/team --include=route.ts`
  y `grep -rL "getSupabaseAdmin" app/api/team --include=route.ts` dan
  ambos vacío (ninguna ruta se escapó).
- **`getSupabase()` (cliente anon) en `app/api/team` / `app/api/public`**:
  `grep -rn "getSupabase(" app/api/team app/api/public` → vacío. Ninguna
  ruta nueva usa el cliente anon.
- **Las 4 rutas de `app/api/public/**`**: correctamente sin auth (por
  diseño, dato público) y con `getSupabaseAdmin()` — coincide con R11-R14 y
  con la alternativa elegida en `design.md` (usar admin en vez de anon "por
  consistencia... y para no depender de que la policy de lectura pública
  siga existiendo en el futuro").
- **Los 6 cron/notify routes**: los 5 de `app/api/cron/**` verifican
  `x-cron-secret === process.env.CRON_SECRET` antes de tocar Supabase;
  `app/api/notify/route.ts` verifica la cookie JWT antes. Los 6 usan
  `getSupabaseAdmin()` — confirmado que no quedó ningún `getSupabase()`
  residual (`grep -rn "getSupabase\b" app/api/cron app/api/notify` → vacío).
- **Residuos de `lib/supabase.ts` (cliente anon) en el resto del repo**:
  `grep -rln 'from ["\']@/lib/supabase["\']'` sobre todo `.ts`/`.tsx` del
  repo (excluyendo `node_modules`) → vacío. Ningún componente ni módulo
  importa el cliente anon. Coincide con lo que `impl_*.md` reporta
  ("`lib/supabase.ts` quedó sin ningún consumidor").

**Verificación con `curl` real** (independiente, no tomada del reporte),
contra `npm run dev` local sin cookie/secret:

```
GET    /api/team                          -> 401
POST   /api/team/members                  -> 401
PATCH  /api/team/members/abc              -> 401
DELETE /api/team/members/abc              -> 401
POST   /api/team/members/abc/toggle       -> 401
DELETE /api/team/assignments/abc          -> 401
POST   /api/team/assignments/swap         -> 401
GET    /api/team/assignments/bulk-preview -> 401
POST   /api/team/assignments/bulk-confirm -> 401
GET    /api/team/templates/abc            -> 401
PUT    /api/team/templates/abc            -> 401
GET    /api/team/logs                     -> 401
GET    /api/public/news                   -> 500 (sin creds Supabase en sandbox, NO 401 — esperado, dato público)
GET    /api/public/research               -> 500 (idem)
GET    /api/public/hf-trending            -> 500 (idem)
GET    /api/public/ai-models              -> 500 (idem)
GET    /api/cron/refresh-news             -> 401
GET    /api/cron/refresh-research         -> 401
GET    /api/cron/refresh-hf-trending      -> 401
GET    /api/cron/refresh-state-of-ai      -> 401
GET    /api/cron/notify                   -> 401
POST   /api/notify (sin cookie)           -> 401
```

Coincide exactamente con lo que `progress/impl_supabase-rls-lockdown.md`
reporta — sin discrepancias.

## Equivalencia funcional R8/R9/R10 — comparación línea a línea

No me conformé con "revisión de código" declarada en `impl_*.md`: comparé
`lib/storage.ts` en `2791d5e` (pre-feature) contra `lib/teamRows.ts` +
`app/api/team/**` en `42fe7ad`, función por función
(`loadData`→`loadTeamData`, `addMember`, `updateMemberName`/`Email`,
`toggleMember`, `removeMember`, `removeAssignment`,
`swapAssignmentMembers`, `loadLogs`, `buildBulkAssignmentPreview`→
`buildBulkPreview`, `confirmBulkAssignment`, `loadTemplate`/`saveTemplate`
con `sanitizeTiming`). La lógica es una traducción fiel: mismos `.from()`,
mismos filtros, mismo orden de operaciones, mismos casos de saneamiento
(asignaciones huérfanas, `member_name` desincronizado). La única diferencia
de comportamiento que encontré es una **mejora defensiva**, no una
regresión: `swapAssignmentMembers` original usaba
`data!.find(...)!` (lanzaría un `TypeError` no controlado si el id no
existe); la ruta nueva agrega un `if (!a || !b) return 404` explícito antes
de usar los valores. `lib/storage.ts` nuevo conserva las 12 firmas
exportadas idénticas (nombre, parámetros, tipo de retorno) y usa el mismo
contrato de errores (`throw new Error(...)` vía el helper `errorMessage()`,
salvo `loadLogs` que — igual que el original — nunca lanza, devuelve
`{ entries: [], tableError: true }` en error, confirmado comparando con
`2791d5e:lib/storage.ts:208`).

`lib/news.ts`, `lib/research.ts`, `lib/hfTrending.ts`, `lib/stateOfAi.ts`:
las 4 funciones de carga (`loadNews`, `loadResearchPapers`,
`loadHfTrending`, `loadAiModels`) pasan a `fetch()` contra
`/api/public/**` con la misma firma; las funciones puras de
`lib/stateOfAi.ts` (`bestVariantPerSlug`, `formatPrice`, `formatIndex`,
`formatReleaseDate`, `buildExecutiveSummary`, `monthlyReleaseCounts`) no
cambiaron una línea.

## Migración SQL (R1-R4)

`supabase/migrations/20260730120000_bloquear_acceso_anon.sql` leída
completa:
- `drop policy if exists "anon full access"` en `members`, `assignments`,
  `templates`, `assignment_logs`, **sin** `create policy` de reemplazo →
  deny total a `anon`, tal como pide R1. Confirmado que no queda ninguna
  policy de escritura para `anon` en esas 4 tablas.
- `drop policy` + `create policy "anon read access" ... for select to anon
  using (true)` en `news_items`, `ai_models`, `research_papers`,
  `hf_trending` → lectura pública se mantiene (R4), escritura/borrado
  denegados a `anon` (R2/R3). Sin ninguna policy adicional de escritura.
- Comentario en el propio archivo referenciando el hallazgo de auditoría y
  el spec, siguiendo el estilo de migraciones previas del repo.
- **No aplicada** en Supabase — confirmado, es lo correcto en esta etapa
  (ver advertencia de orden de despliegue abajo).

## Advertencia de orden de despliegue

Presente y clara en `progress/impl_supabase-rls-lockdown.md`, en mayúsculas,
con la razón completa (si se aplica la migración antes que el código
desplegado, el CRUD de equipo/asignaciones/plantillas/logs se rompe para
cualquiera que siga sirviendo `getSupabase()` directo). También queda
reflejada en el `note` de `feature_list.json`. Cumple el checkpoint
correspondiente de `design.md`/`tasks.md` §5.3.

## Fuera de alcance — confirmado que no se tocó

- `lib/auth.ts`: **no aparece** en `git show 42fe7ad --stat` — intacto,
  incluido el fallback hardcodeado de `JWT_SECRET` (fuera de alcance por
  `requirements.md`, pendiente de que el usuario confirme si está seteado
  en producción).
- `next.config.ts`: no tocado por este commit (los headers de seguridad
  quedaron en `dbf8b39`, ya en `dev`, sin superposición).
- Los fixes de bajo riesgo de `dbf8b39` (rate limiting de `/api/auth`,
  comparación constant-time del PIN, escape de HTML en emails, headers de
  seguridad, bump de next) — confirmado con `git show dbf8b39 --stat` que
  ya estaban mergeados aparte y este commit no los reabre ni los duplica.

---

## Notas no bloqueantes

**Nota 1 — QA humana end-to-end pendiente.** Igual que `project-crud` y
`weekly-update-edit-delete`, la parte de "ejercitar contra Supabase/PIN
reales en el navegador" no se pudo correr en este sandbox. `implementer`
fue honesto al respecto (tareas sin marcar `[x]`, sección explícita en
`impl_*.md`). La condición ya está reflejada en el `note` de
`feature_list.json` para esta feature — no hace falta que yo la repita ahí,
pero **debe viajar a `progress/history.md`** cuando `leader` cierre, listando
como mínimo: (a) aplicar la migración SQL solo después de desplegar este
código, (b) QA de navegador con PIN real de agregar/editar/activar-
desactivar/eliminar miembro, editar/intercambiar asignación, asignación
masiva, plantilla, logs, y (c) confirmar que Noticias/Research/HF
Trending/State of AI siguen cargando sin PIN tras aplicar R2/R4.

**Nota 2 — riesgo real más alto que features previas.** A diferencia de
`project-crud`/`weekly-update-*`, acá el "no ejercitado end-to-end" incluye
un cambio de RLS que, mal secuenciado, puede causar una interrupción total
del CRUD de equipo en producción. La advertencia de orden ya está escrita
con claridad (ver arriba) — la marco igual como el punto de mayor cuidado
para el usuario al desplegar, no como un defecto de la implementación.

**Nota 3 — `lib/supabase.ts` huérfano.** Queda sin consumidores en todo el
repo tras esta feature (confirmado por grep). `implementer` documentó
correctamente por qué no lo borró (fuera de alcance de `tasks.md`, evitar
expandir un fix de seguridad). De acuerdo en dejarlo para una feature de
limpieza futura — no bloqueante acá.

---

## Veredicto final

**APPROVED.** Las 20 rutas nuevas/migradas verifican auth (PIN o
`x-cron-secret`) antes de tocar Supabase y usan `getSupabaseAdmin()`, sin
ninguna excepción encontrada. No queda ningún import residual del cliente
anon (`lib/supabase.ts`) en `lib/storage.ts`, `lib/news.ts`,
`lib/research.ts`, `lib/hfTrending.ts`, `lib/stateOfAi.ts` ni en ningún otro
archivo del repo. La migración SQL hace deny total en las 4 tablas
confidenciales y `for select` solamente en las 4 de lectura pública, sin
policies de escritura para `anon`. Nada fuera de alcance fue tocado. La
trazabilidad R1-R19 está completa sin huecos. `npm run verify` pasa,
corrido de forma independiente. `leader` puede mover
`supabase-rls-lockdown` a `done`, arrastrando la condición de QA humana
pendiente de la Nota 1 hacia `progress/history.md`.
