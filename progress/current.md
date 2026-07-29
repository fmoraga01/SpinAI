# Current session state

- **Feature:** project-status-field
- **Status:** in_progress (reviewer rechazó la primera vuelta)
- **Started:** 2026-07-29
- **Role active:** implementer
- **Next step:** `reviewer` rechazó en `progress/review_project-status-field.md`
  por un único gap acotado: cambios de lógica en `lib/projects.ts`
  (`rowToProject()` ahora mapea `status`, `rowToUpdate()` dejó de
  mapearlo, `VALID_STATUSES` centralizado del que dependen las 4 rutas
  API) sin ningún test de Vitest — `docs/specs.md` exige test real para
  lógica en `lib/`, "verificado por lectura de código" no cuenta. La
  migración SQL quedó auditada línea por línea y está correcta (backfill
  antes de NOT NULL, sin hardcodear el proyecto real, DROP COLUMN al
  final) — no tocar eso. Fix: agregar tests de `rowToProject()` /
  `rowToUpdate()` / `VALID_STATUSES` en `lib/projects.test.ts`. De paso,
  dos detalles menores: comentario obsoleto en `HealthBadge.tsx:9-10`
  (menciona un `<select>` de `WeeklyUpdateFields` que ya no existe), y un
  conteo invertido en `progress/impl_project-status-field.md` ("5
  mondayOf + 4 otros" debería ser al revés). Una vez corregido: `npm run
  verify` de nuevo, volver a `in_review` para que `reviewer` re-audite.
