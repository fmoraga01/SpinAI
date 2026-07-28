# Review — project-status-tracking

**Verdict: APPROVED**

**Caveat on process**: this review was performed by the same agent
(`leader`, acting as `implementer` and then `reviewer` in the same session,
per explicit instruction — no separate `reviewer` subagent tool was
available). This is a deviation from the normal separation of roles; the
check below was still done mechanically and independently (rerunning
lint/build/tests, re-reading the diff and the spec), not by trusting the
implementer's self-report, but it is not a truly independent second
reader. Flagging this explicitly for the human's awareness before treating
`done` as equivalent to a normal SDD review.

## Checkpoints (`CHECKPOINTS.md` — "Before `in_review`")

1. **Every task in `tasks.md` checked off** — PASS. `specs/project-status-tracking/tasks.md`
   has T1, T1b, T1c, T1d, T2–T9 all marked `[x]`.
2. **`npm run lint` passes** — PASS. Re-run independently, no output/errors.
3. **`npm run build` passes** — PASS. Re-run independently; route map
   includes `/proyectos`, `/proyectos/[id]`, `/api/proyectos`,
   `/api/proyectos/[id]`; TypeScript check finishes clean.
4. **`lib/` logic has a real Vitest test** — PASS.
   `lib/projects.test.ts` covers `healthFromTimeline` with 4 cases (empty →
   null, single entry, most-recent-by-weekOf not last-in-array, and
   out-of-order array). Re-ran `npm run test`: 9/9 tests pass across 2 files.
5. **`progress/impl_project-status-tracking.md` exists with a verification
   entry for every `R<n>`** — PASS. Checked line by line against
   `requirements.md`: R1 through R17 are all present, each naming file(s)
   and verification method (automated test for R2/R3, manual QA / code
   reading for the rest, plus a real `curl` check for R16 and a
   `.next/static` grep for the client-bundle half of R17). No `R<n>` is
   missing. R11 and R17 are explicitly marked as partially blocked (the
   Supabase-dependent halves), which is consistent with the known,
   pre-approved manual-step limitation in `design.md`/`tasks.md`, not a
   silently skipped requirement.
6. **`design-check` run for `app/components/*.tsx` changes** — PASS.
   Confirmed via `git diff origin/main -- app/components/'*.tsx'` that
   `Nav.tsx` is the only touched file there; the diff only adds a
   `proyectosActive` boolean and a `<NavLink>` reusing the existing
   component, introducing no new hex colors, radii, or shadows. No
   findings, correctly reported as such rather than skipped.
7. **`feature_list.json` has only this feature `in_progress`/`in_review`** —
   PASS. All other entries are `done`.

## Traceability spot-check (beyond trusting the report)

- Re-read `lib/projects.ts`: `healthFromTimeline` is pure, exported, matches
  `design.md`'s contract (`WeeklyUpdate[] → HealthStatus | null`, most
  recent `weekOf` wins, `null` on empty).
- Re-read `app/api/proyectos/route.ts` and `[id]/route.ts`: both call
  `isAuthenticated(req)` before touching Supabase, matching R16; `[id]`
  route returns 404 (not a generic 500) when `data` is null, matching R7's
  server-side half.
- Confirmed `lib/projects.ts`'s `loadProjects`/`loadProject` use `fetch()`
  against the internal API routes, not `getSupabase()`/`getSupabaseAdmin()`
  directly — matches R15's client/server split.
- Confirmed `supabase/migrations/20260728120000_crear_projects.sql` has no
  `create policy` statement for any of the 3 new tables — matches R17's
  intended deny-by-default. Could not confirm this against a live Supabase
  project (no credentials available in this environment) — this matches
  the blocker already documented in `impl_project-status-tracking.md` and
  `tasks.md`, not a new gap introduced by review.
- Re-ran the R16 manual check independently: `npm run dev` in background,
  `curl` against both routes without a cookie, both returned `401` with
  `{"error":"No autorizado"}` and no project data in the body.

## Known blockers (unchanged by review, human-owned)

1. Apply `supabase/migrations/20260728120000_crear_projects.sql` in the
   Supabase **dev** project's SQL Editor.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel's env vars
   (dev and prod, separately).
3. Once (1) is done, confirm in the Supabase dashboard (Table Editor →
   Policies) that `projects`/`project_kpis`/`project_weekly_updates` have no
   `anon`/`authenticated` policies — the migration file doesn't define any,
   but this needs eyes-on confirmation against the real project.

None of these are reasons to reject: the spec and tasks explicitly scoped
them as manual, human-owned steps outside `implementer`'s access, and the
code was written and verified as far as possible without them (including
the security-critical parts — the auth gate and the absence of the service
role key in the client bundle — which do not depend on the migration being
applied).
