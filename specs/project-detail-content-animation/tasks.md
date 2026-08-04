# Tasks — project-detail-content-animation

1. [ ] **Import the reduced-motion hook in `ProjectDrawer.tsx`.** Import
   `usePrefersReducedMotion` from `@/app/state-of-ai/useReducedMotion` and
   call it once at the top of the `ProjectDrawer` component, alongside its
   existing `useState` calls (it's already `"use client"`). *(Serves R7)*

2. [ ] **Add the `proyectoDetailIn` keyframes and `blockMotionStyle` helper
   in `ProjectDrawer.tsx`.** Add a `proyectoDetailIn` `@keyframes` rule
   (`opacity 0 → 1`, `translateY(4px) → translateY(0)`) to the file's
   existing `<style>` tag (the one that already carries the
   `.proyecto-rich-text` rules, right before the view-content JSX). Add a
   local helper:
   - `blockMotionStyle(index: number, reduced: boolean): React.CSSProperties`
     → `{}` when `reduced`, else
     `{ animation: "proyectoDetailIn 220ms ease-in-out backwards",
     animationDelay: `${index * 30}ms` }`.
   *(Serves R1, R2, R6, R7)*

3. [ ] **Apply Block 0 (`firstUpdateError`).** Merge `blockMotionStyle(0,
   reduced)` into the `firstUpdateError` `<p>`'s existing `style` object.
   *(Serves R1, R2)*

4. [ ] **Apply Block 1 (resumen).** Merge `blockMotionStyle(1, reduced)`
   into *both* the "Resumen de la iniciativa" label `<p>`'s existing
   `style` object and the rich-text summary `<div className=
   "proyecto-rich-text" ...>`'s existing `style` object — do not introduce
   a wrapping element (see design.md's "Scope decision" on this). *(Serves
   R1, R2, R3)*

5. [ ] **Apply Block 2 (metadata line).** Merge `blockMotionStyle(2,
   reduced)` into the "País: X · Negocio: Y" line's existing `style`
   object. Do not stagger the two `<span>`s or the `·` separator
   individually. *(Serves R1, R2, R3)*

6. [ ] **Apply Block 3 (avance header).** Merge `blockMotionStyle(3,
   reduced)` into the "Avance semanal" header `<div>`'s existing `style`
   object (the one wrapping the uppercase label and the "Agregar avance"
   button). Do not add `animation`/`animationDelay` to the label or the
   button individually. *(Serves R1, R2, R3)*

7. [ ] **Apply Block 4 (`AddUpdateForm`).** Wrap the existing
   `{addingUpdate && (<AddUpdateForm .../>)}` call in a new `<div
   style={blockMotionStyle(4, reduced)}>...</div>` — do not modify
   `AddUpdateForm.tsx` itself (see design.md's "Scope decision" on this).
   *(Serves R1, R2, R9)*

8. [ ] **Thread `reduced` into `ProjectTimeline`.** Add `reduced: boolean`
   to `ProjectTimeline`'s `Props` interface in `ProjectTimeline.tsx`, and
   pass `reduced={reduced}` from the existing `<ProjectTimeline
   updates={project.updates} onEdit={handleEditUpdate}
   onDelete={handleDeleteUpdate} />` call site in `ProjectDrawer.tsx`.
   *(Serves R7, precondition for tasks 9–10)*

9. [ ] **Add the keyframes and helpers in `ProjectTimeline.tsx`, apply to
   the empty state.** Add the same `proyectoDetailIn` `@keyframes` rule to
   this file's own existing `<style>` tag (the one that already duplicates
   `.proyecto-rich-text` between the two files — see design.md). Add two
   local helpers:
   - `emptyStateMotionStyle(reduced: boolean): React.CSSProperties` → `{}`
     when `reduced`, else `{ animation: "proyectoDetailIn 220ms
     ease-in-out backwards", animationDelay: "150ms" }`.
   - `rowMotionStyle(index: number, reduced: boolean): React.CSSProperties`
     → `{}` when `reduced`, else `{ animation: "proyectoDetailIn 220ms
     ease-in-out backwards", animationDelay: `${(6 + Math.min(index, 8)) *
     30}ms` }`.
   Merge `emptyStateMotionStyle(reduced)` into the empty-state `<div>`'s
   existing `style` object (the `groups.length === 0` early return). Do not
   stagger its `<p>` separately — it's the only element in that branch.
   *(Serves R1, R2, R5, R6, R7)*

10. [ ] **Apply the row animation in `ProjectTimeline.tsx`.** In the
    `groups.map((group, gi) => ...)` branch, merge `rowMotionStyle(gi,
    reduced)` into each row's outer `<div key={group.key} style={{
    display: "flex", gap: 20 }}>` (the element wrapping both the timeline
    dot/rail column and the week's content column) — so the dot and its
    content fade in together as one unit. Do not add
    `animation`/`animationDelay` to the dot, the rail line, the week label,
    the rich-text note, or the edit/delete action buttons individually.
    *(Serves R1, R4, R6)*

11. [ ] **Verify no interference with existing behavior.** Confirm the
    following are byte-for-byte unchanged: `ProjectDrawer.tsx`'s
    open/close `visible`/`mounted` transition logic, the header close
    button's hover transitions, the "Agregar avance" button's hover
    transitions, and the drawer's `Escape`-to-close handler; and in
    `ProjectTimeline.tsx`, the `.proyecto-timeline-row` hover reveal of
    `.proyecto-timeline-row-actions`, the inline edit
    (`startEdit`/`cancelEdit`/`confirmEdit`) flow, the two-step delete
    confirmation (`confirmDeleteId`, its 3-second `setTimeout`, and the
    "Eliminar" → "¿Seguro?" flip), and every `key={group.key}` on the rows.
    Confirm no `key` prop was added to `<ProjectDrawer .../>` in
    `app/proyectos/page.tsx` (this file should not be touched at all).
    *(Serves scope/non-goals confirmation, and the precondition for R9/R10)*

12. [ ] **Verify non-blocking interactivity by reading the diff.** Confirm
    the only CSS properties introduced anywhere in this change are
    `opacity`, `transform`, `animation`, and `animation-delay` — no
    `pointer-events`, new `disabled` conditions, `visibility`, or `display`
    toggling was added anywhere tied to animation state. *(Serves R8 —
    precondition for the manual QA step below)*

13. [ ] **Manual QA pass** (document in
    `progress/impl_project-detail-content-animation.md` per
    `docs/specs.md` traceability):
    - Open the drawer on a project that has zero weekly updates (or a
      fresh one just created); confirm the resumen, metadata, avance
      header, and the timeline's empty state all fade/settle in top-to-
      bottom without looping, each block as a single visual unit (no
      internal stagger within a block). *(R1, R2, R3, R5, R6)*
    - Open the drawer on a project with 3+ weekly updates; confirm the
      rows fade/settle in staggered top-to-bottom (most-recent-first order)
      after Block 5's own delay, and that no dot/content pairing or
      edit/delete control is ever harder to read mid-animation than the
      rest of its own row. *(R1, R4, R6)*
    - Immediately after opening (within roughly the first 100–200ms, before
      later rows have visually finished entering), try hovering a row to
      reveal its actions, clicking "Editar", clicking "Agregar avance",
      and typing into `AddUpdateForm`'s fields; confirm every one of these
      responds immediately with no perceptible lag tied to the animation.
      *(R8)*
    - With the drawer open on a populated project, add a new weekly
      update via `AddUpdateForm`; confirm only the newly-added row plays an
      entrance fade and every pre-existing row, plus the resumen/metadata/
      avance-header blocks, do *not* replay. Then edit an existing update's
      note and delete a different update; confirm neither causes any block
      or unrelated row to replay its entrance. *(R9)*
    - With the drawer open on project A, click a different project's card
      (switching to project B without closing the drawer); confirm the
      brief loading state appears and then project B's full entrance
      (Blocks 0–5) plays from the start. *(R10)*
    - Close the drawer and reopen it on the same project; confirm the full
      entrance replays from the start. *(R10)*
    - Open the drawer, switch to edit mode, save the edit (returning to
      view mode); confirm the full entrance replays from the start on the
      return to view. *(R10)*
    - Trigger a first-update-save failure if feasible (or inspect the code
      path) to confirm Block 0's `firstUpdateError` paragraph fades in on
      its own, without affecting Blocks 1–5. *(R1, R2, R9)*
    - Toggle OS/browser "reduce motion" on, reload, and reopen the drawer
      (both on an empty-timeline project and a populated one); confirm
      every block and row appears instantly at full opacity/final position
      with no animation, including on first paint. *(R7)*
    - Run the `design-check` skill against `app/proyectos/ProjectDrawer.tsx`
      and `app/proyectos/ProjectTimeline.tsx` per `CHECKPOINTS.md` and
      address or note any findings.

14. [ ] **Lint/build check.** Run `npm run lint` and `npm run build`; both
    must pass before moving the feature to `in_review`.
