# Implementación — `project-status-values-rename`

Feature id: `project-status-values-rename`. Ejecutado `tasks.md` T1-T12
punto a punto, en orden.

## Archivos creados

- `supabase/migrations/20260729180000_cambiar_valores_status_projects.sql`
  — migración nueva. **No aplicada contra ninguna base de datos** por
  ningún agente (ni este `implementer` ni ningún otro paso automatizado):
  no hay credenciales de Supabase en este sandbox, y aunque las hubiera,
  el criterio de la spec es que el humano la aplica manualmente en su
  Supabase real de dev tras revisar el SQL. Contenido verificado línea a
  línea contra `design.md`: `alter table ... drop constraint` → 3
  `update ... where id = '<uuid>'` (por id exacto, no por `name`) →
  `alter table ... add constraint` con el dominio nuevo. Los 3 `id`
  coinciden carácter por carácter con `requirements.md`.
- `app/proyectos/StatusBadge.tsx` — reemplaza a `HealthBadge.tsx`
  (renombrado, no solo contenido nuevo).

## Archivos modificados

- `lib/types.ts` — `HealthStatus` → `ProjectStatus`, literales
  `"desarrollo" | "piloto" | "produccion"`; `Project.status` retipado.
- `lib/projects.ts` — import de `ProjectStatus`; `ProjectRow.status`,
  `ProjectFormValues.status` retipados; `VALID_STATUSES` redefinida.
- `lib/projects.test.ts` — test de `VALID_STATUSES` actualizado; row de
  ejemplo de `rowToProject` usa `"piloto"` en vez de `"at_risk"`.
- `app/proyectos/ProjectCard.tsx` — import y uso de `StatusBadge` en vez
  de `HealthBadge`.
- `app/proyectos/ProjectDrawer.tsx` — import y uso de `StatusBadge`; **más
  un ajuste no anticipado explícitamente en `design.md`** (ver abajo).
- `app/proyectos/ProjectForm.tsx` — imports de `ProjectStatus` y
  `PROJECT_STATUS_LABELS` desde `./StatusBadge`; `HEALTH_STATUS_OPTIONS` →
  `PROJECT_STATUS_OPTIONS`; tipo del `onChange` del `<select>`.
- `specs/project-status-field/requirements.md` y `design.md` — anotados in
  situ (no reescritos) con notas fechadas 2026-07-29 apuntando a esta
  spec para R1/R14/R27 y para el bloque SQL de la constraint vieja.
- `specs/project-status-values-rename/tasks.md` — T1-T12 marcadas `[x]`.

## Archivo eliminado

- `app/proyectos/HealthBadge.tsx` (contenido migrado a `StatusBadge.tsx`).

## Ajuste de alcance no anticipado por `design.md`

`design.md` describe el cambio en `ProjectDrawer.tsx` como "solo el import
y el nombre de componente en el JSX ... sin otros cambios". Sin embargo el
archivo tenía un literal `status: project?.status ?? "on_track"` (default
del formulario en modo creación) que `design.md` no mencionó. Con
`ProjectStatus` ya sin el literal `"on_track"`, ese código dejaba de tipar.
Cambiado a `"desarrollo"` (primera etapa del ciclo de vida, mismo criterio
de "punto de partida" que R4 de la migración usa para el mapeo real).
Ajuste pequeño y mecánico, documentado aquí en vez de expandir alcance o
reescribir la spec.

## Trazabilidad R → verificación

- **R1-R4** (migración SQL: drop → update ×3 → add, sin tocar tipo de
  columna ni RLS): verificado por lectura — el archivo `.sql` creado es
  copia exacta del bloque de `design.md` sección 1, contenido confirmado
  carácter por carácter contra `requirements.md`/`design.md`. **No
  aplicada** — pendiente de que el humano la corra manualmente en Supabase
  dev.
- **R5** (`HealthStatus` → `ProjectStatus` en `lib/types.ts`): verificado
  por lectura de `lib/types.ts` tras el cambio, y por `npm run build`
  (TypeScript check) pasando sin errores de tipo.
- **R6** (imports actualizados en los 4 call sites): verificado por
  `npm run build` (cualquier import roto habría fallado el TS check) y por
  el barrido `grep` de T10 (sin resultados para `HealthStatus`).
- **R7** (`VALID_STATUSES` redefinida): test `lib/projects.test.ts` →
  `describe("VALID_STATUSES", ...)` → `it("contains exactly the 3 expected
  statuses (R14)")`, `expect(VALID_STATUSES).toEqual(["desarrollo",
  "piloto", "produccion"])`. `npm run test` → 12/12 tests pasan.
- **R8** (labels "Desarrollo"/"Piloto"/"Producción" con tilde solo en la
  label): verificado por lectura de código en `StatusBadge.tsx`
  (`CONFIG[...].label`); QA visual en navegador **no ejercitada** (ver
  nota de QA manual abajo).
- **R9** (paleta gris/azul/verde de progresión, no semáforo): verificado
  por lectura de código — `CONFIG` en `StatusBadge.tsx` usa exactamente
  `#94A3B8` / `#2C40FF` / `#22C55E` para desarrollo/piloto/produccion,
  igual a `design.md` sección 3.
- **R10** (rename `HealthBadge`→`StatusBadge`,
  `HEALTH_STATUS_LABELS`→`PROJECT_STATUS_LABELS`): verificado por lectura
  del archivo renombrado y por el barrido `grep` de T10 (sin resultados
  para `HealthBadge`/`HEALTH_STATUS_LABELS`).
- **R11** (`ProjectDrawer.tsx`/`ProjectCard.tsx` importan `StatusBadge`):
  verificado por lectura de ambos archivos tras el cambio y por
  `npm run build` pasando.
- **R12** (`<select>` deriva sus opciones de `PROJECT_STATUS_LABELS`):
  verificado por lectura de `ProjectForm.tsx`
  (`PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS)`).
- **R13** (400 sin crear/modificar si `status` ausente/inválido):
  verificado por lectura de código — `route.ts` y `[id]/route.ts` usan
  `!VALID_STATUSES.includes(status) && "status"` en el array `missing`,
  sin cambio de código necesario (el dominio nuevo llega vía R7). Curl
  real contra `/api/proyectos` sin PIN da `401` (auth-first, esperado); el
  `400` de validación de `status` no se pudo ejercitar end-to-end en este
  sandbox por falta de PIN/sesión — mismo caso ya documentado en features
  anteriores de `/proyectos`.
- **R14** (201/200 con valor válido nuevo): verificado por lectura de
  código, mismo motivo que R13 para el límite de QA end-to-end en sandbox.
- **R15** (test de `VALID_STATUSES`): `lib/projects.test.ts` →
  `describe("VALID_STATUSES", ...)`, ver R7 arriba (mismo test).
- **R16** (test de `rowToProject` con `"piloto"`): `lib/projects.test.ts`
  → `describe("rowToProject", ...)` → `it("maps status from the row (R9),
  along with the other existing fields")`, `status: "piloto"` en el row de
  ejemplo, `expect(project.status).toBe("piloto")`.

## `npm run verify`

```
> lint    → eslint: sin errores
> build   → next build: compiló, TypeScript check sin errores, 16 rutas generadas (incluye /proyectos, /api/proyectos, /api/proyectos/[id])
> test    → vitest run: 2 test files, 12/12 tests pasan
> check-sdd-state → ✓ single active feature: project-status-values-rename (in_progress)
                    ✓ all spec_ready+ features have requirements/design/tasks on disk
                    ✓ feature_list.json is consistent with docs/specs.md
```

Los 4 pasos de `npm run verify` pasaron sin errores.

## Barrido final (T10)

```
grep -rn "on_track\|at_risk\|delayed\|HealthStatus\|HealthBadge\|HEALTH_STATUS_LABELS" app lib
```

Sin resultados — no queda ningún literal o nombre viejo suelto en `app/`
ni `lib/`. (`specs/` se trató aparte en T11, con notas in situ que
preservan el registro histórico sin reescribirlo, como exige la spec.)

## QA manual — UI (`StatusBadge.tsx`, `ProjectCard.tsx`, `ProjectDrawer.tsx`, `ProjectForm.tsx`)

Corrido `npm run dev` localmente y confirmado:
- `curl /proyectos` → `200` (la página carga).
- `curl /api/proyectos` → `401` (auth requerida, comportamiento esperado
  sin PIN).

Este sandbox no tiene PIN/sesión ni credenciales de Supabase (mismo
límite ya documentado en `project-crud`, `weekly-update-entry`,
`weekly-update-edit-delete`, `project-status-field`), y no hay una
herramienta de navegador/browser disponible en este entorno para hacer
click-through autenticado. Por lo tanto:

- **(a) Badge de los 3 proyectos reales con label/color nuevos**: **no
  verificable en este sandbox**, y además explícitamente condicionado por
  la spec a que el humano aplique T1 en Supabase dev primero (la migración
  no fue aplicada por ningún agente, ver arriba). Pendiente de QA humana
  end-to-end en el navegador después de aplicar la migración.
- **(b) `<select>` de "Estado" muestra las 3 opciones nuevas**: verificado
  por lectura de código, no por click-through en navegador (mismo límite
  de entorno). `ProjectForm.tsx` deriva `PROJECT_STATUS_OPTIONS` de
  `PROJECT_STATUS_LABELS` (`StatusBadge.tsx`), que mapea exactamente
  `desarrollo → "Desarrollo"`, `piloto → "Piloto"`,
  `produccion → "Producción"` — no quedan las labels viejas
  ("En curso"/"En riesgo"/"Atrasado") en ningún punto del código (barrido
  T10 confirma cero referencias a esos strings o a los valores viejos).

## `design-check`

El skill `design-check` (`.claude/skills/design-check/SKILL.md`) está
explícitamente acotado por su propia definición de alcance a
`.tsx` bajo `app/components/` ("Only look at `.tsx` files under
`app/components/`. Ignore everything else."). Los componentes tocados por
esta feature están todos bajo `app/proyectos/`, fuera de ese alcance, así
que el skill no aplica formalmente aquí.

Como chequeo manual equivalente (mismos criterios del skill, aplicados a
mano): `StatusBadge.tsx` usa hex literales (`#94A3B8`, `#2C40FF`,
`#22C55E`) en vez de `var(--color-...)`, incluyendo `#2C40FF` que coincide
exactamente con `--color-primary`. Esto **no es drift nuevo introducido
por esta feature** — el archivo original `HealthBadge.tsx` ya usaba el
mismo patrón (hex literales por entrada de un `Record` de configuración
por estado, p. ej. `on_track: { color: "#22C55E", ... }`), consistente en
todo el repo para este tipo de componente de badge multi-estado. No se
flaggea como hallazgo nuevo.

## Migración — estado

**No aplicada por ningún agente.** El archivo
`supabase/migrations/20260729180000_cambiar_valores_status_projects.sql`
queda listo para que el humano lo revise y lo aplique manualmente en su
Supabase de dev real (que tiene los 3 proyectos con datos reales:
Asistente de ventas Easy 2.0, Probador Virtual, Asesor de proyectos).
