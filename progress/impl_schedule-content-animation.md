# Implementation — schedule-content-animation

## Files changed

- `app/components/Schedule.tsx`
  - Imported `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
    and called it once at the top of `Schedule()` (`const prefersReducedMotion
    = usePrefersReducedMotion();`).
  - Added an inline `<style>` tag defining
    `@keyframes scheduleRowIn { from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); } }`, placed as the first child
    of the populated-content return (after the `assignments.length === 0`
    early return), not in the empty-state branch.
  - Added, on each row's existing outer `<div>` `style` object in both the
    "Próximos viernes" (`upcoming.map`) and "Anteriores" (`past.map`)
    branches, a conditional spread that adds `animation: "scheduleRowIn
    220ms ease-in-out backwards"` and `animationDelay: \`${Math.min(i, 8) *
    30}ms\`` only when `!prefersReducedMotion`, and adds neither property
    when `prefersReducedMotion` is `true`. Implemented as
    `...(prefersReducedMotion ? {} : { animation: ..., animationDelay: ... })`
    rather than the `animation: cond ? undefined : "..."` pattern used in the
    `ChangeLog.tsx` precedent — functionally equivalent (both properties are
    simply absent from the computed style either way), chosen here because
    two properties needed the same gate and a single spread reads cleaner
    than two separate ternaries. Noting this as the one small implementation
    choice not spelled out verbatim in `design.md`/`tasks.md` (which show the
    two properties as flat lines); scope and behavior are unchanged from what
    was specified.
  - The pre-existing `transition: "opacity 150ms, border-color 150ms,
    background 150ms"` line and both `key={a.id}` usages (upcoming and past)
    are untouched — confirmed by diff review (see R5/R6 below).
- `specs/schedule-content-animation/tasks.md` — checked off tasks 1-6.

No other files touched. No new dependencies, no schema/API changes, no
change to `Drawer.tsx`, no change to the empty-state branch or the
drag-and-drop logic (`handleDrop`/`swapAssignmentMembers`).

## Environment note

This environment has no real browser/GUI (confirmed again for this feature,
same as the prior `changelog-empty-state-animation` pilot — checked
`.claude/skills/`, only `design-check` exists, which is a read-only diff
review, not a rendering tool). All manual QA below is **code-path reasoning
against the actual diff**, not a live visual/interactive check, and is
flagged as such per item rather than claimed as something it isn't —
especially for the drag-and-drop overlap sanity check and the R6
refresh-replay claim, which the task explicitly called out for careful
reasoning rather than restating `design.md`.

## Requirement traceability

- **R1** (one-time entrance animation per row on first mount, no looping) —
  Code-path reasoning: `animation: "scheduleRowIn 220ms ease-in-out
  backwards"` is set on each row's outer `<div>` (both lists), with no
  `animation-iteration-count` specified anywhere, which defaults to `1` per
  the CSS spec — it cannot loop. The animation only fires on that DOM node's
  creation (see R6 below for why re-renders don't replay it). Not visually
  confirmed (no browser available).

- **R2** (stagger of `30ms * index`, capped at `240ms`, counted
  independently per list) — Code inspection: `upcoming.map((a, i) => ...)`
  and `past.map((a, i) => ...)` each supply their own `i`, 0-indexed from
  the start of that specific `.map` call; `animationDelay:
  \`${Math.min(i, 8) * 30}ms\`` is computed separately in each branch, so
  "Anteriores" row 0 always starts its own delay at `0ms` regardless of how
  many "Próximos viernes" rows preceded it, matching the "independently
  staggered" requirement. `Math.min(i, 8)` caps the multiplier at `8`, so
  `i=8` and beyond all compute `240ms`, matching the R2 cap exactly.

- **R3** (`220ms`, `ease-in-out`, not bounce/spring, single unit on the row
  not its children) — Code inspection: `animation: "scheduleRowIn 220ms
  ease-in-out backwards"` — `220ms` matches literally, `ease-in-out` is the
  CSS standard keyword (no cubic-bezier spring/overshoot curve used
  anywhere). The `animation`/`animationDelay` properties are set exactly
  once per row, on the row's own outer `<div>` `style` object; none of the
  row's children (position-number `<span>`, avatar-tile `<div>`, name/date
  text `<div>`, "Lámina" `<button>`) have any `animation` or `animationDelay`
  property of their own anywhere in the diff — confirmed by re-reading the
  full row JSX for both branches after the edit. Because the keyframe
  animates the row as a single unit, every child inherits the same
  opacity/transform trajectory at the same instant — no child is ever more
  or less legible than its siblings mid-animation.

- **R4** (no motion under `prefers-reduced-motion: reduce`, including first
  paint) — Code inspection: `usePrefersReducedMotion()`'s
  `useSyncExternalStore` SSR snapshot returns `true`
  (`app/state-of-ai/useReducedMotion.ts` line 15, unchanged), so on the
  server-rendered/first-paint HTML `prefersReducedMotion` is `true`, the
  conditional spread `...(prefersReducedMotion ? {} : {...})` contributes an
  empty object, and neither `animation` nor `animationDelay` is present in
  the row's computed style at all — the row renders directly at its
  already-final `opacity`/position (for "Próximos viernes" rows, whatever
  the existing `isDragging`/`isUnassigned`/`isNext` ternary already computes
  for `opacity`, e.g. `1` in the common case; for "Anteriores" rows, no
  row-level `opacity` at all, so full opacity within the section's existing
  `0.45` wrapper). Once hydrated client-side, the hook re-reads
  `window.matchMedia(...)` and keeps motion off for the lifetime of the
  mount if the OS setting is on. Not manually toggled in a live OS/browser
  (no browser tool available).

- **R5** (existing 150ms drag/hover `transition` left untouched; entrance
  animation must not re-trigger from drag-state changes) — Two parts:
  - *Transition line untouched*: confirmed via `git diff origin/main --
    app/components/Schedule.tsx` — the line `transition: "opacity 150ms,
    border-color 150ms, background 150ms",` appears unmodified, in the same
    position in the style object, with the new `animation`/`animationDelay`
    spread added *after* it, not replacing or reordering it.
  - *No re-trigger from drag state changes, and the animation/transition
    overlap doesn't glitch drag behavior*: `isDragging`/`isOver` are derived
    from `draggingIndex`/`overIndex` state, which only affects `background`,
    `border`, `opacity`, and `cursor` values already governed by the
    existing `transition` — none of those state changes touch the
    `animation`/`animationDelay` properties themselves (their values depend
    only on `prefersReducedMotion` and the row's static list-position `i`,
    neither of which changes when a row is dragged/dragged-over), so drag
    interactions cannot cause the `scheduleRowIn` keyframe to restart; CSS
    animations only restart when `animation-name` changes value (or the DOM
    node is recreated), not from an unrelated re-render reapplying an
    unchanged `animation` string. Regarding the drag/transition overlap
    itself: while a row's entrance animation is still active (i.e., within
    its `220ms` duration plus up to `240ms` of delay — worst case, up to
    `460ms` after that row's DOM node was created), the `scheduleRowIn`
    keyframe is driving that row's `opacity` (per the CSS cascade, an active
    CSS animation takes precedence over a `transition` for any property they
    both touch — here, only `opacity` overlaps; `border-color` and
    `background` are not part of the keyframe at all, so those two continue
    to transition via the existing `150ms transition` completely unaffected
    at every point in time, including during that overlap window). If a user
    somehow starts a drag on a row within that short overlap window, the
    `isDragging`-driven `opacity: 0.4` value would not visibly take effect
    on `opacity` until the entrance animation finishes (because the
    animation still owns that property); `border-color`/`background`
    dragging feedback would still update normally and immediately in that
    same window since they're untouched by the keyframe. Once the entrance
    animation completes (`animation-fill-mode: backwards`, not `both`, so
    the animation's effect is dropped after it ends rather than persisted),
    control of `opacity` reverts fully to the `transition`, and drag/hover
    opacity behaves exactly as it did before this feature for the rest of
    that row's lifetime. This matches `design.md`'s "Non-interference"
    section, and I independently re-derived the same conclusion from the
    CSS animation/transition cascade rules rather than just restating it.
    Given `draggable` is present on a row from its very first render (not
    gated on the animation finishing), this overlap is real but bounded to a
    small, fixed window (max ~460ms after mount) and does not persist or
    error — not something requiring a code change per the spec's scope, but
    called out explicitly here since the task asked for it. Not manually
    exercised via a live pointer drag (no browser tool available) — this is
    code-path/CSS-cascade reasoning against the diff.

- **R6** (rows whose `assignment.id` already existed before a refresh must
  not replay the entrance animation; only genuinely new rows should) —
  Confirmed via three independent points read directly from the code, not
  just restated from `design.md`:
  1. `app/components/Drawer.tsx` (line 232) renders `<Schedule
     assignments={data.assignments} onPrepare={...} onRefresh={refresh}
     />` with **no `key` prop** on `Schedule` itself, so `Schedule` never
     unmounts/remounts on an `onRefresh()`-triggered data reload — only its
     `assignments` prop value changes and the component re-renders in
     place (confirmed by reading the JSX directly, not assumed).
  2. `lib/storage.ts`'s `swapAssignmentMembers(idA, idB)` (lines 169-184)
     updates only `member_id`/`member_name` on the two existing assignment
     rows matched `.eq("id", idA)` / `.eq("id", idB)` — it never inserts a
     new assignment row and never touches `date`. Since each row's `date`
     is unchanged by a swap, and `upcoming`/`past` are sorted/filtered by
     `date`, the swapped assignment's position (`i`) within its list is
     also unchanged after the refresh — so even the *values* of
     `animation` and `animationDelay` computed for that row are identical
     before and after the swap, not just the `key`.
   3. Each row already uses `key={a.id}` in both `.map` calls (unchanged by
      this diff), so React's reconciliation matches the pre- and
      post-refresh row for a given `id` to the same DOM node. A CSS
      `animation` only plays on that DOM node's creation; reapplying an
      identical (or even changed) `animation`/`animationDelay` value via
      React re-rendering the same DOM node does not restart a CSS animation
      — restart requires `animation-name` to transition through `none` (or
      the element to be freshly created), neither of which happens on a
      same-key re-render. So the entrance animation genuinely cannot replay
      for a row whose `id` survives the refresh — this falls out of
      existing behavior (`key={a.id}`, plus how `swapAssignmentMembers`
      preserves `id`/`date`), not from any new "seen" flag or effect added
      by this feature (there is none). A row whose `id` is newly present in
      `assignments` (e.g. a brand-new future assignment) gets a fresh DOM
      node on that render and plays the entrance animation exactly once, on
      that occurrence — consistent with R6. Not manually exercised via a
      live drag-and-drop-then-refresh interaction (no browser tool
      available) — this is code-path reasoning against `Drawer.tsx`,
      `lib/storage.ts`, and the row JSX together, as requested.

- **Scope confirmation** (empty state unchanged) — Code inspection: the
  `assignments.length === 0` branch (lines 66-121) is untouched by the diff
  — no `<style>` tag, no `animation` property, no import used there. `git
  diff` confirms zero changed lines within that branch.

## Manual QA — task 5 checklist (code-path reasoning, no live browser)

- Rows in each list fade/settle in with a visible stagger, don't loop, no
  part of a row harder to read than the rest — see R1/R2/R3 above.
- "Anteriores" rows animate independently staggered while keeping the
  section's existing `opacity: 0.45` dimming — the `0.45` opacity lives on
  the parent wrapper (`<div className="space-y-2" style={{ opacity: 0.45
  }}>`, unchanged by this diff) and each row's own `animation` independently
  fades that row's own opacity from `0` to `1` nested inside it; nested
  opacity values compose visually (a fully-opaque-per-its-own-animation row
  still renders within an already-`0.45`-opacity ancestor), so the section
  keeps looking dimmed overall while each row still visibly settles in.
  `past.map`'s own `i` starts at `0` independently of `upcoming.map`'s `i`,
  confirmed above under R2.
- Reduced motion produces instant full-opacity/final-position rows including
  first paint — see R4 above.
- Drag/drop 150ms highlight still works, animation/transition overlap
  doesn't glitch border/background, swapped rows don't replay entrance after
  refresh — see R5/R6 above (both reasoned through the actual diff plus
  `Drawer.tsx` and `lib/storage.ts`, not just restated from `design.md`).
- Empty state unchanged — see "Scope confirmation" above.
- `design-check` skill — see below.

## design-check skill result

Ran the check per `.claude/skills/design-check/SKILL.md` against `git diff
origin/main -- app/components/'*.tsx'`, which returns exactly the diff for
`app/components/Schedule.tsx` (only file under `app/components/` changed by
this feature):

- No hardcoded hex color introduced — the diff adds only an `import`
  statement, one hook call, one `<style>` tag whose `@keyframes` body uses
  only `opacity`/`transform` (no color values), and the `animation`/
  `animationDelay` properties (also not colors).
- No hardcoded `border-radius` introduced.
- No `fontSize` changes.
- No custom `boxShadow` introduced.

**No findings** — consistent with the existing design tokens; the change
introduces no new visual/token surface beyond motion properties, same
conclusion as the prior `changelog-empty-state-animation` pilot.

## Lint / build

- `npm run lint` — passes, no output/errors.
- `npm run build` — passes (`next build`, Turbopack, compiled successfully,
  TypeScript check passed, all 14 pages generated). The only warning
  ("Failed to find font override values for font `Bitcount Grid Double`") is
  pre-existing and unrelated to this change.

## Deviations from spec

- One small implementation-detail choice not spelled out verbatim in
  `tasks.md`/`design.md`: gating `animation`/`animationDelay` via a single
  `...(prefersReducedMotion ? {} : { ... })` object spread per row instead
  of two separate `cond ? undefined : "value"` ternaries (the pattern used
  in the `ChangeLog.tsx` precedent for its one property). Functionally
  identical outcome — both properties are absent from the computed style
  when `prefersReducedMotion` is `true`, present with the specified values
  otherwise — chosen because this feature gates two properties together per
  row rather than one. No requirement or design constraint affected; noted
  here per `implementer.md`'s guidance to log small adjustments rather than
  silently expand scope or rewrite the spec.
