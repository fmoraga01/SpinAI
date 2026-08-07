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
  `shots/after_reducedmotion_canvas_5s.png` (canvas-only crop) — no
  overlap anywhere (that is what this pass's fix and regression test
  actually targeted, and it holds up). **Correction (2026-08-06, 3rd
  reopen — see the dated "Bug 3" section below):** the "same clean
  non-overlapping grid" characterization here was incomplete/misleading —
  these same screenshots, re-examined during the 3rd reopen, actually show
  a cube fragmented into two separated halves with loose corner pieces,
  because `k×k×k` grid trimming (a *different* bug from the overlap one
  fixed in this section) left ~53% of the grid empty at low `n`. The
  no-overlap claim above is still correct; the implicit "so it looks like a
  solid cube" conclusion was not — non-overlap and full-ness are separate
  properties, and this file previously conflated them. See "Bug 3" below
  for the actual fix and its own screenshot evidence.
- **Mobile/reduced tier** (390px viewport, triggers `getQualityTier() ===
  "reduced"`, fewer pieces, `k=4` grid, but the **same full narrative**, not
  a shortened one — R19): initial `shots/after_mobile_8s.png` used too
  short a wait (mistakenly assumed the reduced tier also meant a shorter
  narrative; R19 explicitly keeps the same narrative duration, just fewer
  pieces) and only shows scene mid-assembly. Corrected with canvas-only
  crops at `shots/after_mobile_canvas_25s.png` and
  `shots/after_mobile_canvas_35s.png` (both after the full ~25s+ narrative
  duration) — visually identical between the two timestamps (settled), no
  overlap, same small gaps. **Correction (2026-08-06, 3rd reopen):** same
  caveat as above — no-overlap was correctly confirmed, but at this low
  `n` the same underlying grid-fill bug (see "Bug 3" below) meant the
  shape was not actually a solid, fully-read cube. Superseded by the "Bug
  3" fix and its own verification below; not re-verified again here since
  the underlying `generateCubePositions()` fix is viewport-independent
  (confirmed instead via the sandbox's naturally-triggered `reduced` tier
  at desktop width, see "Bug 3").

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

## Bug 3 (2026-08-06, 3rd reopen) — cube fragmented/incomplete at low `n`

**Symptom** (found by `reviewer` during the 2nd-reopen review pass, after
bugs 1 and 2 above were already fixed and verified — see
`progress/review_project-hero-lego-animation.md`): with bugs 1 and 2 fixed,
pieces no longer overlapped, but the assembled shape still didn't read as a
solid cube for low `n` (worst case: `n=30`, the minimum of the `reduced`
tier's `[30, 40]` range) — it looked like two separated clusters with loose
corner pieces, most visible on the `prefers-reduced-motion` path (fixed,
frontal camera, no occlusion) and easy to miss on the full desktop
narrative (the `autoRotate` three-quarter camera angle occludes most of the
gaps with front-row pieces).

**Root cause**: `generateCubePositions()` forced a perfectly cubic grid,
`k = max(3, ceil(cbrt(n)))`, then trimmed it down to `n` cells. For most `n`
there is no `k` whose cube lands close to `n` — e.g. `n=30`: `k=3` → 27
cells (too few), `k=4` → 64 cells, of which only 30 (46.9%) end up filled
after trimming. Regardless of how smart the trim's cell-selection criterion
is (bug 2's fix didn't touch this), that little raw material can't produce
a shape that reads as solid.

**Fix**: added `chooseGridDims(n)` (`lib/lego/layout.ts`), which replaces
the single `k` with three independent integer dimensions `[kx, ky, kz]`
(each `>= 3`). It searches a small window of triples around
`ceil(cbrt(n))` for the one whose product is `>= n` with the least wasted
cells (`product - n`), breaking ties by the smallest spread between the
largest and smallest dimension (keeps the box reading as roughly cubic, not
an obviously elongated slab). `buildFullGrid()` now takes `(kx, ky, kz)`
and computes per-axis centers/extents instead of a single shared `k`/
`center`; `generateCubePositions()`'s interior-layer ranking (`core`/
`innerLayers`/`structural`) now uses per-axis Chebyshev distance to
`(centerX, centerY, centerZ)` instead of a single scalar center — this is
no longer perfectly rotationally symmetric when the box isn't a literal
cube, but it only needs to produce a reasonable, deterministic layering for
the assembly narrative, not an exact one. The 8 corners are still exactly
the box's 8 corners (`extremeCount === 3` on all 3 axes), so
`selectFinalLockCorners()` needed no changes.

Fill ratio before/after for every tested `n` (both quality tiers):

| n   | before (`k³` grid) | after (`kx×ky×kz`) | fill before | fill after |
|-----|---------------------|----------------------|-------------|------------|
| 30  | 4×4×4=64            | 3×3×4=36              | 46.9%       | 83.3%      |
| 35  | 4×4×4=64            | 3×3×4=36              | 54.7%       | 97.2%      |
| 40  | 4×4×4=64            | 3×3×5=45              | 62.5%       | 88.9%      |
| 80  | 5×5×5=125           | 4×4×5=80               | 64.0%       | 100.0%     |
| 100 | 5×5×5=125           | 4×5×5=100              | 80.0%       | 100.0%     |
| 120 | 5×5×5=125           | 4×5×6=120              | 96.0%       | 100.0%     |

**New Vitest coverage** (`lib/lego/layout.test.ts`, `describe("chooseGridDims")`):
for `n` in `[30, 35, 40, 80, 100, 120]` — asserts fill ratio `> 0.8`
(regression guard so a future session can't silently reintroduce the ~47%
worst case), every dimension `>= 3`, and `max(dims) - min(dims) <= 2` (box
stays roughly cubic, not an obviously elongated slab). All existing
`generateCubePositions`/`selectFinalLockCorners` tests (corner count,
no-duplicate-positions, no-AABB-overlap, corner symmetry, Final Lock corner
selection) still pass unmodified — a rectangular (not just cubic) box's 8
corners are still all equidistant from its centroid, so the "symmetric"
corner test needed no changes. `npm run verify` (lint + build + vitest +
`check-sdd-state`) is green.

**Real-browser QA** (Chromium + Playwright, same mechanics as "How QA was
done" above — this time with an explicit fix for a Playwright login race
this session ran into: `PinGate` renders nothing until its
`/api/auth/check` fetch resolves, so a short fixed `waitForTimeout` after
`page.goto()` before locating the PIN input was flaky/racy; switched to
explicitly `waitFor`-ing the PIN input or the hero heading before
proceeding). To deterministically hit the worst-case `n=30` instead of
relying on the `[30, 40]` random range, `page.addInitScript("Math.random =
() => 0")` was registered (which forces `pickBrickCount()` to return the
tier minimum) — but only *after* logging in and *before* a `page.reload()`,
since registering it before the first navigation silently breaks the
PIN-gate's click handler (confirmed: with the override active from the
first load, the `Entrar` click never fires the `POST /api/auth`; harmless
for this feature's own code, just a quirk of this QA harness worth a
maintainer knowing).

- **Primary case — `prefers-reduced-motion`, desktop viewport, `n=30`
  (worst case, forced)**: `shots/fix3_A_reducedmotion_n30_8s_canvas.png` and
  `_14s_canvas.png` (canvas-only crops), plus the `_full.png` full-page
  versions — a clearly solid, dense, cube-ish block, no split-in-half
  cluster, no loose floating corner pieces. Pixel-identical between 8s and
  14s (this path uses a static camera and places pieces directly in their
  final position, so it should be and is fully settled by 8s). This is the
  exact path that exposed the bug and the most important of the 3 required
  checks — confirmed fixed.
- **Low-`n` edge of the `reduced` tier, normal motion (full narrative),
  `n=30` forced, desktop viewport**: `shots/fix3_B_normal_n30_35s_canvas.png`
  and `_50s_canvas.png` — solid, dense box from the `autoRotate`
  three-quarter angle, no visible holes, consistent between the two
  timestamps (camera keeps auto-rotating post-settle per R14, so frames
  aren't pixel-identical, but the assembled shape itself is the same solid
  block at both times).
- **Full narrative, desktop viewport, natural (unforced) `n`**: this
  sandbox's `navigator.hardwareConcurrency=4` triggers `getQualityTier() ===
  "reduced"` even at 1440px width (per `lib/lego/quality.ts`), so this is
  still exercising the `reduced` tier's `n` range, just not forced to the
  exact minimum — `shots/fix3_C_desktop_natural_35s_canvas.png` and
  `_50s_canvas.png` (+ `_full.png`) — same solid, gapless-looking result.
  Confirms the fix didn't regress the tier/`n` this sandbox naturally lands
  on.

All 3 required verification routes from the reopening instructions were
checked with real screenshots; all show a solid, recognizable cube/box, not
a fragmented cluster. Screenshots live under this session's scratchpad
(not committed, same convention as the rest of this file).

**Files changed this pass**: `lib/lego/layout.ts` (`chooseGridDims()` new,
`buildFullGrid()` and `generateCubePositions()` updated to use 3
dimensions instead of 1), `lib/lego/layout.test.ts` (new
`describe("chooseGridDims")` block).

**Not touched, per the reopening instructions**: the bug 1/bug 2 fixes
(commits `3758211`/`f3a9c47`), the all-`"2x2"` brick-size trade-off (still
pending a separate user decision, unrelated to this bug).

## Bug 4 (2026-08-06, 4th reopen) — `chooseGridDims()` tie-break by spread almost never fired

**Symptom** (found by `reviewer` during the 3rd-reopen review pass, after
bug 3's fix above was confirmed to solve the `n=30`/`prefers-reduced-motion`
case): for `n=81` (tier `full`, range `[80,120]`), `chooseGridDims(81)`
returned `[3,4,7]` (spread=4) — an obviously elongated slab, not a
reasonably cubic box. The reviewer verified by brute force that this
degenerate case hit 22 of the 41 integer `n` values in `[80,120]`.

**Root cause**: the 3rd-reopen fix's `chooseGridDims()` used spread
(`max(dims) - min(dims)`) only as a **tie-break** — compared only when
`waste` (`product - n`) matched *exactly* between two candidate triples.
That almost never happens for a real `n` (waste rarely lands on the same
integer for two different triples), so the tie-break essentially never
fired and the function always returned the single globally
least-wasteful triple, regardless of how elongated it was.

**Fix**: replaced the tie-break with a hard filter + cap-relaxation loop
(`chooseGridDimsWithCap(n, maxSpread)` + `chooseGridDims(n)` trying
`maxSpread` from 1 to 5): candidates whose spread exceeds the current cap
are discarded outright (not compared), and waste is minimized only among
the triples that pass the cap. The cap is relaxed (1 -> 2 -> ... -> 5) only
if no triple satisfies the current one. This was prototyped and verified by
an exhaustive brute-force run (see the dated `progress/current.md` section
that specified this fix) *before* transcribing it here — the algorithm was
implemented as designed, no changes were needed during transcription beyond
matching this file's naming/comment conventions.

**New Vitest coverage** (`lib/lego/layout.test.ts`,
`describe("chooseGridDims")`): the previous regression test only sampled 6
`n` values (`30, 35, 40, 80, 100, 120`), which happened to dodge the bug —
exactly why it slipped through the 3rd-reopen review. Replaced the
"roughly cubic" tie-break-window test with two tests that iterate **every**
integer `n` in each quality tier's full range (`for (let n = 30; n <= 40;
n++)` and `for (let n = 80; n <= 120; n++)`), asserting `spread <= 1` and
`fill >= 0.75` for each — the sampled `fill >= 0.8` test and the `dims >= 3`
test were kept as-is (still valid, cap-relaxation search still guarantees
both). All 35 tests in the file pass, including the two new full-range
ones. `npm run verify` (lint + build + vitest + `check-sdd-state`) is
green.

**Real-browser QA** (Chromium + Playwright, same mechanics as previous
passes — `PIN`/`JWT_SECRET` env vars local to the `npm run dev` process
only, `Math.random` override registered only *after* logging in via the
PIN gate to avoid breaking its click handler, per the note in the "Bug 3"
section above). To deterministically hit tier `full` with `n=81`:
`navigator.hardwareConcurrency`/`navigator.deviceMemory` overridden to 16
via `page.addInitScript` (sandbox's real `hardwareConcurrency=4` would
otherwise force tier `reduced` even at desktop width, per
`lib/lego/quality.ts`), plus `Math.random = () => 0.025` (so
`pickBrickCount("full")` = `round(80 + 0.025*40)` = `81` exactly). Verified
via `page.evaluate` that the forced values actually took (`hardwareConcurrency:
16, deviceMemory: 16, innerWidth: 1440`).

- At the default camera (`CAMERA_RADIUS=11` in both `scene.ts` and
  `timeline.ts` — note there are two separate copies of this constant, one
  for the initial static setup and one used every frame during the
  autoRotate orbit tween in `timeline.ts`; both would need to move together
  for any future camera change), the assembled `n=81` box reads as a
  solid, dense, gapless arrangement with no overlapping pieces — same
  close-up "product photography" framing as every other confirmed pass, no
  regression there.
- To get an unambiguous read on the box's actual proportions (the default
  framing is close enough that the full silhouette isn't visible), both
  `CAMERA_RADIUS`/`CAMERA_HEIGHT` copies (`scene.ts` and `timeline.ts`) were
  **temporarily** bumped to `22`/`6` for one extra screenshot pass only,
  then immediately reverted (confirmed via `git diff --stat` showing only
  `lib/lego/layout.ts`/`layout.test.ts` changed afterward) — this was a
  throwaway QA-only edit, never committed. At the pulled-back distance the
  `n=81` box is unambiguously `[4,5,5]`: a solid rectangular block, clearly
  not the `[3,4,7]` elongated slab the old algorithm produced. (Grid-axis
  spread of 1 doesn't translate to identical *world-space* dimensions on
  every axis — X/Z share `CELL_UNIT_XZ` while Y uses the smaller
  `CELL_UNIT_Y`, a pre-existing, already-accepted asymmetry from the bug 3
  fix, unrelated to this bug — but the box no longer reads as an elongated
  slab, which was the actual complaint.)
- Quick regression pass at natural (unforced) settings, full narrative
  (10s/35s/50s): solid, colored, gapless box, consistent with every prior
  confirmed pass — no regression from this change.

Screenshots (not committed, same scratchpad convention as prior passes):
`n81_full_{8s,40s,55s}_{full,canvas}.png` (default camera, tier `full`
forced), a second `n81_full_*` set at the temporarily pulled-back camera,
and `regression_natural_{10s,35s,50s}_full.png`.

**Files changed this pass**: `lib/lego/layout.ts`
(`chooseGridDimsWithCap()` new, `chooseGridDims()` rewritten to use it with
cap relaxation 1-5), `lib/lego/layout.test.ts` (`describe("chooseGridDims")`
tie-break-window test replaced with full-integer-range tests for both
tiers). `app/components/lego/scene.ts` and `app/components/lego/timeline.ts`
were touched only transiently for QA screenshots and are unchanged in the
final diff.

**Not touched**: bugs 1/2/3 fixes (commits `3758211`/`f3a9c47`/`0542a9c`),
the all-`"2x2"` brick-size trade-off (still pending separate user
decision).

## Bug 5 (2026-08-06, 5th reopen) — camera never fit the scene content ("giant zoom" reported by the user in their own real browser)

The user tested the feature in their own real browser (not this sandbox)
after the 4th-pass approval and sent a screenshot: LEGO pieces filling and
overflowing the entire canvas, an extreme close-up rather than the
well-composed floating cloud / assembled cube seen in every prior QA pass
in this sandbox.

**Root cause, quantified before touching any code**: `app/components/lego/scene.ts`
had `CAMERA_RADIUS = 11`, `CAMERA_HEIGHT = 3.4`, camera FOV `37`. At that
distance (~11.5 units from origin), the frustum can only comfortably frame
an object up to ~3.65 units of radius. But:
- The floating cloud (`FLOAT_RADIUS = 6` in `lib/lego/layout.ts`, plus a
  brick-size margin) has an effective bounding radius of **~7.17** units —
  almost double what fits.
- The worst-case assembled cube across the `full` tier's `n` range (e.g.
  `n=101` → dims `[5,5,5]`) has a bounding radius of **~6.24** — also
  bigger than what fits.

**Why 4 prior review passes never caught this**: this sandbox reports
`navigator.hardwareConcurrency = 4`, which trips `getQualityTier()` into
the smaller `reduced` tier (fewer pieces, physically smaller assembled
box) even at desktop viewport widths — every default (non-forced) QA run
in this feature's history landed in that easier case. The one time `full`
tier was checked with real numbers (bug 4's `n=81` case), the camera was
manually, temporarily pulled back "to see the full silhouette" — that was
direct evidence the default camera already failed there, but it got
treated as a QA convenience rather than recognized as the bug itself. A
real user's browser, with a normal core count, lands in `full` tier by
default — the exact worst case that was never verified end-to-end with
the *actual* default camera.

**Fix**: `CAMERA_RADIUS` 11 → **26**, `CAMERA_HEIGHT` 3.4 → **8** (same
height/radius ratio preserved), computed to frame the larger of the two
bounding radii above (~7.17) with ~15% margin — verified to comfortably
fit an object up to radius ~8.64 at the new distance. FOV was deliberately
left unchanged (37°): widening the FOV instead of pulling the camera back
would have introduced wide-angle-lens distortion at the edges, the
opposite of the brief's "product photography lens feeling"; pulling the
camera back compresses perspective, which is the correct look.
`controls.minDistance`/`controls.maxDistance` in `scene.ts` were rescaled
from `6`/`18` to `14`/`42` to keep the manual post-narrative zoom range
sensible around the new default distance (~27.2).

**Consolidated 3 independent copies of the same constant** — this
duplication is very likely *why* the bug went unnoticed as long as it did
(one QA pass touching one copy doesn't fix or even reveal the other two):
`CAMERA_RADIUS`/`CAMERA_HEIGHT` used to be defined separately in
`scene.ts` and in `timeline.ts` (used by the orbit tween), and the
`prefers-reduced-motion` static camera position in `LegoHeroScene.tsx` had
the same numbers hardcoded as literals (`camera.position.set(0, 3.4, 11)`)
— a third independent copy. Now `scene.ts` exports both constants and
`timeline.ts`/`LegoHeroScene.tsx` both import from there; grep-confirmed
no stray `11`/`3.4` literals remain.

**Verification — real browser, two independent sessions** (this session's
fix, then a separate `reviewer` pass that ran its own script rather than
trusting these screenshots): both confirmed, across tier `reduced`
(natural default in this sandbox), tier `full` (forced via
`navigator.hardwareConcurrency`/`deviceMemory` overrides — the real-world
case), and `prefers-reduced-motion`, that the floating cloud and the
assembled cube are both fully contained within the canvas with visible
margin, no clipping. `reviewer` additionally drag-tested and wheel-zoomed
`OrbitControls` post-narrative in tier `full` and found smooth,
un-stuck behavior across the new `minDistance`/`maxDistance` range.
Screenshots from this session's fix (not committed, scratchpad-only):
`camfix_A_natural_*.png`, `camfix_B_full_*.png`, `camfix_reducedmotion.png`.

**Files changed this pass**: `app/components/lego/scene.ts`,
`app/components/lego/timeline.ts`, `app/components/LegoHeroScene.tsx`.
`lib/lego/layout.ts` untouched — bugs 1-4 unaffected.

**`npm run verify`**: green (lint, build, 86 vitest tests unchanged,
check-sdd-state) — this was a camera/render constant change, no new pure
logic in `lib/lego/*` to add tests for.

Reviewed and approved independently by `reviewer`, 5th pass (2026-08-06)
— see `progress/review_project-hero-lego-animation.md`, fifth dated
section, commit `1701b46`.

## Bug 6 (2026-08-06, 6th reopen) — canvas never fit its container on retina/HiDPI displays

The bug 5 camera fix (previous section) was real and necessary but not
sufficient: the user tested it in their own real browser and sent a
second screenshot — "la animacion se sigue viendo fuera de su canvas, con
una especie de zoom" — showing the assembled cube visibly clipped by the
bottom/right edge of the canvas's own bordered container, on
`spinai-dev.vercel.app`.

**Root cause, measured before touching code**: `app/components/lego/scene.ts`'s
`resize()` called `renderer.setSize(width, height, false)`. Three.js's
third `setSize` argument, `updateStyle`, controls whether the canvas
element's CSS `style.width`/`style.height` get set to match the intended
display size — with `false`, they never do. Only the canvas's `width`/
`height` HTML *attributes* get set (to `cssSize * pixelRatio`, the
drawing-buffer resolution needed for sharp rendering on high-density
screens). With no other CSS rule sizing the canvas (confirmed via grep —
none exists; it's appended directly via `container.appendChild`), a
`<canvas>` with no explicit CSS size defaults to its own `width`/`height`
attribute values as its CSS box size. On any screen with
`devicePixelRatio > 1` (any retina/HiDPI display — likely the user's
machine, and common in general), this made the canvas render literally
larger than its DOM container.

Reproduced in this sandbox by simulating a retina display
(`deviceScaleFactor: 2` in Playwright's browser context) — something no
prior QA pass on this feature had tried; every previous pass ran at the
Chromium default of `deviceScaleFactor: 1`, where this bug is invisible.
Measured directly via `canvas.getBoundingClientRect()` vs.
`container.getBoundingClientRect()`: a 532×532 CSS px container held a
795×795 CSS px canvas — real, measured overflow, not a screenshot
impression.

**Fix**: `renderer.setSize(width, height, false)` → `renderer.setSize(width, height, true)`,
one line, in `resize()`. With `updateStyle: true`, Three.js explicitly
sets `canvas.style.width`/`height` to the intended CSS size regardless of
`devicePixelRatio`, while the drawing-buffer resolution (`canvas.width`/
`height` attributes, driven by `renderer.setPixelRatio()`) still scales up
for retina sharpness. Verified after the fix, same retina scenario: canvas
530×530 CSS px inside a 532×532 container (the 2px difference is the
container's own 1px border) — `canvas.style.width`/`height` now literally
report `"530px"`.

**Verification — real browser, two independent sessions** (this session's
fix, then a separate `reviewer` pass with its own script and its own
`getBoundingClientRect()` measurements, not trusting these screenshots):
both confirmed, with `deviceScaleFactor: 2` simulated, that the floating
cloud and the assembled cube stay fully inside the container's border with
visible margin on all sides, on this sandbox's natural `reduced` tier.
Forcing `full` tier simultaneously with simulated retina was investigated
and *deliberately not* used as a verification scenario: that specific
combination (100+ pieces + shadows + environment map, at ~2x render
resolution, on this sandbox's software-only Swiftshader rendering with no
real GPU) causes the assembly narrative to stall for well over 120
real-world seconds — traced to GSAP's default lag-smoothing capping the
timeline's effective progress during sustained per-frame render times far
above what any GPU-accelerated browser would ever produce. Confirmed this
is a sandbox-only rendering-performance artifact, not a functional bug: the
same retina simulation *without* forcing `full` tier (i.e., normal `full`-tier
weight is only ever hit on a real user's GPU-accelerated browser, not here)
completes the full narrative normally in ~55s. The user's own screenshot
independently corroborates this — it showed correctly-structured,
grid-aligned assembled bricks (not a stalled/shapeless cluster), confirming
their real browser's narrative was progressing normally; the only defect
visible there was the canvas-overflow this fix addresses.

**Targeted high-DPI audit** (per reviewer's request, given this bug hid for
6 rounds specifically because no one had tested retina before): the only
other `devicePixelRatio` usage in this feature is
`renderer.setPixelRatio(...)` in `scene.ts`, which is correct (it
intentionally scales the drawing-buffer resolution, not the CSS size).
`LegoHeroScene.tsx`'s `ResizeObserver` reads `container.clientWidth`/
`clientHeight`, which are already CSS pixels with no DPR assumption baked
in. No other canvas-sizing code exists anywhere else in
`app/components/lego/*`. Reviewer confirmed no other implicit
`devicePixelRatio === 1` assumption remains.

**Tests**: no new pure logic (`lib/lego/*` untouched) — `npm run verify`
(lint + build + 86 vitest tests unchanged + check-sdd-state) green, run
independently by both this session and `reviewer`.

**Files changed this pass**: `app/components/lego/scene.ts` (one line +
explanatory comment). Nothing from bugs 1-5 touched.

Reviewed and approved independently by `reviewer`, 6th pass (2026-08-06)
— see `progress/review_project-hero-lego-animation.md`, sixth dated
section, commit `3b67563`.
