# Tasks — template-editor-content-animation

1. [x] **Import the reduced-motion hook.** In
   `app/components/TemplateEditor.tsx`, import `usePrefersReducedMotion`
   from `@/app/state-of-ai/useReducedMotion` and call it once at the top of
   the `TemplateEditor` component, alongside its existing `useState` calls
   and *before* the `if (loading || presenting)` early return (hooks must
   run unconditionally on every render). *(Serves R4)*

2. [x] **Add the entrance keyframes and stagger helper.** Add a
   `templateEditorSectionIn` `@keyframes` rule (`opacity 0 → 1`,
   `translateY(6px) → translateY(0)`) via an inline `<style>` tag placed
   inside the populated-content return (the `<div className="space-y-6">`
   block), not inside the `loading || presenting` branch. Add a local
   `sectionMotionStyle(index: number, reduced: boolean): React.CSSProperties`
   helper that returns `{}` when `reduced` is `true`, and otherwise
   `{ animation: "templateEditorSectionIn 260ms ease-in-out backwards",
   animationDelay: `${index * 30}ms` }`. *(Serves R1, R2, R3, R4)*

3. [x] **Apply the animation to the three inline sections.** Merge
   `sectionMotionStyle(0, reduced)` into the "Reunión asignada" badge's
   existing `style` object; add a `style={sectionMotionStyle(1, reduced)}`
   prop to the "Título" wrapper `<div>`; add a
   `style={sectionMotionStyle(7, reduced)}` prop to the actions row's
   `<div className="flex gap-2 flex-wrap">`. Do not add `animation`/
   `animationDelay` to any element nested inside these three (the badge
   text, the title `<input>`, or the three action buttons). *(Serves R1,
   R2, R3)*

4. [x] **Wrap and animate the five self-contained sections.** At their call
   sites inside `TemplateEditor`'s return (not inside their own component
   definitions), wrap each of `<TimingSection .../>`, `<AgendaEditor .../>`,
   `<ThemePicker .../>`, `<FontPicker .../>`, `<SizePicker .../>` in a
   plain `<div style={sectionMotionStyle(n, reduced)}>...</div>` with
   `n` = 2, 3, 4, 5, 6 respectively (matching their top-to-bottom order).
   Do not modify `TimingSection`, `AgendaEditor`, `ThemePicker`,
   `FontPicker`, or `SizePicker`'s own function signatures or internals.
   *(Serves R1, R2, R3)*

5. [x] **Verify no interference with existing behavior.** Confirm none of
   the file's existing per-control transitions (input `border-color
   150ms`, buttons' `border-color 150ms, color 150ms`, the timing toggle's
   `background 150ms` / `left 150ms`, `AgendaEditor`'s drag
   `opacity`/`outline` styling, the Guardar button's `background 300ms,
   border-color 300ms, color 300ms`) were touched, and confirm the
   `loading || presenting` spinner branch (`@keyframes spin`) is
   completely unchanged. *(Serves scope/non-goals confirmation)*

6. [x] **Verify non-blocking interactivity by reading the diff.** Confirm
   the only CSS properties introduced are `opacity`, `transform`,
   `animation`, and `animation-delay` — no `pointer-events`, `disabled`,
   `visibility`, or `display` toggling was added anywhere tied to
   animation state. *(Serves R5 — precondition for the manual QA step
   below)*

7. [x] **Manual QA pass** (document in
   `progress/impl_template-editor-content-animation.md` per
   `docs/specs.md` traceability):
   - Open the drawer and click "◈ Preparar lámina" (or "Lámina" from the
     schedule) for an assignment with no existing template; confirm all
     eight sections fade/settle in with a visible top-to-bottom stagger,
     none loop, and no control inside a section is ever harder to see than
     the rest of that same section. *(R1, R2, R3)*
   - Immediately after the drawer opens (within roughly the first
     200–300ms, before the later sections have visually finished
     entering), try clicking into the "Título" input and typing, dragging
     an agenda row, clicking a theme/font/size swatch, and tabbing through
     controls with the keyboard; confirm every one of these works
     immediately with no perceptible lag or blocked interaction tied to
     the animation. *(R5)*
   - With the editor open, type in the title, toggle timing on/off, add
     and remove an agenda item, drag-reorder an agenda item, pick a
     different theme/font/size, and click "Guardar"; confirm no section
     replays its entrance fade during any of these ordinary interactions.
     *(R6)*
   - Toggle OS/browser "reduce motion" on, reload, and reopen the editor;
     confirm all eight sections appear instantly at full opacity/final
     position with no animation, including on first paint. *(R4)*
   - Close the editor (Volver or Escape) and reopen it for the same or a
     different assignment; confirm the full entrance animation replays
     from the start. Separately, open the editor, click "Presentar," then
     close the presentation view; confirm the entrance animation replays
     again when back in the editor. *(R7)*
   - Confirm the `loading || presenting` spinner is visually unchanged —
     no animation added there. *(scope confirmation)*
   - Run the `design-check` skill against `app/components/TemplateEditor.tsx`
     per `CHECKPOINTS.md` and address or note any findings.

8. [x] **Lint/build check.** Run `npm run lint` and `npm run build`; both
   must pass before moving the feature to `in_review`.
