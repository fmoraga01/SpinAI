# Tasks — changelog-empty-state-animation

1. [x] **Import the reduced-motion hook.** In `app/components/ChangeLog.tsx`,
   import `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
   and call it once at the top of the `ChangeLog` component. *(Serves R4)*

2. [x] **Add the entrance keyframes.** Add a `changelogEmptyIn` `@keyframes`
   rule (opacity 0→1, `translateY(6px) scale(0.98)` → `translateY(0)
   scale(1)`) via an inline `<style>` tag inside the `logs.length === 0`
   branch, following the same pattern as the existing `spin` keyframe in the
   loading branch above it. *(Serves R1, R2, R5)*

3. [x] **Apply the animation conditionally.** On the empty state's outer
   container `<div>` (the one wrapping the icon + text), set
   `animation: changelogEmptyIn 320ms ease-in-out` inline only when
   `usePrefersReducedMotion()` is `false`; omit the `animation` property
   entirely (or set nothing) when it's `true`, so the element renders at its
   final opacity/position with no motion. *(Serves R1, R2, R4)*

4. [x] **Verify no legibility delay.** Confirm the animation has no
   `animation-delay` and that opacity/transform apply to the whole container
   in one pass (not staggered per child), so heading and description text
   are reading-ready as soon as the animation starts. *(Serves R3)*

5. [x] **Manual QA pass** (document in `progress/impl_changelog-empty-state-animation.md`
   per `docs/specs.md` traceability):
   - Load the changelog view with zero log entries; confirm the empty state
     fades/settles in once, doesn't loop, and text is never harder to read
     mid-animation. *(R1, R2, R3)*
   - Toggle OS/browser "reduce motion" setting on, reload; confirm the empty
     state appears instantly with no animation, including on first paint.
     *(R4)*
   - Visually confirm only existing tokens/colors are used (no new hex
     values introduced beyond what's already in the file). *(R5)*
   - Navigate away from and back to the changelog view (or force a
     remount); confirm the animation replays. *(R6)*
   - Run the `design-check` skill against `app/components/ChangeLog.tsx`
     per `CHECKPOINTS.md` ("If `app/components/*.tsx` changed...") and
     address or note any findings.

6. [x] **Lint/build check.** Run `npm run lint` and `npm run build`; both must
   pass before moving the feature to `in_review`.
