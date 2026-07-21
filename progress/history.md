# History

Append-only journal of completed (or abandoned) features. `leader` adds one
entry per feature when it reaches `done` — never edit past entries, only add
new ones below.

Entry format:

```markdown
## <feature-id> — done YYYY-MM-DD

- Requirements: R1–R<n>, see specs/<feature-id>/requirements.md
- Summary: <one or two sentences of what shipped and why>
- Merged to dev: <date/commit> · Promoted to main: <date/commit, or "pending">
```

---

## changelog-empty-state-animation — done 2026-07-21

- Requirements: R1–R6, see specs/changelog-empty-state-animation/requirements.md
- Summary: piloto de la Fase 1 del flujo SDD. Animación de entrada sutil
  (fade + translateY + scale, 320ms ease-in-out) para el empty state de
  `ChangeLog.tsx`, respetando `prefers-reduced-motion` vía el hook
  existente de `state-of-ai`. Fundamentada en research de UX sobre
  microinteracciones. Cero deps nuevas, cero tokens nuevos. Reviewer
  aprobó sin objeciones — ver progress/review_changelog-empty-state-animation.md.
- Merged to dev: commits d0b8b0f, ea0c96a · Promoted to main: 2026-07-21 (dev → main junto con schedule-content-animation)

## schedule-content-animation — done 2026-07-21

- Requirements: R1–R6, see specs/schedule-content-animation/requirements.md
- Summary: animación de entrada por fila del calendario de asignados en
  `app/components/Schedule.tsx` (fade + `translateY(4px)→0`, 220ms
  ease-in-out) con stagger escalonado (30ms/fila, tope 8), aplicada de forma
  independiente a "Próximos viernes" y "Anteriores". Respeta
  `prefers-reduced-motion` (sin movimiento en primer paint vía snapshot SSR),
  no toca el empty state ni el drag/drop, y no re-dispara la entrada tras
  swap/`onRefresh()` (los `key={a.id}` preservan el nodo DOM). Cero deps
  nuevas, cero tokens nuevos; `design-check` sin hallazgos. Reviewer corrió
  `npm run verify` (lint/build/test 5/5/check-sdd-state) y aprobó sin
  objeciones — ver progress/review_schedule-content-animation.md.
- Merged to dev: commit 325a555 · Promoted to main: 2026-07-21

## template-editor-content-animation — done 2026-07-21

- Requirements: R1–R7, see specs/template-editor-content-animation/requirements.md
- Summary: animación de entrada por sección en `app/components/TemplateEditor.tsx`
  (fade + `translateY(6px)→0`, 260ms ease-in-out) aplicada a cada una de las
  ocho secciones de nivel superior ("Reunión asignada", Título,
  TimingSection, AgendaEditor, ThemePicker, FontPicker, SizePicker, fila de
  acciones), con stagger fijo de 30ms por índice (0–210ms, sin tope porque el
  número de secciones es fijo). Respeta `prefers-reduced-motion` (incluido
  primer paint vía snapshot SSR), garantiza que la interactividad de cada
  control nunca queda bloqueada por la animación (R5, propiedad clave de
  esta feature al ser un formulario y no un estado pasivo), no re-dispara la
  entrada en re-renders ordinarios dentro del mismo montaje (R6), y sí la
  repite íntegramente en cada remount — reapertura del editor o retorno
  desde `PresentationView` vía `key={editorKey}` (R7). Cero deps nuevas,
  cero tokens nuevos, `Drawer.tsx` sin cambios. Reviewer corrió
  `npm run verify` (lint/build/test 5/5/check-sdd-state) y aprobó sin
  objeciones — ver progress/review_template-editor-content-animation.md.
- Merged to dev: commits 45bfd1d, daea385, 93d3a97, 1423e6f · Promoted to main: 2026-07-21

## members-panel-content-animation — done 2026-07-21

- Requirements: R1–R9, see specs/members-panel-content-animation/requirements.md
- Summary: animación de entrada del contenido de la vista "Equipo" en
  `app/components/MembersPanel.tsx` (fade + `translateY→0`, 220ms
  ease-in-out) aplicada a los tres bloques de nivel superior en orden fijo
  — el formulario "Agregar", el bloque lista-o-empty-state, y el contador
  del footer — con stagger de bloque `30ms * index` (0/30/60ms). El bloque
  lista-o-empty-state trata el empty state ("Sin integrantes aún") como una
  sola unidad visual sin sub-stagger, y cada fila de miembro (`<li
  key={m.id}>`) anima individualmente con un stagger propio
  `(1 + min(index, 8)) * 30ms` sobre la base del bloque, con tope en la
  fila 8 para no alargar la entrada en rosters largos. Respeta
  `prefers-reduced-motion` desde el primer paint SSR (reutilizando
  `usePrefersReducedMotion()`), nunca bloquea la interactividad de ningún
  control durante la animación (R7 — toggle, edición inline de
  nombre/email, borrado con confirmación en dos pasos, formulario), no
  repite la entrada en refresh ordinario tras `onAdd`/`onToggle`/`onRemove`/
  `onUpdateEmail`/`onUpdateName` gracias a los `key={m.id}` preexistentes
  (solo la fila nueva agregada por `onAdd` anima, R8), y sí repite la
  entrada completa al remontar la pestaña "equipo" tras salir y volver
  (R9, vía la ausencia de `key` en `Drawer.tsx`). Cero deps nuevas, cero
  tokens nuevos, `Drawer.tsx` sin cambios. Reviewer corrió `npm run verify`
  (lint/build/test 5/5/check-sdd-state) y re-verificó independientemente
  cada R1–R9 contra el diff real, aprobando sin objeciones — ver
  progress/review_members-panel-content-animation.md.
- Merged to dev: commits b1f5ad0, 97cfcf4, 71c30bb, b5d5165 · Promoted to main: 2026-07-21
