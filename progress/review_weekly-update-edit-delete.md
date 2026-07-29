# Review — `weekly-update-edit-delete`

**Veredicto: APPROVED**

Revisado por `reviewer` (sesión independiente de la que implementó). Commit
revisado: `703c684` en `dev`. `npm run verify` corrido por el reviewer, no
tomado del reporte de `implementer`.

La aprobación se emite **con una condición de traspaso** (no bloqueante para
`done`, sí obligatoria al escribirlo): la entrada de `feature_list.json` debe
llevar un `note` de QA humana pendiente, igual que `project-crud` y
`weekly-update-entry` — ver "Condición de traspaso" abajo.

---

## Checkpoints — `Before in_review`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS (con matiz)** — T1-T6 `[x]`. T5 está marcada con la anotación explícita "(parcial — bloqueado por falta de credenciales Supabase/PIN)", que es exactamente lo que T6 instruye hacer en vez de asumir que funciona. No es un check-off silencioso. |
| 2 | `npm run verify` pasa | **PASS** — corrido por el reviewer, exit code 0: `lint` OK, `build` OK (TypeScript incluido), `test` 13/13 en 2 archivos, `check-sdd-state` OK. El build registra la ruta nueva: `ƒ /api/proyectos/[id]/avances/[updateId]`. |
| 3 | Test de Vitest si se agregó lógica en `lib/` | **PASS** — `lib/projects.ts` solo suma `updateWeeklyUpdate()`/`deleteWeeklyUpdate()`, dos wrappers de `fetch()` sin lógica pura. Consistente con el precedente ya aprobado (`createProject`/`updateProject`/`deleteProject`/`createWeeklyUpdate` tampoco tienen test; `lib/projects.test.ts` cubre solo `mondayOf`/`healthFromTimeline`, ambas reutilizadas sin cambios) y con lo que la spec aprobada ratificó en T2. |
| 4 | `progress/impl_*.md` con entrada de verificación por cada `R<n>` | **PASS** — R1-R21 tienen todas entrada. Ninguna "N/A" sin justificación; los bloqueos de entorno (R17-R21) están declarados como bloqueos, no como verificados. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS / N/A** — no se tocó ningún archivo bajo `app/components/`; el skill está scopeado explícitamente a `app/components/*.tsx` ("Only look at `.tsx` files under `app/components/`. Ignore everything else"), así que correrlo sobre este diff no habría reportado nada. `implementer` aplicó los criterios del skill a mano sobre `app/proyectos/*.tsx` y documentó el resultado. **Verifiqué sus afirmaciones una por una y son ciertas**: `#F87171`/`#F8717122` ya existían en `ProjectDrawer.tsx`, `#F87171`/`#1a2035`/`var(--shadow-glow-sm)` ya existían en `AddUpdateForm.tsx`, todos los `border-radius` nuevos usan `var(--radius-md)`, y los `fontSize` nuevos (11/12/13) caen dentro de la escala 10-15px. Sin drift nuevo. |
| 6 | Solo esta feature `in_progress`/`in_review` | **PASS** — `check-sdd-state`: "✓ single active feature: weekly-update-edit-delete (in_review)". |

## Checkpoints — `Before done`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | `progress/review_<feature>.md` con pass/fail y veredicto | **PASS** — este archivo. |
| 2 | Ningún `R<n>` sin entrada de verificación | **PASS** — R1-R21 cubiertos. |
| 3 | Una sola feature activa | **PASS**. |
| 4 | `progress/history.md` con entrada resumen | **PENDIENTE de `leader`** — le corresponde al cierre de sesión, no a `implementer`/`reviewer`. |

---

## Verificación dirigida (los dos frentes que ya causaron rechazos antes)

### 1. Validación de `PATCH` — ¿reintrodujo el bug del `"banana"` → 500?

**No.** El bloque de validación de `PATCH`
(`app/api/proyectos/[id]/avances/[updateId]/route.ts:27-34`) es carácter por
carácter idéntico al de `POST` (`.../avances/route.ts:15-22`), incluida la
validación de parseabilidad que corrigió R16 de `weekly-update-entry`:

```ts
(!weekOf || Number.isNaN(new Date(weekOf).getTime())) && "weekOf",
```

Ejercité la expresión aislada con los casos límite: `{}` → 400
(`weekOf,status,note`), `weekOf:"banana"` → 400 (`weekOf`), `status:"nope"` →
400 (`status`), `note:"   "` → 400 (`note`), `weekOf:"2026-13-45"` → 400
(`weekOf`), body completo válido → pasa. El gap del `"banana"` **no** volvió.

Sí es una reimplementación (copia) en vez de una reutilización, incluido
`VALID_STATUSES` duplicado — pero `tasks.md`/T1 autorizó explícitamente esa
opción ("No tocar `route.ts` ... salvo que compartir `VALID_STATUSES` requiera
extraerlo ... mantenerlo mínimo"). Aceptado como decisión ya ratificada por la
spec, con la nota de deuda de abajo.

### 2. R18 — `updateId` de otro proyecto → 404, no 500/200

**Correcto en el código real.** `findUpdate()` (líneas 8-18) filtra por ambas
columnas a la vez, tal como pide `design.md`:

```ts
.select("id").eq("id", updateId).eq("project_id", projectId).maybeSingle()
```

Recorrido de los cuatro caminos:
- `updateId` válido pero de **otro** proyecto → 0 filas → `maybeSingle()`
  devuelve `data: null, error: null` → `if (!existing)` → **404**. Correcto.
- `updateId` inexistente → mismo camino → **404**.
- `id` de proyecto inexistente → ninguna fila de `project_weekly_updates`
  matchea ese `project_id` → **404** (R17 cubierto por la misma query).
- `id` o `updateId` no-uuid → PostgREST `22P02` → **404** explícito, no 500.

Punto fino que sí revisé porque es la trampa exacta: usaron `maybeSingle()`,
no `single()`. Con `single()` el caso de 0 filas habría devuelto `PGRST116`,
que no matchea el chequeo de `22P02` y habría caído en el `return ... { status:
500 }` — es decir, exactamente el 500 que R18 prohíbe. La elección es la
correcta.

El `.update(...)`/`.delete()` posterior filtra solo por `.eq("id", updateId)`,
sin repetir `project_id`, pero la existencia y pertenencia ya quedaron
verificadas en la misma request y `design.md` lo especifica así. Aceptado.

Queda como está declarado en `impl_*.md`: el 404 cross-project **no se pudo
ejercitar contra Supabase real** en el sandbox. El código es correcto por
lectura; la confirmación end-to-end va a la condición de traspaso.

### 3. Regresiones

- **`POST /api/proyectos/[id]/avances`** — sin cambios (fuera del diff de
  `703c684`). Convive en `route.ts` mientras lo nuevo vive en
  `[updateId]/route.ts`; el build resuelve ambas rutas sin conflicto
  (`ƒ /api/proyectos/[id]/avances` y `ƒ /api/proyectos/[id]/avances/[updateId]`
  aparecen las dos). Sin regresión de `weekly-update-entry`.
- **`ProjectTimeline.tsx`** — `weekLabel()` intacta (idéntica), el `useMemo`
  de orden descendente intacto (`b.weekOf.localeCompare(a.weekOf)`), el empty
  state intacto y sigue siendo la primera rama del render, después de todos
  los hooks (sin riesgo de orden de hooks). Todo el cambio es aditivo. Sin
  regresión de `project-status-tracking`.
- **`ProjectDrawer.tsx`** — el diff son 20 líneas puramente aditivas: dos
  funciones nuevas y dos props en el render de `ProjectTimeline`. Ningún
  `useState`, `useEffect`, handler ni rama de render de los modos
  vista/creación/edición/borrado-de-proyecto fue tocado. `DeleteProjectModal`,
  `ProjectForm`, `AddUpdateForm` y el manejo de `Escape` quedan igual. Sin
  regresión de `project-crud`.
- **Aislamiento del estado nuevo** — `ProjectTimeline` solo se monta con
  `formMode === "view" && project !== null`, así que el estado por fila se
  descarta al entrar a modo formulario y no puede interferir con los modos del
  drawer.

### 4. Exclusión mutua

- **R3 (una sola fila en edición)** — garantizado: `editingId` es un único
  `string | null` y el botón "Editar" de toda fila lleva
  `disabled={editingId !== null}`. Abrir edición en B mientras A edita es
  imposible: el botón de B está deshabilitado.
- **R12 (no editar y borrar la misma fila)** — garantizado estructuralmente:
  la fila en edición renderiza únicamente la rama `WeeklyUpdateFields` +
  Cancelar/Guardar; los botones Editar/Eliminar solo existen en la rama de
  lectura. No es un `hidden` condicional que se pueda escapar.
- **Confirmación de borrado entre filas** — garantizado: `confirmDeleteId` es
  un único valor, así que clickear "Eliminar" en B revierte automáticamente la
  confirmación pendiente de A. Solo una fila puede estar en "¿Seguro?" a la vez.
- **Caso cruzado (confirmación pendiente en A + abrir edición en B)** —
  `startEdit()` no limpia `confirmDeleteId`, así que durante la ventana de 3s
  la fila A puede quedar mostrando "¿Seguro?" mientras B está en edición.
  **No es una violación**: R3 cubre exclusión de edición entre filas y R12
  cubre edición-vs-borrado dentro de *la misma* fila; ninguna requirement pide
  exclusión edición-en-B vs. borrado-en-A. Además el auto-revert de R10 acota
  la ventana a 3s y tracé el estado resultante si el usuario confirma ese
  borrado: `project.updates` pierde A, B sigue montada y en edición con sus
  valores, el `PATCH` posterior sobre B funciona igual. Sin corrupción de
  estado. Lo dejo como observación no bloqueante abajo.

### 5. Las tres decisiones no explícitas en `design.md`

1. **`onEdit`/`onDelete` vs `onEditUpdate`/`onDeleteUpdate`** — **razonable**.
   La inconsistencia es real y es del propio `design.md` (la `interface Props`
   dice `onEdit`/`onDelete`, la sección de `ProjectDrawer` dice
   `onEditUpdate`/`onDeleteUpdate`). `tasks.md`/T4 concedió la libertad
   explícitamente ("o los nombres de prop que use `ProjectTimeline`"), y elegir
   la firma declarada del componente por sobre la prosa es el criterio
   correcto. **Acción de seguimiento para `spec-author`, no para esta feature**:
   corregir esa línea de `design.md` para que el documento no quede
   contradiciéndose con el código ya mergeado.
2. **`opacity: 0` de hover como clase CSS** — **razonable, y de hecho la única
   implementación posible**. El `style={{ opacity: 0 /* 1 on row hover */ }}`
   de `design.md` es pseudocódigo: un style inline no puede expresar `:hover`.
   La clase `.proyecto-timeline-row-actions` con la regla
   `.proyecto-timeline-row:hover .proyecto-timeline-row-actions { opacity: 1 }`
   se agregó al bloque `<style>` ya existente, que es literalmente lo que
   pedía T3 ("agregar la regla CSS al bloque `<style>` existente, no un
   `<style>` nuevo"). Cumple R1 y R8 con el mismo trigger que ya resalta la fila.
3. **Limpieza de `deleteError[id]` residual tras un borrado exitoso** —
   **razonable**. Higiene de estado pura, no altera ninguna requirement, y está
   escrita sin mutación (devuelve `prev` sin copiar si no hay nada que limpiar).
   Nit menor: `startConfirmDelete()` no limpia el error previo, así que un
   mensaje de un intento fallido sigue visible hasta que el reintento tenga
   éxito. R13 no lo prohíbe; cosmético.

---

## Observaciones no bloqueantes (para deuda futura, no para esta feature)

1. **Dependencia circular nueva entre módulos**: `ProjectTimeline.tsx` importa
   `WeeklyUpdateFields.tsx`, que a su vez ya importaba `weekLabel` de
   `ProjectTimeline.tsx`. El ciclo es benigno en runtime (ambos exports son
   declaraciones de función, hoisted, y ninguna se usa en tiempo de evaluación
   de módulo) y el build pasa limpio, pero es un olor que conviene cortar
   moviendo `weekLabel()` a `lib/projects.ts` — donde ya vive `mondayOf()`, su
   pariente directo, y donde además ganaría cobertura de Vitest gratis.
2. **`opacity: 0` no saca los botones del flujo de foco**: los controles
   "Editar"/"Eliminar" siguen siendo tabulables e invisibles para un usuario de
   teclado. Es exactamente lo que especificó `design.md`, así que no es un
   incumplimiento — pero si en algún momento se hace una pasada de a11y sobre
   `/proyectos`, este es el patrón a revisar.
3. **`setTimeout` de R10 sin cleanup en unmount**: si el drawer se cierra
   dentro de la ventana de 3s, el timer dispara un `setState` sobre un
   componente desmontado. React 18+ lo ignora en silencio y es el mismo patrón
   que ya usa `MembersPanel.handleRemove`, así que es consistente con el repo.
4. **Validación duplicada entre `POST` y `PATCH`** (incluido `VALID_STATUSES`):
   autorizada por T1, pero ahora hay dos copias del mismo bloque en dos
   archivos. Si aparece una tercera ruta que valide un avance, conviene
   extraerlo a un helper compartido antes de que las copias diverjan — que es
   justamente cómo nacen bugs como el del `"banana"`.
5. **Robustez compartida (no nueva)**: `await req.json()` sin `try/catch` (body
   malformado → 500) y `note?.trim()` sobre un `note` no-string (→ 500) se
   comportan igual en `PATCH` y en el `POST` ya en producción. No es una
   regresión ni un gap introducido por esta feature; se anota para una pasada
   transversal de endurecimiento de las rutas de `/proyectos`.

---

## Condición de traspaso (obligatoria al mover a `done`)

`implementer` declaró honestamente que no hay
`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`PIN` en este sandbox y
que R17-R21 y la QA visual de R1-R14 quedaron sin ejercitar contra datos
reales. Eso es lo que `tasks.md`/T6 pide hacer y es el mismo bloqueo que ya
aceptaron `project-crud` y `weekly-update-entry`, así que no motiva un rechazo.

Pero `leader` debe replicar el precedente y escribir un `note` en la entrada de
`feature_list.json` al pasarla a `done`, listando como pendiente de QA humana
en `dev`, antes de cualquier uso real:

- Editar un avance cambiando los tres campos → `200`, fila actualizada sin
  recargar, `weekOf` guardado = lunes de la fecha elegida, `HealthBadge`
  refrescado si era el avance más reciente.
- Editar un avance **sin** cambiar la fecha → el `PATCH` no falla al reenviar
  el mismo lunes.
- Eliminar un avance → `200`, fila fuera del timeline sin recargar; eliminar el
  último → empty state (R14).
- **`PATCH` y `DELETE` con un `updateId` real que pertenece a otro proyecto →
  `404`, ni `200` ni `500`** (R18). Es el caso más fácil de pasar por alto y
  necesita dos proyectos reales en Supabase para ejercitarse de verdad.
- Dashboard de Supabase → confirmar que `project_weekly_updates` sigue sin
  policy para `anon`/`authenticated` (R21).
- QA visual en navegador de los controles de hover y del formulario inline
  (R1-R14).
