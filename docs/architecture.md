# Architecture map

A quick orientation for whoever (human or agent) is about to write a spec or
implement one. This is intentionally shallow — for anything deeper than
"where does this belong," use graphify.

> If `graphify-out/graph.json` exists, run `graphify query "<question>"`,
> `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` instead of
> re-deriving structure by hand — see the root `CLAUDE.md` for the full
> graphify workflow. This file is the fallback when graphify-out/ hasn't
> been generated yet.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(PostgreSQL) · Nodemailer over Gmail SMTP · GitHub Actions for scheduled
jobs · Vercel for hosting.

## Layout

- **`app/`** — routes (App Router) and page-level composition.
  - `app/api/**/route.ts` — API routes: auth (PIN + JWT cookie), manual and
    cron-triggered notifications, scheduled data refreshes.
  - `app/components/` — shared React components (roulette, calendar,
    presentation view, nav, etc.). Design tokens live in `app/globals.css`;
    the `design-check` skill enforces consistency against them.
  - `app/state-of-ai/`, `app/noticias/` — feature-specific page trees.
- **`lib/`** — framework-agnostic logic: Supabase client, data
  fetching/parsing (news, research, HF trending, AI landscape), storage
  helpers, shared types. This is where Vitest coverage starts (see
  `docs/specs.md` traceability section) — it's pure(r) logic, cheapest to
  test, highest signal.
- **`.github/workflows/`** — cron jobs (weekly notification email, periodic
  data refreshes for news/research/trending).

## Data flow, roughly

Supabase holds `members`, `assignments`, `templates`, `assignment_logs`.
Server-side code in `lib/` and `app/api/` reads/writes it; scheduled GitHub
Actions hit cron API routes that query Supabase and send email via
Nodemailer.

## Where a new feature usually touches

| Kind of change | Likely files |
|---|---|
| New data source / parsing logic | `lib/*.ts` |
| New UI | `app/components/*.tsx` + relevant `app/**/page.tsx` |
| New scheduled job | `app/api/cron/*/route.ts` + `.github/workflows/*.yml` |
| Auth/session behavior | `app/api/auth/*`, `lib/storage.ts` |
| DB schema | Supabase migration (see README.md "Base de datos") |
