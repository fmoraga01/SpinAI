# Current session state

- **Feature:** supabase-rls-lockdown
- **Status:** spec_ready
- **Started:** 2026-07-30
- **Role active:** none (waiting on human approval)
- **Next step:** HUMAN APPROVAL GATE. Read
  `specs/supabase-rls-lockdown/requirements.md`,
  `specs/supabase-rls-lockdown/design.md`,
  `specs/supabase-rls-lockdown/tasks.md` and explicitly approve (or
  request changes) before `leader` sets status to `in_progress` and hands
  off to `implementer`. Nothing else happens until that approval.

## Contexto (hallazgo de seguridad, ya verificado, no re-descubrir)

Tablas `members`, `assignments`, `templates`, `assignment_logs`
(`supabase/migrations/20260702000000_esquema_inicial.sql`) tienen RLS
`for all to anon using (true) with check (true)` — CRUD completo para el
rol `anon`, cuya key es pública (bundle del navegador). No existe
`middleware.ts` en el repo; `app/components/PinGate.tsx` es solo overlay
de React, no protege nada a nivel de red/Supabase. `lib/storage.ts` (+
`lib/hfTrending.ts`, `lib/news.ts`, `lib/research.ts`, `lib/stateOfAi.ts`)
llaman a `getSupabase()` (cliente anon) directo desde componentes
`"use client"`. Tablas de solo-lectura pública (`news_items`, `ai_models`,
`research_papers`, `hf_trending`) también sobre-privilegiadas (`for all`
en vez de `for select`).

Hallazgo adicional detectado durante la redacción de la spec: los cron
routes (`app/api/cron/refresh-news`, `refresh-research`,
`refresh-hf-trending`, `refresh-state-of-ai`, `cron/notify`) y
`app/api/notify` también usan `getSupabase()` (cliente anon) para
escribir/leer, protegidos solo por `CRON_SECRET`/JWT — no por RLS. Al
bloquear RLS para `anon`, estos 6 routes se rompen a menos que migren a
`getSupabaseAdmin()`. Ya está cubierto en la spec (R16, R17, tasks.md §4).

## Spec

`specs/supabase-rls-lockdown/requirements.md` (R1–R19),
`specs/supabase-rls-lockdown/design.md`,
`specs/supabase-rls-lockdown/tasks.md` — escritos por `leader` actuando
como `spec-author` (no había herramienta de invocación de subagentes
disponible en este entorno; se siguió `.claude/agents/spec-author.md` al
pie de la letra: EARS notation numerada, alternativas descartadas con
razón, checklist ordenado referenciando R<n>).

## Fuera de alcance (no tocar en esta feature)

Rate limiting de `/api/auth`, comparación constant-time del PIN, escape de
HTML en emails de notificación, headers de seguridad en `next.config.ts`,
bump de next — ya resueltos aparte, commit `dbf8b39` en `dev`. Fallback
hardcodeado de `JWT_SECRET` — pendiente de confirmación del usuario, no
tocar.

## Nota de orden de despliegue (importante para cuando se apruebe)

La migración SQL (tasks.md §5) debe aplicarse en Supabase dev **después**
de que el código de los puntos 1–4 esté desplegado, o el CRUD de
equipo/asignaciones/templates/logs se rompe para cualquiera que siga
sirviendo el código viejo. Ver `design.md`, sección "Cosas a las que
prestar atención".
