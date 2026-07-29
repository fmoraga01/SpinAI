# Review — weekly-update-entry

## Veredicto

**RECHAZADO** — 1 gap bloqueante:

- **R16 incompleto**: la cláusula "`weekOf` ... **no parseable como fecha** →
  `400`" no está implementada en `app/api/proyectos/[id]/avances/route.ts`
  (solo se valida presencia con `!weekOf`), y la entrada de traceability de
  R16 en `progress/impl_weekly-update-entry.md` declara "verificado por
  ejecución real" listando únicamente 3 casos, omitiendo justamente ese.
  Verificado por el reviewer con `curl` real contra `npm run dev` (detalle
  abajo).

Todo lo demás pasa. **No se encontró ninguna regresión** de
`project-crud` ni de `project-status-tracking` (se revisó explícitamente,
dado el precedente de la primera vuelta de `project-crud`).

## Checkpoints — "Before `in_review`"

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Todas las tasks de `tasks.md` marcadas `[x]` | **PASS** — T1-T8 `[x]` |
| 2 | `npm run lint` | **PASS** (vía `npm run verify`, exit 0) |
| 3 | `npm run build` | **PASS** — compila + TS ok; `/api/proyectos/[id]/avances` aparece como ruta dinámica (ƒ) |
| 4 | `npm run test` | **PASS** — 13/13 (2 archivos), incluye los 4 nuevos de `mondayOf()` |
| 5 | `npm run check-sdd-state` | **PASS** — "single active feature: weekly-update-entry (in_review)" |
| 6 | Lógica nueva en `lib/` con test real de Vitest | **PASS** — `mondayOf()` con 4 tests en `lib/projects.test.ts` |
| 7 | `impl_<feature>.md` con entrada de verificación para cada `R1`-`R19` | **FAIL parcial** — están las 19 entradas, pero la de **R16 sobredeclara** cobertura (ver gap) |
| 8 | `design-check` si cambió `app/components/*.tsx` | **N/A → PASS** — no se tocó ningún archivo de `app/components/`; igual se aplicó el criterio sobre `app/proyectos/*.tsx` y se documentó (T4/T5/T6), sin findings pendientes |
| 9 | `feature_list.json`: una sola feature activa | **PASS** — solo `weekly-update-entry` (`in_review`) |

## Checkpoints — "Before `done`"

| Checkpoint | Resultado |
|---|---|
| `review_<feature>.md` con pass/fail + veredicto | **PASS** (este archivo) |
| Ningún `R<n>` sin entrada de verificación | **FAIL** — R16 (ver gap) |
| Una sola feature `in_progress`/`in_review` | **PASS** |
| `progress/history.md` con entrada de la feature | **PENDIENTE** — sin entrada todavía; es paso de cierre del `leader`, no del `implementer` |

## Gap bloqueante — detalle

`app/api/proyectos/[id]/avances/route.ts`:

```ts
const missing = [
  !weekOf && "weekOf",              // <-- solo presencia, no parseabilidad
  !VALID_STATUSES.includes(status) && "status",
  !note?.trim() && "note",
].filter(Boolean);
```

Evidencia empírica (curl real contra `npm run dev`, cookie `spinai_token`
válida, mismo método que usó `implementer`):

```
{"weekOf":"2026-07-06","status":"bogus","note":"x"}   -> 400  (ok)
{"weekOf":"2026-07-06","status":"on_track","note":"   "} -> 400  (ok)
{}                                                     -> 400  (ok)
{"weekOf":"banana","status":"on_track","note":"x"}     -> 500  <-- R16 pide 400
{"weekOf":"2026-07-06","status":"on_track","note":"x"} -> 500  (baseline: env Supabase ausente)
```

El caso `"banana"` devuelve exactamente el mismo `500` que el body
totalmente válido, o sea que **atravesó la validación completa** y murió
recién al llegar a `getSupabaseAdmin()`.

**Esto no es un artefacto del sandbox.** Con credenciales reales el
comportamiento sigue sin cumplir R16: `week_of` es `date not null`
(`supabase/migrations/20260728120000_crear_projects.sql:31`), así que
`"banana"` produciría un error de cast de Postgres devuelto como `500`
(`error.message`) por la línea 39 de la ruta — nunca un `400`. El registro
efectivamente no se crea, pero el status code y el mensaje "indicando qué
campo es inválido" que exige R16 no se cumplen.

Origen: `design.md` (líneas ~273-280) ya traía el bloque de validación sin
el chequeo de parseabilidad, así que `implementer` siguió el design al pie
de la letra. Igual el requirement manda sobre el sketch del design.

**Cómo cerrarlo** (decide `leader`, no el reviewer):
- (a) agregar el chequeo en la ruta (ej.
  `Number.isNaN(new Date(weekOf).getTime())` sumado a `!weekOf`), agregar
  el caso `weekOf` no parseable a la verificación por `curl`, y corregir la
  entrada de R16 en `impl_weekly-update-entry.md`; o
- (b) si se considera que la cláusula sobra (el cliente siempre manda un
  `weekOf` derivado de `mondayOf()`), enmendar R16 en `requirements.md` con
  `spec_author` + aprobación humana, en vez de dejar el requirement vigente
  incumplido.

La opción (a) es la barata: el path solo es alcanzable llamando la API
directo (curl/devtools), pero R16 existe justamente para ese caso.

## Auditoría específica pedida

### 1. `mondayOf()` — **CORRECTO**

`diff = day === 0 ? -6 : 1 - day` sobre un `Date` construido a mediodía
local, formateado con `getFullYear`/`getMonth`/`getDate` (nunca
`toISOString()`). Los 4 casos verificados corriendo `npm run test` yo mismo
(13/13 verde), y la aritmética revisada a mano:

- lunes `2026-07-06` (day=1, diff=0) → `2026-07-06` ✓ (se mapea a sí mismo)
- domingo `2026-07-05` (day=0, diff=-6) → `2026-06-29` ✓ (lunes **anterior**,
  no el siguiente — el caso que más se suele equivocar)
- miércoles `2026-07-08` (day=3, diff=-2) → `2026-07-06` ✓
- sábado `2026-08-01` (day=6, diff=-5) → `2026-07-27` ✓ (cruza fin de mes;
  `setDate()` con valor negativo hace el rollover correcto)

Los tests del archivo se corresponden con lo que describe el reporte.

### 2. Orquestación de creación en dos pasos — **CORRECTO**

`ProjectDrawer.handleFormSubmit` (líneas 119-148). El manejo real, no solo
"existe un try/catch":

- `createProject(values)` corre primero; si lanza, cae al `catch` **externo**
  (`setFormError`) y el bloque `if (firstUpdate)` es inalcanzable porque
  está después en el mismo `try` → **R5 ok**, no se intenta el avance.
- En éxito: `setProject(created)` + `onCreated(created)` +
  `setFormMode("view")` se ejecutan **antes** de intentar el avance. El
  `createWeeklyUpdate` va en un `try/catch` **interno** que **no re-lanza**:
  en el catch solo hace `setFirstUpdateError(...)`. Nada revierte
  `setProject`/`setFormMode`. → **R6 ok**: el proyecto queda creado y el
  drawer queda en modo vista mostrándolo.
- El error es **distinguible**: `firstUpdateError` es un estado propio,
  separado de `formError` (R5) y de `deleteError`, con su propio bloque de
  render en modo vista (líneas 392-394), y se resetea junto con los otros al
  cerrar el drawer (líneas 65-69).
- **Sin duplicación**: verifiqué los handlers en `app/proyectos/page.tsx` —
  `handleCreated` hace append (`[...prev, project]`) y `handleUpdated` hace
  replace por id (`prev.map(p => p.id === project.id ? project : p)`). La
  secuencia `onCreated(created)` → `onUpdated(withUpdate)` deja **una sola**
  card, actualizada con el avance. No hay doble insert ni proyecto huérfano.
- El `catch` vacío de `ProjectForm.handleSubmit` no traga nada relevante:
  `handleFormSubmit` nunca re-lanza, y el `finally { setSubmitting(false) }`
  libera el botón en todos los caminos.

### 3. Bloqueos de entorno — **ACEPTABLE** (mismo criterio que las 2 features anteriores)

Sin `.env.local`/`SUPABASE_SERVICE_ROLE_KEY` ni `PIN`, no se pueden
ejercitar el `201` real (R18), el `404` real (R17) ni el click-through de
UI (R1-R14). Reproduje yo mismo el `401` (R15) y los `400` (R16) por `curl`
real, así que la parte verificable del contrato de la API está verificada
de verdad, no solo por lectura. Los bloqueos están declarados
explícitamente en el reporte, sin workarounds inventados (no se hardcodeó
PIN ni se mockeó Supabase), y quedan listados como pasos pendientes del
humano. Mismo precedente aceptado en `project-status-tracking` y
`project-crud` → se acepta de nuevo. **Esto no es motivo de rechazo.**

Nota: este bloqueo es independiente del gap de R16 — el gap se demuestra por
lectura de código y se confirma por `curl` sin necesitar Supabase.

### 4. Las 4 decisiones no explícitas en `design.md` — **TODAS RAZONABLES**

1. `WeeklyUpdateValues` declarado una sola vez en `WeeklyUpdateFields.tsx` e
   importado por `ProjectForm`/`AddUpdateForm` — consistente con la decisión
   #1 de `impl_project-crud.md` para `ProjectFormValues`. Evita drift. OK.
2. `focusHandlers()` local en `WeeklyUpdateFields.tsx` tipado también para
   `HTMLSelectElement` — necesario por el `<select>` nuevo. Dejar intacto el
   `focusHandlers()` de `ProjectForm.tsx` evita tocar un archivo que no lo
   necesitaba; el costo es ~4 líneas duplicadas. Aceptable, no rompe nada.
3. Botón "Agregar avance" con `height: 28` vs 32 de "Editar"/"Eliminar" —
   jerarquía visual distinta (cuerpo vs header). `design.md` no fijaba la
   altura. Cosmético, sin impacto en requirements.
4. `values.date !== ""` en vez de truthiness — literalmente equivalente y
   más explícito. OK.

Ninguna de las 4 contradice `design.md` ni afecta un requirement.

## Regresiones sobre specs previas — ninguna encontrada

Revisado en el código, sin confiar en el "sin cambios" del reporte:

- `lib/projects.ts`: `git diff` **puramente aditivo** (0 líneas eliminadas).
  `healthFromTimeline()` y `rowToUpdate()` conservan firma y cuerpo exactos
  → contratos de `project-status-tracking` R2/R3 intactos.
- `ProjectTimeline.tsx`: único cambio es `function weekLabel` →
  `export function weekLabel`. El empty state sigue exactamente igual
  (`if (groups.length === 0)` → "Este proyecto todavía no tiene avances
  semanales registrados") → **R10 de `project-status-tracking` intacto**
  (era el tipo de regresión que hundió la 1ª vuelta de `project-crud`). El
  orden descendente por `weekOf` (R9) tampoco cambió.
- `HealthBadge.tsx`: solo se agrega `HEALTH_STATUS_LABELS` derivado de
  `CONFIG`. El componente y su caso `status === null` no se tocaron.
- `ProjectForm.tsx`: `showFirstUpdateSection` llega como `project === null`,
  así que en **modo edición la sección nueva no se renderiza** y el
  formulario queda idéntico al de `project-crud`. `canSubmit = isValid &&
  !updateIsPartial`: con los 3 campos vacíos `updateIsPartial` es `false`
  (0 no es `> 0`), o sea `canSubmit === isValid` → **R4/R8 de `project-crud`
  sin cambios de comportamiento**. `handleFormCancel` intacto (R9).
- `ProjectDrawer.tsx`: los 3 modos siguen funcionando — vista
  (`formMode === "view"`), creación (`mode === "create"` → `formMode
  "form"` con `project === null`) y edición (botón "Editar" →
  `setFormMode("form")` con `project !== null`). Botones "Editar"/"Eliminar"
  (R6/R11), modal de borrado (R12-R15), Escape con prioridad al modal,
  backdrop, estados loading/error/no-encontrado (R7): todos intactos. El
  `AddUpdateForm` se renderiza **encima** de `ProjectTimeline`, que se sigue
  renderizando siempre (nunca se reemplaza) y sin salir de modo vista →
  R8 de esta spec cumplido sin pisar el patrón de `project-crud`.
- `app/proyectos/page.tsx`: **no fue tocado** en el commit; el empty state
  (R5 de `project-status-tracking`) sigue intacto.

## Observación menor (no bloqueante)

`await req.json()` sin `try/catch` en la ruta nueva: un body con JSON
malformado produce un `500` no manejado en vez de `400`. Ningún requirement
lo exige y las 3 rutas de `project-crud` tienen el mismo patrón, así que es
consistente con el repo — mencionado solo por si se toca la validación al
arreglar R16.

## Para el `leader`

Devolver a `in_progress` con un alcance chico y acotado: cerrar R16 por la
vía (a) o (b) de arriba. El resto de la feature está en condiciones de
`done` — no hace falta re-verificar lo ya validado acá, solo el requirement
afectado (más `npm run verify` de nuevo).
