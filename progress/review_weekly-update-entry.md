# Review — weekly-update-entry

## Veredicto final (segunda vuelta, commit `5e724dd`)

**APROBADO** — el único gap bloqueante de la primera vuelta (R16) está
resuelto y verificado por ejecución real. La feature queda lista para pasar
a `done`. Detalle en la sección "Segunda vuelta" al final de este archivo.

---

## Veredicto — primera vuelta (histórico, ya resuelto)

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


---

# Segunda vuelta — re-review del fix de R16 (commit `5e724dd`)

## Veredicto: **APROBADO**

El gap bloqueante está cerrado por la vía (a) que proponía la primera
vuelta (fix en la ruta, sin enmendar el requirement). Re-verificado por el
reviewer de forma independiente, sin confiar en el reporte del
`implementer`.

## 1. Lectura del código real — **CORRECTO**

`app/api/proyectos/[id]/avances/route.ts:16`:

```ts
(!weekOf || Number.isNaN(new Date(weekOf).getTime())) && "weekOf",
```

`git show 5e724dd` confirma que el cambio de código es **exactamente una
línea** (`!weekOf && "weekOf"` → la de arriba); los demás archivos del
commit son solo `progress/impl_weekly-update-entry.md`. Sin efectos
colaterales en el resto de la ruta.

La lógica cubre las dos mitades que pide R16, en cortocircuito:

- `weekOf` ausente (`undefined`) / `""` → `!weekOf` es `true` → se agrega a
  `missing` (rama original preservada, sin regresión).
- `weekOf` presente pero no parseable → `new Date(weekOf)` es `Invalid
  Date`, `getTime()` es `NaN`, `Number.isNaN(...)` es `true` → se agrega.
- `weekOf` válido → ambas ramas `false` → no se agrega, sigue al `insert`.

El `||` garantiza que `new Date()` solo se evalúa con un `weekOf` truthy, y
el resultado se suma a la misma lista `missing`, así que el mensaje sigue
nombrando el campo inválido — la parte de R16 que exige "un mensaje
indicando qué campo falta o es inválido", no solo el status code.

## 2. Verificación empírica propia (`curl` contra `npm run dev` local)

Reproducido por el reviewer, no copiado del reporte. JWT firmado a mano con
`jose` y el secreto de fallback de `lib/auth.ts` (`fallback-secret-change-me`),
cookie `spinai_token`, sin tocar ningún archivo del repo:

```
sin cookie (body válido)            -> 401 {"error":"No autorizado"}                    (R15 ok)
{}                                  -> 400 "...faltantes o inválidos: weekOf, status, note"
{"weekOf":"banana",...}             -> 400 "...faltantes o inválidos: weekOf"   <-- EL FIX
{"weekOf":"",...}                   -> 400 "...faltantes o inválidos: weekOf"   (sin regresión)
weekOf ausente                      -> 400 "...faltantes o inválidos: weekOf"   (sin regresión)
{"weekOf":"2026-13-45",...}         -> 400 "...faltantes o inválidos: weekOf"   (extra del reviewer)
{"status":"bogus",...}              -> 400 "...faltantes o inválidos: status"   (sin regresión)
{"note":"   ",...}                  -> 400 "...faltantes o inválidos: note"     (sin regresión)
banana + bogus + blank              -> 400 "...faltantes o inválidos: weekOf, status, note"
{"weekOf":"2026-07-06",...} válido  -> 500 (baseline: env Supabase ausente)
```

Dos comprobaciones adicionales que el reviewer hizo y el reporte no
declaraba:

- **`"2026-13-45"`** (string con forma de fecha pero fuera de rango, no solo
  basura tipo `"banana"`) también devuelve `400`. El fix no depende de que
  el input sea obviamente no-fecha.
- **El log del server tiene exactamente UN `500`**, y es el error explícito
  de `getSupabaseAdmin` (`lib/supabaseAdmin.ts:20`, "Faltan
  NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"), correspondiente a
  la única request con body válido. Esto prueba dos cosas a la vez: (a)
  ningún caso inválido llegó a tocar Supabase — todos cortaron en el `400`,
  o sea que **no se crea el registro**, como exige R16; y (b) el caso de
  fecha válida **sigue atravesando la validación** igual que antes del fix
  (el `500` es idéntico al baseline de la primera vuelta), o sea que el
  chequeo nuevo no rechaza fechas legítimas.

Contraste con la primera vuelta: `"banana"` devolvía el mismo `500` que un
body válido (prueba de que atravesaba la validación entera). Ahora devuelve
`400` nombrando `weekOf`, y ya no aparece en el log de Supabase.

## 3. `npm run verify` — **PASS, exit 0**

Corrido por el reviewer, end-to-end:

```
npm run lint            -> sin errores
npm run build           -> compila + TS check ok
npm run test            -> 13/13 (2 archivos), incluidos los 4 de mondayOf()
npm run check-sdd-state -> ✓ single active feature: weekly-update-entry (in_review)
VERIFY EXIT=0
```

## 4. Checkpoints re-confirmados

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Tasks `tasks.md` marcadas `[x]` | **PASS** — T1-T8 |
| 2 | `npm run lint` | **PASS** (corrido por el reviewer) |
| 3 | `npm run build` | **PASS** (corrido por el reviewer) |
| 4 | `impl_<feature>.md` con verificación para cada `R1`-`R19` | **PASS** — la entrada de R16 ahora lista los 4 casos reales y **ya no sobredeclara**: documenta el gap previo, el fix y los 3 casos de re-verificación. Coincide con lo que el reviewer reprodujo. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **N/A → PASS** — el fix es server-side; no se tocó ningún `.tsx` en `5e724dd` |
| 6 | `feature_list.json`: una sola feature activa | **PASS** — solo `weekly-update-entry` (`in_review`) |

## 5. Alcance del re-review

Conforme a lo acordado, **no se re-evaluó** lo ya aprobado en la primera
vuelta (`mondayOf()`, orquestación de creación en dos pasos, ausencia de
regresiones sobre `project-crud` / `project-status-tracking`, las 4
decisiones no explícitas en `design.md`, y los bloqueos de entorno
aceptados). El commit `5e724dd` no toca ninguno de esos archivos, así que
esas conclusiones siguen vigentes.

Los bloqueos de entorno (sin credenciales de Supabase → `201`/`404` reales
de R17/R18 no ejercitables; sin `PIN`/browser → QA visual de R1-R14 no
ejercitable) **siguen presentes y siguen siendo aceptables**, con el mismo
criterio ya aplicado a `project-crud` y `project-status-tracking`. Están
declarados en `impl_weekly-update-entry.md` como pasos pendientes del
humano. No son motivo de rechazo.

## 6. Observación menor (heredada, no bloqueante)

Sigue en pie lo anotado en la primera vuelta: `await req.json()` sin
`try/catch` → un body con JSON malformado da `500` en vez de `400`. Ningún
requirement lo exige y las 3 rutas de `project-crud` tienen el mismo
patrón, así que es consistente con el repo. **No bloquea.**

Nota de precisión sobre el fix (tampoco bloqueante): `new Date(x)` acepta
también números y booleanos (`new Date(123)` es una fecha válida), así que
un `weekOf` no-string pasaría la validación y moriría en el cast de
Postgres. R16 habla de "no parseable como fecha" y el cliente siempre manda
el string de `mondayOf()`, así que el requirement se cumple; se deja
anotado solo por si a futuro se endurece la validación de tipos del body.

## 7. Para el `leader`

**Aprobado para `done`.** Pendiente el paso de cierre habitual del `leader`
(entrada en `progress/history.md`), que no es responsabilidad del
`implementer` ni del `reviewer`. El `reviewer` no tocó `feature_list.json`
ni `progress/current.md`, ni hizo commit/push.
