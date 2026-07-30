# Requirements — supabase-rls-lockdown

Hallazgo de auditoría de seguridad: las tablas `members`, `assignments`,
`templates`, `assignment_logs` tienen RLS `for all to anon using (true)
with check (true)` — CRUD completo para el rol `anon`, cuya key
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`) es pública (va en el bundle del
navegador). No existe `middleware.ts` en el repo; `PinGate.tsx` es solo un
overlay de React que no bloquea nada a nivel de red. `lib/storage.ts` (y
`lib/hfTrending.ts`, `lib/news.ts`, `lib/research.ts`, `lib/stateOfAi.ts`)
llaman a `getSupabase()` (cliente anon) directo desde componentes
`"use client"`, sin pasar por ninguna ruta API protegida. Las tablas de
solo-lectura pública (`news_items`, `ai_models`, `research_papers`,
`hf_trending`) tienen el mismo problema de sobre-privilegio (permiten
borrar/corromper datos vía anon key aunque el contenido no sea
confidencial).

## Esquema y RLS

- **R1**: WHEN se aplica la migración de esta feature THEN el sistema
  SHALL remover las políticas `for all to anon` existentes sobre `members`,
  `assignments`, `templates` y `assignment_logs` sin reemplazarlas por
  ninguna política para `anon` (deny total por defecto, RLS ya habilitado
  en `20260702000000_esquema_inicial.sql`), replicando el patrón de
  `supabase/migrations/20260728120000_crear_projects.sql`.
- **R2**: WHEN se aplica la migración de esta feature THEN el sistema
  SHALL remover las políticas `for all to anon` existentes sobre
  `news_items`, `ai_models`, `research_papers` y `hf_trending` y
  reemplazarlas por una política `for select to anon using (true)` en cada
  una (lectura pública permitida, escritura/borrado denegados a `anon`).
- **R3**: WHEN un cliente usa la anon key para hacer `INSERT`, `UPDATE` o
  `DELETE` directo (REST API de Supabase, sin pasar por `app/api/**`)
  contra `members`, `assignments`, `templates`, `assignment_logs`,
  `news_items`, `ai_models`, `research_papers` o `hf_trending` THEN
  Supabase SHALL rechazar la operación por RLS.
- **R4**: WHEN un cliente usa la anon key para hacer `SELECT` directo
  contra `news_items`, `ai_models`, `research_papers` o `hf_trending`
  THEN Supabase SHALL permitir la lectura (sin cambio de comportamiento
  observable para quien consume esos datos).

## Rutas API — datos protegidos (equipo, asignaciones, plantillas, logs)

- **R5**: WHEN se hace `GET /api/team` sin cookie `spinai_token` válida
  THEN el sistema SHALL responder 401.
- **R6**: WHEN se hace `GET /api/team` con cookie válida THEN el sistema
  SHALL responder con el mismo shape de datos que hoy devuelve
  `loadData()` (`{ members, assignments }`), consultando con
  `getSupabaseAdmin()` server-side, incluyendo el mismo saneamiento de
  asignaciones huérfanas y nombres desincronizados que hace `loadData()`
  hoy.
- **R7**: WHEN se hace cualquier request (`POST`/`PATCH`/`DELETE`, según
  corresponda) a las rutas nuevas que reemplazan `addMember`,
  `updateMemberName`, `updateMemberEmail`, `toggleMember`, `removeMember`,
  `removeAssignment`, `swapAssignmentMembers`, `confirmBulkAssignment`,
  `loadTemplate`, `saveTemplate`, `loadLogs` sin cookie `spinai_token`
  válida THEN el sistema SHALL responder 401 y no SHALL tocar Supabase.
- **R8**: WHEN se hace la request equivalente con cookie válida y payload
  correcto THEN el sistema SHALL producir el mismo efecto en Supabase (y
  devolver una respuesta funcionalmente equivalente) al que produce hoy la
  función correspondiente de `lib/storage.ts` operando con el cliente
  anon, usando `getSupabaseAdmin()` server-side.
- **R9**: WHEN `lib/storage.ts` es invocado desde un componente cliente
  (`addMember`, `updateMemberName`, `updateMemberEmail`, `toggleMember`,
  `removeMember`, `loadData`, `removeAssignment`, `swapAssignmentMembers`,
  `buildBulkAssignmentPreview`, `confirmBulkAssignment`, `getNextFridays`,
  `loadTemplate`, `saveTemplate`, `loadLogs`) THEN el módulo SHALL exponer
  exactamente las mismas firmas de funciones exportadas que hoy (mismos
  nombres, parámetros y tipos de retorno), delegando internamente a
  `fetch` contra las rutas API nuevas en vez de llamar a `getSupabase()`
  directamente — de forma que ningún componente consumidor (`Drawer.tsx`,
  `MembersPanel.tsx`, `Roulette.tsx`, `Schedule.tsx`, `ChangeLog.tsx`,
  `TemplateEditor.tsx`, `Nav.tsx`, `HeroChip.tsx`, `HomeCTAs.tsx`) necesite
  cambios más allá de imports ya existentes.
- **R10**: WHEN una función de `lib/storage.ts` recibe una respuesta HTTP
  no-OK de su ruta API THEN SHALL lanzar un `Error` con un mensaje
  utilizable (igual que hoy lanza `Error(error.message)` del cliente
  Supabase), para no romper el manejo de errores existente en los
  componentes consumidores.

## Rutas API — datos de solo lectura pública (news, research, hfTrending, stateOfAi)

- **R11**: WHEN se hace un request a la ruta (o Server Component, según lo
  que defina `design.md`) que reemplaza `loadNews(page)` THEN el sistema
  SHALL devolver el mismo shape `{ items, hasMore }` con la misma
  paginación (`PAGE_SIZE = 20`) que hoy, sin requerir autenticación (dato
  público).
- **R12**: WHEN se hace un request a la ruta/Server Component que
  reemplaza `loadResearchPapers(limit)` THEN el sistema SHALL devolver el
  mismo shape `ResearchPaper[]` que hoy, sin requerir autenticación.
- **R13**: WHEN se hace un request a la ruta/Server Component que
  reemplaza `loadHfTrending()` THEN el sistema SHALL devolver el mismo
  shape `{ models, papers }` que hoy, sin requerir autenticación.
- **R14**: WHEN se hace un request a la ruta/Server Component que
  reemplaza `loadAiModels()` THEN el sistema SHALL devolver el mismo shape
  `AiModel[]` que hoy, sin requerir autenticación. Las funciones puras que
  no tocan Supabase (`bestVariantPerSlug`, `formatPrice`, `formatIndex`,
  `formatReleaseDate`, `buildExecutiveSummary`, `monthlyReleaseCounts`)
  SHALL permanecer sin cambios de firma ni de comportamiento.
- **R15**: WHEN `lib/hfTrending.ts`, `lib/news.ts`, `lib/research.ts`,
  `lib/stateOfAi.ts` son invocados desde los componentes que hoy los
  consumen (`Research.tsx`, `HfTrending.tsx`, `noticias/page.tsx`,
  `state-of-ai/page.tsx` y los demás componentes de `app/state-of-ai/*`
  que dependen de `loadAiModels`) THEN esos módulos SHALL exponer las
  mismas firmas exportadas que hoy — salvo que `design.md` documente
  explícitamente que una lectura se mueve a Server Component, en cuyo caso
  el/los componente(s) afectados se actualizan como parte de esta feature
  y quedan explícitamente listados en `tasks.md`.

## Cron routes — deben seguir funcionando

- **R16**: WHEN corre cualquiera de los cron jobs existentes
  (`app/api/cron/refresh-news`, `refresh-research`, `refresh-hf-trending`,
  `refresh-state-of-ai`, `cron/notify`) con el header `x-cron-secret`
  correcto THEN el job SHALL poder seguir leyendo/escribiendo en sus
  tablas correspondientes (incluyendo `INSERT`/`UPDATE`/`UPSERT`/`DELETE`
  en `news_items`, `research_papers`, `hf_trending`, `ai_models`, y
  lectura de `members`/`assignments`) pese a que R1/R2 le quiten a `anon`
  el permiso de escritura — es decir, estos routes SHALL migrar de
  `getSupabase()` (cliente anon) a `getSupabaseAdmin()` (service role)
  como parte de esta feature.
- **R17**: WHEN corre `app/api/notify` (disparado por el usuario
  autenticado, no por cron) THEN SHALL seguir pudiendo leer
  `assignments`/`members` pese a R1, migrando también de `getSupabase()` a
  `getSupabaseAdmin()`.

## Verificación end-to-end del flujo de PIN

- **R18**: WHEN un usuario sin cookie válida abre cualquier página que
  antes cargaba datos vía `lib/storage.ts` (equipo, calendario, logs,
  plantillas) THEN SHALL ver el mismo comportamiento observable de hoy en
  cuanto al `PinGate` (bloqueado hasta ingresar el PIN correcto) y, una
  vez autenticado, los datos SHALL cargar correctamente contra las rutas
  API nuevas.
- **R19**: WHEN un usuario ingresa el PIN correcto y el flujo emite la
  cookie `spinai_token` THEN todas las funciones de `lib/storage.ts`
  SHALL operar exactamente igual que hoy (sin regresión funcional) al
  ejercitarlas manualmente en el navegador: agregar/editar/activar-
  desactivar/eliminar miembro, editar/intercambiar asignación, asignación
  masiva, ver/editar plantilla, ver logs.

## Fuera de alcance (no forma parte de esta feature)

Rate limiting de `/api/auth`, comparación constant-time del PIN, escape de
HTML en emails de notificación, headers de seguridad en `next.config.ts`,
bump de next — ya resueltos en un commit aparte (`dbf8b39`, ya en `dev`).
El fallback hardcodeado de `JWT_SECRET` (`"fallback-secret-change-me"`) en
`app/api/auth/route.ts`, `lib/auth.ts`, `app/api/notify/route.ts` — queda
sin tocar, pendiente de que el usuario confirme si `JWT_SECRET` ya está
seteado en producción.
