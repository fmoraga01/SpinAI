# Current session state

- **Feature:** supabase-rls-lockdown
- **Status:** in_progress (implementación terminada, lista para pasar a `in_review`)
- **Started:** 2026-07-30
- **Role active:** implementer (terminado)
- **Next step:** `implementer` ejecutó `specs/supabase-rls-lockdown/tasks.md`
  §1–§6 completo. `npm run verify` está en verde (lint + build + test
  22/22 + check-sdd-state). Falta que `leader` mueva el status a
  `in_review` y que `reviewer` revise el código y, sobre todo, confirme el
  plan de QA humana pendiente (ver `progress/impl_supabase-rls-lockdown.md`)
  antes de que el usuario aplique la migración SQL en Supabase.

## Qué se hizo

- 14 rutas API nuevas: `app/api/team/**` (10, protegidas por
  `isAuthenticated`) y `app/api/public/**` (4, sin auth — datos públicos).
- `lib/storage.ts`, `lib/news.ts`, `lib/research.ts`, `lib/hfTrending.ts`,
  `lib/stateOfAi.ts` reescritos: mismas firmas exportadas, ahora hacen
  `fetch` a las rutas nuevas en vez de `getSupabase()` (anon) directo.
- `lib/teamRows.ts` nuevo (server-side, no expuesto al cliente): mapeos
  `rowTo*`, helpers puros (`nextFridayAfter`, `getNextFridays`,
  `sanitizeTiming`) y lógica de negocio (`loadTeamData`,
  `clearLogsIfNoAssignments`, `buildBulkPreview`) compartida por las 10
  rutas de `app/api/team/**`. `lib/teamRows.test.ts` con 10 tests Vitest
  nuevos.
- 6 cron/notify routes migrados de `getSupabase()` a `getSupabaseAdmin()`.
- `supabase/migrations/20260730120000_bloquear_acceso_anon.sql` escrita
  (deny total a `anon` en members/assignments/templates/assignment_logs,
  `for select` en news_items/ai_models/research_papers/hf_trending) —
  **NO aplicada** en Supabase, queda pendiente de que el usuario la corra
  manualmente y solo DESPUÉS de desplegar este código (ver advertencia en
  mayúsculas en `progress/impl_supabase-rls-lockdown.md`).

## Verificado

- `npm run verify`: verde.
- `curl` real contra `npm run dev` local: 401 confirmado sin cookie/secret
  en las 18 rutas relevantes (12 de `app/api/team/**`, 5 cron + notify);
  las 4 rutas `/api/public/**` responden sin 401 (500 por falta de
  credenciales Supabase reales en este sandbox, esperado).

## Pendiente (no ejercitable en este sandbox — documentado, no como "hecho")

QA end-to-end en navegador con PIN real + Supabase dev real: R6, R8,
R16–R19 de `requirements.md`. Ver el detalle completo de qué falta
ejercitar en `progress/impl_supabase-rls-lockdown.md`, sección
"Trazabilidad requisito → verificación" y "Verificación general".

## Contexto (hallazgo de seguridad, ya verificado, no re-descubrir)

Tablas `members`, `assignments`, `templates`, `assignment_logs`
(`supabase/migrations/20260702000000_esquema_inicial.sql`) tenían RLS
`for all to anon using (true) with check (true)` — CRUD completo para el
rol `anon`, cuya key es pública (bundle del navegador). No existe
`middleware.ts` (Next 16 lo renombró a `proxy.ts`, confirmado durante la
implementación — y ese `proxy.ts` tampoco bloquea nada a nivel de red,
solo setea un header para el overlay de `PinGate.tsx`). `lib/storage.ts`
(+ `lib/hfTrending.ts`, `lib/news.ts`, `lib/research.ts`,
`lib/stateOfAi.ts`) llamaban a `getSupabase()` (cliente anon) directo
desde componentes `"use client"`. Tablas de solo-lectura pública
(`news_items`, `ai_models`, `research_papers`, `hf_trending`) también
sobre-privilegiadas (`for all` en vez de `for select`).

Hallazgo adicional detectado durante la redacción de la spec: los cron
routes (`app/api/cron/refresh-news`, `refresh-research`,
`refresh-hf-trending`, `refresh-state-of-ai`, `cron/notify`) y
`app/api/notify` también usaban `getSupabase()` (cliente anon) para
escribir/leer, protegidos solo por `CRON_SECRET`/JWT — no por RLS. Ya
migrados a `getSupabaseAdmin()` (R16, R17, tasks.md §4).

## Spec

`specs/supabase-rls-lockdown/requirements.md` (R1–R19),
`specs/supabase-rls-lockdown/design.md`,
`specs/supabase-rls-lockdown/tasks.md` — checklist completo, marcado por
`implementer`.

## Fuera de alcance (no tocar en esta feature)

Rate limiting de `/api/auth`, comparación constant-time del PIN, escape de
HTML en emails de notificación, headers de seguridad en `next.config.ts`,
bump de next — ya resueltos aparte, commit `dbf8b39` en `dev`. Fallback
hardcodeado de `JWT_SECRET` — pendiente de confirmación del usuario, no
tocar. `lib/supabase.ts` (`getSupabase()`, cliente anon) quedó sin
consumidores tras esta migración pero no se eliminó (no estaba en el
alcance de `tasks.md`) — candidato a limpieza en una feature futura.

## Nota de orden de despliegue (CRÍTICO — leer antes de aplicar la migración)

**La migración SQL (`supabase/migrations/20260730120000_bloquear_acceso_anon.sql`)
NO debe aplicarse en Supabase dev hasta que el código de los puntos 1–4 de
`tasks.md` esté desplegado**, o el CRUD de equipo/asignaciones/
templates/logs se rompe para cualquiera que siga sirviendo el código
viejo. Ver `progress/impl_supabase-rls-lockdown.md` para el detalle
completo.
