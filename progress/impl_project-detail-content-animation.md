# Implementation — project-detail-content-animation

## Files changed

- `app/proyectos/ProjectDrawer.tsx`
  - Imported `usePrefersReducedMotion` from
    `@/app/state-of-ai/useReducedMotion` and called it once at the top of
    `ProjectDrawer()` (`const reduced = usePrefersReducedMotion();`),
    alongside the existing `useState` calls.
  - Added a module-level helper `blockMotionStyle(index: number, reduced:
    boolean): React.CSSProperties` (`{}` when `reduced`, else `{ animation:
    "proyectoDetailIn 220ms ease-in-out backwards", animationDelay:
    \`${index * 30}ms\` }`).
  - Added the `@keyframes proyectoDetailIn { from { opacity: 0; transform:
    translateY(4px); } to { opacity: 1; transform: translateY(0); } }` rule
    to the file's existing `<style>` tag (the one that already carries the
    `.proyecto-rich-text` rules).
  - Merged `blockMotionStyle(0, reduced)` into the `firstUpdateError` `<p>`'s
    existing `style` object (Block 0).
  - Merged `blockMotionStyle(1, reduced)` into *both* the "Resumen de la
    iniciativa" label `<p>` and the rich-text summary `<div
    className="proyecto-rich-text" ...>`'s existing `style` objects, unchanged
    otherwise — no wrapping element added (Block 1, R3).
  - Merged `blockMotionStyle(2, reduced)` into the "País: X · Negocio: Y"
    line's existing `style` object (Block 2).
  - Merged `blockMotionStyle(3, reduced)` into the "Avance semanal" header
    `<div>`'s existing `style` object (Block 3).
  - Wrapped the existing `{addingUpdate && (<AddUpdateForm .../>)}` call in a
    new `<div style={blockMotionStyle(4, reduced)}>...</div>` — `AddUpdateForm.tsx`
    itself untouched (Block 4).
  - Passed `reduced={reduced}` to the existing `<ProjectTimeline
    updates={project.updates} onEdit={handleEditUpdate}
    onDelete={handleDeleteUpdate} />` call site.
- `app/proyectos/ProjectTimeline.tsx`
  - Added `reduced: boolean` to `Props`, threaded into the destructured
    component signature.
  - Added the same `@keyframes proyectoDetailIn` rule to this file's own
    existing `<style>` tag (the one already duplicating `.proyecto-rich-text`
    between the two files, per design.md's precedent for that duplication).
  - Added two module-level helpers: `emptyStateMotionStyle(reduced:
    boolean): React.CSSProperties` (delay `150ms`) and `rowMotionStyle(index:
    number, reduced: boolean): React.CSSProperties` (delay `(6 +
    Math.min(index, 8)) * 30ms`), both hardcoding Block 5's fixed position per
    design.md's "Scope decision" (single call site, no `baseIndex` prop).
  - Merged `emptyStateMotionStyle(reduced)` into the empty-state `<div>`'s
    existing `style` object (the `groups.length === 0` early return).
  - Merged `rowMotionStyle(gi, reduced)` into each row's outer `<div
    key={group.key} style={{ display: "flex", gap: 20 }}>` — the element
    wrapping both the timeline dot/rail and the week's content column, so
    the dot and its content fade in together as one unit.
- `specs/project-detail-content-animation/tasks.md` — checked off tasks 1-14.

No other files touched. `app/proyectos/page.tsx`, `ProjectForm.tsx`,
`AddUpdateForm.tsx`, and `WeeklyUpdateFields.tsx` were read to confirm scope
boundaries (per design.md's "Touches" section and non-goals) but not edited —
confirmed by `git status`/`git diff` showing only the two files above as
changed.

## Deviations from spec

None. The implementation matches `design.md`'s helper signatures, keyframe
definitions, and call sites verbatim (`blockMotionStyle(0-4, ...)` on Blocks
0-4 in `ProjectDrawer.tsx`; `emptyStateMotionStyle`/`rowMotionStyle` hardcoded
for Block 5 in `ProjectTimeline.tsx`), and `tasks.md`'s wording exactly,
including the wrapping-`<div>` choice for Block 4 and the two-elements-share-
one-delay choice for Block 1.

## Environment note

This environment has no real browser/GUI (same constraint noted in the four
prior animation features' progress files — `changelog-empty-state-animation`,
`schedule-content-animation`, `template-editor-content-animation`,
`members-panel-content-animation`). `npm run dev` was not launched
interactively as a browser session; all "manual QA" below is **code-path
reasoning against the actual diff and the referenced files**
(`ProjectDrawer.tsx`, `ProjectTimeline.tsx`, `useReducedMotion.ts`), not a
live visual/interactive check, and is flagged as such per item rather than
claimed as hands-on observed.

## Requirement traceability

- **R1** (one-time entrance fade+translate on each rendered Block 0-5, no
  looping) — Code inspection: `animation: "proyectoDetailIn 220ms
  ease-in-out backwards"` is set via `blockMotionStyle`/`emptyStateMotionStyle`/
  `rowMotionStyle` on each block's/row's own element, with no
  `animation-iteration-count` specified anywhere in the diff — defaults to
  `1` per the CSS spec, so it cannot loop. Not visually confirmed (no browser
  available).

- **R2** (fixed `30ms * index` stagger for Blocks 0-5, independent of which
  other blocks are present) — Code inspection: `blockMotionStyle(0..4,
  reduced)` calls are hardcoded to each block's fixed position in the JSX
  (`firstUpdateError`=0, resumen=1, metadata=2, avance header=3,
  `AddUpdateForm`=4) regardless of whether Block 0 or Block 4 are actually
  rendered on a given mount — each call site is unconditional inside its own
  `{cond && (...)}` branch, so the *value* passed to the helper never depends
  on sibling presence. Block 5's own base delay (`150ms` for the empty state,
  `6 * 30ms` anchor for rows) is likewise hardcoded, not derived from a count.
  Not visually confirmed (no browser available).

- **R3** (Blocks 1/2/3 animate as one visual unit each, no sub-stagger of
  their constituent parts) — Code inspection: Block 1's label `<p>` and
  rich-text `<div>` both receive `blockMotionStyle(1, reduced)` — the *same*
  delay value, so they fade in at the same instant. Block 2's metadata `<div>`
  is the single element carrying `blockMotionStyle(2, reduced)`; its three
  `<span>` children received no `animation`/`animationDelay` of their own
  (confirmed by the diff showing zero changed lines inside those `<span>`s).
  Block 3's header `<div>` (wrapping the label and the "Agregar avance"
  button) is the single element carrying `blockMotionStyle(3, reduced)`;
  neither the label `<p>` nor the button received their own animation. Not
  visually confirmed (no browser available).

- **R4** (per-row stagger `(6 + min(index, 8)) * 30ms`, dot+content as one
  unit, capped) — Code inspection: `groups.map((group, gi) => ...)` yields
  each row's 0-indexed position in the sorted (most-recent-first) list;
  `rowMotionStyle(gi, reduced)` is merged into the row's outer `<div
  key={group.key} style={{ display: "flex", gap: 20, ...rowMotionStyle(gi,
  reduced) }}>` — the element that wraps *both* the timeline dot/rail column
  and the week's content column, so they fade in together. The formula caps
  at `index = 8` via `Math.min(index, 8)`, so row 8+ all share the same
  `270ms` (`(6+8)*30`) delay. Not visually confirmed (no browser available).

- **R5** (empty state animates as a single visual unit at Block 5's own
  `150ms` delay, not the row formula) — Code inspection:
  `emptyStateMotionStyle(reduced)` returns a fixed `animationDelay: "150ms"`
  independent of any row index, and is merged only into the empty-state
  `<div>` (the sole element in that branch — its child `<p>` is unstyled by
  this feature). Not visually confirmed (no browser available).

- **R6** (`220ms`, `ease-in-out`, no bounce/spring) — Code inspection: the
  literal string `"proyectoDetailIn 220ms ease-in-out backwards"` appears
  identically in all three helpers (`blockMotionStyle`,
  `emptyStateMotionStyle`, `rowMotionStyle`) — `220ms` duration,
  `ease-in-out` easing, no bounce/overshoot/spring keyword anywhere in the
  diff. Not visually confirmed (no browser available).

- **R7** (reduced motion: full opacity/final position, no delay, including
  first paint) — Code inspection: `usePrefersReducedMotion()`'s SSR fallback
  (third argument to `useSyncExternalStore` in
  `app/state-of-ai/useReducedMotion.ts`) is `() => true`, so the very first
  server-rendered paint already has `reduced === true`, and every
  `blockMotionStyle`/`emptyStateMotionStyle`/`rowMotionStyle` call returns
  `{}` — no `animation`/`animationDelay` property at all. `reduced` is
  computed once in `ProjectDrawer` and threaded into `ProjectTimeline` as a
  prop, so both files' helpers see the same value on every render. Not
  visually confirmed (no browser available) — this is the same hook, used
  identically, already accepted in `Schedule.tsx`, `ChangeLog.tsx`,
  `TemplateEditor.tsx`, and `MembersPanel.tsx`.

- **R8** (no control's interactivity gated on animation state) — Code
  inspection: grepped the full diff (`git diff app/proyectos/ProjectDrawer.tsx
  app/proyectos/ProjectTimeline.tsx`) and confirmed the only properties
  introduced anywhere are `animation` and `animationDelay` (plus the
  `<style>` keyframes body, which itself only sets `opacity`/`transform`).
  Neither `pointer-events`, a new `disabled` condition, `visibility`, nor
  `display` appears anywhere in the diff. None of the interactive descendants
  ("Agregar avance" button, `AddUpdateForm`'s fields/buttons, each row's
  hover-revealed "Editar"/"Eliminar" actions, inline edit fields, and
  "Cancelar"/"Guardar" or "Eliminar"/"¿Seguro?" buttons) had any
  `onClick`/`onChange`/`disabled`/`autoFocus` prop added or removed — only
  the *wrapping* elements (the `<p>`/`<div>` blocks, the new Block-4 wrapper
  `<div>`, each row's outer `<div>`) gained or merged a `style` prop. Since
  `opacity`/`transform`/`animation` never affect hit-testing, focus order, or
  the accessibility tree, and no gating mechanism was added, R8 holds by
  construction. Not manually clicked/typed into during the animation window
  (no browser available) — this is code-path reasoning against the actual
  diff, not a live interaction test.

- **R9** (no replay on same-branch updates; only a newly-created block/row
  plays its entrance) — Code inspection of `ProjectDrawer.tsx`:
  `handleAddUpdate`, `handleEditUpdate`, and `handleDeleteUpdate` all call
  `setProject(...)` without ever touching `formMode`/`loading`/`error` — the
  view branch's condition (`formMode === "view" && !loading && !error &&
  project !== null`) stays `true` throughout, so React reconciles Blocks
  1/2/3/5's wrapper in place rather than unmounting/remounting them; their
  `animation` inline-style value is recomputed identically on every render of
  the same instance (same string, same node), so nothing re-triggers the CSS
  animation (it only fires on DOM-node creation, not on style reapplication).
  `ProjectTimeline`'s rows are each `key={group.key}` (i.e. `update.id`,
  unchanged by this diff), so a pre-existing row's DOM node survives an
  update/delete of a *different* row; only `handleAddUpdate` introduces a
  genuinely new `update.id`, giving that one new row's `<div>` a freshly
  created DOM node — the only row whose `animation` fires on that occurrence.
  Block 0 (`firstUpdateError`) and Block 4 (`AddUpdateForm`'s wrapper) are
  each independently conditionally rendered (`{cond && (...)}`); when either
  flips from absent to present within an already-mounted view branch, that
  specific block's own element is a new DOM node and plays its entrance once,
  without touching any sibling block (confirmed: each conditional's JSX is
  independent of the others in the diff). Not manually exercised via live
  add/edit/delete (no browser available) — this is code-path reasoning
  against the `key={group.key}` reconciliation structure and the unchanged
  `formMode`/`loading`/`error` state transitions in the handlers.

- **R10** (full replay on view-branch remount: closed→open, project A→B,
  form→view) — Code inspection of `ProjectDrawer.tsx` (unchanged control
  flow, confirmed by `git diff` showing zero changed lines in the three
  `useEffect`s and `handleFormSubmit`/`handleFormCancel`):
  1. Closed→open: `if (!mounted) return null;` unmounts everything, including
     the view branch, when `isOpen` is `false`; the `useEffect` on `isOpen`
     sets `mounted` back to `true` on open, mounting a fresh view-branch
     subtree.
  2. Project A→B while the drawer stays open: the `useEffect` on
     `[projectId, mode]` unconditionally does `setFormMode("view");
     setLoading(true);` before `loadProject` resolves, which renders the
     loading-spinner branch (a different JSX position) for at least one
     render — unmounting project A's view-branch subtree; when `loadProject`
     resolves, a new view-branch subtree mounts for project B.
  3. Form→view: `handleFormSubmit` calls `setFormMode("view")` only after
     `createProject`/`updateProject` resolves; before that, `formMode ===
     "form"` renders `ProjectForm` instead (a different JSX position),so
     switching back to `"view"` mounts a fresh view-branch subtree.

  In all three cases Blocks 0-5 (whichever are present on that mount) get
  freshly created DOM nodes and their `animation` fires again from the start.
  Not manually exercised via live drawer open/close/switch (no browser
  available) — this is code-path reasoning against `ProjectDrawer`'s
  existing four-way branch structure (form / loading / error-or-null /
  view), confirmed untouched by this diff.

- **Scope confirmation** (task 11 — no interference with existing behavior)
  — `git diff` of both files confirms zero changed lines on: the drawer's
  open/close `visible`/`mounted` transition logic and its `transform`/
  `opacity` transitions; the header close button's `border-color`/`color`
  hover transitions; the "Agregar avance" button's `border-color`/`color`
  hover transitions; the `Escape`-to-close `onKey` handler;
  `ProjectTimeline`'s `.proyecto-timeline-row` hover reveal of
  `.proyecto-timeline-row-actions`; the inline edit
  (`startEdit`/`cancelEdit`/`confirmEdit`) flow; the two-step delete
  confirmation (`confirmDeleteId`, its 3-second `setTimeout`, and the
  "Eliminar"→"¿Seguro?" flip); every `key={group.key}` on the rows.
  `git status`/`git diff --stat` confirm only `ProjectDrawer.tsx` and
  `ProjectTimeline.tsx` changed — `app/proyectos/page.tsx` was not touched at
  all, and grepping the repo confirms no `key` prop was added to
  `<ProjectDrawer .../>` there.

- **Task 12** (non-blocking interactivity by reading the diff) — see R8
  above; the same grep of the full diff confirms the only CSS properties
  introduced anywhere are `opacity`, `transform`, `animation`, and
  `animation-delay`.

## Manual QA — task 13 checklist

All items below are **code-path/JSX reasoning**, not live browser
interaction (no dev server/browser tool available in this environment, same
constraint as the four prior animation features):

- "Open the drawer on a project with zero weekly updates ... confirm the
  resumen, metadata, avance header, and the timeline's empty state all
  fade/settle in top-to-bottom without looping, each block as a single
  visual unit" — see R1/R2/R3/R5/R6 above. Verified by static reading of the
  JSX/diff, not live interaction.
- "Open the drawer on a project with 3+ weekly updates ... confirm the rows
  fade/settle in staggered top-to-bottom (most-recent-first order) after
  Block 5's own delay, and that no dot/content pairing or edit/delete
  control is ever harder to read mid-animation than the rest of its own row"
  — see R1/R4/R6 above; `groups` is sorted `b.weekOf.localeCompare(a.weekOf)`
  (most-recent-first, unchanged by this diff) and `gi` is that sorted array's
  index, so row 0 (most recent) gets the smallest stagger delay. Verified by
  static reading of the JSX/diff, not live interaction.
- "Immediately after opening ... try hovering a row to reveal its actions,
  clicking 'Editar', clicking 'Agregar avance', and typing into
  `AddUpdateForm`'s fields ... confirm every one of these responds
  immediately" — see R8 above. Verified by static reading of the diff
  (absence of any interactivity-gating property), not a live click/keyboard
  test.
- "With the drawer open on a populated project, add a new weekly update ...
  confirm only the newly-added row plays an entrance fade ... Then edit an
  existing update's note and delete a different update; confirm neither
  causes any block or unrelated row to replay" — see R9 above. Verified by
  code-path reasoning against the `key={group.key}` reconciliation structure
  and the unchanged `setProject`-only handlers, not a live re-render
  observation.
- "With the drawer open on project A, click a different project's card
  ... confirm the brief loading state appears and then project B's full
  entrance plays from the start" — see R10 (case 2) above. Verified by
  reading the `[projectId, mode]` `useEffect`'s branch-switching, not a live
  project-switch.
- "Close the drawer and reopen it on the same project ... confirm the full
  entrance replays" — see R10 (case 1) above. Verified by reading the
  `mounted`/`isOpen` `useEffect`, not a live close/reopen.
- "Open the drawer, switch to edit mode, save the edit ... confirm the full
  entrance replays on the return to view" — see R10 (case 3) above. Verified
  by reading `handleFormSubmit`'s `setFormMode("view")` timing, not a live
  edit/save.
- "Trigger a first-update-save failure ... confirm Block 0's
  `firstUpdateError` paragraph fades in on its own, without affecting Blocks
  1-5" — see R9 above (Block 0's independent `{firstUpdateError && (...)}`
  conditional). Verified by inspecting `handleFormSubmit`'s catch branch that
  sets `firstUpdateError` without touching `formMode`/`project`, not a live
  triggered failure.
- "Toggle OS/browser 'reduce motion' on, reload, and reopen the drawer (both
  on an empty-timeline project and a populated one) ... confirm every block
  and row appears instantly at full opacity/final position with no
  animation, including on first paint" — see R7 above. Verified by reading
  `useReducedMotion.ts`'s SSR fallback and each helper's `{}` branch, not a
  live OS-setting toggle + reload.
- `design-check` skill run against `app/proyectos/ProjectDrawer.tsx` and
  `app/proyectos/ProjectTimeline.tsx` — see below.

## design-check skill result

The skill's default scope (`git diff origin/main -- app/components/'*.tsx'`)
does not cover this feature's files (they live under `app/proyectos/`, not
`app/components/`), so it was run explicitly against the two changed files'
diff instead, applying the same reference tokens and "what to flag" criteria
from `.claude/skills/design-check/SKILL.md`:

- **Hex color bypassing an existing token / new hex color with no matching
  token**: grepped the diff for hex literals — the only hex color present on
  any changed line (`#F87171`) is a pre-existing value on the
  `firstUpdateError` `<p>` and the two rich-text `<div>`s, unchanged by this
  feature (it already appears, untouched, on `editError`/`deleteError`
  elsewhere in `ProjectTimeline.tsx`); this diff only appended
  `...blockMotionStyle(...)`/`...rowMotionStyle(...)` spreads to those lines'
  existing style objects. No new hex color was introduced anywhere.
- **Hardcoded border-radius**: none introduced — the diff adds only an
  `import`, module-level helper functions, one hook call, `<style>`
  `@keyframes` bodies (`opacity`/`transform` only), and `style` merges
  limited to `animation`/`animationDelay`.
- **`fontSize` outside the established scale**: none introduced — every
  `fontSize` value on a changed line is a pre-existing value, unchanged by
  this diff.
- **Custom `boxShadow`**: none introduced.

**No findings** — consistent with the four prior animation features'
conclusions; this change introduces no new visual/token surface beyond
motion properties (`animation`, `animation-delay`, and the keyframes'
`opacity`/`transform`).

## Lint / build / test / check-sdd-state

- `npm run lint` — passes, no output/errors.
- `npm run build` — passes (`next build`, Turbopack, compiled successfully,
  TypeScript check passed, all 26 pages generated). The only warning
  ("Failed to find font override values for font `Bitcount Grid Double`") is
  pre-existing and unrelated to this change.
- `npm run test` (Vitest) — passes, 4 files / 36 tests, all green. No new
  test was added for this feature: the change is entirely presentational
  JSX/CSS in `app/proyectos/`, not logic in `lib/`, so per `docs/specs.md`'s
  traceability guidance the manual-QA path above applies instead of a Vitest
  test.
- `npm run check-sdd-state` — passes: single active feature
  (`project-detail-content-animation`, `in_progress`), all `spec_ready+`
  features have their three spec files on disk, `feature_list.json` is
  consistent with `docs/specs.md`.
- `npm run verify` (all four of the above in sequence) — passes end to end.
