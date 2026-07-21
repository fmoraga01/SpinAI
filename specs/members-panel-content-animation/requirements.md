# Requirements — members-panel-content-animation

Scope: the populated content of `app/components/MembersPanel.tsx` — the
"Equipo" tab of `Drawer.tsx`. The component's single root `<div>` has three
top-level content blocks, in this fixed top-to-bottom order: the "Agregar"
form (name input, optional email input, submit button), the list-or-empty-
state block (either the "Sin integrantes aún" empty state, or the
`<ul>` of member rows keyed by `m.id`), and the footer counter ("`N`
activos" / "`N` total"). The feature request ("animar el contenido de la
vista equipo") reads as this whole view's populated content, not a single
sub-part of it — see design.md for how that's reconciled with the file's
three structurally different blocks.

This is the fourth feature in this series, following
`changelog-empty-state-animation`, `schedule-content-animation`, and
`template-editor-content-animation` (all `done`, merged to `dev`). Settled
points from those three specs are cited, not re-derived, throughout.

Non-goals (explicit, not just implied):
- No change to the existing per-row interaction transition
  (`className="flex items-center justify-between transition-all
  duration-150"` on each `<li>`), which drives the active/inactive
  background-and-border style change — that is a separate concern from
  content entrance and must keep working exactly as it does today.
- No change to the existing `border-color` transitions on the "Agregar"
  form's two inputs or on the inline-edit name/email inputs.
- No change to the submit button's existing disabled-while-name-is-empty
  behavior, or to its own `transition-all duration-150` style transition.
- No change to the two-step delete confirmation (`confirmRemove` state, the
  "✕" → "¿Seguro?" text flip, the red styling, or the 3-second `setTimeout`
  that reverts it) or to the click-to-edit name/email pattern
  (`autoFocus`/`onBlur`/`onKeyDown` save-on-blur-or-Enter,
  cancel-on-Escape) — all pre-existing, unrelated interaction mechanisms.
- No change to `Drawer.tsx` — in particular, no `key` prop is added to the
  `<MembersPanel .../>` call site; the replay behavior in R9 below relies on
  its current absence, not on new code.

- **R1** — WHEN `MembersPanel` first renders (i.e. on mount) THEN the
  system SHALL play a one-time entrance animation (fade combined with a
  slight vertical translate) on each of its three top-level content
  blocks — the "Agregar" form, the list-or-empty-state block, and the
  footer counter — without looping or repeating.

- **R2** — WHEN the three top-level blocks mount together THEN the system
  SHALL stagger their entrance animations using a fixed per-block delay of
  `30ms` multiplied by each block's fixed top-to-bottom position (0-indexed:
  "Agregar" form = `0`, list-or-empty-state block = `1`, footer counter =
  `2`), so the form's entrance starts immediately with no delay and the
  view settles top-to-bottom.

- **R3** — WHEN the list-or-empty-state block renders the empty state ("Sin
  integrantes aún" / "Agrega el primero arriba", shown when
  `members.length === 0`) THEN the system SHALL play its entrance animation
  as a single visual unit, at that block's own delay per R2, without
  staggering the heading and description text separately from each other
  (no keyframe step where one is legible before the other).

- **R4** — WHEN the list-or-empty-state block instead renders one or more
  member rows (each `<li>` keyed by `m.id`) THEN the system SHALL play a
  one-time entrance animation on each row individually (fade combined with
  a slight vertical translate), staggered using a per-row delay layered on
  top of that block's own base delay from R2 — specifically
  `(1 + min(index, 8)) * 30ms`, where `index` is the row's 0-indexed
  position in the `members` array — so a long roster's stagger is capped
  and doesn't stretch the visible entrance out indefinitely.

- **R5** — WHEN any block's or row's entrance animation plays THEN the
  system SHALL run it for `220ms` using a linear or ease-in-out ("standard
  curve") timing function, not a bounce/overshoot/spring curve, and SHALL
  apply the fade/translate to that block or row as a single unit — never as
  separate, independently timed animations on its inner controls (the two
  "Agregar" inputs and its submit button; a row's toggle button, name,
  email, and delete button; the two footer counter spans) — so no part of
  an already-mounted block or row is ever harder to read mid-animation than
  the rest of that same block or row.

- **R6** — IF the user's OS/browser reports `prefers-reduced-motion: reduce`
  THEN the system SHALL render all three blocks, and every row, with no
  motion — full opacity, final position, no delay — including on the
  server-rendered/first paint before any client-side media-query check
  resolves, reusing `usePrefersReducedMotion()` from
  `app/state-of-ai/useReducedMotion.ts` per the precedent already
  established in `specs/changelog-empty-state-animation/design.md`,
  `specs/schedule-content-animation/design.md`, and
  `specs/template-editor-content-animation/design.md` (not re-litigated
  here).

- **R7** — WHILE any block's or row's entrance animation (including its
  stagger delay window) is playing THEN every interactive control in
  `MembersPanel` — the "Agregar" form's name input, email input, and submit
  button; each row's active/inactive toggle button, click-to-edit name
  affordance, click-to-edit email affordance, and delete/confirm button —
  SHALL remain immediately focusable, clickable, and editable exactly as if
  no animation were running; the system SHALL NOT apply
  `pointer-events: none`, the `disabled` attribute (beyond the submit
  button's existing, unrelated empty-name behavior), `visibility`,
  `display`, or any other mechanism that gates a control's interactivity on
  that block's or row's animation state or completion.

- **R8** — WHEN an action (`onAdd`, `onToggle`, `onRemove`,
  `onUpdateEmail`, or `onUpdateName`) causes `Drawer`'s `refresh()` to
  re-render `MembersPanel` with an updated `members` prop, within the same
  mounted instance, THEN the system SHALL NOT replay the entrance animation
  described in R1–R5 on the "Agregar" form block, the footer block, or on
  any row whose `m.id` already existed before the refresh (React preserves
  each existing row's DOM node via the existing `key={m.id}`); only a row
  whose `m.id` is newly present in the `members` array (created by `onAdd`)
  SHALL play the entrance animation described in R4, and only on that
  occurrence.

- **R9** — WHEN `MembersPanel` unmounts and a new instance mounts later —
  i.e. the drawer's active tab changes away from "equipo" and back to
  "equipo" (`Drawer.tsx` renders `MembersPanel` with no `key` prop,
  conditioned on `drawer === "equipo"`, so switching tabs away removes it
  from the tree and switching back mounts a wholly new instance) — THEN the
  system SHALL replay the full entrance animation described in R1–R5 on
  that new instance, exactly as on the first time the "Equipo" tab was
  opened.
