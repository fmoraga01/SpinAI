# Implementation notes — project-hero-lego-animation

## Environment limitation (read this first)

This sandbox has **no display and no headless browser** (no chromium,
playwright, or puppeteer binary available, and installing one would mean
downloading a large binary through the proxy with no guarantee it would
even run without a GPU/X server). `npm run dev` was run and the home page
was fetched with `curl` to confirm markup/DOM structure (grid layout
classes, absence of `AnimatedGrid`, presence of the new components), but
**no actual WebGL rendering, animation pacing, or `OrbitControls` drag
interaction could be visually confirmed** the way the CSS-only animation
features before this one were checked in an actual browser.

To compensate, every requirement below was verified as thoroughly as
possible without a browser:
- Pure logic (`lib/lego/*`) has real Vitest coverage (67 tests total, all
  green).
- Every Three.js/GSAP module was read end-to-end multiple times looking
  specifically for runtime bugs; this caught and fixed three real issues
  before finishing (see "Bugs found during self-review" below).
- `npm run build`/`tsc --noEmit` confirm the whole dependency graph
  compiles and type-checks (catches a large class of "this API doesn't
  exist" mistakes even without running the code).
- `curl` against the running dev server confirms DOM-level structure
  (layout classes, absence/presence of expected strings).

What this **cannot** confirm: exact visual timing/pacing "feel", whether
the Final Lock reads as a climax, whether `OrbitControls` dragging feels
right, whether piece density looks correct at 80-120 bricks, or whether
`prefers-reduced-motion`/fallback-tier actually render pixel-correct in a
real browser. If a maintainer can open `http://localhost:3000` in an
actual browser, that pass is still worth doing before shipping to
production.

## Files changed / added

- `package.json` — added `three`, `gsap` (dependencies), `@types/three`
  (devDependencies). Installed versions: `three@0.180.0`, `gsap@3.15.0`,
  `@types/three@0.180.4` (latest stable at implementation time, newer than
  design.md's suggested `^0.170.0`/`^3.12.5` — per the task brief's
  instruction to use the latest stable if needed).
- `lib/lego/rng.ts` — new. Deterministic `mulberry32` PRNG shared by
  `layout.ts`/`paths.ts` so they're seed-testable without `Math.random()`.
- `lib/lego/layout.ts` + `lib/lego/layout.test.ts` — new. Pure
  `generateFloatingPositions`, `generateCubePositions`,
  `selectFinalLockCorners`.
- `lib/lego/paths.ts` + `lib/lego/paths.test.ts` — new. Pure
  `buildCatmullRomPath`.
- `lib/lego/quality.ts` + `lib/lego/quality.test.ts` — new. Pure
  `getQualityTier`, `pickBrickCount`.
- `app/components/lego/bricks.ts` — new. Brick geometry (`RoundedBoxGeometry`
  + stud `CylinderGeometry`, merged via `BufferGeometryUtils`), material
  palette, `InstancedMesh` construction, piece assignment.
- `app/components/lego/scene.ts` — new. `Scene`/`camera`/`WebGLRenderer`/
  lights/`RoomEnvironment`/`OrbitControls` setup + `dispose()`.
- `app/components/lego/timeline.ts` — new. Per-piece runtime state, GSAP
  master timeline (floating → signal → assembly → Final Lock → wave →
  `OrbitControls` handoff), idle drift loop.
- `app/components/LegoHeroScene.tsx` — new. `"use client"` wrapper: quality
  tier + reduced-motion branching, mounts/unmounts the scene, drives the
  render loop, full cleanup.
- `app/components/LegoHeroSceneLoader.tsx` — new (**not** in design.md's
  file list — see "Deviations from design.md" below).
- `app/page.tsx` — removed `<AnimatedGrid />`, changed hero to
  `grid-cols-1 md:grid-cols-2`, text column unchanged internally, mounts
  `<LegoHeroSceneLoader />` on the right.
- `app/state-of-ai/page.tsx`, `app/components/AnimatedGrid.tsx` — **not
  touched**, confirmed via `git diff`/`grep` (task 9.4).
- `specs/project-hero-lego-animation/tasks.md` — checkboxes updated as work
  progressed.

## Deviations from design.md (small, documented per AGENTS.md)

1. **`next/dynamic({ ssr: false })` moved into its own Client Component
   (`LegoHeroSceneLoader.tsx`) instead of living directly in
   `app/page.tsx`.** This repo's Next.js version (16.2.12) rejects
   `ssr: false` inside a Server Component at build time:
   `` `ssr: false` is not allowed with `next/dynamic` in Server Components.
   Please move it into a Client Component. `` — confirmed against
   `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
   ("Importing Server Components" section), per the repo-wide instruction
   to check that doc before writing Next.js code since this version has
   breaking changes from training-data assumptions. `app/page.tsx` stays a
   plain Server Component; `LegoHeroSceneLoader.tsx` is a 25-line
   `"use client"` file whose only job is the `dynamic()` call + loading
   placeholder (identical placeholder to what design.md specified). No
   requirement is affected — R21 (no SSR evaluation of `three`/`gsap`) is
   still satisfied, confirmed by `npm run build` passing clean.

2. **Camera orbit tween scope.** design.md says the camera is "controlada
   por GSAP durante las Escenas 1-3" but its own pseudocode example only
   showed a tween for the `floating` label. Implemented literally as
   described in prose: a single `theta` tween spanning the full duration
   from `floating` through the end of `assembly` (computed once that total
   duration is known, inserted at position 0), rather than a 3s tween that
   would leave the camera static during `signal`/`assembly`. Camera holds
   its final orbit angle through Final Lock and the wave (deliberate: keeps
   attention on the corner pieces during the climax instead of continuing
   to pan).

3. **`controls.update()` gating.** Not in design.md explicitly, but a
   correctness fix found during self-review (see below): `controls.update()`
   is only called once `controls.enabled === true` (i.e. after the R14
   handoff), to avoid `OrbitControls`' damping math fighting the
   GSAP-driven `camera.position` writes during Escenas 1-3.

## Decisions where design.md left a range (concrete values chosen)

- **Cube grid `k` from `n`**: `k = max(3, ceil(cbrt(n)))`. For the full
  tier (`n` in [80,120]) this always yields `k=5` (125 cells); for the
  reduced tier (`n` in [30,40]) it always yields `k=4` (64 cells) — matches
  design.md's own "grilla de 4×4×4 a 5×5×5" framing exactly.
- **Trim-to-exactly-`n` criterion** (design.md explicitly left this to
  `implementer`): all 8 corners (`layer 5`) are **always** kept
  unconditionally (required by Final Lock in every tier, R11-R14 don't
  vary by tier). The remaining `n - 8` budget is distributed proportionally
  across the other 5 layers (`core`/`innerLayers`/`structural`/`faces`/
  `edges`) by pool size, using an evenly-spaced stride sample within each
  pool (not random) so the trim stays visually symmetric and deterministic.
  Interior cells (`extremeCount === 0`) are further split into 3 sub-layers
  by *rank* among cells sorted by Chebyshev distance-to-center (not by
  distinct distance *value* — at small `k` most interior cells share the
  same distance value, e.g. all 26 non-center cells of `k=5`'s interior are
  at distance 1, so value-based bucketing would collapse 2 of the 3
  sub-layers to zero; rank-based bucketing keeps all 3 non-empty). Verified
  by `layout.test.ts`.
- **Final Lock corner selection** ("diagonal alterna del cubo", left to
  `implementer`'s discretion on exact criterion): even-parity corners
  relative to the centroid (`(x>cx)+(y>cy)+(z>cz)` bit count is even) — a
  regular-tetrahedron subset of the 8 corners, i.e. no two of the 4 chosen
  corners share a cube edge. This is a combinatorial bijection over
  `{0,1}^3`, so it's provably always exactly 4 of the 8, in every tier —
  verified by `layout.test.ts`.
- **GSAP timing values within documented ranges**:
  - `FLOATING_DURATION = 3s`, `SIGNAL_DURATION = 2s` (both fixed by R5/R6).
  - Assembly stage durations (6 stages, decreasing per R10):
    `[2.2, 1.9, 1.6, 1.4, 1.3, 1.2]`s — within the 1.2-2.2s range.
  - Assembly stage pauses (growing per R10): `[0.3, 0.32, 0.36, 0.42, 0.5,
    0.55]`s — within the 0.3-0.6s range.
  - Final Lock: initial pause `0.65s` (0.5-0.8s range), pauses between
    corners 1-2 and 2-3: `0.4s` each (0.3-0.5s range), pause before corner
    4: `1.0s` (0.8-1.2s "longer pause" range), corner 4 alignment rotation:
    `0.8s` (matches design.md's "~0.8s" exactly), snap durations `0.15-0.2s`.
  - Wave: `0.6s` total duration, `0.25s` per-piece tween, amplitude `0.06`
    world units ("casi imperceptible").
  - Per-piece travel split: `80%` main leg (`power2.inOut`, progress
    0→0.92) / `20%` overshoot leg (`back.out(1.4)`, progress 0.92→1) — not
    specified as an exact ratio in design.md, chosen so the overshoot leg
    is short relative to the main travel.
- **R8's positional overshoot mechanism**: `back.out(1.4)` easing applied
  directly to the `progress` tween (0.92→1) does transiently push GSAP's
  interpolated `progress` value above `1` (that's how back-easing works on
  any numeric target) — sampling `CatmullRomCurve3.getPoint(t)` only
  accepts `t` in `[0,1]`, so a small bounded linear extrapolation along the
  curve's exit tangent (`sampleCurve()` in `timeline.ts`, capped at 0.5
  units of raw excess) is used for `t > 1` instead of clamping the
  overshoot away entirely (which would silently satisfy nothing).
- **R9's "snap"**: expressed as R9 itself allows ("cambio de easing/pequeño
  ajuste final de posición-escala") via a chained scale pulse
  (`1 → 1.08 → 1`, ~150ms) immediately after each piece's travel tween
  completes — kept as a genuinely separate tween from the R8 overshoot
  (which is positional), per design.md's "Cada 'snap' se implementa como un
  tween corto adicional encadenado al final del tween de vuelo".
- **Brick size mix** (design.md left the exact distribution to
  `implementer`): layer 2 ("structural") pieces are weighted 70% `2x4` /
  25% `2x2` / 5% `1x2` / 0% `plate1x1`; all other layers use 40% `2x2` /
  25% `1x2` / 20% `2x4` / 15% `plate1x1`.
- **Pure-logic module location**: `lib/lego/` (not `app/components/lego/`,
  the alternative design.md explicitly allowed) for `layout.ts`/`paths.ts`/
  `quality.ts` specifically so they're picked up by the existing
  `vitest.config.ts` include glob (`lib/**/*.test.ts`) without needing to
  touch that config — matches `docs/architecture.md`'s own framing of
  `lib/` as "where Vitest coverage starts". `bricks.ts`/`scene.ts`/
  `timeline.ts` (which import `three`/`gsap` directly) stayed under
  `app/components/lego/` as design.md specified.

## Bugs found and fixed during self-review (before this was ever run)

Since no browser was available to catch these interactively, a careful
line-by-line re-read of `timeline.ts`/`LegoHeroScene.tsx` surfaced three
real bugs, all fixed before finishing:

1. `assignment.cubePosition` is a plain `[number,number,number]` tuple, not
   a `THREE.Vector3` — code that called `.toArray()` on it (when building
   `finalLockKeys`) would have thrown at runtime. Fixed to just `.join(",")`
   directly (`tsc` did not catch this because both branches typed-checked
   fine independently at the time it was introduced — the bug was a
   confusion between two different `cubePosition` typed fields; caught by
   re-reading the file, not by the compiler).
2. The camera orbit tween only covered the 3s `floating` phase (see
   deviation #2 above) — extended to span Escenas 1-3.
3. `controls.update()` was being called every render frame regardless of
   `controls.enabled`, which would have fought the GSAP-driven
   `camera.position` writes during Escenas 1-3 (OrbitControls' damping
   physics has no awareness of externally-set camera positions). Fixed to
   only call `controls.update()` once `controls.enabled` (i.e. post-R14
   handoff) — see deviation #3.

Also hardened: the `attachAutoRotateStopper` pointerdown listener
originally used `{ once: true }`, which meant a stray click during the
~10-15s intro (before the R14 handoff) would consume the listener and leave
nothing to ever turn off `autoRotate` afterward. Changed to check
`controls.enabled` inside the handler and only remove itself once it
actually fires meaningfully.

## Requirement-by-requirement verification (R1-R21)

- **R1/R2 (layout, responsive)**: `app/page.tsx` uses
  `grid-cols-1 md:grid-cols-2` (same breakpoint as the rest of the repo).
  Verified via `curl http://localhost:3000/` — confirmed the
  `grid-cols-1 md:grid-cols-2 gap-10 items-center` class string is present
  in the rendered HTML, headline text unchanged, `LegoHeroSceneLoader`
  chunk referenced. Browser-based viewport-resize confirmation not
  possible in this environment (see limitation note above).
- **R3 (transparent canvas over dark theme)**: `scene.ts` — `new
  THREE.WebGLRenderer({ alpha: true })`, `renderer.setClearColor(0x000000,
  0)`, no `scene.background` assignment anywhere. Verified by code
  inspection (grep confirms no `scene.background =` in the codebase for
  this scene) and by `curl` confirming `AnimatedGrid` string count is `0`
  on the home page (old canvas removed) while the outer page `<div>` still
  carries `background: "var(--color-bg)"`.
- **R4 (80-120 non-colliding floating pieces)**: `lib/lego/layout.test.ts`
  — `generateFloatingPositions` tested for `n` in `{80,100,120}`, asserts
  no pair closer than `MIN_DIST` and all points inside `FLOAT_RADIUS`. All
  green (`npx vitest run lib/lego`).
- **R5 (idle rotation/drift, no collisions, camera orbit)**: `stepIdlePieces`
  in `timeline.ts` applies per-piece axis rotation + sinusoidal drift only
  while `phase === "idle"`; camera orbit tween covers the floating phase
  (and beyond, see deviation #2). No-collision guarantee inherited from R4
  (drift amplitude 0.15-0.35 units is small relative to `MIN_DIST=1.1`).
  Not visually re-confirmed in a browser (limitation noted above).
- **R6 (signal wave from center)**: `timeline.ts` computes
  `delay = distance/maxDistance * signalDuration` per piece, confirmed by
  code reading that pieces closer to origin get `start ≈ cursor` and
  farther pieces get `start ≈ cursor + SIGNAL_DURATION - tweenDuration`.
- **R7 (hierarchical assembly order)**: `generateCubePositions` classifies
  6 layers (Vitest-verified: exactly 8 corners always, all other layers
  non-empty for `n=100` in `layout.test.ts`); `timeline.ts`'s `stageGroups`
  processes them in `core → innerLayers → structural → faces → edges →
  cornersNormal` order with a strictly advancing `cursor`, so stages cannot
  overlap end-to-end (only the ≤0.3s internal stagger within a stage).
- **R8 (Catmull-Rom trajectory, ease-in/out, overshoot, gradual rotation)**:
  `buildCatmullRomPath` Vitest-verified (deterministic, offset from
  straight line > 0, degenerate `from===to` case documented);
  `updatePieceFromProgress` slerps `startQuaternion → endQuaternion` by
  clamped progress every frame; overshoot via `back.out(1.4)` + bounded
  curve extrapolation (see above).
- **R9 (magnetic snap)**: chained scale-pulse tween (`1→1.08→1`) after every
  piece's travel tween — `addPieceTravel` in `timeline.ts`.
- **R10 (pacing: pauses, accelerating rhythm)**: concrete duration/pause
  arrays documented above, strictly decreasing/increasing respectively.
- **R11/R12/R13 (Final Lock sequence + wave)**: `addFinalLockTravel`
  (corners 1-3) + `addFinalCornerTravel` (corner 4) implement the exact
  pause/fly/snap sequence from design.md with the concrete timings listed
  above; wave tweens `waveOffset` per piece with center-outward delay.
- **R14 (OrbitControls handoff, disabled before)**: `controls.enabled =
  false` set in `scene.ts` at construction; flipped to `true` only in the
  master timeline's `onComplete` (non-reduced-motion path) or immediately
  (reduced-motion path). `autoRotate` engages only after handoff and stops
  on the first real `pointerdown` post-handoff (see bug-fix above).
- **R15 (PBR material, no grime textures)**: `bricks.ts`'s
  `createMaterialPalette` — `MeshPhysicalMaterial` with `roughness`,
  `metalness: 0`, `clearcoat`, `clearcoatRoughness`, `envMapIntensity`; no
  `map`/texture assigned anywhere.
- **R16 (limited palette, blue/yellow minority)**: `COLOR_PALETTE` in
  `bricks.ts` — white 65% / light gray 20% / dark gray 5% / blue
  (`#2C40FF`, `var(--color-primary)`) 8% / yellow 2%.
- **R17 (perspective camera, smooth movement)**: `PerspectiveCamera(37,
  ...)` in `scene.ts`; all camera position writes go through `ease: "none"`
  (orbit, constant slow speed, no jump) or `OrbitControls`' own damped
  interpolation (`dampingFactor: 0.08`) — no instantaneous jumps anywhere
  in the code.
- **R18 (`prefers-reduced-motion`)**: `LegoHeroScene.tsx`'s `reducedMotion`
  branch calls `placePieceAtCube` for every piece (no tween, no timeline),
  sets a fixed camera position, `controls.enabled = true` immediately, and
  renders once + on `controls`' `"change"` event only (no continuous
  `requestAnimationFrame` loop). Verified by code reading — this branch is
  taken whenever `usePrefersReducedMotion()` returns `true`, same hook used
  unmodified from `app/state-of-ai/useReducedMotion.ts`.
- **R19 (mobile/low-end fallback)**: `getQualityTier`/`pickBrickCount`
  Vitest-verified (`quality.test.ts`, 10 tests covering the exact
  breakpoint/hardware/memory criteria from design.md); `scene.ts`/`bricks.ts`
  branch on `tier` for shadows/`clearcoat`/environment map/pixel ratio —
  same `timeline.ts` code runs regardless of tier (only piece count and
  material settings differ), so "same narrative, fewer pieces" holds by
  construction, not by a separate code path that could drift.
- **R20 (cleanup)**: `LegoHeroScene.tsx`'s effect cleanup calls
  `cleanupFns` (which includes `timeline.kill()` and the auto-rotate
  listener removal, or the `controls` `"change"` listener removal in
  reduced-motion mode), `resizeObserver.disconnect()`, and `disposeScene()`
  (from `scene.ts`, which disposes every geometry/material found via
  `scene.traverse`, disposes the environment texture, `controls.dispose()`,
  `renderer.dispose()`, and removes the canvas from the DOM). Verified by
  code reading; no browser memory profiler available to confirm empirically
  stable memory across repeated mount/unmount cycles (limitation noted
  above).
- **R21 (no SSR evaluation of Three.js)**: `npm run build` passes clean
  (`✓ Compiled successfully`, no `window is not defined` or similar
  errors); `LegoHeroSceneLoader.tsx` (`"use client"`) is the only file that
  calls `next/dynamic({ ssr: false })`, `app/page.tsx` stays a Server
  Component that never imports `three`/`gsap` directly.

## `npm run verify` result

```
> npm run lint    → clean, no errors
> npm run build   → ✓ Compiled successfully, all routes generated
> npm run test    → 7 test files, 67 tests, all passed
> check-sdd-state → ✓ single active feature: project-hero-lego-animation (in_progress)
                    ✓ all spec_ready+ features have requirements/design/tasks on disk
                    ✓ feature_list.json is consistent with docs/specs.md
```

Full `npm run verify` run green end-to-end at implementation time.

## Post-`done` bugfixes (2026-08-06 reapertura — real browser QA found genuine bugs)

The feature reached `done` on 2026-08-06, but that pass had **no browser/GPU
in the sandbox** (see "Environment limitation" above) — all visual
requirements were verified by code reading only. The user tried the real
implementation and reported "se ve mal la implementacion". A later session in
this same environment discovered Chromium + Playwright *are* actually
available here (see "How QA was done" below) and used them to diagnose real
bugs with real screenshots, which the original `done` pass could not do.
Two bugs were found; this section documents both fixes (the original
sections above are left untouched, per AGENTS.md, since they're what was
actually implemented in the first pass).

### Bug 1 — studs missing from every brick (fixed, commit `3758211`)

`buildBrickGeometry()` in `app/components/lego/bricks.ts`:
`THREE.BufferGeometryUtils.mergeGeometries()` failed on **every** brick
(confirmed via a real browser `console.error`:
`"All geometries must have compatible attributes; make sure index attribute
exists among all geometries, or in none of them"`). Root cause:
`RoundedBoxGeometry` builds itself non-indexed (`this.index = null`,
confirmed by reading its source in
`node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js`), while
the stud `CylinderGeometry`s are indexed by default — `mergeGeometries`
requires every input to agree on indexed/non-indexed, so the merge silently
failed and the `if (!merged) return body` fallback rendered every brick as a
bare box with no studs. Fixed by calling `.toNonIndexed()` on the body (if
indexed) and on every stud before merging. Verified visually: studs are
present on every brick in every screenshot below.

### Bug 2 — assembled cube looked like an overlapping pile, not a cube (this session's task)

**Root cause**: `buildFullGrid()` in `lib/lego/layout.ts` used a single
`CELL_UNIT = 1.3` for X/Y/Z grid spacing, entirely independent of the
footprint of the brick actually assigned to a cell. `pickBrickSize()` in
`app/components/lego/bricks.ts` picked footprints up to `2x4` (4 studs *
`STUD_UNIT` 0.8 = 3.2 world units wide) with no awareness of the 1.3-unit
cell spacing or of what size its neighbors got — large pieces routinely
invaded their neighbors' cells. Confirmed with a real "before" screenshot
(`shots/before_normal_60s.png` in this session's scratchpad, reproduced by
`git stash`-ing the fix and re-screenshotting against the exact same running
dev server): the assembled shape is a staircase-like mass of overlapping
bricks, not a cube, matching the bug report exactly.

**Approaches considered** (see `progress/current.md`'s reopening note for
the original framing of these two options):

1. Non-uniform per-axis cell spacing only (keep the existing weighted brick
   size mix) — rejected on its own: footprint variance is still per-cell and
   independent of neighbor spacing, so *some* fixed spacing would either
   overlap the largest pieces or leave huge, visually inconsistent gaps
   around the smallest ones (`plate1x1` is 0.8 wide vs. `2x4`'s 3.2) —
   directly contradicts the "gaps chicos y parejos" requirement, not just
   the "no overlap" one.
2. Fix the footprint used by every cube-assigned piece to one canonical
   brick size — chosen. Simpler, and the only option that can satisfy both
   "no overlap" *and* "small, even gaps" at once, since gap consistency
   requires every piece to occupy the same fraction of its cell.

**Fix implemented** (combines both directions in the end, once the
footprint was fixed to a single canonical size — see below for why both
were still necessary):

- `pickBrickSize()` (`app/components/lego/bricks.ts`) now always returns
  `"2x2"` for every piece, regardless of `layer`/`rng` (both parameters kept
  in the signature, `void`-referenced, so the call site and future
  restoration of variety don't require a signature change). This sacrifices
  the layer-2 "large `2x4` blocks for structural mass" visual variety
  design.md described, and the `1x2`/`2x4`/`plate1x1` mix in general — a
  documented, deliberate trade-off: a piece's geometry/size is fixed for its
  whole lifetime (it's the same `InstancedMesh` instance floating *and*
  assembled), so there is no way to have footprint variety during the
  floating cloud without also having it in the assembled cube, and footprint
  variety in the assembled cube is exactly what caused the bug.
- `lib/lego/layout.ts`'s `buildFullGrid()` now uses **two** spacing
  constants instead of one, because even with a single canonical brick size
  its footprint (1.6 world units, X/Z) and height (0.6, Y) are themselves
  different: `CELL_UNIT_XZ = 1.6 + 0.12 = 1.72` (horizontal spacing) and
  `CELL_UNIT_Y = 0.6 + 0.12 = 0.72` (vertical spacing) — `0.12` is the fixed
  gap. Reusing one constant for all 3 axes (even sized correctly for the
  footprint) would have left huge vertical gaps between rows relative to the
  small horizontal gaps between columns, which would have looked just as
  broken as the original bug, only vertically instead of via overlap. Both
  constants are commented as needing to stay numerically in sync with
  `BRICK_SIZE_DEFS["2x2"]`/`STUD_UNIT` in `bricks.ts` if that canonical size
  ever changes.

**New regression test**: `lib/lego/layout.test.ts` gained an
`it.each([80, 100, 120, 30, 40])` case ("never overlaps the axis-aligned
bounding box of any two assigned pieces") that computes the real AABB (using
the `2x2` half-extents) of every pair of cells `generateCubePositions()`
returns and asserts none overlap, for every `n` in both quality tiers. This
is what the acceptance criteria in `progress/current.md` asked for as
optional Vitest coverage on top of the mandatory screenshot check — it
guards the *logic* (would have caught the original bug), but it cannot by
itself prove what a human eye sees, hence the screenshots below.

**Real-browser QA (mandatory per the reopening instructions, not
optional)**: Chromium + Playwright *are* available in this sandbox — the
2026-08-06 `done` pass's "no browser available" conclusion was wrong, not a
permanent environment limitation (see "How QA was done" below for exact
mechanics, since this contradicts the note at the top of this file and is
worth a maintainer knowing next time).

- **Before** (`git stash` applied to revert this fix, same running dev
  server, same code otherwise): `shots/before_normal_30s.png`,
  `_45s.png`, `_60s.png` — reproduces the reported bug exactly: an
  overlapping, staircase-like mass, not a cube, consistent across all 3
  timestamps (already settled, not still animating).
- **After** (fix applied, `git stash pop`, same dev server, waited for
  Turbopack HMR to recompile): `shots/after_normal_30s.png`, `_45s.png`,
  `_60s.png` — a clearly recognizable cube-shaped grid of uniform bricks,
  small even gaps visible between every piece, studs visible on top of each
  piece, no overlap anywhere, all 3 timestamps visually identical (settled).
  `shots/after_desktop_canvas_60s.png` intended as a canvas-only crop but
  that particular run hit the shell tool's timeout mid-wait — the full-page
  `after_normal_*` shots above already give the required evidence, so this
  wasn't re-run.
- **`prefers-reduced-motion`** (same `generateCubePositions()`, places
  pieces directly in final position, no narrative):
  `shots/after_reduced-motion_8s.png`,
  `shots/after_reducedmotion_canvas_5s.png` (canvas-only crop) — same clean
  non-overlapping grid, confirms the fix benefits this code path too since
  it shares the same layout function.
- **Mobile/reduced tier** (390px viewport, triggers `getQualityTier() ===
  "reduced"`, fewer pieces, `k=4` grid, but the **same full narrative**, not
  a shortened one — R19): initial `shots/after_mobile_8s.png` used too
  short a wait (mistakenly assumed the reduced tier also meant a shorter
  narrative; R19 explicitly keeps the same narrative duration, just fewer
  pieces) and only shows scene mid-assembly. Corrected with canvas-only
  crops at `shots/after_mobile_canvas_25s.png` and
  `shots/after_mobile_canvas_35s.png` (both after the full ~25s+ narrative
  duration) — visually identical between the two timestamps (settled),
  clean non-overlapping grid with the same small gaps, confirming the
  mobile/reduced tier also assembles a clean cube, not just "fewer
  overlapping pieces".

All screenshots referenced above live under this session's scratchpad
directory (not committed — throwaway QA evidence, per the instruction to
keep them under the working directory as evidence rather than in the repo).

### How QA was done (correction to "Environment limitation" above)

Chromium + Playwright are preinstalled in this sandbox
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) but not as an npm dependency
of this project — imported by absolute path via CommonJS `require("/opt/
node22/lib/node_modules/playwright")` (ESM `import` does not resolve this
path). Chromium executable:
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, launched with
`args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl",
"--ignore-gpu-blocklist"]` for software-rendered WebGL. The site's
`PinGate` was bypassed for QA only by starting `npm run dev` with
process-local `PIN`/`JWT_SECRET` env vars (never written to `.env` or
committed) and having Playwright fill `input[type="password"]` + click
"Entrar". A stale `next-server` process from an earlier session in this same
long-lived sandbox was still holding port 3000 (`ps -ef` showed it, `ss`/
`lsof` oddly didn't — killed by explicit PID, not by relying on the `npm
run dev` wrapper's own `kill`) before a fresh dev server could bind port
3000 cleanly; worth remembering for the next session in this environment.

## Regression check (task 9.4)

`app/state-of-ai/page.tsx` still imports `AnimatedGrid` from
`../components/AnimatedGrid` and renders
`<AnimatedGrid variant="background" intensity={0.2} />` unchanged (line
226). `app/components/AnimatedGrid.tsx` itself was not modified (confirmed
via `git diff` showing no changes to that file). `curl` against
`/state-of-ai` while running the dev server returned the page successfully
(200).
