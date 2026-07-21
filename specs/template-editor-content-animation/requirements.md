# Requirements — template-editor-content-animation

Scope: the populated content of `app/components/TemplateEditor.tsx` — the
entrance of its eight top-level sections once loading finishes: the
"Reunión asignada" badge, the "Título" input, `TimingSection`,
`AgendaEditor`, `ThemePicker`, `FontPicker`, `SizePicker`, and the actions
row (Volver / Guardar / Presentar). The feature request ("animar el
contenido de la vista preparar lámina") reads as this populated form
content, not the loading state.

Non-goals (explicit, not just implied):
- No change to the existing `loading || presenting` spinner branch (the
  `@keyframes spin` block near the top of the component) — it is a distinct,
  already-animated state and out of scope for this feature.
- No entrance animation or stagger on `AgendaEditor`'s individual agenda
  rows (their add/remove/reorder), and no change to its existing
  drag-and-drop micro-interaction (`dragIndex`/`dragOver` opacity/outline
  behavior) — `AgendaEditor` participates in the top-level stagger exactly
  once, as a single section, the same as every other section; its internal
  list is a separate, already-interactive mechanism and adding a second,
  competing motion layer inside it would complicate the drag interaction
  without a clear benefit.
- No change to any existing per-control hover/focus transition already in
  the file (e.g. input `border-color 150ms`, button `border-color 150ms,
  color 150ms`, the timing toggle's `background 150ms` / `left 150ms`) —
  those are unrelated, pre-existing interaction affordances and must keep
  working exactly as they do today.

- **R1** — WHEN the content of `TemplateEditor` first renders after loading
  completes (i.e. `loading` transitions from `true` to `false`, mounting
  the eight top-level sections — the "Reunión asignada" badge, "Título"
  input, `TimingSection`, `AgendaEditor`, `ThemePicker`, `FontPicker`,
  `SizePicker`, and the actions row) THEN the system SHALL play a one-time
  entrance animation (fade combined with a slight vertical translate) on
  each section's own outer wrapper, without looping or repeating.

- **R2** — WHEN two or more of the eight top-level sections mount together
  THEN the system SHALL stagger their entrance animations using a per-section
  delay of `30ms` multiplied by that section's fixed position in the
  top-to-bottom order (0-indexed: badge = 0, Título = 1, TimingSection = 2,
  AgendaEditor = 3, ThemePicker = 4, FontPicker = 5, SizePicker = 6, actions
  row = 7), so the form settles in visual reading order instead of flashing
  in all at once.

- **R3** — WHEN a section's entrance animation plays THEN the system SHALL
  keep its total duration between `200ms` and `500ms` using a linear or
  ease-in-out ("standard curve") timing function, not a bounce/overshoot/
  spring curve, and SHALL apply the fade/translate to that section's own
  outer wrapper as a single unit — not as separate, independently timed
  animations on the section's inner controls (e.g. individual agenda rows,
  the drag handle, or the "+ Agregar" button inside `AgendaEditor`;
  individual swatches inside `ThemePicker`/`FontPicker`/`SizePicker`; or the
  three buttons in the actions row) — so no control inside an
  already-mounted section is ever harder to see or read than the rest of
  that same section.

- **R4** — IF the user's OS/browser reports `prefers-reduced-motion: reduce`
  THEN the system SHALL render all eight sections with no motion — full
  opacity, final position, no delay — including on the
  server-rendered/first paint before any client-side media-query check
  resolves, reusing `usePrefersReducedMotion()` from
  `app/state-of-ai/useReducedMotion.ts` per the precedent already
  established in `specs/changelog-empty-state-animation/design.md` and
  `specs/schedule-content-animation/design.md` (not re-litigated here).

- **R5** — WHILE any section's entrance animation (including its stagger
  delay window) is playing THEN every interactive control within that
  section — the "Título" input; the timing toggle switch and its minutes
  field; the agenda text inputs, drag handles, remove buttons, and
  "+ Agregar" button; the theme/font/size swatches; and the "Volver" /
  "Guardar" / "Presentar" buttons — SHALL remain immediately focusable,
  clickable, and editable exactly as if no animation were running; the
  system SHALL NOT apply `pointer-events: none`, the `disabled` attribute,
  or any other mechanism that gates a control's interactivity on that
  section's animation state or completion. `TemplateEditor` is a form the
  user may want to use immediately (type the title, toggle timing, drag an
  agenda item) — unlike a passive empty state or a read-only calendar row —
  so the animation must be purely visual and never create a waiting period
  before the user can act.

- **R6** — WHEN `TemplateEditor` re-renders because of an ordinary internal
  state change within the same mount (typing in the title, toggling timing
  on/off, editing a minutes value, adding/removing/reordering an agenda
  item, assigning a responsible member, picking a theme/font/size, saving,
  or a save error) THEN the system SHALL NOT replay the entrance animation
  described in R1–R3 on any section — each section's entrance plays exactly
  once per mount, regardless of how many times the component re-renders
  afterward.

- **R7** — WHEN `TemplateEditor` unmounts and a new instance of it mounts
  later — whether because the editing view was closed and reopened
  (`editingAssignment` going from a value back to `null` and then to a
  value again) or because `key={editorKey}` changes when returning from
  `PresentationView` — THEN the system SHALL replay the full entrance
  animation described in R1–R3 on that new instance, exactly as on the
  first time the editor was opened.
