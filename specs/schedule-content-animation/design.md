# Design — schedule-content-animation

## Approach

Add a single CSS `@keyframes` entrance animation, defined once via an inline
`<style>` tag in `app/components/Schedule.tsx` (same mechanism as
`ChangeLog.tsx`'s existing `spin`/`changelogEmptyIn` keyframes — keeps the
project's one established local convention for motion instead of a second
one), and apply it per-row via each row's existing inline `style` object in
both the "Próximos viernes" (`upcoming`) and "Anteriores" (`past`) render
branches. The `<style>` tag is placed in the populated-content return
(after the `assignments.length === 0` early return), not in the empty-state
branch, since the empty state is out of scope (see requirements.md).

**Keyframe:**

```css
@keyframes scheduleRowIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Applied per row as:

```
animation: scheduleRowIn 220ms ease-in-out backwards;
animationDelay: `${Math.min(index, 8) * 30}ms`;
```

only when `!prefersReducedMotion`; omitted entirely when reduced motion is
on, so the row renders directly at its final opacity/position (R4).

- **Duration `220ms`, easing `ease-in-out`**: within the 200–500ms "fuller
  entrance" band from the research, at the low end because this is a
  compact single-line row (position number, small avatar tile, two lines of
  text, one button), not a full centered block like the prior pilot's empty
  state — a lighter, quicker settle reads better for something this small.
  `ease-in-out` matches the established local convention (no bounce/spring).
- **Translate `4px` (vertical only), no scale**: the prior pilot
  (`changelog-empty-state-animation`) used `translateY(6px) scale(0.98→1)`
  on a centered icon+text block, where scale reads as "settling into
  place." A `Schedule` row is a full-width flex row; scaling it down
  horizontally would visibly narrow/widen the row's edges against its
  neighbors' already-final-width borders, which reads as a glitch rather
  than a settle. Dropping scale and keeping only a small vertical translate
  is the one deliberate divergence from the established convention, for a
  concrete layout reason — the fade+translate DNA carries over, scale
  doesn't.
- **Stagger `30ms` per row, capped at `240ms` (index 8+)**: per the
  staggering guidance in the research (avoids an overwhelming simultaneous
  flash across N rows; reads as more natural than one synchronized block),
  scaled to a value where even a longer "Anteriores" list finishes its
  visible entrance quickly — worst case, last row starts at 240ms and
  finishes at 460ms total, well within what still reads as a single
  cohesive "content entrance," not a slow reveal.
- **Two lists, staggered independently**: "Próximos viernes" and
  "Anteriores" each restart their own `index`-based delay at 0 (row 0 of
  "Anteriores" doesn't wait for the last "Próximos viernes" row to finish).
  Both sections are visible in the same initial paint, so their entrances
  overlap in wall-clock time — intentional, keeps the whole visible content
  settling in over roughly the same short window rather than serializing
  two lists end-to-end.
- **`animation-fill-mode: backwards` is required here** (unlike the prior
  pilot, which had no per-element delay and didn't need it): rows with a
  nonzero `animationDelay` (index > 0) would otherwise render at their
  *post*-animation computed style (opacity 1) during the delay window and
  only jump to opacity 0 when the animation starts — `backwards` holds the
  keyframe's `from` state (opacity 0, translateY 4px) for the duration of
  the delay, so the row genuinely stays invisible until its turn.
- **Single unit, no intra-row staggering**: the `animation` property is set
  once on the row's outer `<div>` only (not on individual children like the
  avatar tile or text), satisfying R3 — nothing inside a row fades in ahead
  of or behind the rest of that same row.
- Runs once per row mount (`animation-iteration-count` defaults to `1`),
  satisfying R1.

## Non-interference with the existing drag/hover transition (R5)

Each row already sets `transition: "opacity 150ms, border-color 150ms,
background 150ms"` in the same inline `style` object, driving the
hover/drag/drop-target highlight (`isDragging`, `isOver` state). This
feature adds a separate `animation` property to that same style object —
`transition` and `animation` are independent CSS mechanisms and coexist
without either canceling the other. While a row's entrance `animation` is
still running (its `220ms` + delay window), the CSS animations cascade
takes precedence over the transition for the properties they share
(`opacity`); once the entrance animation completes, control of `opacity`
reverts to the `transition` as before, so drag-state opacity changes
continue to animate at their existing `150ms` exactly as today. No property
on the existing `transition` string is touched, added to, or removed. QA
(tasks.md) includes explicitly dragging a row immediately after mount as a
sanity check of this interaction, since it's the one place the two
mechanisms briefly overlap in time.

## Refresh-replay behavior (R6)

`app/components/Drawer.tsx` renders `<Schedule assignments={data.assignments}
onRefresh={refresh} .../>` with no `key` prop, so `Schedule` itself never
unmounts/remounts on a data refresh — only its `assignments` prop changes
and it re-renders in place. Each row already uses `key={a.id}`. Because
`swapAssignmentMembers` swaps `memberId`/`memberName` between two existing
assignment rows (their `id`s, and therefore their list positions, are
unchanged) rather than creating new assignment records, React's
reconciliation keeps the same DOM node for both rows across the
`onRefresh()`-triggered re-render — so the CSS `animation`, which only
fires on that DOM node's *creation*, naturally does not replay. No extra
code (no "seen" flag, no `useEffect`, no remount trick) is needed to get
this behavior: it falls directly out of the existing `key={a.id}` structure
already in `Schedule.tsx`, which this feature must not change. Only a row
whose `assignment.id` is genuinely new to the list (e.g. a newly-added
future assignment) gets a fresh DOM node and therefore plays the entrance
animation on that occurrence — consistent with R6.

This deliberately differs from `changelog-empty-state-animation`'s R6
(replay the animation every time that component remounts): that feature's
animated unit is a single block tied to one component's mount/unmount
lifecycle, while `Schedule`'s rows are keyed list items that persist across
data refreshes by design — replaying the fade on every refresh (e.g. after
every drag-and-drop swap) would fight the "reordering vs. entrance are
different problems" distinction from the research and make the list feel
like it's constantly reloading.

## Reduced motion

Reuse `usePrefersReducedMotion()` from `app/state-of-ai/useReducedMotion.ts`
exactly as `specs/changelog-empty-state-animation/design.md` already
established (cross-folder import via the `@/` alias, not relocated to
`lib/` — that decision isn't re-litigated here). `Schedule.tsx` is already
`"use client"`; call the hook once at the top of the component and gate the
per-row `animation`/`animationDelay` inline style on `!prefersReducedMotion`.
The hook's SSR default of `true` means the first server-rendered paint
already has no motion, satisfying R4's first-paint clause with no extra
work.

## Alternatives considered and discarded

- **Chosen**: inline `<style>` with a scoped `@keyframes scheduleRowIn`,
  applied per row via `animation`/`animationDelay` in each row's existing
  inline `style` object. Zero new dependencies, matches the one convention
  already established by `ChangeLog.tsx`, small diff.
- **Discarded — animate the whole list section as one block** (e.g. fade in
  the `<div>` wrapping all of "Próximos viernes," or all of "Anteriores,"
  as a single unit instead of per row): simpler to implement, but directly
  contradicts the staggering guidance cited in the research — multiple
  distinct rows appearing in one simultaneous flash reads as more abrupt
  and less legible than a gentle stagger, and it would erase the visual
  distinction the UI already draws between rows (the highlighted "next up"
  row, faded/dashed "unassigned" rows, dimmed "past" rows) by animating
  them as an undifferentiated blob. Rejected in favor of per-row entrance.
- **Discarded — Tailwind's built-in `animate-*` utilities**: Tailwind v4
  ships `animate-spin`/`animate-pulse`/`animate-bounce`, none matching a
  fade+translate entrance; a custom one means extending the *global* theme
  keyframes in `app/globals.css` for what's currently a single component's
  effect, or arbitrary-value utility classes that are harder to read than a
  named keyframe. Same reasoning as the prior pilot's design.md — not a
  better fit.
- **Discarded — a JS animation library (Framer Motion, react-spring,
  etc.)**: still no animation library in `package.json`; adding one for a
  per-row CSS-achievable fade is disproportionate new dependency weight for
  this size of feature, per the same reasoning as the prior pilot.
- **Discarded — `useEffect`-toggled transition class per row**: would need
  each row to start in an initial "pre-enter" state and flip a class after
  mount via `useEffect`, which is extra state and an extra render pass
  *per row* (with per-row stagger timers on top) — meaningfully more moving
  parts than `animationDelay` computed inline from the row's own index in
  one render pass. Not proportional to what's being achieved.

## Touches

No Supabase schema, auth, or cron surface — purely a client-side
presentational change confined to `app/components/Schedule.tsx`, reusing
the existing `app/state-of-ai/useReducedMotion.ts` hook. No new
dependencies, no new design tokens, no changes to `Drawer.tsx` or any other
file.
