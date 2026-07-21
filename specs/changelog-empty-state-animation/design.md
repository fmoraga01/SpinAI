# Design — changelog-empty-state-animation

## Approach

Add a single CSS `@keyframes` entrance animation to the existing empty-state
`<div>` in `app/components/ChangeLog.tsx` (the `logs.length === 0` branch,
currently lines ~76–97), following the same inline-`<style>` pattern already
used by the loading state's `spin` keyframe a few lines above it in the same
file — this keeps the file internally consistent rather than introducing a
second way of doing motion.

**Keyframe**, applied to the outer empty-state container:

```css
@keyframes changelogEmptyIn {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

- **Duration**: `320ms` — mid-point of the 200–500ms range cited in the
  research, reads as smooth without feeling slow (NN/g, Web Animation Best
  Practices).
- **Easing**: `ease-in-out` (CSS standard curve) — suits a fade/translate
  combo per NN/g and Material's duration/easing guidance; explicitly avoids
  bounce/spring curves, which would compete with the "subtle" ask.
- **Translate distance**: `6px` and **scale**: `0.98→1` — small enough that
  it reads as "settling into place," not a slide-in; keeps the icon tile and
  text block moving together as one unit so nothing shifts relative to
  anything else.
- **No opacity=0 hold on text**: `opacity` animates on the whole container
  from the first frame, so heading/description are already in their DOM
  position and start becoming legible immediately — satisfies R3 (no text
  legibility delay). There is no `animation-delay`.
- `animation-fill-mode: backwards` is not needed since the animation starts
  at `t=0` with no delay; the container's default (initial keyframe values,
  effectively `both`) keeps it simple — plain `animation: changelogEmptyIn
  320ms ease-in-out;` with no `-fill-mode` is sufficient because there's no
  delay window to fill.
- Runs once (`animation-iteration-count` defaults to `1`) — satisfies R1/R6:
  it fires on every mount of this branch (React re-runs the inline `<style>`
  + element each time the component mounts), never loops.

## Reduced motion

**Decision: reuse `usePrefersReducedMotion()` from
`app/state-of-ai/useReducedMotion.ts` as-is via a cross-folder import,
without relocating it to `lib/`.**

Rationale:
- The hook is UI-only (wraps `useSyncExternalStore` + `matchMedia`), not
  framework-agnostic business logic — it doesn't fit the `lib/` mandate in
  `docs/architecture.md` ("framework-agnostic logic: Supabase client, data
  fetching/parsing... shared types"). Moving a React hook into `lib/` would
  blur that boundary for a one-line import savings.
- This feature only needs one consumer. Relocating a file, updating its one
  existing importer in `app/state-of-ai/`, and re-testing that page is a
  bigger diff than the animation itself for a small polish task — not
  proportional (per `docs/specs.md`'s "keep it proportional" guidance).
- A cross-folder import (`app/components/ChangeLog.tsx` importing from
  `app/state-of-ai/useReducedMotion`) is unusual layout-wise but not
  incorrect — both are under `app/`, and Next.js/TypeScript path resolution
  handles it with the existing `@/` alias with no config change.
- If a third consumer shows up later, that's the trigger to promote it to
  `lib/` or a shared `app/hooks/`; not before (avoid speculative refactors).

Implementation: import `usePrefersReducedMotion` in `ChangeLog.tsx`, call it
at the top of the component (it's already `"use client"`), and in the
empty-state branch conditionally omit the `animation` inline style / the
`<style>` block's effect when `prefersReducedMotion` is `true`. Because the
hook defaults to `true` on SSR (`() => true // en SSR, sin animación`), the
very first server-rendered paint already has no motion, satisfying R4's
"including on the server-rendered/first paint" clause without extra work.

## Why inline `<style>` + CSS `@keyframes` (not alternatives)

- **Chosen**: inline `<style>` with a scoped `@keyframes` name
  (`changelogEmptyIn`), same mechanism as the existing `spin` keyframe in
  this file. Zero new dependencies, matches established local convention,
  trivially small diff.
- **Discarded — Tailwind's built-in `animate-*` utilities**: Tailwind v4
  ships a few default animations (`animate-spin`, `animate-pulse`,
  `animate-bounce`) but none matching a fade+translate+scale entrance;
  building a custom one means either extending the theme's `@keyframes` in
  `globals.css` (a shared, global surface) for a single component's one-time
  effect, or using arbitrary-value utility classes that are harder to read
  than a named keyframe. Not a better fit than the pattern already in file.
- **Discarded — a JS animation library (Framer Motion, react-spring,
  etc.)**: SpinAI has no animation library in `package.json` today; adding
  one for a single one-shot fade on an empty state is disproportionate
  weight (bundle size, new dependency to maintain) for what a ~10-line CSS
  keyframe achieves. Revisit only if a future feature needs orchestrated/
  interruptible/gesture-driven animation.
- **Discarded — CSS `transition` on mount via a `useEffect`-toggled class**:
  would need an extra render pass (start at initial state, `useEffect` flips
  a class) to trigger the transition, adding state and a layout-affecting
  re-render for something a `@keyframes` animation does declaratively in one
  render. More moving parts for the same visual result.

## Touches

No Supabase schema, auth, or cron surface — this is a pure client-side
presentational change confined to `app/components/ChangeLog.tsx`, reading an
existing hook from `app/state-of-ai/`. No new dependencies, no new design
tokens.
