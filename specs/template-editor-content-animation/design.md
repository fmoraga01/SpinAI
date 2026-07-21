# Design — template-editor-content-animation

## Approach

Add a single CSS `@keyframes` entrance animation, defined once via an inline
`<style>` tag in `app/components/TemplateEditor.tsx` — the same mechanism
already used by the file's own `spin` keyframe (loading branch) and by
`Schedule.tsx`/`ChangeLog.tsx`'s prior animations — and apply it to the
outer wrapper of each of the eight top-level sections, with a small,
index-based stagger. The `<style>` tag is placed in the populated-content
return path (inside the `<div className="space-y-6">` block), not in the
`loading || presenting` branch above it, since that branch is out of scope.

**Keyframe:**

```css
@keyframes templateEditorSectionIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

A local helper computes the per-section inline style from a fixed index:

```ts
function sectionMotionStyle(index: number, reduced: boolean): React.CSSProperties {
  if (reduced) return {};
  return {
    animation: "templateEditorSectionIn 260ms ease-in-out backwards",
    animationDelay: `${index * 30}ms`,
  };
}
```

called once per section with a hardcoded index matching the fixed top-to-
bottom order (badge=0, Título=1, TimingSection=2, AgendaEditor=3,
ThemePicker=4, FontPicker=5, SizePicker=6, actions row=7) — `!prefersReducedMotion`
is passed in as `reduced`, satisfying R4.

- **Duration `260ms`, easing `ease-in-out`**: within the 200–500ms band
  from the research, between the two prior features' values — `220ms`
  (`Schedule`'s compact single-line rows) and `320ms` (`ChangeLog`'s
  centered empty-state block). A `TemplateEditor` section is a mid-size
  content block (a labeled input, a toggle card, a 4-up grid) — heavier
  than a list row, lighter than a full centered hero — so a duration
  between the two priors' values reads proportionate. `ease-in-out` matches
  the file's own existing convention (no bounce/spring), per Material
  Design's guidance to use a deceleration curve for content entering the
  screen.
- **Translate `6px` (vertical only), no scale**: matches `ChangeLog`'s
  distance value, but — like `Schedule` — deliberately drops the `scale`
  term. Every one of these eight sections is a full-width block bounded by
  a border or grid that's already at its final width relative to its
  neighbors (input border, card border, 4-column grid); scaling it down
  and back up would visibly narrow/widen those edges against sibling
  sections that have already reached their final width, reading as a
  glitch rather than a settle — the same reasoning `schedule-content-
  animation`'s design.md used to drop scale for its full-width rows.
- **No fixed cap on the stagger, because the section count itself is
  fixed**: unlike `Schedule`'s per-row stagger (capped at `240ms` because
  the list length is unbounded and driven by data), `TemplateEditor` always
  has exactly eight top-level sections in a fixed order — the last section
  (actions row, index 7) always starts at `210ms` and finishes at `470ms`
  total, comfortably inside NN/g's ~1s "uninterrupted flow" ceiling with no
  extra cap logic needed.
- **`animation-fill-mode: backwards` is required**: sections with a nonzero
  `animationDelay` (index > 0) would otherwise render at their post-
  animation computed style (opacity 1) during the delay window and only
  jump to opacity 0 when the animation starts; `backwards` holds the
  keyframe's `from` state for the delay's duration, so later sections
  genuinely stay invisible until their turn — same reasoning as
  `schedule-content-animation`.
- **Single unit per section, no intra-section staggering**: `animation` is
  set once on each section's own outer wrapper only — never on an
  individual agenda row, a theme/font/size swatch, or one of the three
  action buttons — satisfying R3. `AgendaEditor`'s own internal
  `dragIndex`/`dragOver`-driven `opacity`/`outline` styling on its rows is
  untouched; it is a separate, pre-existing mechanism, not part of this
  feature's animation.
- Runs once per section per mount (`animation-iteration-count` defaults to
  `1`), satisfying R1.

## Applying the wrapper style without changing sub-component signatures

Two of the eight sections (the "Reunión asignada" badge and the actions
row) are plain `<div>`s written directly inside `TemplateEditor`'s own JSX,
so `sectionMotionStyle(...)` is merged straight into their existing (badge)
or new (actions row) inline `style` object. The "Título" section is also a
plain `<div>` with no existing `style` prop; add one. The remaining five
sections (`TimingSection`, `AgendaEditor`, `ThemePicker`, `FontPicker`,
`SizePicker`) are self-contained components each rendering their own outer
`<div>` with no `style` prop threaded through from the parent today.
Rather than adding a `style?: React.CSSProperties`
prop to five component signatures (a larger, more invasive diff touching
five function signatures for a purely cosmetic wrapper concern), each is
wrapped at its call site in `TemplateEditor` with a plain
`<div style={sectionMotionStyle(n, reduced)}><ComponentName .../></div>`.
This adds one extra `<div>` per wrapped section but no extra visual
nesting effect: Tailwind's `space-y-6` (on the parent `<div
className="space-y-6">`) applies `margin-top` to direct children via the
`> * + *` selector, and each wrapped section is still exactly one direct
child (the wrapping `<div>` itself), so spacing is visually identical to
today.

## Non-blocking interactivity (R5)

This is the property that most distinguishes this feature from the two
prior animation specs: `TemplateEditor` is a form the user likely wants to
act on immediately (type a title, toggle timing, drag an agenda item),
unlike `ChangeLog`'s passive empty state or `Schedule`'s read-only calendar
rows. Per the forms-UX research cited in the feature request — "if
animation delays access to content users came for, it's not enhancing
UX — it's creating UX debt" and animations must be "smoothly
interruptible" — the implementation must guarantee real interactivity is
never gated on animation state.

This holds by construction, not by extra code: the only CSS properties
this feature touches are `opacity`, `transform`, `animation`, and
`animation-delay`. None of these affect hit-testing or focusability —
`pointer-events`, `visibility`, and `display` (the properties that *would*
block interaction) are never set by this feature. An element sitting at
`opacity: 0` during its stagger delay is still fully clickable, focusable,
and (for inputs) typable in every browser; only its *visual* opacity is
zero. Tab order is also unaffected since no element is ever
`display: none` or removed from the accessibility tree. The manual QA in
`tasks.md` includes explicitly clicking/typing into a section immediately
after the drawer opens (before its entrance animation visually finishes)
to confirm this holds in practice, not just in theory.

## Scope decision: per-section stagger vs. one whole-block fade

**Chosen: stagger each of the eight top-level sections**, analogous to
`Schedule.tsx`'s per-row stagger, rather than fading the whole
`<div className="space-y-6">` in as one unit (`ChangeLog`'s pattern).

Reasoning:
- The staggering research cited in the feature request (SVGator, Framer
  University, NN/g) is about exactly this situation: multiple visually and
  functionally distinct elements appearing together read better in
  sequence than as one simultaneous flash, because it chunks content and
  builds a visual hierarchy. `TemplateEditor`'s eight sections are more
  heterogeneous than `Schedule`'s uniform rows (a badge, a text input, a
  toggle card, a drag-and-drop list, three separate 4-up grids, and a
  button row) — if anything, that heterogeneity *strengthens* the case for
  staggering over `ChangeLog`'s single centered icon+text block, since
  there is no natural "one visual unit" reading here; the sections are
  read top-to-bottom as distinct chunks already (each has its own
  uppercase label), so animating them as one lump would fight the layout's
  existing visual hierarchy instead of reinforcing it.
- Does the form context change the calculus? It changes the *stagger
  window*, not the decision to stagger. A read-only list (`Schedule`) or a
  passive empty state (`ChangeLog`) has no urgency constraint beyond
  "don't feel slow"; a form the user wants to act on immediately adds a
  harder constraint — R5, above — that the *visual* stagger must never
  become a *functional* wait. Because R5 holds unconditionally (opacity/
  transform never gate interactivity), the form context does not force
  abandoning the stagger; it only disqualifies solutions that *would*
  gate interactivity (e.g. disabling inputs until their section "finishes
  entering" — considered and rejected, see Alternatives below).
- The fixed, small section count (exactly 8, not data-driven and
  unbounded like `Schedule`'s rows) keeps the worst case short: last
  section starts at `210ms`, finishes at `470ms` — well under NN/g's ~1s
  ceiling, so the stagger cost is bounded and known at design time, not a
  risk that grows with more content the way an unbounded list's would.

## Scope decision: excluding `AgendaEditor`'s internal items

`AgendaEditor` participates in the top-level stagger exactly once, as a
single section (index 3) — its own outer wrapper fades/translates in like
every other section, but its internal `items.map(...)` rows do not get
their own entrance or stagger. Reasoning:
- `AgendaEditor` already has its own interaction layer — `dragIndex`/
  `dragOver` state driving per-row `opacity`/`outline` during drag —
  adding a second, independently-timed motion system (entrance fade) on
  the same rows would create two motion mechanisms competing for the same
  elements' `opacity`/`transform`, increasing the risk of visual conflict
  (e.g. a row mid-entrance-fade being dragged) for a benefit that is
  marginal: agenda items are typically 1–5 short rows already visible
  together as soon as the section fades in, so a sub-stagger inside an
  already-staggered section reads as over-animated rather than subtle.
- Rows are also added/removed by direct user action ("+ Agregar", "✕"),
  not by an async data load — animating a row's appearance right as the
  user clicks "+ Agregar" would need to distinguish "row exists at initial
  section mount" from "row was just added by the user," which is
  meaningfully more state (a "seen" set or per-row mount tracking) for a
  small transient scope that R6 already asks this feature to avoid
  broadly (no replay on ordinary interaction). Not proportional to what
  the request ("animar el contenido... sutil") asks for.
- No divergence from the reasoning given in the feature request — this
  spec adopts it as-is.

## Scope decision: excluding the loading spinner

Unchanged, out of scope, exactly as stated in requirements.md's Non-goals.
The spinner is a distinct, already-animated loading affordance predating
this feature and shared verbatim with `Drawer.tsx`'s own loading branch;
touching it is not part of "animar el contenido," which reads as the
populated form, not the wait state before it.

## Reduced motion

Reuse `usePrefersReducedMotion()` from `app/state-of-ai/useReducedMotion.ts`
exactly as both prior features established (cross-folder import via the
`@/` alias, not relocated to `lib/` — not re-litigated a third time).
`TemplateEditor` is already `"use client"`; call the hook once, alongside
its other `useState` calls, *before* the `if (loading || presenting)` early
return (React's rules of hooks require it be called unconditionally on
every render, regardless of which branch that render takes). Gate every
`sectionMotionStyle(...)` call's `reduced` argument on the hook's return
value. The hook's SSR default of `true` means the very first
server-rendered paint already has no motion, satisfying R4's first-paint
clause with no extra work.

## Replay behavior (R6, R7)

`Drawer.tsx` mounts `TemplateEditor` conditionally
(`editingAssignment ? <TemplateEditor key={editorKey} .../> : (...)`), not
unconditionally with a stable prop like `Schedule` (which `Drawer.tsx`
renders with no `key`, keeping the same instance across data refreshes —
see `specs/schedule-content-animation/design.md`). Two things force a
brand-new `TemplateEditor` instance, each creating fresh DOM nodes for the
content subtree and therefore replaying every section's CSS `animation`:

1. Closing the editing view sets `editingAssignment` back to `null`,
   removing `TemplateEditor` from the tree entirely; reopening it (from
   `Schedule`'s "Lámina" button or the "◈ Preparar lámina" CTA) sets
   `editingAssignment` to a value again, mounting a wholly new instance.
2. Returning from `PresentationView` (`onClose`) increments `editorKey`,
   which — because it's used as the `key` prop — forces React to discard
   the old `TemplateEditor` instance (still showing its own spinner, since
   `presenting` was `true` before the swap to `PresentationView`) and
   mount a brand new one from scratch.

Within a single instance, the content subtree
(`<div className="space-y-6">...</div>`) is created exactly once — the
first time `loading` flips from `true` to `false` after `loadTemplate()`
resolves. Every subsequent re-render of that same instance (typing,
toggling, saving, etc. — R6) reuses the same DOM nodes for that subtree,
since none of `loading`/`presenting` flip back to `true` and then `false`
again within one instance's lifetime — `presenting` only ever turns `true`
on the way to being swapped out for `PresentationView` (see point 2
above), never back to a re-shown content view within the same instance.
So R6's "no replay on ordinary interaction" and R7's "full replay on a new
instance" both fall directly out of the existing `editingAssignment`/
`editorKey` mount structure already in `Drawer.tsx` and the existing
`loading`/`presenting` state machine already in `TemplateEditor.tsx` — no
extra "seen" flag, `useEffect`, or remount trick is needed for either.

This is the same conclusion `changelog-empty-state-animation`'s R6 reached
(replay on every mount) rather than `schedule-content-animation`'s
(persist across re-renders) — and for the analogous reason: `TemplateEditor`
is not a keyed list item that persists across a data refresh the way a
`Schedule` row does; it is a whole view tied to one "prepare/edit this
slide" session, torn down and recreated between sessions exactly like
`ChangeLog`'s empty state is torn down and recreated between navigations.
Replaying a light, sub-second entrance each time the user opens the editor
to prepare a slide reinforces "this is a fresh session" rather than
feeling like a reload — the opposite problem `schedule-content-
animation`'s design.md worried about (replaying on every drag-and-drop
swap would feel like the list constantly reloading, because rows there
persist by design).

## Alternatives considered and discarded

- **Chosen**: inline `<style>` with a scoped `@keyframes
  templateEditorSectionIn`, applied per top-level section via a small
  `sectionMotionStyle(index, reduced)` helper, with plain wrapper `<div>`s
  around the five self-contained sub-components. Zero new dependencies,
  matches the one convention already established across this codebase's
  three motion features, small diff.
- **Discarded — animate the whole `<div className="space-y-6">` as one
  block** (the `ChangeLog` pattern): simpler, but contradicts the
  staggering research and erodes the section-by-section visual hierarchy
  the form already has via its uppercase labels — see "Scope decision:
  per-section stagger" above.
- **Discarded — gate control interactivity on animation completion**
  (e.g. `disabled` on inputs/buttons until their section's `animationend`
  fires): directly violates R5 and the forms-UX research cited in the
  feature request; would turn a purely cosmetic entrance into a real
  functional delay. Rejected outright, not just as a style preference.
- **Discarded — per-item stagger inside `AgendaEditor`**: considered and
  rejected per "Scope decision: excluding `AgendaEditor`'s internal
  items" above — competes with the existing drag interaction and needs
  extra state to distinguish initial rows from user-added ones, for
  marginal benefit on typically-short lists.
- **Discarded — thread a `style` prop through `TimingSection`,
  `AgendaEditor`, `ThemePicker`, `FontPicker`, `SizePicker`**: functionally
  equivalent to the chosen wrapper-`<div>` approach but changes five
  component signatures instead of adding wrapper elements at the call
  site — a larger diff for the same visual result.
- **Discarded — Tailwind's built-in `animate-*` utilities**: same
  reasoning as both prior specs — no shipped utility matches a
  fade+translate entrance, and a custom one means extending the *global*
  theme in `app/globals.css` for one component's effect.
- **Discarded — a JS animation library (Framer Motion, react-spring,
  etc.)**: still no animation library in `package.json`; disproportionate
  new dependency weight for a CSS-achievable fade, same reasoning as both
  prior specs.
- **Discarded — `useEffect`-toggled transition class per section**: would
  need each section to start in a "pre-enter" state and flip a class after
  mount, adding an extra render pass and per-section timers on top —
  meaningfully more moving parts than a static `animationDelay` computed
  from each section's fixed index.

## Touches

No Supabase schema, auth, or cron surface — purely a client-side
presentational change confined to `app/components/TemplateEditor.tsx`,
reusing the existing `app/state-of-ai/useReducedMotion.ts` hook. No new
dependencies, no new design tokens, no changes to `Drawer.tsx`,
`HomeCTAs.tsx`, or any other file.
