# Implementation — template-editor-content-animation

## Files changed

- `app/components/TemplateEditor.tsx`
  - Imported `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
    and called it once, unconditionally, at the top of `TemplateEditor()`
    (`const prefersReducedMotion = usePrefersReducedMotion();`), alongside the
    other `useState` calls and *before* the `if (loading || presenting)` early
    return.
  - Added a module-level `sectionMotionStyle(index: number, reduced: boolean):
    React.CSSProperties` helper (next to `distributeEvenly`) that returns `{}`
    when `reduced` is `true`, else `{ animation: "templateEditorSectionIn
    260ms ease-in-out backwards", animationDelay: \`${index * 30}ms\` }`.
  - Added an inline `<style>` tag defining `@keyframes templateEditorSectionIn
    { from { opacity: 0; transform: translateY(6px); } to { opacity: 1;
    transform: translateY(0); } }` as the first child of the
    populated-content return (inside `<div className="space-y-6">`), not in
    the `loading || presenting` branch.
  - Applied `sectionMotionStyle(0, prefersReducedMotion)` merged into the
    "Reunión asignada" badge's existing `style` object; added `style=
    {sectionMotionStyle(1, prefersReducedMotion)}` to the "Título" wrapper
    `<div>`; added the same pattern (`style={sectionMotionStyle(7,
    prefersReducedMotion)}`) to the actions row's `<div className="flex gap-2
    flex-wrap">`.
  - Wrapped each of `<TimingSection .../>` (index 2), `<AgendaEditor .../>`
    (index 3), `<ThemePicker .../>` (index 4), `<FontPicker .../>` (index 5),
    and `<SizePicker .../>` (index 6) in a plain `<div style=
    {sectionMotionStyle(n, prefersReducedMotion)}>...</div>` at their call
    sites in `TemplateEditor`'s return. None of those five components'
    signatures or internals were touched.
- `specs/template-editor-content-animation/tasks.md` — checked off tasks 1-6
  (task 7 documented here, task 8 below).

No other files touched. No new dependencies, no schema/API changes, no
change to `Drawer.tsx`, and no change to the `loading || presenting` branch
or `AgendaEditor`'s internal `dragIndex`/`dragOver` mechanism.

## Deviation from spec (noted, not silently applied)

`design.md`'s "Reduced motion" section contains one internally inconsistent
sentence: "`!prefersReducedMotion` is passed in as `reduced`". Taken
literally, that would mean `reduced` is `true` exactly when the OS does
*not* request reduced motion — which contradicts the helper's own stated
contract two paragraphs earlier ("returns `{}` when `reduced` is `true`")
and would break R4 (motion would play *only* when the user asked for no
motion, and vice-versa). This is the only spot in the design doc where the
mapping is stated explicitly; `tasks.md` itself doesn't restate a mapping,
just uses the bare identifier `reduced` in the call sites it shows
(`sectionMotionStyle(0, reduced)` etc.).

Implemented the only variant consistent with the helper's own contract and
with R4: `reduced` is passed as `prefersReducedMotion` directly (not
negated) at every one of the eight call sites — i.e. when the OS reports
`prefers-reduced-motion: reduce`, `prefersReducedMotion` is `true`,
`sectionMotionStyle` returns `{}`, and no motion plays. Verified against the
prior precedent (`Schedule.tsx` uses `prefersReducedMotion ? {} : {
animation: ..., animationDelay: ... }` — i.e. animation is applied only when
`prefersReducedMotion` is falsy, the same direction used here). No other
part of the design or requirements was reinterpreted; this is purely a
correction of what appears to be a typo in one sentence of `design.md`,
resolved in the only direction that satisfies R4 and matches the helper's
own documented behavior.

## Environment note

This environment has no real browser/GUI (same constraint noted in the two
prior animation features' progress files — only `.claude/skills/design-check`
exists, a read-only diff-review skill, not a rendering tool; no `npm run
dev` server was launched interactively). All "manual QA" below is
**code-path reasoning against the actual diff and the referenced files**
(`Drawer.tsx`, the JSX itself), not a live visual/interactive check, and is
flagged as such per item below rather than claimed as hands-on tested.

## Requirement traceability

- **R1** (one-time entrance fade+translate per section on first populated
  render, no looping) — Code inspection: `animation: "templateEditorSectionIn
  260ms ease-in-out backwards"` is set via `sectionMotionStyle` on each of
  the eight sections' own outer wrapper, with no `animation-iteration-count`
  specified anywhere in the diff, which defaults to `1` per the CSS spec —
  it cannot loop. The animation fires once, on each wrapper DOM node's
  creation (see R6 below for why later re-renders of the same instance don't
  replay it). Not visually confirmed (no browser available).

- **R2** (`30ms * index` stagger, badge=0 ... actions row=7, top-to-bottom
  order) — Code inspection: the eight call sites pass exactly `0, 1, 2, 3,
  4, 5, 6, 7` in the same order they render top-to-bottom in the JSX (badge,
  Título, TimingSection, AgendaEditor, ThemePicker, FontPicker, SizePicker,
  actions row), matching `requirements.md`'s fixed order. `animationDelay:
  \`${index * 30}ms\`` inside the helper computes `0ms, 30ms, 60ms, 90ms,
  120ms, 150ms, 180ms, 210ms` respectively. Not visually confirmed (no
  browser available).

- **R3** (200-500ms duration, standard-curve easing, applied to each
  section's own outer wrapper as a single unit, not to inner controls) —
  Code inspection: `260ms` is within the 200-500ms band; `ease-in-out` is a
  standard deceleration curve, no bounce/spring keyword used. `git diff`
  confirms `animation`/`animationDelay` were added on exactly eight
  elements — the badge `<div>`, the Título `<div>`, the three added wrapper
  `<div>`s around `TimingSection`/`AgendaEditor`/`ThemePicker`/`FontPicker`/
  `SizePicker` (five wrappers, though grouped as one bullet in `tasks.md`),
  and the actions-row `<div>` — and nowhere else: no `animation` property
  was added to the badge's inner `<p>`s, the Título `<input>`, any agenda
  row/drag-handle/remove-button/"+ Agregar" button inside `AgendaEditor`, any
  swatch inside `ThemePicker`/`FontPicker`/`SizePicker`, or any of the three
  action buttons. Confirmed by reading the full diff line-by-line above.

- **R4** (reduced motion: full opacity/final position, no delay, including
  first paint) — Code inspection: `usePrefersReducedMotion()`'s SSR fallback
  (third argument to `useSyncExternalStore` in
  `app/state-of-ai/useReducedMotion.ts`) is `() => true`, so the very first
  server-rendered paint already has `prefersReducedMotion === true`, and
  every `sectionMotionStyle(n, prefersReducedMotion)` call returns `{}` —
  no `animation`/`animationDelay` property at all, so each section renders
  directly at its authored opacity (1, implicit) and position, no delay.
  When the OS/browser later reports `prefers-reduced-motion: reduce` (real
  matchMedia value `true`), the same `{}` result holds. Not visually
  confirmed (no browser available) — this is the "reuse the established
  hook exactly" pattern already used identically in `Schedule.tsx` and
  `ChangeLog.tsx`, both previously accepted.

- **R5** (no control's interactivity gated on animation state — Título
  input, timing toggle/minutes field, agenda inputs/drag handles/remove/
  "+Agregar", theme/font/size swatches, Volver/Guardar/Presentar all stay
  immediately focusable/clickable/editable) — Code inspection, this is the
  requirement with a static-analysis-friendly proof: grepped the full diff
  (see task 6 above) and confirmed the only properties introduced anywhere
  are `animation` and `animationDelay` (plus the `<style>` keyframes body,
  which itself only sets `opacity`/`transform`). Neither `pointer-events`,
  `disabled`, `visibility`, nor `display` appears anywhere in the diff. None
  of the eight sections' own interactive descendants (input, toggle button,
  agenda `<input>`s/buttons/`draggable` span, swatch `<button>`s, the three
  action `<button>`s) had any prop added or removed by this diff — their
  `onClick`/`onChange`/`onFocus`/`onBlur`/`draggable`/`disabled={saving}`
  (pre-existing, unrelated to this feature) attributes are untouched, as
  confirmed by the diff showing zero changed lines inside those elements'
  own JSX (only the *wrapping* `<div>`s gained a `style` prop). Since
  `opacity`/`transform`/`animation` never affect hit-testing, focus order,
  or the accessibility tree, and no gating mechanism was added, R5 holds by
  construction — consistent with `design.md`'s own "holds by construction,
  not by extra code" argument. Not manually clicked/typed into during the
  animation window (no browser available) — this is code-path reasoning
  against the actual diff, not a live interaction test.

- **R6** (no replay on ordinary re-render within the same mount — typing,
  toggling, adding/removing/reordering agenda items, assigning a member,
  picking theme/font/size, saving, save error) — Code inspection: none of
  `title`, `agendaItems`, `timingEnabled`, `totalMinutes`, `theme`, `font`,
  `size`, `saving`, `saved`, or `error` state changes flip `loading` back to
  `true` and then `false` again, and none of them cause `TemplateEditor`
  itself to unmount/remount (no `key` on it changes as a result of these
  state updates — `editorKey` only lives in `Drawer.tsx` and is untouched by
  any handler in this file). Since the `<div className="space-y-6">...
  </div>` subtree (and every section wrapper inside it) is created exactly
  once per mount — the render where `loading` first becomes `false` — and
  every one of the state changes above only re-renders the *same* mounted
  instance, React reconciles against the same existing DOM nodes for each
  wrapper `<div>` (no key changes, same element type/position in the tree),
  and a CSS `animation` does not restart on a same-node re-render even
  though `sectionMotionStyle(...)` is recomputed and reapplied on every
  render — restarting requires `animation-name` to pass through `none` or
  the element to be freshly created, neither of which happens here. Not
  manually exercised via live typing/toggling/saving (no browser available)
  — this is code-path reasoning against `TemplateEditor`'s own state
  machine.

- **R7** (full replay on remount — `editingAssignment` closed/reopened, or
  `editorKey` incrementing on return from `PresentationView`) — Code
  inspection of `Drawer.tsx` (unchanged by this feature, confirmed via
  `git diff` scope): `TemplateEditor` is rendered as `<TemplateEditor
  key={editorKey} assignment={editingAssignment} ... />` only inside
  `editingAssignment ? (...) : (...)` (line ~201-208). Setting
  `editingAssignment` back to `null` unmounts `TemplateEditor` entirely;
  setting it to a value again mounts a brand-new instance, whose `loading`
  starts `true` and flips to `false` after its own `loadTemplate()` call —
  creating the `space-y-6` subtree fresh, so every section's `animation`
  plays from the start again. Separately, `editorKey` (state in
  `Drawer.tsx`) is used as the `key` prop on `TemplateEditor`; per React's
  reconciliation rules, a changed `key` forces unmount of the old instance
  and mount of a new one regardless of any other props, which happens when
  returning from `PresentationView`'s `onClose` per `design.md`. Both paths
  are pre-existing in `Drawer.tsx`, untouched by this feature's diff — R7
  falls out of the existing mount structure, not from any new code. Not
  manually exercised via live open/close/reopen or Presentar/back (no
  browser available) — this is code-path reasoning against `Drawer.tsx`
  and `TemplateEditor.tsx`'s state machine together.

- **Scope confirmation** (loading/presenting spinner, per-control
  transitions, `AgendaEditor`'s drag opacity/outline unchanged) — `git diff`
  of the full file confirms zero changed lines inside the `if (loading ||
  presenting)` branch (lines 725-732, including its own `@keyframes spin`
  `<style>` tag), zero changed lines on the input's `border-color 150ms`
  transition, the buttons' `border-color 150ms, color 150ms` transitions,
  the timing toggle's `background 150ms` / `left 150ms` transitions, the
  Guardar button's `background 300ms, border-color 300ms, color 300ms`
  transition, or `AgendaEditor`'s `dragIndex`/`dragOver`-driven `opacity`/
  `outline` styling on its rows. All of those lines appear identically
  before and after the diff.

## Manual QA — task 7 checklist

All items below are **code-path/JSX reasoning**, not live browser
interaction (no dev server/browser tool available in this environment,
same constraint as both prior animation features). Where a specific
checklist bullet from `tasks.md` task 7 maps to a requirement already
proven above, it is cross-referenced rather than re-argued:

- "Open the drawer ... confirm all eight sections fade/settle in with a
  visible top-to-bottom stagger, none loop, and no control ... harder to
  see" — see R1/R2/R3 above. Verified by static reading of the JSX/diff,
  not live interaction.
- "Immediately after the drawer opens ... try clicking into the Título
  input and typing, dragging an agenda row, clicking a theme/font/size
  swatch, and tabbing through controls ... confirm every one of these works
  immediately" — see R5 above. Verified by static reading of the diff
  (absence of any interactivity-gating property), not a live click/keyboard
  test.
- "With the editor open, type in the title, toggle timing on/off, add and
  remove an agenda item, drag-reorder an agenda item, pick a different
  theme/font/size, and click Guardar; confirm no section replays its
  entrance fade" — see R6 above. Verified by code-path reasoning against
  the state machine, not a live re-render observation.
- "Toggle OS/browser reduce motion on, reload, and reopen the editor;
  confirm all eight sections appear instantly at full opacity/final
  position ... including on first paint" — see R4 above. Verified by
  reading `useReducedMotion.ts`'s SSR fallback and the helper's `{}`
  branch, not a live OS-setting toggle + reload.
- "Close the editor ... and reopen it ... confirm the full entrance
  animation replays ... open the editor, click Presentar, then close the
  presentation view; confirm the entrance animation replays again" — see R7
  above. Verified by reading `Drawer.tsx`'s `editingAssignment`/`editorKey`
  mount structure, not a live open/close/Presentar/back sequence.
- "Confirm the loading || presenting spinner is visually unchanged" — see
  "Scope confirmation" above. Verified by `git diff` showing zero changed
  lines in that branch.
- `design-check` skill run against `app/components/TemplateEditor.tsx` — see
  below.

## design-check skill result

Ran the check per `.claude/skills/design-check/SKILL.md` against `git diff
origin/main -- app/components/'*.tsx'`, which returns exactly the diff for
`app/components/TemplateEditor.tsx` (the only file under `app/components/`
changed by this feature):

- No hardcoded hex color introduced — the diff adds only an `import`
  statement, a module-level helper function, one hook call, one `<style>`
  tag whose `@keyframes` body uses only `opacity`/`transform` (no color
  values), eight `sectionMotionStyle(...)` calls, and five wrapper `<div>`s
  with no color-bearing props.
- No hardcoded `border-radius` introduced.
- No `fontSize` changes.
- No custom `boxShadow` introduced.

**No findings** — consistent with the existing design tokens; the change
introduces no new visual/token surface beyond motion properties, same
conclusion as both prior animation features (`changelog-empty-state-
animation`, `schedule-content-animation`).

## Lint / build / test / check-sdd-state

- `npm run lint` — passes, no output/errors.
- `npm run build` — passes (`next build`, Turbopack, compiled successfully,
  TypeScript check passed, all 14 pages generated). The only warning
  ("Failed to find font override values for font `Bitcount Grid Double`") is
  pre-existing and unrelated to this change.
- `npm run test` (Vitest) — passes, 1 file / 5 tests, all green. No new test
  was added for this feature: the change is entirely presentational JSX/CSS
  in `app/components/`, not logic in `lib/`, so per `docs/specs.md`'s
  traceability guidance the UI verification path (manual QA above) applies
  instead of a Vitest test.
- `npm run check-sdd-state` — passes: single active feature
  (`template-editor-content-animation`, `in_progress`), all `spec_ready+`
  features have their three spec files on disk, `feature_list.json` is
  consistent with `docs/specs.md`.
