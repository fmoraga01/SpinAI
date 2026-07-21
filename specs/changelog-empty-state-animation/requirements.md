# Requirements — changelog-empty-state-animation

Scope: the empty state block rendered by `app/components/ChangeLog.tsx` when
`logs.length === 0` (icon + "Sin cambios registrados" + description). No
other `ChangeLog` state (loading, table-error, populated list) is in scope.

- **R1** — WHEN the empty-state block mounts (i.e. `logs.length === 0` first
  renders) THEN the system SHALL play a one-time entrance animation on that
  block (fade combined with a slight translate and/or scale), without
  looping or repeating.
- **R2** — WHEN the entrance animation plays THEN the system SHALL keep its
  total duration between 200ms and 500ms and use a linear or ease-in-out
  ("standard curve") timing function, not a bounce/overshoot/spring curve.
- **R3** — WHEN the entrance animation plays THEN the system SHALL NOT delay
  the heading ("Sin cambios registrados") or description text becoming fully
  legible beyond the animation's own total duration (no separate staggered
  delay before text starts appearing, no keyframe step where text is fully
  hidden partway through).
- **R4** — IF the user's OS/browser reports `prefers-reduced-motion: reduce`
  THEN the system SHALL render the empty state with no motion (icon,
  heading, and description appear immediately at their final position and
  full opacity), including on the server-rendered/first paint before any
  client-side media-query check resolves.
- **R5** — WHEN the entrance animation plays THEN the system SHALL use only
  colors, radii, and spacing already defined as design tokens or already
  used elsewhere in `ChangeLog.tsx` (e.g. `var(--radius-md)`,
  `var(--color-text-primary)`, the existing `#2C40FF`-based icon tile) — no
  new colors are introduced for the animation itself.
- **R6** — WHEN the empty state re-renders because `ChangeLog` re-mounts
  (e.g. navigating away and back) THEN the system SHALL replay the same
  one-time entrance animation described in R1 (i.e. the animation is tied to
  mount, not to a one-time-per-session flag).
