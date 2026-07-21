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
