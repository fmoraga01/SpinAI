# Implementation — changelog-empty-state-animation

## Files changed

- `app/components/ChangeLog.tsx`
  - Imported `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
    and called it once at the top of `ChangeLog()`.
  - Added `animation: prefersReducedMotion ? undefined : "changelogEmptyIn 320ms ease-in-out"`
    to the outer container `<div>` of the `logs.length === 0` branch.
  - Added an inline `<style>` block inside that same branch (sibling to the
    icon tile and text block, matching the existing `spin` keyframe pattern
    in the loading branch a few lines above) defining:
    `@keyframes changelogEmptyIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`
- `specs/changelog-empty-state-animation/tasks.md` — checked off tasks 1-6.

No other files touched. No new dependencies, no schema/API changes, no
deviation from `design.md` — implementation matches the design 1:1.

## Environment note

This environment has no real browser / GUI to interact with (no `run` skill
or similar was available for this task — checked `.claude/skills/`, only
`design-check` exists). Manual QA below is therefore **code-path reasoning**,
not live visual/interactive verification, except where noted (dev server
route reachability was checked with `curl`). This is flagged explicitly per
task instructions rather than claimed as visual verification.

## Requirement traceability

- **R1** (one-time entrance animation on empty-state mount, no looping) —
  Manual QA / code-path reasoning: the `animation` inline style is set on
  the outer container of the `logs.length === 0` branch, using
  `animation: changelogEmptyIn 320ms ease-in-out` with no
  `animation-iteration-count`, which defaults to `1` (CSS spec default) — it
  cannot loop. The animation fires whenever this branch mounts/renders (React
  creates the DOM node + inline `<style>` fresh on each mount), giving a
  one-time play per mount. Not visually confirmed in a live browser (no
  browser tool available in this environment) — verified by reading the
  produced JSX/CSS.
- **R2** (200-500ms duration, linear/ease-in-out, no bounce/spring) — Code
  inspection: `animation: changelogEmptyIn 320ms ease-in-out` — 320ms is
  within the 200-500ms range, and `ease-in-out` is the CSS standard easing
  keyword (not a spring/bounce curve, no third-party easing function used).
- **R3** (no legibility delay / no staggered hidden step for heading or
  description) — Code inspection: there is no `animation-delay` anywhere in
  the rule or the inline style. The `animation` property is applied once, to
  the single outer `<div>` that wraps both the icon tile and the text block
  — the heading and description `<p>` elements are not separately animated
  and have no `opacity`/`animation` styles of their own, so they inherit the
  parent's opacity trajectory as part of one continuous fade from the first
  frame (`from { opacity: 0 }` at `t=0`, not held at 0 for any window) —
  text is legible-in-progress from the same instant the container is, never
  fully hidden mid-animation.
- **R4** (no motion when `prefers-reduced-motion: reduce`, including on
  first paint) — Code inspection: `usePrefersReducedMotion()` returns `true`
  as its `useSyncExternalStore` SSR snapshot (`() => true // en SSR, sin
  animación`, unchanged in `app/state-of-ai/useReducedMotion.ts`), so on the
  server-rendered/first-paint HTML the ternary
  `prefersReducedMotion ? undefined : "changelogEmptyIn 320ms ease-in-out"`
  evaluates to `undefined`, meaning no `animation` inline style is emitted
  at all in that case — the element renders directly at its static final
  layout (no `from`-keyframe opacity/transform ever applied), matching "no
  motion, final position and full opacity immediately". Once hydrated
  client-side, `useSyncExternalStore` re-reads
  `window.matchMedia("(prefers-reduced-motion: reduce)").matches` and keeps
  the animation off for the lifetime of that mount if the OS setting is on.
  Not manually toggled in a live OS/browser (no browser tool available in
  this environment) — verified by reading the hook's implementation and the
  conditional in `ChangeLog.tsx`.
- **R5** (only existing tokens/colors, no new colors introduced) — Code
  inspection / diff review: the only change to styling is the `animation`
  property (a CSS animation reference, not a color/radius/spacing value) and
  the `<style>` block's `@keyframes` (which only uses `opacity` and
  `transform`, no color/radius values at all). No new hex color, `var(--...)`
  token, radius, or spacing was introduced — confirmed by diffing
  `app/components/ChangeLog.tsx` against `origin/main` and checking every
  changed line.
- **R6** (animation replays on remount, not gated by a one-time flag) — Code
  inspection: the animation is driven purely by the CSS `animation` inline
  style being present on the JSX returned every time this branch renders on
  mount — there is no `useState`/`useRef`/`sessionStorage` flag anywhere in
  `ChangeLog.tsx` suppressing it after a first play. Since `ChangeLog` fully
  unmounts/remounts when its parent (`Drawer.tsx`) closes/reopens it (fresh
  `useState` initial values, a fresh `useEffect` fetch), the empty-state
  branch's `<style>` + `animation` are re-created from scratch on every
  mount, so the animation replays each time. Not manually exercised via a
  live navigate-away-and-back interaction (no browser tool available in
  this environment) — verified by reading the component's mount lifecycle
  and lack of any persistence mechanism.

## design-check skill result

Ran the check described in `.claude/skills/design-check/SKILL.md` against
`git diff origin/main -- app/components/'*.tsx'`, which returns exactly the
diff for `app/components/ChangeLog.tsx` (only file under
`app/components/` changed by this feature). Findings:

- No hardcoded hex color introduced (the diff adds no color values at all —
  only `animation` and the `@keyframes` block, which use `opacity`/
  `transform`, not color).
- No hardcoded `border-radius` introduced.
- No `fontSize` changes.
- No custom `boxShadow` introduced.

**No findings** — the change is fully consistent with existing design
tokens (in fact, it introduces no new visual/token surface at all beyond a
motion property).

## Lint / build

- `npm install` — ran first, `node_modules` was not present in this
  environment (383 packages installed, pre-existing unrelated npm audit
  warnings only).
- `npm run lint` — passes, no output/errors.
- `npm run build` — passes (`next build`, Turbopack). Pre-existing warning
  ("Failed to find font override values for font `Bitcount Grid Double`")
  is unrelated to this change and present independent of it.
- `npm run dev` — started successfully; confirmed `http://localhost:3000/`
  returns HTTP 200 via `curl`. Did not find `changelogEmptyIn` in the raw
  SSR HTML for `/`, which is expected: `ChangeLog` renders inside
  `Drawer.tsx` and its own `loading` state (spinner branch) is what's
  present on first paint before the client-side `loadLogs()` fetch
  resolves — the empty-state branch (and its keyframes) only exists in the
  DOM after that client-side fetch completes with zero entries, which
  `curl` against the initial HTML can't observe. This is consistent with
  the design (R4's SSR guarantee is about *if* the empty-state branch were
  part of first paint, motion would still be off then too — not that the
  empty-state branch itself is always in the SSR output).

## Deviations from spec

None. Implementation follows `design.md` and `tasks.md` exactly as written.
