# Review — `project-detail-content-animation`

**Veredicto: APPROVED**

Revisado por una sesión independiente de la que implementó (no escribió este
código). Commit revisado: `57b5c54` en `dev`. `npm run lint`, `npm run build`,
y `npm run verify` completo (lint + build + test + check-sdd-state) corridos
de forma independiente en este sandbox, no tomados del reporte de
`implementer`. Diff de los dos archivos leído línea por línea contra
`design.md`/`tasks.md`, no solo el resumen de `impl_*.md`.

Es una feature puramente presentacional (animación de entrada CSS, sin lógica
en `lib/`), así que el foco de esta revisión fue: (a) que cada `R<n>` tenga
una verificación real y específica, no genérica, en
`progress/impl_project-detail-content-animation.md`; (b) que el diff real no
introduzca ningún mecanismo que gate la interactividad de controles (R8); y
(c) que nada fuera del alcance declarado (`page.tsx`, `ProjectForm.tsx`,
`AddUpdateForm.tsx`, `WeeklyUpdateFields.tsx`, hovers/edición/borrado
pre-existentes) haya sido tocado.

---

## Checkpoints — `Before in_review`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS** — 14/14 tareas `[x]`, 0 sin marcar (confirmado con grep, no solo lectura visual). |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí, exit 0: `lint` sin salida/errores, `build` compila (26 páginas, incluida `/proyectos`), `test` (Vitest) 4 archivos/36 tests en verde, `check-sdd-state` OK ("single active feature: project-detail-content-animation (in_review)"). |
| 3 | Cambios en `lib/` con test Vitest real | **N/A justificado** — el diff (`git show 57b5c54 --stat`) toca únicamente `app/proyectos/ProjectDrawer.tsx` y `app/proyectos/ProjectTimeline.tsx`; cero líneas en `lib/`. Correcto que no haya un nuevo test Vitest — no aplica el checkpoint. |
| 4 | `progress/impl_<feature>.md` con verificación por cada `R<n>` | **PASS** — el archivo existe y R1–R10 tienen cada uno una entrada de "Requirement traceability" con razonamiento código-a-código específico (no genérico, no "N/A" sin justificar), más una sección de manual QA (task 13) que mapea cada checklist item de vuelta a los R<n> que cubre. Sin huecos. Cada entrada está honestamente etiquetada como "code-path reasoning, not live browser interaction" (sin navegador en este sandbox) — mismo patrón ya aceptado en las cuatro features previas de esta serie y en `review_supabase-rls-lockdown.md`. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS (no aplica)** — el diff no toca `app/components/**` (toca `app/proyectos/**`, fuera del scope declarado del skill). El `implementer` documentó correctamente esta no-aplicabilidad y, pese a eso, corrió una verificación manual de tokens (hex/`border-radius`/`fontSize`/`boxShadow`) contra las líneas tocadas — confirmé independientemente que el único hex color en las líneas cambiadas (`#F87171`) es pre-existente (aparece sin cambios en `firstUpdateError`, `editError`, `deleteError`) y que las únicas propiedades CSS nuevas introducidas en todo el diff son `animation`/`animationDelay` (más `opacity`/`transform` dentro del `@keyframes` en sí). No hay drift de design tokens. |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — solo `project-detail-content-animation` en `in_review`; confirmado también por `check-sdd-state`. |

## Checkpoints — `Before done`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | `progress/review_<feature>.md` con pass/fail y veredicto | **PASS** — este archivo. |
| 2 | Ningún `R<n>` sin entrada de verificación | **PASS** — ver checkpoint 4 arriba. |
| 3 | Una sola feature activa | **PASS**. |
| 4 | `progress/history.md` con entrada resumen | **PENDIENTE de `leader`** al cierre de sesión — no es responsabilidad de `implementer`/`reviewer` (mismo patrón que `review_supabase-rls-lockdown.md`). |

---

## Verificación dirigida — traceability real, no solo la palabra del implementer

Leí `requirements.md` (R1–R10), `design.md` completo y el diff real de
`57b5c54` para los dos archivos, no solo `impl_*.md`:

- **R1/R2/R6** (entrada única fade+translate, `220ms ease-in-out`, stagger
  `30ms * índice fijo`, sin loop) — confirmado en el código: `blockMotionStyle`
  en `ProjectDrawer.tsx` y `emptyStateMotionStyle`/`rowMotionStyle` en
  `ProjectTimeline.tsx` usan literalmente
  `"proyectoDetailIn 220ms ease-in-out backwards"` en los tres helpers, sin
  `animation-iteration-count` en ningún lado (default `1`). Los índices
  0–4 están hardcodeados en cada call site dentro de su propio
  `{cond && (...)}`, no derivados de cuántos bloques están montados —
  confirmado leyendo cada línea de la Sección "Content" de
  `ProjectDrawer.tsx` (líneas 347–430).
- **R3** (Block 1/2/3 como unidad visual única) — confirmado: Block 1 (label +
  rich-text div) recibe *el mismo* `blockMotionStyle(1, reduced)` en ambos
  elementos (líneas 350 y 379); Block 2's tres `<span>`/separador no tienen
  animación propia, solo el `<div>` contenedor (línea 382); Block 3's label y
  botón "Agregar avance" no tienen animación propia, solo el `<div>` header
  (línea 389).
- **R4/R5** (fórmula de fila `(6 + min(index,8))*30ms`, dot+contenido como
  unidad, empty state a `150ms` fijo) — confirmado en `ProjectTimeline.tsx`:
  `rowMotionStyle(gi, reduced)` se mergea en el `<div key={group.key}
  style={{ display: "flex", gap: 20, ... }}>` que envuelve *tanto* el riel/dot
  como la columna de contenido (línea 188) — nunca por separado. `groups` sigue
  ordenado `b.weekOf.localeCompare(a.weekOf)` (más reciente primero, sin
  cambios en el diff), así que `gi=0` es la fila más reciente con el delay
  menor. `emptyStateMotionStyle` devuelve `animationDelay: "150ms"` fijo,
  independiente de índice.
- **R7** (reduced motion, incluido first paint) — `usePrefersReducedMotion()`
  se llama una sola vez en `ProjectDrawer` y se pasa como prop `reduced` a
  `ProjectTimeline` (línea 430) — una sola fuente de verdad, tal como exige
  `design.md`'s "Scope decision". Confirmé en
  `app/state-of-ai/useReducedMotion.ts` que el fallback SSR de
  `useSyncExternalStore` es `() => true`, así que el primer paint ya llega con
  `reduced === true` y los tres helpers devuelven `{}` (sin `animation` en
  absoluto).
- **R8** (sin gating de interactividad) — grep del diff completo (`git show
  57b5c54 -- app/proyectos/ProjectDrawer.tsx app/proyectos/ProjectTimeline.tsx`)
  confirma que las únicas propiedades nuevas en cualquier línea son
  `animation`/`animationDelay` (y `opacity`/`transform` dentro del cuerpo del
  `@keyframes`). Ningún `pointer-events`, `disabled` nuevo, `visibility`, ni
  `display` aparece en ninguna línea tocada. El único
  `pointer-events: none`/`opacity: 0` existente en el archivo
  (`.proyecto-timeline-row-actions`, revelado en hover) es la clase CSS
  **pre-existente y sin cambios** que gestiona el hover-reveal, no algo nuevo
  ni condicionado al estado de esta animación — confirmado que esa clase no
  aparece en el diff.
- **R9/R10** (no-replay en updates in-place; replay completo en remount) —
  confirmé leyendo `ProjectDrawer.tsx` completo que `handleAddUpdate`/
  `handleEditUpdate`/`handleDeleteUpdate` solo tocan `project`/`updates` sin
  tocar `formMode`/`loading`/`error` (rama de vista permanece montada; las
  filas usan `key={group.key}` = `update.id`, sin cambios), y que los tres
  caminos de remount (cerrado→abierto vía `mounted`; proyecto A→B vía el
  `useEffect` de `[projectId, mode]` que pasa por la rama de loading; y
  form→view vía `handleFormSubmit`) son exactamente los tres que `design.md`
  describe, sin cambios en el diff a ninguno de esos tres flujos de control.

## Fuera de alcance — confirmado que no se tocó

- `git show 57b5c54 --stat` confirma que el commit toca únicamente
  `app/proyectos/ProjectDrawer.tsx`, `app/proyectos/ProjectTimeline.tsx`,
  `progress/current.md`, `progress/impl_project-detail-content-animation.md`,
  y `specs/project-detail-content-animation/tasks.md` — **cero** líneas en
  `app/proyectos/page.tsx`, `ProjectForm.tsx`, `AddUpdateForm.tsx`, o
  `WeeklyUpdateFields.tsx`.
- Confirmé manualmente (no solo confié en el reporte) que ningún `key` prop
  fue agregado a `<ProjectDrawer .../>` en `page.tsx` — ese archivo no
  aparece en el diff del commit en absoluto.
- Confirmé que los mecanismos pre-existentes de `ProjectTimeline.tsx`
  (`.proyecto-timeline-row` hover, `startEdit`/`cancelEdit`/`confirmEdit`,
  `confirmDeleteId` + su `setTimeout` de 3s y el flip "Eliminar"→"¿Seguro?")
  están intactos línea por línea en el diff — el único cambio en cada una de
  esas líneas es el spread `...rowMotionStyle(gi, reduced)` agregado al
  `style` del `<div>` contenedor de la fila, nada en la lógica de esos
  handlers ni en sus botones.
- `git status --porcelain` está limpio — sin archivos temporales ni cambios
  sin commitear.

## Notas no bloqueantes

**Nota 1 — QA manual sin navegador real.** Igual que las cuatro features
previas de esta serie (`changelog-empty-state-animation`,
`schedule-content-animation`, `template-editor-content-animation`,
`members-panel-content-animation`), este sandbox no tiene navegador/GUI, así
que toda la verificación de R1–R10 es code-path reasoning contra el diff real,
no una observación visual en vivo. El `implementer` lo declaró honestamente en
cada entrada de `impl_*.md` en vez de reclamar una verificación visual que no
ocurrió — mismo patrón ya aceptado en las cuatro specs previas. No bloqueante.

---

## Veredicto final

**APPROVED.** Las 14 tareas de `tasks.md` están marcadas `[x]` y confirmé que
corresponden a cambios reales en el diff (`57b5c54`), no solo a la palabra del
implementer. `npm run verify` pasa de punta a punta, corrido de forma
independiente. Los diez requisitos (R1–R10) tienen cada uno una verificación
específica y trazable en `progress/impl_project-detail-content-animation.md`,
confirmada contra el código real, no genérica. Nada fuera del alcance
declarado fue tocado: `page.tsx`, `ProjectForm.tsx`, `AddUpdateForm.tsx`, y
`WeeklyUpdateFields.tsx` no aparecen en el diff, y los hovers/transiciones/
edición inline/confirmación de borrado pre-existentes en `ProjectTimeline.tsx`
están intactos. No se introdujo ningún `pointer-events`/`disabled`/
`display`/`visibility` nuevo condicionado a la animación (R8) — las únicas
propiedades CSS nuevas en todo el diff son `animation`/`animationDelay`/
`opacity`/`transform`. `design-check` no aplica (scope solo a
`app/components/**`), pero la consistencia de design tokens en las líneas
tocadas fue verificada manualmente y confirmada por mí de forma independiente.
`leader` puede mover `project-detail-content-animation` a `done`.
