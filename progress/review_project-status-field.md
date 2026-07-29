# Review — project-status-field

**Veredicto: REJECTED**

Motivo bloqueante único: **el checkpoint de Vitest para lógica de `lib/` no
se cumple** (detalle en el checkpoint 3 abajo). Todo lo demás — incluido el
punto de mayor riesgo real, la migración SQL contra datos de producción —
pasa. La corrección es acotada: agregar tests a `lib/projects.test.ts`, sin
tocar nada más de la implementación.

Revisado por un contexto distinto al que implementó la feature. Commit
auditado: `3b22702` (+ `802dec9`, cambio de estado), rama `dev`, árbol
limpio.

---

## Checkpoints "Before `in_review`"

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Todas las tasks de `tasks.md` marcadas `[x]` | **PASS** — T1-T10 marcadas y verificadas contra el diff real, no solo contra el reporte |
| 2 | `npm run lint` | **PASS** — corrido por el reviewer, sin errores |
| 3 | `npm run build` | **PASS** — corrido por el reviewer, compila + TS check ok |
| 3b | Test Vitest real para lógica nueva/cambiada en `lib/` | **FAIL** — ver abajo |
| 4 | `progress/impl_<feature>.md` con verificación para cada `R<n>` | **PASS con reserva** — R1-R32 todos tienen entrada, ninguna "N/A" sin justificar; pero 5 entradas usan un tipo de verificación que `docs/specs.md` no acepta para `lib/` (ver 3b) |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS (N/A estricto)** — no se tocó `app/components/`; se tocó `app/proyectos/*.tsx` y aun así se aplicó el criterio manualmente y se documentó, sin findings pendientes |
| 6 | Una sola feature `in_progress`/`in_review` | **PASS** — `check-sdd-state`: "single active feature: project-status-field (in_review)" |

`npm run verify` completo: **exit 0** (lint + build + 9 tests + check-sdd-state).

---

## FAIL — Checkpoint 3b: lógica de `lib/` sin test de Vitest

`CHECKPOINTS.md` ("Before `in_review`"):

> Si la feature agregó/cambió lógica en `lib/`, hay un test Vitest real
> (`lib/**/*.test.ts`) — **esto ya no es opcional** ahora que Vitest existe.

`docs/specs.md` (sección Traceability) lo refuerza:

> **Logic in `lib/`** — a real Vitest test... This is no longer optional for
> `lib/` changes... don't leave `lib/` logic untested because of a missing
> `export`.

Esta feature **sí** cambió lógica en `lib/projects.ts`:

- `rowToProject()` ahora mapea `status: row.status` (**R9**)
- `rowToUpdate()` dejó de mapear `status` (**R10**)
- `VALID_STATUSES` nuevo export, del que dependen las 4 rutas API (**R14**)
- `ProjectFormValues` gana `status` / `WeeklyUpdateFormValues` lo pierde
  (**R12**, **R13**)

Ninguna de esas cinco tiene test. Verificado:

```
grep "rowToProject|rowToUpdate|VALID_STATUSES" lib/*.test.ts  → 0 ocurrencias
```

`lib/projects.test.ts` cubre hoy **únicamente** `mondayOf()`, que esta
feature no tocó. El balance neto de la feature es **-4 tests y +0**: pasó
de 8 `it()` en `lib/projects.test.ts` (4 `mondayOf` + 4 `healthFromTimeline`)
a 4 (solo `mondayOf`).

En `impl_project-status-field.md`, R9/R10/R12/R13/R14 están verificados
"por lectura [de código]" — que no es ninguno de los tres tipos de
verificación aceptados por `docs/specs.md` para `lib/`. `npm run build`
(TypeScript) tampoco sustituye al test: valida la *forma* de los tipos, no
que `rowToProject()` propague el valor correcto.

Atenuante que **no** aplica acá: `rowToProject`/`rowToUpdate` ya están
exportadas y son funciones puras que reciben un objeto plano — no necesitan
Supabase ni refactor previo para testearse.

### Para levantar el rechazo

Agregar a `lib/projects.test.ts` (nada más; no tocar la implementación):

1. `describe("rowToProject")` — que una fila con `status: "at_risk"` produzca
   un `Project` con `status: "at_risk"` (R9), y que siga mapeando
   `business_unit → businessUnit`, kpis ordenados por `position` y updates.
2. `describe("rowToUpdate")` — que una fila `{id, week_of, note}` produzca
   exactamente `{id, weekOf, note}`, sin propiedad `status` (R10). Sirve
   `expect(Object.keys(...))` o `expect(result).not.toHaveProperty("status")`.
3. `describe("VALID_STATUSES")` — que contenga exactamente los 3 valores del
   `check` de la migración (R14). Es el acoplamiento silencioso más peligroso
   que queda: si alguien edita el array, nada falla hasta que Postgres
   rechaza el insert en runtime.

---

## Migración SQL — auditada en detalle (punto de mayor riesgo): CORRECTA

`supabase/migrations/20260729120000_mover_status_a_projects.sql`. Es
**byte-idéntica** al bloque de `design.md` (verificado con `diff`, no a ojo).
Secuencia leída paso a paso:

1. `alter table projects add column status text;` — **nullable**, sin
   `not null` ni `default`. Correcto (R1, R2 paso 1). Es exactamente el error
   que se buscaba: un `add column ... not null` acá habría reventado contra
   la fila existente de "Probador Virtual". **No está ese error.**
2. Backfill (R2 paso 2, R3, R4):
   ```sql
   update projects p
   set status = coalesce(
     (select u.status from project_weekly_updates u
      where u.project_id = p.id order by u.week_of desc limit 1),
     'on_track')
   where p.status is null;
   ```
   - Subquery **correlacionada** por `u.project_id = p.id` — por proyecto,
     no una constante global. **No hardcodea "Probador Virtual"** ni ningún
     UUID, y no asume un único proyecto: escala a N proyectos sin cambios (R3).
   - `order by u.week_of desc limit 1` = "avance más reciente por fecha",
     mismo criterio que usaba `healthFromTimeline()` (R3).
   - `coalesce(..., 'on_track')` cubre el proyecto sin ningún avance, único
     caso sin dato del que derivar (R4), documentado como tal en el comentario.
   - Alias `p` sin `AS`: sintaxis válida de Postgres para `UPDATE`.
3. `alter column status set not null` + `add constraint projects_status_check
   check (status in ('on_track','at_risk','delayed'))` — **después** del
   backfill (R2 paso 3, R1). En este punto ninguna fila es null, así que el
   `not null` no falla; y los valores backfilleados vienen de una columna que
   ya tenía el mismo `check`, así que el constraint tampoco puede fallar.
4. `alter table project_weekly_updates drop column status;` — **último** (R5).
   El orden importa y está bien: el backfill del paso 2 lee esa columna
   mientras todavía existe. Invertir 2 y 4 dejaría el backfill sin fuente.
5. Sin `create policy`/`alter policy`/`enable row level security` en todo el
   archivo — RLS intacta (R6).

**No fue aplicada contra ninguna base**, como exigía T1: no existe ningún
`.env*` en el repo (`ls .env*` → no such file), así que el sandbox no tuvo
credenciales de Supabase ni siquiera para intentarlo. `impl_...md` lo declara
explícitamente y lista la aplicación manual como paso pendiente del humano.

Nota informativa (no es un defecto): la migración no es transaccional
explícita. Postgres corre cada statement en su propia transacción implícita
si se pega suelta en el SQL Editor; si el humano quiere atomicidad total
puede envolverla en `begin; ... commit;`. Dado que el paso 4 es irreversible
y destructivo, vale la pena mencionarlo, pero **no contradice ningún
requirement** — R1-R6 no piden atomicidad.

---

## Frentes auditados — resultados

**Sin referencias huérfanas: PASS**
- `healthFromTimeline` → **0 ocurrencias** en `.ts`/`.tsx` de todo el repo.
- Los 4 tests viejos fueron **borrados de verdad** (`git show 3b22702 --
  lib/projects.test.ts`: 34 deleciones, `describe("healthFromTimeline")` y sus
  4 `it()` desaparecen del archivo). **No** quedaron comentados ni con
  `.skip`: `grep ".skip|xit(|xdescribe|todo("` en `lib/*.test.ts` → 0.
- Ningún `<select>` ni "Estado" en `WeeklyUpdateFields.tsx` ni
  `AddUpdateForm.tsx`; `ProjectTimeline.tsx` no tiene ninguna ocurrencia de
  `status` (ni en `startEdit`, ni en `confirmEdit`, ni en el JSX).
- Sin residuos de "Sin datos" en `app/`/`lib/`.

**Rutas API: PASS — verificado por `curl` real por el reviewer**
(`npm run dev` local + JWT HS256 firmado con el secret de fallback de
`lib/auth.ts`):

| Caso | Esperado | Obtenido |
|---|---|---|
| `POST /api/proyectos` sin cookie | 401 | `401 {"error":"No autorizado"}` |
| `POST /api/proyectos` sin `status` | 400 con "status" | `400 Campos requeridos faltantes: status` |
| `POST /api/proyectos` `status:"foo"` | 400 | `400 ...faltantes: status` |
| `POST /api/proyectos` `status:"at_risk"` | pasa validación | 500 (credenciales) |
| `PATCH /api/proyectos/<id>` sin `status` | 400 con "status" | `400 ...faltantes: status` |
| `PATCH` `status:"foo"` | 400 | `400 ...faltantes: status` |
| `PATCH` `status:"delayed"` | pasa validación | 500 (credenciales) |
| `POST .../avances` body `{}` | 400 **sin** "status" | `400 ...o inválidos: weekOf, note` |
| `POST .../avances` `{weekOf,note}` | no 400 | pasa validación → 500 |
| `POST .../avances` + `status:"basura-invalida"` | **ignorado**, no 400 | pasa validación → 500 |
| `PATCH .../avances/<id>` body `{}` | 400 sin "status" | `400 ...o inválidos: weekOf, note` |
| `PATCH .../avances/<id>` + `status` basura | ignorado, no 400 | pasa validación → 500 |

Sobre la duda planteada (ignorar vs. rechazar): el código implementó
**ignorar silenciosamente**, que es lo que pide R30. Confirmado empíricamente
con un `status` deliberadamente inválido (`"basura-invalida"`): no produce
400. Las dos rutas de avances simplemente no desestructuran `status` del body.

Los 500 son todos el error explícito de `getSupabaseAdmin()` ("Faltan
NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY", 20 ocurrencias en el
log), **nunca** un `TypeError`/`ReferenceError` (grep → 0). El reporte del
implementer es fiel en este punto.

**`VALID_STATUSES` centralizado: PASS** — 1 sola definición
(`lib/projects.ts:26`), importada por `app/api/proyectos/route.ts` y
`[id]/route.ts`. Las dos rutas de avances ya no la importan. 0 copias locales
(R14).

**`HealthBadge` sin caso `null`: PASS** — `{ status }: { status: HealthStatus }`,
sin `| null`, sin rama `if (status === null)`, sin código muerto.
`ProjectCard.tsx:12` `const status = project.status;` (R24);
`ProjectDrawer.tsx:269` `<HealthBadge status={project.status} />` (R25) — un
único call site en el drawer, ambos migrados.

**Anotaciones de specs previas: PASS** — las 4 specs tienen anotaciones in
situ fechadas 2026-07-29 que apuntan de vuelta a `project-status-field`, y
coinciden 1:1 con la tabla consolidada (status-tracking R2/R3/R6;
crud R2/R3/R4/R7/R8/R17/R18/R20/R21; entry R1/R2/R3/R4/R9/R10/R16/R18;
edit-delete R2/R4/R5/R16/R19). Sin ítems anotados de más ni de menos.

Verificado el caso más delicado, R5 de `weekly-update-edit-delete` ("ya no
refresca el badge"): la anotación es **correcta**. `ProjectTimeline.tsx` no
importa ni renderiza `HealthBadge` (0 ocurrencias), y
`ProjectDrawer.handleEditUpdate`/`handleDeleteUpdate` hacen
`{ ...project, updates: ... }` — preservan `project.status` intacto y solo
tocan `updates`, así que el badge efectivamente no se recalcula ni cambia al
editar/borrar un avance. No hay código que intente derivarlo.

---

## Observaciones menores (no bloquean por sí solas; corregir junto con 3b)

1. **Comentario obsoleto en `HealthBadge.tsx:9-10`**: dice
   "Reutilizado por WeeklyUpdateFields.tsx (`<select>` de estado del avance)".
   Ese `<select>` ya no existe. El único consumidor de `HEALTH_STATUS_LABELS`
   es hoy `ProjectForm.tsx:6`. El comentario apunta a algo que la feature
   borró.
2. **Dato incorrecto en `impl_project-status-field.md`**: dice "9 tests pasan
   (5 `mondayOf()` + 4 tests preexistentes de otros módulos)". Está invertido:
   son **4** `mondayOf` (`lib/projects.test.ts`) + **5** de `lib/sizes.test.ts`.
   El total (9) y la resta (13 → 9, -4) sí son correctos.

## Pendientes del humano (correctamente documentados, no son motivo de rechazo)

Aplicar la migración en el SQL Editor de dev; setear
`SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` para ejercitar los
201/200 reales (R28/R29/R31/R32); setear `PIN` para el QA visual de R15-R26;
confirmar RLS en el dashboard (R6).
