# Tasks — schedule-content-animation

1. [x] **Import the reduced-motion hook.** In `app/components/Schedule.tsx`,
   import `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
   and call it once at the top of the `Schedule` component (it's already
   `"use client"`). *(Serves R4)*

2. [x] **Add the entrance keyframes.** Add a `scheduleRowIn` `@keyframes`
   rule (`opacity 0 → 1`, `translateY(4px) → translateY(0)`) via an inline
   `<style>` tag placed in the populated-content return path (after the
   `assignments.length === 0` early return), not in the empty-state branch.
   *(Serves R1, R3)*

3. [x] **Apply the animation per row, staggered.** On each row's existing
   outer `<div>` `style` object — in both the "Próximos viernes"
   (`upcoming.map`) and "Anteriores" (`past.map`) branches — add, only when
   `!prefersReducedMotion`:
   `animation: "scheduleRowIn 220ms ease-in-out backwards"` and
   `animationDelay: `${Math.min(index, 8) * 30}ms`` (each list computing its
   own `index`, i.e. `i` from its own `.map`, independently — not a shared
   running count across both lists). Omit both properties when
   `prefersReducedMotion` is `true`. Do not add `animation`/`animationDelay`
   to any child element within a row (avatar, text, button) — only the
   row's outer container. *(Serves R1, R2, R3, R4)*

4. [x] **Verify no interference with existing behavior.** Confirm the row's
   pre-existing `transition: "opacity 150ms, border-color 150ms, background
   150ms"` line is untouched (same string, same position in the style
   object), and confirm both `key={a.id}` (upcoming) and `key={a.id}`
   (past) are unchanged — the refresh-replay behavior in R6 relies on those
   keys staying exactly as they are, not on any new code. *(Serves R5, R6)*

5. [x] **Manual QA pass** (document in
   `progress/impl_schedule-content-animation.md` per `docs/specs.md`
   traceability):
   - Load the schedule with several upcoming and past assignments; confirm
     rows in each list fade/settle in with a visible stagger, don't loop,
     and no row's inner content (number/avatar/text/button) is ever harder
     to read mid-animation than the rest of that same row. *(R1, R2, R3)*
   - Confirm "Anteriores" rows also animate in (independently staggered
     from "Próximos viernes") while keeping their existing `opacity: 0.45`
     section-level dimming. *(R1, R2)*
   - Toggle OS/browser "reduce motion" on, reload; confirm every row
     appears instantly at full opacity/final position with no animation,
     including on first paint. *(R4)*
   - Drag a row over another and drop to trigger a swap (or drag without
     dropping); confirm the existing 150ms opacity/border/background
     highlight still behaves exactly as before, drag immediately after a
     fresh page load to sanity-check the animation/transition overlap
     doesn't visually glitch, and confirm the swapped rows do **not**
     replay their entrance fade after `onRefresh()` completes. *(R5, R6)*
   - Confirm the empty state (`assignments.length === 0`, "Sin
     asignaciones") is visually unchanged — no animation added there.
     *(scope confirmation)*
   - Run the `design-check` skill against `app/components/Schedule.tsx` per
     `CHECKPOINTS.md` and address or note any findings.

6. [x] **Lint/build check.** Run `npm run lint` and `npm run build`; both
   must pass before moving the feature to `in_review`.
