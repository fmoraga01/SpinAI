# Tasks — Cambiar los valores de `projects.status` a etapa de ciclo de vida

Feature id: `project-status-values-rename`. Checklist ordenado; cada tarea
es lo bastante chica para completarse y verificarse antes de pasar a la
siguiente.

## Migración Supabase

- [ ] **T1** (R1-R4) Crear
      `supabase/migrations/20260729180000_cambiar_valores_status_projects.sql`
      con el contenido exacto de `design.md` sección 1: `drop constraint
      projects_status_check` → los 3 `update ... where id = '<uuid>'`
      (Asistente de ventas Easy 2.0 → `desarrollo`, Probador Virtual →
      `piloto`, Asesor de proyectos → `desarrollo`) → `add constraint
      projects_status_check check (status in ('desarrollo', 'piloto',
      'produccion'))`. **No aplicar la migración** — el humano la aplica
      manualmente en Supabase dev después de revisar el SQL exacto (mismo
      criterio que `project-status-field`, dato de producción real).
      Verificación: leer el archivo generado y confirmar que el orden de
      los 3 pasos coincide exactamente con `design.md` (drop → update ×3 →
      add), y que los 3 `id` coinciden carácter por carácter con los de
      `requirements.md`.

## Tipos y constantes

- [ ] **T2** (R5) En `lib/types.ts`: renombrar `HealthStatus` →
      `ProjectStatus`, redefinir los literales a `"desarrollo" | "piloto" |
      "produccion"`, y actualizar `status: HealthStatus` → `status:
      ProjectStatus` en la interfaz `Project`.
- [ ] **T3** (R6, R7) En `lib/projects.ts`: actualizar el import de
      `HealthStatus` a `ProjectStatus`; actualizar `ProjectRow.status` y
      `ProjectFormValues.status` al tipo nuevo; redefinir
      `VALID_STATUSES` como `["desarrollo", "piloto", "produccion"]`.
      Verificación: `npm run build` (TS check) pasa sin errores de tipo en
      este archivo — dependerá de que T4/T5/T6 también estén hechas, así
      que el build final se corre al final (T10).

## Badge y formulario

- [ ] **T4** (R8, R9, R10) Renombrar `app/proyectos/HealthBadge.tsx` →
      `app/proyectos/StatusBadge.tsx`. Dentro: renombrar el componente
      `HealthBadge` → `StatusBadge`, `HEALTH_STATUS_LABELS` →
      `PROJECT_STATUS_LABELS`, usar `ProjectStatus` como tipo, y aplicar el
      `CONFIG` con la paleta nueva de `design.md` sección 3 (gris
      `#94A3B8` / azul `#2C40FF` / verde `#22C55E` para
      desarrollo/piloto/producción respectivamente) y las labels
      "Desarrollo"/"Piloto"/"Producción" (con tilde solo en la label).
- [ ] **T5** (R11) En `app/proyectos/ProjectDrawer.tsx` y
      `app/proyectos/ProjectCard.tsx`: actualizar el import a `StatusBadge`
      desde `./StatusBadge` y el nombre de componente usado en el JSX. Sin
      otros cambios.
- [ ] **T6** (R12) En `app/proyectos/ProjectForm.tsx`: actualizar imports
      (`HealthStatus` → `ProjectStatus`, `HEALTH_STATUS_LABELS` →
      `PROJECT_STATUS_LABELS` desde `./StatusBadge`), renombrar
      `HEALTH_STATUS_OPTIONS` → `PROJECT_STATUS_OPTIONS`, y actualizar el
      tipo del `onChange` del `<select>` de "Estado"
      (`e.target.value as ProjectStatus`). Sin cambios a la lógica de
      validación/habilitación de submit.

## API (verificación, sin cambio de código esperado)

- [ ] **T7** (R13, R14) Confirmar por lectura (no se espera edición) que
      `app/api/proyectos/route.ts` y `app/api/proyectos/[id]/route.ts`
      solo referencian `VALID_STATUSES` (no un literal `HealthStatus` ni
      los 3 valores viejos hardcodeados) — si por algún motivo alguna de
      las dos rutas sí tiene un literal viejo hardcodeado que el grep de
      `design.md` no haya capturado, corregirlo ahí. Verificación: `grep -n
      "on_track\|at_risk\|delayed" app/api/proyectos/route.ts
      "app/api/proyectos/[id]/route.ts"` no devuelve resultados.

## Tests

- [ ] **T8** (R15) En `lib/projects.test.ts`, bloque
      `describe("VALID_STATUSES", ...)`: actualizar el `expect(...)` a
      `["desarrollo", "piloto", "produccion"]`.
- [ ] **T9** (R16) En `lib/projects.test.ts`, bloque
      `describe("rowToProject", ...)`: cambiar el `status: "at_risk"` del
      row de ejemplo a `status: "piloto"`, y el
      `expect(project.status).toBe("at_risk")` a
      `expect(project.status).toBe("piloto")`.

## Barrido final y verificación

- [ ] **T10** Barrido completo: `grep -rn "on_track\|at_risk\|delayed\|HealthStatus\|HealthBadge\|HEALTH_STATUS_LABELS" app lib` (excluyendo
      `specs/`, que se trata aparte en T11) no debe devolver resultados —
      confirma que no quedó ningún literal o nombre viejo suelto fuera de
      los archivos ya cubiertos por T2-T9.
- [ ] **T11** Anotar (no reescribir) `specs/project-status-field/requirements.md`
      y `design.md` con una nota breve fechada 2026-07-29 señalando que los
      3 valores documentados ahí fueron reemplazados por
      `specs/project-status-values-rename/`, mismo criterio ya usado en
      esa spec para las 4 specs anteriores a ella.
- [ ] **T12** Correr `npm run verify` completo (lint + build + test +
      check-sdd-state) y documentar el resultado en
      `progress/impl_project-status-values-rename.md`, junto con una
      checklist de QA manual: abrir `/proyectos` en el navegador y
      confirmar que (a) el badge de cada uno de los 3 proyectos reales
      muestra la label y color nuevos correctos según el mapeo de
      `requirements.md` — solo verificable **después** de que el humano
      aplique T1 en Supabase dev, documentar si quedó pendiente por esa
      razón; (b) el `<select>` de "Estado" del formulario de
      crear/editar proyecto muestra las 3 opciones nuevas
      ("Desarrollo"/"Piloto"/"Producción") y no las viejas.
