# Requirements — project-detail-content-animation

Scope: the **view-mode** content of `app/proyectos/ProjectDrawer.tsx` — the
branch rendered when `formMode === "view" && !loading && !error && project
!== null` (i.e. the drawer is open on an existing project and showing its
detail, not the create/edit form, not the loading spinner, not the
error/not-found state). Read top-to-bottom, that branch is a fixed sequence
of six content blocks:

- **Block 0** — the `firstUpdateError` paragraph (conditional: only rendered
  when a project was just created and its first weekly update failed to
  save).
- **Block 1** — the "Resumen de la iniciativa" label and the rich-text
  summary (`renderFormattedText(project.summary)`), two sibling elements.
- **Block 2** — the metadata line ("País: X · Negocio: Y").
- **Block 3** — the "Avance semanal" section header (the uppercase label and
  the "Agregar avance" button, one row).
- **Block 4** — `AddUpdateForm` (conditional: only rendered while
  `addingUpdate` is `true`).
- **Block 5** — `ProjectTimeline`, always rendered; internally it renders
  either its own empty state ("Este proyecto todavía no tiene avances
  semanales registrados.") or one row per weekly update, each row keyed by
  `update.id` and containing the timeline dot, the week label, the
  rich-text note, and the edit/delete controls.

This is the fifth feature in this series, following
`changelog-empty-state-animation`, `schedule-content-animation`,
`template-editor-content-animation`, and `members-panel-content-animation`
(all `done`, merged to `dev`). Settled points from those four specs —
duration, easing, translate distance, stagger interval, row-count cap,
`animation-fill-mode: backwards`, and the reduced-motion mechanism — are
cited, not re-derived, throughout; see `design.md` for the citations and for
the one open question (easing) that research raised against that precedent.

Non-goals (explicit, not just implied):
- No change to the create/edit form (`ProjectForm.tsx`), the loading
  spinner, or the error/not-found state — this feature is scoped to the
  view-mode detail content only, per the feature request ("contenido de
  detalle").
- No change to the drawer's own open/close slide/backdrop transition (the
  `visible`/`mounted` state machine and its `transform`/`opacity`
  transitions in `ProjectDrawer.tsx`) — that is a separate, pre-existing
  concern from this feature's content-entrance animation.
- No change to any existing hover/interaction transition: the header
  close button's `border-color`/`color` transition, the "Agregar avance"
  button's `border-color`/`color` transition, `ProjectTimeline`'s
  `.proyecto-timeline-row` hover reveal of `.proyecto-timeline-row-actions`,
  the inline edit/cancel/save button transitions, or the two-step delete
  confirmation (`confirmDeleteId`, the "Eliminar" → "¿Seguro?" flip, and its
  3-second auto-revert `setTimeout`) — all pre-existing, unrelated
  interaction mechanisms.
- No change to `AddUpdateForm.tsx`'s or `WeeklyUpdateFields.tsx`'s own
  internal markup or props beyond what's needed to wrap `AddUpdateForm`'s
  existing call site for Block 4's entrance (see design.md).
- No `key` prop added to `<ProjectDrawer .../>` in `app/proyectos/page.tsx`
  — the replay behavior in R10 below relies on `ProjectDrawer`'s existing
  internal branch-switching, not on new remount plumbing at the page level.

- **R1** — WHEN the view-mode content branch of `ProjectDrawer` mounts
  (i.e. a fresh instance of Blocks 0–5 enters the tree) THEN the system
  SHALL play a one-time entrance animation (fade combined with a slight
  vertical translate) on each of Blocks 0–5 that is actually rendered at
  that moment, without looping or repeating.

- **R2** — WHEN Blocks 0–5 mount together THEN the system SHALL stagger
  their entrance animations using a fixed per-block delay of `30ms`
  multiplied by each block's fixed position (0-indexed exactly as listed
  above: `firstUpdateError` = `0`, resumen = `1`, metadata = `2`, avance
  header = `3`, `AddUpdateForm` = `4`, `ProjectTimeline` = `5`), regardless
  of whether Block 0 or Block 4 happen to be absent on a given mount — a
  block's delay SHALL depend only on its fixed position in this list, never
  on how many of the other blocks are currently rendered.

- **R3** — WHEN Block 1 (resumen), Block 2 (metadata), or Block 3 (avance
  header) renders THEN the system SHALL play that block's entrance
  animation as a single visual unit at that block's own delay per R2,
  without staggering its constituent parts separately from each other (the
  resumen label vs. its rich-text body; the avance header's label vs. its
  "Agregar avance" button) — no keyframe step where one part of the block is
  legible while a sibling part of the same block is not.

- **R4** — WHEN `ProjectTimeline` (Block 5) renders one or more weekly-update
  rows (each row keyed by `update.id`) THEN the system SHALL play a one-time
  entrance animation on each row individually (fade combined with a slight
  vertical translate, applied to the row's timeline dot and its content
  together as one unit — never staggering the dot separately from its
  content), staggered using a per-row delay layered on top of Block 5's own
  base delay from R2 — specifically `(6 + min(index, 8)) * 30ms`, where
  `index` is the row's 0-indexed position in the sorted (most-recent-first)
  list of updates — so a long history's stagger is capped and doesn't
  stretch the visible entrance out indefinitely.

- **R5** — WHEN `ProjectTimeline` (Block 5) instead renders its own empty
  state ("Este proyecto todavía no tiene avances semanales registrados.")
  THEN the system SHALL play its entrance animation as a single visual
  unit, at Block 5's own delay per R2 (i.e. `150ms`), not the row formula in
  R4.

- **R6** — WHEN any block's or row's entrance animation (R1–R5) plays THEN
  the system SHALL run it for `220ms` using a linear or ease-in-out
  ("standard curve") timing function, not a bounce/overshoot/spring curve.

- **R7** — IF the user's OS/browser reports `prefers-reduced-motion:
  reduce` THEN the system SHALL render every block and every row with no
  motion — full opacity, final position, no delay — including on the
  server-rendered/first paint before any client-side media-query check
  resolves, reusing `usePrefersReducedMotion()` from
  `app/state-of-ai/useReducedMotion.ts` per the precedent already
  established in the four prior animation specs (not re-litigated here).

- **R8** — WHILE any block's or row's entrance animation (including its
  stagger delay window) is playing THEN every interactive control within
  the view-mode content — the "Agregar avance" button; `AddUpdateForm`'s
  date/note fields and its "Cancelar"/"Agregar" buttons; and, per row,
  the hover-revealed "Editar"/"Eliminar" actions, the inline edit fields,
  and the "Cancelar"/"Guardar" or "Eliminar"/"¿Seguro?" buttons — SHALL
  remain immediately focusable, clickable, and editable exactly as if no
  animation were running; the system SHALL NOT apply `pointer-events:
  none`, a new `disabled` condition, `visibility`, `display`, or any other
  mechanism that gates a control's interactivity on that block's or row's
  animation state or completion.

- **R9** — WHEN an action re-renders the already-mounted view-mode content
  branch without unmounting it — specifically: `handleAddUpdate`,
  `handleEditUpdate`, or `handleDeleteUpdate` updating `project.updates`;
  `firstUpdateError` being set after a failed first-update save; or
  `addingUpdate` toggling `AddUpdateForm` on/off — THEN the system SHALL NOT
  replay the entrance animation on any block or row whose DOM node already
  existed before the update (React preserves it via the branch's stable
  tree position for Blocks 1/2/3/5's wrapper and via `key={update.id}` for
  each pre-existing row); only a block or row whose DOM node is newly
  created by that specific action — Block 0 appearing for the first time,
  Block 4 appearing when `addingUpdate` flips to `true`, or a new row
  created by `handleAddUpdate` — SHALL play its entrance animation, and
  only on that occurrence.

- **R10** — WHEN the view-mode content branch itself unmounts and a new
  instance mounts later — i.e. `formMode`/`loading`/`error`/`project`
  changes such that `ProjectDrawer`'s render switches away from the view
  branch and back to it (opening the drawer on any project from closed;
  switching from one project to another while the drawer stays open, which
  passes through the loading-spinner branch in between per
  `ProjectDrawer`'s existing `projectId` effect; or returning to view mode
  after `handleFormSubmit` resolves from create/edit) — THEN the system
  SHALL replay the full entrance animation described in R1–R6 on that new
  instance's Blocks 0–5, exactly as on the first time that project's detail
  was shown.
