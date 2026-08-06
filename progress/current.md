# Current session state

- **Feature:** project-hero-lego-animation (bug 4 fix applied — 4th reopen)
- **Status:** in_progress
- **Started:** 2026-08-06
- **Role active:** implementer (done) — next: leader moves to `in_review`,
  invokes `reviewer` (4th pass).
- **Next step:** `reviewer` re-verifies. If this pass is approved, the only
  remaining open item is the unrelated pending trade-off below (all-`"2x2"`
  brick sizing vs `design.md`'s original size-variety decision), which needs
  a user decision, not more implementation work.

## Bugs 1, 2, 3 — already fixed, not touched this pass

- Bug 1 (studs faltantes): commit `3758211`.
- Bug 2 (solapamiento, piezas unificadas a `"2x2"`): commit `f3a9c47`.
- Bug 3 (`n=30` + `prefers-reduced-motion` fragmentado): commit `0542a9c`,
  introduced `chooseGridDims()`. Confirmed by 2 independent `reviewer`
  passes with real-browser screenshots.

## Bug 4 — FIXED this pass (`chooseGridDims()` spread tie-break almost never fired)

`chooseGridDims()` in `lib/lego/layout.ts` used spread (`max - min` of the
3 grid dimensions) only as a tie-break when `waste` matched exactly between
two candidate triples — which almost never happens for a real `n`, so the
function always returned the globally least-wasteful triple regardless of
elongation. Concrete case the `reviewer` found: `n=81` (tier `full`)
returned `[3,4,7]` (spread=4, an obviously elongated slab). Verified by
brute force to hit 22 of 41 `n` in `[80,120]`.

**Fix applied** (transcribed from the pre-verified algorithm in the prior
session's handoff, no redesign needed): replaced the tie-break with a hard
filter — `chooseGridDimsWithCap(n, maxSpread)` only considers triples whose
spread is `<= maxSpread`, minimizing waste within that set; `chooseGridDims`
tries `maxSpread` from 1 to 5, using the first cap that yields any valid
triple. For `n=81` this now returns `[4,5,5]` (spread=1).

**Test coverage**: `lib/lego/layout.test.ts`, `describe("chooseGridDims")`
— replaced the old 6-value-sample "roughly cubic" test (which happened to
dodge the bug) with two tests iterating **every** integer `n` in each
quality tier's full range (`30..40` and `80..120`), asserting `spread <= 1`
and `fill >= 0.75` for each. All 35 tests in the file pass. `npm run
verify` (lint + build + vitest + `check-sdd-state`) is green.

**Real-browser QA** (Chromium + Playwright, PIN-gate bypassed with a
process-local test PIN, never committed): forced tier `full` + `n=81` via
`navigator.hardwareConcurrency`/`deviceMemory` overrides (16) and a fixed
`Math.random` return value. Confirmed via a temporary (immediately
reverted) camera pullback that the assembled box is now `[4,5,5]` — a solid
rectangular block, not the `[3,4,7]` elongated slab from before. Default
camera framing also confirmed solid/gapless, no overlaps. A quick
regression pass at natural (unforced) settings showed no visual regression
in the normal narrative. Full details, screenshot filenames, and the exact
overrides used are in `progress/impl_project-hero-lego-animation.md`,
dated "Bug 4 (2026-08-06, 4th reopen)" section.

## Trade-off pending user decision (unrelated to this bug, do not resolve)

The bug 2 fix (commit `f3a9c47`) unified all pieces to `"2x2"`, losing the
size variety (`2x4`/`1x2`/`plate1x1`) `design.md` had fixed as a definitive
decision. Still pending presentation to the user once this feature is
fully approved.

## Files changed this pass

`lib/lego/layout.ts`, `lib/lego/layout.test.ts`. (`scene.ts`/`timeline.ts`
were touched transiently for QA only and are back to their committed
state — confirmed via `git diff --stat`.)
