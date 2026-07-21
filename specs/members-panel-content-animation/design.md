# Design — members-panel-content-animation

## Approach

Add a single CSS `@keyframes` entrance animation, defined once via an inline
`<style>` tag in `app/components/MembersPanel.tsx` — the same mechanism
already used by `ChangeLog.tsx`, `Schedule.tsx`, and `TemplateEditor.tsx`'s
own entrance animations — and apply it to two different tiers of this
file's content via two small helper functions built on the *same* keyframe
and the *same* duration/easing/translate values:

1. **Block tier** — the three fixed top-level blocks (form, list-or-empty-
   state, footer), each getting a delay based on its fixed position (0, 1,
   2).
2. **Row tier** — inside the list-or-empty-state block, when it's rendering
   member rows rather than the empty state, each `<li>` gets its own delay,
   layered on top of the list block's own base delay.

**Keyframe:**

```css
@keyframes membersPanelIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Two small helpers**, both using the same keyframe/duration/easing:

```ts
function blockMotionStyle(index: number, reduced: boolean): React.CSSProperties {
  if (reduced) return {};
  return {
    animation: "membersPanelIn 220ms ease-in-out backwards",
    animationDelay: `${index * 30}ms`,
  };
}

function rowMotionStyle(index: number, reduced: boolean): React.CSSProperties {
  if (reduced) return {};
  return {
    animation: "membersPanelIn 220ms ease-in-out backwards",
    animationDelay: `${(1 + Math.min(index, 8)) * 30}ms`,
  };
}
```

`blockMotionStyle` is called with `0` (form), `1` (list-or-empty-state
block as a whole, only used when rendering the *empty* state — R3), and `2`
(footer). `rowMotionStyle` is called once per member row with that row's
`.map()` index (R4). The `+1` in `rowMotionStyle` anchors row 0's delay to
exactly the list block's own base delay (`30ms`, i.e. `1 * 30`) rather than
`0ms` — the list block, as block index `1`, never itself starts before
`30ms`, so its first row shouldn't either; per-row stagger from there is
identical in shape to `Schedule`'s (`min(index, 8) * 30ms`), just offset by
one block-slot.

- **Duration `220ms`, easing `ease-in-out`, translate `4px` (vertical only,
  no scale)**: reused verbatim from `schedule-content-animation`, not
  re-derived. The values were chosen there for "a compact single-line row"
  entrance, and `MembersPanel`'s dominant content — the member rows (toggle
  circle, name, email, delete button, all in a single flex row) — is
  materially the same shape as a `Schedule` row. Rather than introducing a
  second value set for the form/footer blocks (as `template-editor-content-
  animation` did relative to `Schedule`, because its sections were
  genuinely heavier), this feature uses one value set for both tiers: the
  form and footer blocks here are small (two inputs + a button; two text
  spans) — lighter than `TemplateEditor`'s sections, not heavier — so
  reusing the lighter/faster `Schedule` values for them too, instead of
  `TemplateEditor`'s `260ms`/`6px`, keeps proportion and avoids inventing a
  third set of numbers for a feature this size. Scale is dropped for the
  same layout reason both prior specs gave: every block/row here is a
  full-width or bordered element already at its final width relative to
  its neighbors, so scaling would read as a glitch, not a settle.
- **Block stagger, fixed index, not capped**: exactly three blocks, always
  in the same order, so — like `TemplateEditor`'s eight fixed sections —
  no cap is needed; the last block (footer) always starts at `60ms`.
- **Row stagger, capped at index 8**: the `members` array is unbounded and
  data-driven (like `Schedule`'s `assignments`), so it reuses `Schedule`'s
  cap verbatim to keep a long roster's total visible entrance bounded
  (worst case: last row starts at `270ms`, finishes at `490ms`).
- **`animation-fill-mode: backwards` is required**, for the same reason
  both prior specs give: blocks/rows with a nonzero `animationDelay` would
  otherwise render at their post-animation `opacity: 1` during the delay
  window and only jump to `opacity: 0` when the animation starts;
  `backwards` holds the keyframe's `from` state for the delay's duration.
- **Single unit per block/row, no intra-block/row staggering**: `animation`
  is set once on each block's own wrapper or each row's own `<li>` only —
  never on the "Agregar" inputs/button individually, or on a row's toggle
  button/name/email/delete button individually — satisfying R5.
- Runs once per block/row mount (`animation-iteration-count` defaults to
  `1`), satisfying R1/R4.

## Scope decision: three blocks, not one lump and not eight sections (R1, R2)

The feature request asks to animate "el contenido de la vista equipo" —
the whole view, not just its list. `MembersPanel`'s actual structure is
three blocks (form / list-or-empty-state / footer): not a single uniform
list like `Schedule` (which has no wrapping "sections," just two peer
lists), and not eight heterogeneous sections like `TemplateEditor`. Three
fixed, structurally distinct, always-present blocks is proportionally
closer to `TemplateEditor`'s "stagger the fixed top-level sections" pattern
than to `Schedule`'s "just stagger the rows, no section wrapper" pattern —
so the top tier of this design (R1, R2) follows `TemplateEditor`'s
fixed-index sectioning, scaled down from eight indices to three. Within
that top tier, the list block's *content* is itself a data-driven list of
rows, which is exactly `Schedule`'s situation — so the second tier (R4)
follows `Schedule`'s per-row stagger verbatim. Neither precedent alone fits
this file; combining them at their respective natural tiers does.

One deliberate simplification carried over from `TemplateEditor`'s design
(AgendaEditor's item count never shifts ThemePicker's fixed section delay):
the footer's delay is fixed at block index `2` (`60ms`) regardless of how
many member rows exist above it. For a long roster, later rows (e.g. row
index 8, starting at `270ms`) may still be mid-animation while the footer
below them has already finished settling at `60ms + 220ms = 280ms` — a
minor, rarely-noticed inversion given most rosters are a handful of names,
not a scroll-length list. Making the footer's delay depend on the current
row count was considered and discarded — see Alternatives.

## Scope decision: including the empty state (R3)

Unlike `schedule-content-animation` (which explicitly excluded its empty
state as a distinct, rarely-hit state outside the request's scope), this
feature includes the empty state. Reasoning specific to this view:

- The list-or-empty-state block is one of the three fixed blocks this
  feature already animates as a matter of course (R1/R2); the empty state
  and the populated list are two mutually-exclusive renderings of that same
  block, not a separate fourth concern layered on top. Excluding it would
  mean block index `1` sometimes animates (when populated) and sometimes
  silently doesn't (when empty) — an inconsistency with no clean way to
  express as "the content of this view animates," which is what was asked.
- It sits directly below the "Agregar" form, which *is* animating (block
  index `0`) — for a brand-new team (the state most likely to actually see
  this), having the form settle in while the block immediately beneath it
  does nothing would read as an unfinished, half-wired entrance rather than
  a deliberate omission, the opposite problem `changelog-empty-state-
  animation`'s empty state (its sole focus) was solving for.
- It is a first-use-leaning state (a team roster empty on ongoing use is
  unusual once any member has ever been added), the same category
  `changelog-empty-state-animation`'s empty state was in — not a
  frequently-revisited state the way `Schedule`'s empty state can be
  (visited every time there happen to be zero assignments, which is a
  normal steady-state for that view, not just a first-run condition).

Per R3, the empty state animates as a single visual unit (heading +
description together, no sub-stagger between them) — mirroring
`changelog-empty-state-animation`'s R3, not re-derived.

## Non-blocking interactivity (R7)

As in `template-editor-content-animation`, `MembersPanel` is a form/list
the user likely wants to act on immediately (add a member right away, edit
a name mid-animation, toggle someone active). This holds by construction:
the only CSS properties this feature touches are `opacity`, `transform`,
`animation`, and `animation-delay`. `pointer-events`, `disabled` (beyond
the pre-existing, unrelated empty-name gate on the submit button),
`visibility`, and `display` are never set by this feature and are never
conditioned on animation state. An element at `opacity: 0` during its
stagger delay is still fully clickable, focusable, and typable — the click-
to-edit name/email buttons, the toggle circle, and the delete/confirm
button all remain responsive the instant the tab opens, regardless of
whether their row's fade has visually finished. Manual QA in `tasks.md`
includes acting on a row/form control immediately after the tab opens, per
the same pattern `template-editor-content-animation`'s QA used.

## Replay behavior (R8, R9)

Two distinct behaviors, at two distinct tiers of the React tree, exactly as
established by the two closest precedents:

- **No replay within one open session (R8)** — `Drawer.tsx` renders
  `<MembersPanel members={data.members} .../>` and every action handler
  (`onAdd`/`onToggle`/`onRemove`/`onUpdateEmail`/`onUpdateName`) awaits its
  `lib/storage.ts` call and then calls `refresh()`, which only calls
  `setData(await loadData())` — it never remounts `MembersPanel` itself.
  Each row already uses `key={m.id}`; React's reconciliation preserves the
  DOM node for every row whose `m.id` survives the refresh, so the CSS
  `animation` (which only fires on that node's *creation*) does not
  replay — the same reasoning `schedule-content-animation`'s R6 relies on
  for `key={a.id}`. The form and footer blocks are unconditionally rendered
  in the same tree position on every render of the same `MembersPanel`
  instance, so React reconciles them to their existing DOM nodes too (no
  key needed for a single, always-present element) — their `animation`
  inline-style value is also unchanged across a `refresh()`-triggered
  re-render, so nothing re-triggers it. Only `onAdd` genuinely introduces a
  new `m.id` into the array, giving that one new `<li>` a freshly-created
  DOM node — the only row that plays R4's entrance on that occurrence.
- **Full replay on remount (R9)** — `Drawer.tsx` renders `MembersPanel`
  only inside `drawer === "equipo" && (...)`, with no `key` prop. Switching
  the drawer to any other tab removes `MembersPanel` from the tree
  entirely; switching back to "equipo" mounts a wholly new instance with
  fresh DOM nodes for all three blocks and every row, so R1–R5 replay in
  full — the same reasoning `template-editor-content-animation`'s R7 relies
  on for `TemplateEditor`'s conditional (`editingAssignment ? ... : null`)
  mount, just without that feature's extra `key={editorKey}` trigger (there
  is no analogous "return from a sibling view" path here — the only way
  `MembersPanel` unmounts is switching drawer tabs).

Both behaviors fall directly out of the existing `key={m.id}` structure and
`Drawer.tsx`'s existing conditional-render/no-`key` mount pattern — no
extra "seen" flag, `useEffect`, or remount trick is needed for either.

## Reduced motion

Reuse `usePrefersReducedMotion()` from `app/state-of-ai/useReducedMotion.ts`
exactly as all three prior features established (cross-folder import via
the `@/` alias, not relocated to `lib/` — not re-litigated a fourth time).
`MembersPanel` is already `"use client"`; call the hook once at the top of
the component, alongside its existing `useState` calls, and pass its value
as the `reduced` argument to every `blockMotionStyle`/`rowMotionStyle` call.
The hook's SSR default of `true` means the first server-rendered paint
already has no motion, satisfying R6's first-paint clause with no extra
work.

## Alternatives considered and discarded

- **Chosen**: one `@keyframes membersPanelIn`, one duration/easing/translate
  value set, applied via two small helpers (`blockMotionStyle` for the
  three fixed blocks, `rowMotionStyle` for member rows), reusing `Schedule`'s
  exact numeric values. Minimal new code, one visual "voice" for the whole
  file, small diff.
- **Discarded — a second, heavier value set for the form/footer blocks**
  (e.g. `TemplateEditor`'s `260ms`/`6px`), mirroring how that feature's
  sections differed from `Schedule`'s rows: rejected because, unlike
  `TemplateEditor`'s genuinely larger sections, this file's form and footer
  blocks are small — closer in visual weight to a `Schedule` row than to a
  `TemplateEditor` section — so a second value set would add complexity
  without a proportional visual reason.
- **Discarded — animate the list-or-empty-state block as one lump instead
  of per-row** (i.e. never call `rowMotionStyle`, just fade the whole `<ul>`
  in as a block like the empty state does): rejected for the populated
  case for the same reason `schedule-content-animation`'s design.md gives —
  multiple distinct rows appearing in one simultaneous flash reads as more
  abrupt than a gentle stagger, and would erase the active/inactive visual
  distinction the rows already draw. The empty state itself is the one
  place this feature *does* use the single-lump treatment, because it has
  no rows to stagger — see R3.
- **Discarded — excluding the empty state** (the `Schedule` precedent):
  considered and rejected — see "Scope decision: including the empty
  state" above; this view's specifics differ enough from `Schedule`'s to
  land on the opposite conclusion.
- **Discarded — making the footer's delay depend on the current row
  count** (e.g. `(2 + members.length) * 30ms`, or waiting for the last
  row's `animationend`): would remove the minor late-list inversion noted
  above, but couples the footer's timing to unbounded, data-driven content
  and needs either a growing inline delay or a JS `animationend` listener —
  meaningfully more moving parts for a cosmetic edge case that's barely
  visible on the small rosters this view typically has. Not proportional.
- **Discarded — gate control interactivity on animation completion**: 
  directly violates R7 and the forms-UX reasoning `template-editor-content-
  animation`'s design.md already laid out; rejected outright.
- **Discarded — Tailwind's built-in `animate-*` utilities**: same
  reasoning as all three prior specs — no shipped utility matches a
  fade+translate entrance, and a custom one means extending the *global*
  theme in `app/globals.css` for one component's effect.
- **Discarded — a JS animation library (Framer Motion, react-spring,
  etc.)**: still no animation library in `package.json`; disproportionate
  new dependency weight for a CSS-achievable fade, same reasoning as all
  three prior specs.
- **Discarded — `useEffect`-toggled transition class per block/row**: would
  need each block/row to start in a "pre-enter" state and flip a class
  after mount, adding an extra render pass and per-item timers on top —
  meaningfully more moving parts than a static `animationDelay` computed
  from each block's fixed index or each row's own `.map()` index.

## Touches

No Supabase schema, auth, or cron surface — purely a client-side
presentational change confined to `app/components/MembersPanel.tsx`,
reusing the existing `app/state-of-ai/useReducedMotion.ts` hook. No new
dependencies, no new design tokens, no changes to `Drawer.tsx` or any
other file.
