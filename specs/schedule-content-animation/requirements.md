# Requirements — schedule-content-animation

Scope: the populated content of `app/components/Schedule.tsx` — the row
entrance for both the "Próximos viernes" list (`upcoming`) and the
"Anteriores" list (`past`). The empty state (`assignments.length === 0`,
the "Sin asignaciones" block) is explicitly **out of scope** for this
feature — it is a distinct, rarely-hit state, and the feature request
("animar el contenido del calendario de asignados") reads as the populated
schedule content, not the zero-state; adding it here would blur scope the
way `docs/specs.md` asks specs to avoid. It may be a candidate for a future,
separate feature following the `changelog-empty-state-animation` precedent
if wanted later.

Non-goals (explicit, not just implied):
- No animation of the drag-and-drop reordering/repositioning itself
  (`handleDrop` / `swapAssignmentMembers`) — a row visually sliding from
  position A to B when swapped is a materially different, larger feature
  (would touch layout/FLIP-style transforms) and is not part of this spec.
- No change to the existing per-row interaction transition
  (`transition: "opacity 150ms, border-color 150ms, background 150ms"`),
  which drives hover/drag/drop-target highlighting — that is a separate
  concern from content entrance and must keep working exactly as it does
  today.
- No animation of the empty state (see Scope above).

- **R1** — WHEN a row in the "Próximos viernes" list or the "Anteriores"
  list mounts for the first time (i.e. its DOM node, keyed by
  `assignment.id`, is newly created) THEN the system SHALL play a one-time
  entrance animation on that row (fade combined with a slight vertical
  translate), without looping or repeating.

- **R2** — WHEN two or more rows within the same list ("Próximos viernes"
  or "Anteriores", counted independently per list) mount together THEN the
  system SHALL stagger their entrance animations using a per-row delay of
  `30ms` multiplied by the row's position within that list (0-indexed),
  capped at a maximum delay of `240ms` (i.e. the 9th row and beyond in the
  same list start at the same `240ms` mark as the 8th), so a long list
  doesn't stretch the visible entrance out indefinitely.

- **R3** — WHEN a row's entrance animation plays THEN the system SHALL run
  it for `220ms` using a linear or ease-in-out ("standard curve") timing
  function, not a bounce/overshoot/spring curve, and SHALL apply the
  fade/translate to the row as a single unit — not as separate, independently
  timed animations on the row's child elements (position number, avatar,
  name/date text, "Lámina" button) — so no part of a row's content is ever
  harder to read mid-animation than any other part of the same row.

- **R4** — IF the user's OS/browser reports `prefers-reduced-motion: reduce`
  THEN the system SHALL render every row (both lists) with no motion —
  full opacity, final position, no delay — including on the
  server-rendered/first paint before any client-side media-query check
  resolves, reusing `usePrefersReducedMotion()` from
  `app/state-of-ai/useReducedMotion.ts` per the precedent already
  established in `specs/changelog-empty-state-animation/design.md` (not
  re-litigated here).

- **R5** — WHILE a row is being dragged, dragged-over, or highlighted as a
  drop target THEN the system SHALL leave the existing row-level
  `transition: "opacity 150ms, border-color 150ms, background 150ms"` style
  unmodified and untouched by this feature, and the entrance animation from
  R1–R3 SHALL NOT re-trigger in response to those interaction state changes
  (drag start/over/leave/drop, or the resulting `opacity`/`border`/
  `background` changes) — it only ever runs once, on that row's own mount.

- **R6** — WHEN `onRefresh()` causes `Schedule` to re-render with updated
  `assignments` data (including after a drag-and-drop swap via
  `swapAssignmentMembers`) THEN the system SHALL NOT replay the entrance
  animation on rows whose `assignment.id` already existed before the
  refresh (React preserves their DOM node via the existing `key={a.id}`);
  only a row whose `assignment.id` is newly present in the list SHALL play
  the entrance animation, and only on that occurrence.
