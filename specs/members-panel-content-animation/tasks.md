# Tasks — members-panel-content-animation

1. [x] **Import the reduced-motion hook.** In `app/components/MembersPanel.tsx`,
   import `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion`
   and call it once at the top of the `MembersPanel` component, alongside
   its existing `useState` calls (it's already `"use client"`). *(Serves
   R6)*

2. [x] **Add the entrance keyframes and the two helpers.** Add a
   `membersPanelIn` `@keyframes` rule (`opacity 0 → 1`,
   `translateY(4px) → translateY(0)`) via an inline `<style>` tag placed in
   the component's returned JSX (inside the root `<div>`). Add two local
   helpers:
   - `blockMotionStyle(index: number, reduced: boolean): React.CSSProperties`
     → `{}` when `reduced`, else
     `{ animation: "membersPanelIn 220ms ease-in-out backwards",
     animationDelay: `${index * 30}ms` }`.
   - `rowMotionStyle(index: number, reduced: boolean): React.CSSProperties`
     → `{}` when `reduced`, else
     `{ animation: "membersPanelIn 220ms ease-in-out backwards",
     animationDelay: `${(1 + Math.min(index, 8)) * 30}ms` }`.
   *(Serves R1, R2, R4, R5, R6)*

3. [x] **Apply the animation to the "Agregar" form block.** Merge
   `blockMotionStyle(0, reduced)` into the `<form onSubmit={handleAdd}
   className="flex flex-col gap-2 mb-5">` element's `style` prop (add one if
   it doesn't have one). Do not add `animation`/`animationDelay` to the two
   inputs or the submit button individually. *(Serves R1, R2, R5)*

4. [x] **Apply the animation to the empty-state block.** Merge
   `blockMotionStyle(1, reduced)` into the empty-state `<div>`'s existing
   `style` object (the one shown when `members.length === 0`). Do not
   stagger the heading (`<p>Sin integrantes aún</p>`) and description
   (`<p>Agrega el primero arriba</p>`) separately — one `animation` on
   their shared wrapper only. *(Serves R1, R2, R3)*

5. [x] **Apply the animation to each member row.** In the `members.map((m,
   index) => ...)` (or equivalent index-yielding map) branch, merge
   `rowMotionStyle(index, reduced)` into each `<li key={m.id}>`'s existing
   `style` object, alongside its current `background`/`border`/
   `borderRadius`/`padding` values — without touching its existing
   `className="flex items-center justify-between transition-all
   duration-150"`. Do not add `animation`/`animationDelay` to the toggle
   button, name, email, or delete button individually. *(Serves R1, R4,
   R5)*

6. [x] **Apply the animation to the footer block.** Merge
   `blockMotionStyle(2, reduced)` into the footer `<div>`'s existing
   `style` object (the "`N` activos" / "`N` total" counter). Do not add
   `animation`/`animationDelay` to the two `<span>`s individually. *(Serves
   R1, R2, R5)*

7. [x] **Verify no interference with existing behavior.** Confirm the
   following are byte-for-byte unchanged: the `<li>`'s
   `transition-all duration-150` className; the submit button's
   disabled-while-empty-name logic and its own `transition-all
   duration-150`; the two `border-color 150ms ease` transitions on the
   "Agregar" inputs; the inline-edit name/email `autoFocus`/`onBlur`/
   `onKeyDown` pattern; the `confirmRemove` two-step delete flow and its
   `setTimeout(..., 3000)`; every `key={m.id}` on the rows; and that no
   `key` prop was added to `<MembersPanel .../>` in `Drawer.tsx` (this file
   should not be touched at all). *(Serves scope/non-goals confirmation,
   and the precondition for R8/R9)*

8. [x] **Verify non-blocking interactivity by reading the diff.** Confirm
   the only CSS properties introduced anywhere in this change are
   `opacity`, `transform`, `animation`, and `animation-delay` — no
   `pointer-events`, new `disabled` conditions, `visibility`, or `display`
   toggling was added anywhere tied to animation state. *(Serves R7 —
   precondition for the manual QA step below)*

9. [x] **Manual QA pass** (document in
   `progress/impl_members-panel-content-animation.md` per `docs/specs.md`
   traceability):
   - Open the drawer to an empty team (or remove all members first);
     confirm the "Agregar" form and the empty state both fade/settle in
     with the form leading (no delay) and the empty state following
     shortly after, as a single unit (heading and description appearing
     together, not staggered relative to each other). *(R1, R2, R3)*
   - Add a few members so the list is populated (3+); reopen the "Equipo"
     tab fresh (switch to another tab and back) and confirm the form, then
     the rows (staggered top-to-bottom), then the footer all fade/settle in
     without looping, and that no control inside any block/row is ever
     harder to read mid-animation than the rest of that same block/row.
     *(R1, R2, R4, R5)*
   - Immediately after the tab opens (within roughly the first 100–200ms,
     before later rows have visually finished entering), try typing into
     the "Agregar" name/email inputs, clicking a row's toggle circle,
     click-to-editing a row's name and email, and clicking a row's delete
     button (through both confirmation steps); confirm every one of these
     responds immediately with no perceptible lag tied to the animation.
     *(R7)*
   - With the tab open and populated, add a new member via the form;
     confirm only the newly-added row plays an entrance fade and every
     pre-existing row does *not* replay its entrance. Then toggle a
     member's active state, edit a name, edit an email, and remove a
     member; confirm none of these cause any row, the form, or the footer
     to replay their entrance animation. *(R8)*
   - Switch the drawer away from "Equipo" to another tab and back; confirm
     the full entrance animation (form, list/rows, footer) replays from the
     start on every reopen. *(R9)*
   - Toggle OS/browser "reduce motion" on, reload, and reopen the "Equipo"
     tab (both with an empty team and with a populated one); confirm every
     block and row appears instantly at full opacity/final position with
     no animation, including on first paint. *(R6)*
   - Run the `design-check` skill against `app/components/MembersPanel.tsx`
     per `CHECKPOINTS.md` and address or note any findings.

10. [x] **Lint/build check.** Run `npm run lint` and `npm run build`; both
    must pass before moving the feature to `in_review`.
