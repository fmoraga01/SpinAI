# Implementation — members-panel-content-animation

## Files changed

- `app/components/MembersPanel.tsx`
  - Imported `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
    and called it once, unconditionally, at the top of `MembersPanel()`
    (`const prefersReducedMotion = usePrefersReducedMotion();`), alongside the
    existing `useState` calls.
  - Added two module-level helpers (next to the component, above it):
    `blockMotionStyle(index: number, reduced: boolean): React.CSSProperties`
    (`{}` when `reduced`, else `{ animation: "membersPanelIn 220ms
    ease-in-out backwards", animationDelay: \`${index * 30}ms\` }`) and
    `rowMotionStyle(index: number, reduced: boolean): React.CSSProperties`
    (`{}` when `reduced`, else `{ animation: "membersPanelIn 220ms
    ease-in-out backwards", animationDelay: \`${(1 + Math.min(index, 8)) *
    30}ms\` }`).
  - Added an inline `<style>` tag defining `@keyframes membersPanelIn { from
    { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform:
    translateY(0); } }` as the first child of the component's root `<div>`.
  - Applied `blockMotionStyle(0, prefersReducedMotion)` to the "Agregar"
    `<form>`'s `style` prop (it had none before).
  - Merged `blockMotionStyle(1, prefersReducedMotion)` into the empty-state
    `<div>`'s existing `style` object.
  - Changed `members.map((m) => ...)` to `members.map((m, index) => ...)` and
    merged `rowMotionStyle(index, prefersReducedMotion)` into each
    `<li key={m.id}>`'s existing `style` object.
  - Merged `blockMotionStyle(2, prefersReducedMotion)` into the footer
    counter `<div>`'s existing `style` object.
- `specs/members-panel-content-animation/tasks.md` — checked off tasks 1-10.

No other files touched. `app/components/Drawer.tsx` was read (to confirm the
mount/no-`key` structure R8/R9 rely on) but not edited, per task 7's explicit
instruction. No new dependencies, no schema/API changes.

## Deviations from spec

None. The implementation matches `design.md`'s helper signatures, keyframe
definition, and call sites verbatim (`blockMotionStyle(0/1/2, ...)` on the
form/empty-state/footer, `rowMotionStyle(index, ...)` per row), and
`tasks.md`'s wording exactly (including reusing the `members.map((m, index)
=> ...)` index-yielding form the task anticipated).

## Environment note

This environment has no real browser/GUI (same constraint as the three prior
animation features' progress files — `npm run dev` was not launched
interactively as a browser session; only `.claude/skills/design-check`, a
read-only diff-review skill, was run). All "manual QA" below is **code-path
reasoning against the actual diff and the referenced files**
(`MembersPanel.tsx`, `Drawer.tsx`, `useReducedMotion.ts`), not a live
visual/interactive check, and is flagged as such per item rather than
claimed as hands-on observed.

## Requirement traceability

- **R1** (one-time entrance fade+translate on each of the three top-level
  blocks on mount, no looping) — Code inspection: `animation: "membersPanelIn
  220ms ease-in-out backwards"` is set via `blockMotionStyle`/`rowMotionStyle`
  on the form's own `<form>` element, the empty-state's own `<div>` (or each
  row's own `<li>` when populated), and the footer's own `<div>`, with no
  `animation-iteration-count` specified anywhere in the diff — defaults to
  `1` per the CSS spec, so it cannot loop. Not visually confirmed (no browser
  available).

- **R2** (`30ms * index` stagger across the three fixed blocks — form=0,
  list-or-empty-state=1, footer=2) — Code inspection: `blockMotionStyle(0,
  ...)` on the form, `blockMotionStyle(1, ...)` on the empty-state `<div>`,
  and `blockMotionStyle(2, ...)` on the footer `<div>` compute delays of
  `0ms`, `30ms`, `60ms` respectively, matching the fixed top-to-bottom order
  in the JSX. Not visually confirmed (no browser available).

- **R3** (empty state animates as a single visual unit, heading and
  description not staggered relative to each other) — Code inspection:
  `blockMotionStyle(1, prefersReducedMotion)` is merged onto the empty-state
  `<div>`'s own `style` object only; the two `<p>` children (`Sin integrantes
  aún` / `Agrega el primero arriba`) received no `animation`/`animationDelay`
  of their own — confirmed by the diff showing zero changed lines inside
  those two `<p>` elements. A single `animation` on the shared wrapper means
  both lines fade/translate together as one unit. Not visually confirmed (no
  browser available).

- **R4** (per-row entrance, `(1 + min(index, 8)) * 30ms` delay, capped
  stagger) — Code inspection: `members.map((m, index) => ...)` now yields
  each row's 0-indexed array position, and `rowMotionStyle(index,
  prefersReducedMotion)` is merged into that row's own `<li key={m.id}>`
  `style` object, computing `(1 + Math.min(index, 8)) * 30ms` — row 0 starts
  at `30ms` (anchored to the list block's own base delay from R2), row 8+ all
  cap at `270ms`, matching the spec's formula and rationale (bounded worst
  case for a long roster). Not visually confirmed (no browser available).

- **R5** (220ms, ease-in-out/standard curve, single unit per block/row, never
  sub-staggered on inner controls) — Code inspection: `animation:
  "membersPanelIn 220ms ease-in-out backwards"` is the literal value in both
  helpers — `220ms` duration, `ease-in-out` easing (no bounce/spring
  keyword). Grepped the full diff and confirmed `animation`/`animationDelay`
  were added on exactly: the form `<form>`, the empty-state `<div>` (or, when
  populated, each row's `<li>`), and the footer `<div>` — and nowhere else:
  no `animation` property was added to either "Agregar" `<input>`, the
  submit `<button>`, a row's toggle button/name button/email button/delete
  button individually, or either footer `<span>`. Confirmed by reading the
  full diff line-by-line (see below).

- **R6** (reduced motion: full opacity/final position, no delay, including
  first paint) — Code inspection: `usePrefersReducedMotion()`'s SSR fallback
  (third argument to `useSyncExternalStore` in
  `app/state-of-ai/useReducedMotion.ts`) is `() => true`, so the very first
  server-rendered paint already has `prefersReducedMotion === true`, and
  every `blockMotionStyle`/`rowMotionStyle` call returns `{}` — no
  `animation`/`animationDelay` property at all, so every block and row
  renders directly at its authored opacity (1, implicit) and position, no
  delay. When the OS/browser later reports `prefers-reduced-motion: reduce`
  (real `matchMedia` value `true`), the same `{}` result holds for every
  subsequent render. Not visually confirmed (no browser available) — this is
  the same hook, used identically, already accepted in `Schedule.tsx`,
  `ChangeLog.tsx`, and `TemplateEditor.tsx`.

- **R7** (no control's interactivity gated on animation state — "Agregar"
  name/email inputs and submit button; each row's toggle button,
  click-to-edit name/email, delete/confirm button all stay immediately
  focusable/clickable/editable) — Code inspection: grepped the full diff and
  confirmed the only properties introduced anywhere are `animation` and
  `animationDelay` (plus the `<style>` keyframes body, which itself only
  sets `opacity`/`transform`). Neither `pointer-events`, a new `disabled`
  condition, `visibility`, nor `display` appears anywhere in the diff. None
  of the interactive descendants (`<input>`s, submit `<button disabled=
  {!name.trim()}>` — pre-existing, unrelated — toggle `<button>`, click-to-
  edit name/email `<button>`s, delete/confirm `<button>`) had any prop added
  or removed by this diff — their `onClick`/`onChange`/`onFocus`/`onBlur`/
  `onKeyDown`/`autoFocus` attributes are untouched, confirmed by the diff
  showing zero changed lines inside those elements' own JSX (only the
  *wrapping* `<form>`/`<div>`/`<li>` gained or merged a `style` prop). Since
  `opacity`/`transform`/`animation` never affect hit-testing, focus order, or
  the accessibility tree, and no gating mechanism was added, R7 holds by
  construction. Not manually clicked/typed into during the animation window
  (no browser available) — this is code-path reasoning against the actual
  diff, not a live interaction test.

- **R8** (no replay within one mounted instance on `onAdd`/`onToggle`/
  `onRemove`/`onUpdateEmail`/`onUpdateName`-triggered `refresh()`; only a
  newly-added row plays its entrance) — Code inspection of `Drawer.tsx`
  (read, not edited, confirmed via `git status`/`git diff` scope showing no
  changes to that file): every handler passed to `MembersPanel` calls its
  `lib/storage.ts` function then `refresh()`, which only does
  `setData(await loadData())` — it never remounts `MembersPanel` itself
  (no `key` on the `<MembersPanel .../>` call site, no conditional
  unmount/remount tied to these handlers). Each row keeps `key={m.id}`
  (unchanged by this diff), so React reconciles every existing row's `<li>`
  to its existing DOM node across a `refresh()`-triggered re-render — a CSS
  `animation` only fires on that node's *creation*, so it does not replay
  even though `rowMotionStyle(index, ...)` is recomputed and reapplied
  identically on every render (same value, same node, no restart). The form
  `<form>` and footer `<div>` are unconditionally rendered in the same tree
  position on every render of the same instance, so they're reconciled to
  their existing DOM nodes too, and their `animation` value is unchanged
  across the re-render — nothing re-triggers it. Only `onAdd` genuinely
  introduces a new `m.id` into the `members` array, giving that one new
  `<li>` a freshly-created DOM node — the only row whose `animation` fires on
  that occurrence. Not manually exercised via live add/toggle/edit/remove
  (no browser available) — this is code-path reasoning against
  `MembersPanel`'s `key={m.id}` structure and `Drawer.tsx`'s handler wiring.

- **R9** (full replay on remount when switching drawer tabs away from and
  back to "equipo") — Code inspection of `Drawer.tsx` (unchanged by this
  feature): `MembersPanel` is rendered only inside a `drawer === "equipo"`
  conditional, with no `key` prop. Switching the drawer to any other tab
  removes `MembersPanel` from the tree entirely (unmount); switching back to
  "equipo" mounts a wholly new instance with fresh DOM nodes for the form,
  the list-or-empty-state block, and every row — so `animation` fires again
  on all of them, replaying R1-R5 in full. This falls directly out of
  `Drawer.tsx`'s existing conditional-render/no-`key` structure, confirmed
  untouched by this diff. Not manually exercised via live tab-switching (no
  browser available) — this is code-path reasoning against `Drawer.tsx`'s
  mount structure.

- **Scope confirmation** (task 7 — no interference with existing behavior) —
  `git diff` of the full file confirms zero changed lines on: the `<li>`'s
  `transition-all duration-150` className; the submit button's
  disabled-while-empty-name logic and its own `transition-all duration-150`;
  the two `border-color 150ms ease` transitions on the "Agregar" inputs
  (with their `onFocus`/`onBlur` handlers); the inline-edit name/email
  `autoFocus`/`onBlur`/`onKeyDown` pattern; the `confirmRemove` two-step
  delete flow and its `setTimeout(..., 3000)`; every `key={m.id}` on the
  rows. `git status`/`git diff origin/main` confirm `Drawer.tsx` was not
  touched at all, and no `key` prop was added to the `<MembersPanel .../>`
  call site there.

## Manual QA — task 9 checklist

All items below are **code-path/JSX reasoning**, not live browser
interaction (no dev server/browser tool available in this environment, same
constraint as the three prior animation features). Where a checklist bullet
maps to a requirement already proven above, it is cross-referenced rather
than re-argued:

- "Open the drawer to an empty team ... confirm the form and empty state
  both fade/settle in with the form leading (no delay) and the empty state
  following shortly after, as a single unit" — see R1/R2/R3 above. Verified
  by static reading of the JSX/diff, not live interaction.
- "Add a few members ... reopen the 'Equipo' tab fresh ... confirm the form,
  then the rows (staggered top-to-bottom), then the footer all fade/settle
  in without looping, and that no control ... is ever harder to read
  mid-animation" — see R1/R2/R4/R5 above. Verified by static reading of the
  JSX/diff, not live interaction.
- "Immediately after the tab opens ... try typing into the name/email
  inputs, clicking a row's toggle circle, click-to-editing a row's name and
  email, and clicking a row's delete button ... confirm every one of these
  responds immediately" — see R7 above. Verified by static reading of the
  diff (absence of any interactivity-gating property), not a live
  click/keyboard test.
- "With the tab open and populated, add a new member ... confirm only the
  newly-added row plays an entrance fade and every pre-existing row does
  *not* replay. Then toggle/edit-name/edit-email/remove a member; confirm
  none of these replay any entrance" — see R8 above. Verified by code-path
  reasoning against the `key={m.id}` reconciliation structure, not a live
  re-render observation.
- "Switch the drawer away from 'Equipo' to another tab and back; confirm the
  full entrance animation replays" — see R9 above. Verified by reading
  `Drawer.tsx`'s conditional-render/no-`key` mount structure, not a live
  tab-switch.
- "Toggle OS/browser reduce motion on, reload, and reopen the 'Equipo' tab
  (empty and populated) ... confirm every block and row appears instantly at
  full opacity/final position ... including on first paint" — see R6 above.
  Verified by reading `useReducedMotion.ts`'s SSR fallback and each helper's
  `{}` branch, not a live OS-setting toggle + reload.
- `design-check` skill run against `app/components/MembersPanel.tsx` — see
  below.

## design-check skill result

Ran the check per `.claude/skills/design-check/SKILL.md` against `git diff
origin/main -- app/components/'*.tsx'`, which returns exactly the diff for
`app/components/MembersPanel.tsx` (the only file under `app/components/`
changed by this feature):

- No hardcoded hex color introduced — the diff adds only an `import`
  statement, two module-level helper functions, one hook call, one `<style>`
  tag whose `@keyframes` body uses only `opacity`/`transform` (no color
  values), four `blockMotionStyle(...)`/`rowMotionStyle(...)` call sites, and
  one `.map()` signature change (`(m) =>` to `(m, index) =>`) — no
  color-bearing props added anywhere.
- No hardcoded `border-radius` introduced.
- No `fontSize` changes.
- No custom `boxShadow` introduced.

**No findings** — consistent with the existing design tokens; the change
introduces no new visual/token surface beyond motion properties, same
conclusion as all three prior animation features
(`changelog-empty-state-animation`, `schedule-content-animation`,
`template-editor-content-animation`).

## Lint / build / test / check-sdd-state

- `npm run lint` — passes, no output/errors.
- `npm run build` — passes (`next build`, Turbopack, compiled successfully,
  TypeScript check passed, all 14 pages generated). The only warning
  ("Failed to find font override values for font `Bitcount Grid Double`") is
  pre-existing and unrelated to this change.
- `npm run test` (Vitest) — passes, 1 file / 5 tests, all green. No new test
  was added for this feature: the change is entirely presentational JSX/CSS
  in `app/components/`, not logic in `lib/`, so per `docs/specs.md`'s
  traceability guidance the manual-QA path above applies instead of a Vitest
  test.
- `npm run check-sdd-state` — passes: single active feature
  (`members-panel-content-animation`, `in_progress`), all `spec_ready+`
  features have their three spec files on disk, `feature_list.json` is
  consistent with `docs/specs.md`.
