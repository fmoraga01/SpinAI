# Review — project-crud

**Verdict: REJECTED**

Motivo bloqueante (uno solo): la implementación **elimina el empty state de
`/proyectos`**, que sigue siendo un requirement vigente
(`project-status-tracking` R5). No es una laguna de la spec: es una decisión
unilateral de `implementer` sobre un requirement explícitamente declarado
en vigor por la propia `specs/project-crud/requirements.md`.

Todo lo demás está bien. El resto de R1-R26 se sostiene, `npm run verify`
pasa corrido de forma independiente, y las otras 4 desviaciones reportadas
por `implementer` son razonables (detalle abajo). El arreglo es chico.

Revisión hecha por una sesión que no escribió este código.

---

## Motivo del rechazo (bloqueante)

`app/proyectos/page.tsx` borra por completo el bloque
`{!loading && !error && projects.length === 0 && (...)}` ("Sin proyectos
cargados" + ícono + "Vuelve a revisar más tarde") y lo reemplaza por el grid
incondicional con `CreateProjectCard`. Con 0 proyectos la página ahora
muestra únicamente la card "Crear proyecto", sin ningún empty state.

Esto contradice `specs/project-status-tracking/requirements.md` R5:

> **R5**: WHEN la lista de proyectos está vacía (0 proyectos) THEN el
> sistema SHALL mostrar un empty state consistente con el resto de la app
> (ver `noticias/page.tsx` como precedente), no una lista en blanco.

Y R5 **no fue retirado**. `specs/project-crud/requirements.md` (líneas 5-7)
lo deja explícitamente vigente:

> no repite requirements ya cubiertos ahí (**R1-R17 de esa spec siguen
> vigentes sin cambios**).

Nótese que R5 de esa spec está vivo tal cual, a diferencia de R8, que sí fue
formalmente marcado *(retirado 2026-07-29)* en su propio archivo — o sea, el
repo ya tiene un mecanismo establecido para retirar un requirement, y no se
usó acá.

Además, `design.md` de esta feature **asume que el empty state sigue
existiendo**: la sección `CreateProjectCard.tsx` (líneas 159-168) lo usa como
referencia viva de estilo — *"Replica el bloque de ícono `+` que ya existe
como referencia visual en el empty state de `page.tsx` (líneas ~68-77
actuales...)"*, *"mismos valores de color que ya usa el empty state"*, y
*"Border `dashed` en vez del `solid` que usa el ícono del empty state"*. En
ningún punto el diseño aprobado propone eliminarlo.

El reporte de `implementer` (decisión #2) justifica el cambio diciendo que
*"`R1`/`design.md` no cubren explícitamente esta interacción"*. Eso es
incorrecto: el requirement que la cubre no es R1 de esta spec, es R5 de
`project-status-tracking`, que esta misma spec declara vigente. El
razonamiento de producto ofrecido (el empty state pasivo "vuelve a revisar
más tarde" ya no tiene sentido si el usuario puede actuar) es **bueno y
probablemente correcto** — pero por `docs/specs.md` cambiar un requirement
pasa por spec + gate de aprobación humana, no por criterio de `implementer`
en tiempo de implementación.

### Cómo corregirlo (cualquiera de las dos)

- **Opción A (código, más rápida):** restaurar el bloque de empty state para
  `projects.length === 0`, y dentro de ese estado incluir igual el
  `CreateProjectCard` (o un CTA equivalente), de modo que se cumplan R5
  *y* R1 a la vez. Adaptar el copy pasivo ("Vuelve a revisar más tarde") a
  uno accionable — eso sí es un ajuste de texto menor dentro del espíritu
  de R5, que solo exige "un empty state consistente con el resto de la app,
  no una lista en blanco".
- **Opción B (spec):** retirar formalmente R5 en
  `specs/project-status-tracking/requirements.md` con la marca
  *(retirado 2026-07-29)* y su razón, igual que se hizo con R8, y obtener
  aprobación humana explícita del cambio. Recién ahí el código actual queda
  conforme.

No apliqué ninguna de las dos: no es rol de `reviewer` arreglar lo que
rechaza.

---

## Checkpoints (`CHECKPOINTS.md` → "Before `in_review`")

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Todas las tareas de `tasks.md` marcadas `[x]` | **PASS** — T1-T8 todas `[x]`, verificado en el archivo |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí, exit 0 (ver abajo) |
| 3 | Cambios en `lib/` tienen test Vitest real | **PASS con reserva** — ver nota 1 |
| 4 | `progress/impl_<feature>.md` con entrada de verificación para cada `R<n>` | **PASS** — R1-R26, sin huecos, sin "N/A" sin justificar |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS (no aplica estrictamente)** — ver nota 2 |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — solo `project-crud` → `in_review` |
| — | **Fidelidad al spec aprobado** | **FAIL** — ver "Motivo del rechazo" |

El checkpoint que falla no es uno de los seis mecánicos: es el que
`CHECKPOINTS.md` describe como *"no reemplaza los juicios de valor de
arriba — un humano/reviewer todavía tiene que leer la spec y el diff"*.

### Checkpoint 2 — `npm run verify`, corrido de forma independiente

No confié en el reporte. Corrido por mí, **exit code 0**:

```
npm run lint            → PASS, sin salida de error
npm run build           → PASS, compila; /api/proyectos y /api/proyectos/[id]
                          siguen listadas como rutas dinámicas (ƒ)
npm run test            → PASS, 2 archivos / 9 tests
npm run check-sdd-state → PASS, "single active feature: project-crud (in_review)"
```

---

## Verificación de R1-R26 (leída contra el código, no contra el reporte)

Releí el diff completo y confirmé las afirmaciones del reporte una por una.
**No encontré ninguna afirmación falsa** en `progress/impl_project-crud.md`,
salvo la justificación de la decisión #2 tratada arriba.

**API (R16-R26) — sólido.** `POST` (`app/api/proyectos/route.ts:22-47`),
`PATCH` y `DELETE` (`app/api/proyectos/[id]/route.ts:29-79`): las tres
llaman `isAuthenticated(req)` como primera línea y devuelven `401` antes de
tocar nada (R16/R19/R23, R26); validación de los 4 campos con `?.trim()`
antes de `getSupabaseAdmin()` con mensaje de campo faltante (R17/R20);
`maybeSingle()` + chequeo `!data` → `404` (R22); manejo de `error.code ===
"22P02"` para ids no-UUID como `404` en vez de `500`, igual que el `GET`
existente; `DELETE` hace `select("id").maybeSingle()` de existencia antes
del `delete` para distinguir `404` de `200` (R25). Ningún import ni env var
nueva, ningún archivo tocado en `supabase/migrations/` (R26 confirmado por
el `--name-only` del commit).

**UI (R1-R15) — correcta,** salvo el empty state. Verifiqué en particular
los tres puntos donde era fácil equivocarse:
- **R14 / Escape anidado:** `ProjectDrawer.tsx:89-99` hace early-return
  `if (showDeleteModal) return;` en su listener, y `DeleteProjectModal.tsx:14-20`
  registra el suyo. Escape con el modal abierto cierra solo el modal, no el
  drawer de fondo. El riesgo señalado en `design.md` está efectivamente
  resuelto.
- **R15:** la rama `catch` de `handleDeleteConfirm` (`ProjectDrawer.tsx:141-145`)
  hace `setShowDeleteModal(false)` + `setDeleteError(...)` y **no** llama
  `onDeleted` — el proyecto no se quita del listado; el error se pinta en el
  cuerpo del drawer (`ProjectDrawer.tsx:346-348`). Cumple R15 al pie.
- **R5/R10:** el estado `values` vive en `ProjectForm`, que no se desmonta
  al fallar el submit, así que los valores ingresados sobreviven al error.
  Confirmado: `handleFormSubmit` solo setea `formError`.

---

## Las dos preguntas abiertas que `implementer` dejó para criterio del reviewer

### 1. Bloqueos de entorno (sin Supabase, sin PIN) — **ACEPTABLE, con condición**

**No es motivo de rechazo.** Razones:
- Literalmente, el checkpoint que aplica es *"No `R<n>` is missing a
  verification entry"*, y ninguno lo está. `docs/specs.md` pide para rutas
  API *"manual verification steps (e.g. hitting the route locally, checking
  logs)"* — `implementer` levantó el server real y golpeó las rutas; llegó
  hasta donde el entorno se lo permitió y **etiquetó con honestidad** qué
  quedó sin ejercitar (R18, R21, R22, R24, R25) en vez de declararlo
  verificado.
- Hay precedente directo: `progress/review_project-status-tracking.md`
  aprobó con este mismo bloqueo documentado.
- El JWT firmado a mano con el secreto de fallback de `lib/auth.ts` para
  probar los `401`/`400` me parece una técnica legítima de verificación, no
  un workaround sucio: no tocó ningún archivo del repo para lograrlo.

**Condición que debe viajar a `done`:** esta feature no es de solo lectura
como la anterior — **escribe y borra datos de producción en cascada**
(`DELETE` arrastra `project_kpis` y `project_weekly_updates`). Ningún camino
de escritura real se ejecutó nunca. Aceptar el bloqueo no puede significar
enterrarlo: al cerrar, `leader` debe dejar en `progress/history.md` y en la
entrada de `feature_list.json` una nota explícita de **"pendiente de QA
humana end-to-end antes de uso real en dev"**, cubriendo como mínimo: crear
un proyecto (201), editarlo (200), borrar uno (200 + confirmar en el Table
Editor de Supabase que la cascada borró KPIs y avances), y `PATCH`/`DELETE`
con id inexistente (404). Eso también alimenta el gate `dev → main`, que
sigue exigiendo uso real antes de producción.

### 2. Las cinco desviaciones respecto de `design.md`

| # | Desviación | Juicio |
|---|---|---|
| 1 | `ProjectFormValues` declarada una sola vez en `lib/projects.ts` y reusada | **Correcta.** El diseño mostraba la interfaz duplicada en dos snippets; una sola declaración evita drift. Mejora, no desviación. |
| 2 | Empty state pasivo reemplazado por el grid con `CreateProjectCard` | **BLOQUEANTE.** Ver arriba. Es la única que rompe un requirement. |
| 3 | POST-vs-PATCH decidido por `project === null` en vez del prop `projectId` | **Correcta, y mejor que el diseño.** Verifiqué el caso que motiva el cambio: tras crear, `page.tsx` deja `selectedId` en `null` y `creating` en `true`, así que el prop `projectId` sigue siendo `null` mientras el `Project` recién creado vive en el estado interno del drawer. Usar `projectId` habría disparado un segundo `POST` al editar sin cerrar el drawer. `project === null` es el criterio correcto. |
| 4 | Prop `error` de `DeleteProjectModal` siempre recibe `null` | **Aceptable, con deuda menor.** R15 es explícito en que el error va en el drawer, no en el modal, y seguir la letra del requirement por sobre el snippet es la decisión correcta. Pero deja código muerto: el prop y su bloque de render (`DeleteProjectModal.tsx:55-57`) son inalcanzables. Ver nota 3. |
| 5 | `#2C40FF88` → `#2C40FF55` y borde `#F8717155` → `#F87171` sólido | **Correcta.** Es exactamente lo que `design.md:187-189` autorizaba de antemano. Verifiqué el dato: `#2C40FF55` aparece 13 veces en `app/` (11 previas + las 2 nuevas), el reporte es exacto. |

Conclusión: 4 de 5 son desviaciones razonables dentro del espíritu del
diseño, y dos de ellas (#1, #3) son mejoras genuinas. Solo #2 rompe algo.

---

## Notas no bloqueantes

**Nota 1 — Vitest para las funciones nuevas de `lib/`.** `lib/projects.ts`
suma `createProject`/`updateProject`/`deleteProject` sin tests.
`tasks.md` T3 las exceptúa explícitamente ("las funciones de fetch en sí no
son pure functions — no requieren Vitest"), y esa `tasks.md` pasó el gate de
aprobación humana, así que lo doy por **PASS**. Pero hay una fricción real
en la documentación: `docs/specs.md:113` lista *"data fetching"* dentro de
lo que exige Vitest obligatorio. Las preexistentes `loadProjects`/
`loadProject` tampoco tienen test, o sea que el precedente acompaña a
`tasks.md`. **Recomiendo a `leader`/`spec-author` reconciliar la redacción
de `docs/specs.md:113`** para que "data fetching" no siga contradiciendo la
práctica establecida; no es responsabilidad de esta feature.

**Nota 2 — `design-check`.** El checkpoint se dispara solo si cambia
`app/components/*.tsx`; confirmé con `git show --name-only` que **ningún**
archivo de `app/components/` fue tocado, así que estrictamente no aplica.
`tasks.md` T4/T5 lo pedía igual para `app/proyectos/*.tsx`, y `implementer`
aplicó los criterios del skill a mano, documentó hallazgos concretos y
corrigió dos valores. Verifiqué el dato duro que sustenta esa corrección
(#2C40FF55, 13 usos) y es correcto. Lo doy por satisfecho de buena fe.

**Nota 3 — código muerto menor.** El prop `error` de `DeleteProjectModal` y
su render nunca se activan (`ProjectDrawer.tsx:378` pasa `error={null}`
siempre, por diseño de R15). Conviene eliminar el prop y su bloque, o dejar
un comentario de por qué existe. `AGENTS.md` §5 pide no dejar restos. Se
puede resolver junto con el fix bloqueante.

**Nota 4 — proceso.** El diff se commiteó a `dev` como `e59d793` mientras yo
revisaba, antes de que hubiera veredicto. El mensaje del commit aclara
"Pendiente de veredicto de reviewer", así que no rompe el flujo de
`AGENTS.md` (todo va a `dev` primero, y nada se acercó a `main`), pero
implica que el arreglo del empty state va a necesitar un commit adicional
encima en vez de una enmienda. Lo señalo para que `leader` no lo interprete
como que la feature ya quedó cerrada.

**Nota 5 — pendiente de cierre.** `progress/history.md` todavía no tiene
entrada para `project-crud`. Es tarea de `leader` al pasar a `done`
(checkpoint de "Before `done`"), no un incumplimiento de `implementer`.

---

## Qué falta, en concreto, para aprobar

1. **[Bloqueante]** Resolver el conflicto con `project-status-tracking` R5:
   restaurar un empty state para `projects.length === 0` que conviva con el
   `CreateProjectCard` (Opción A), **o** retirar R5 formalmente en su spec
   con aprobación humana explícita (Opción B).
2. *(Opcional, mismo pase)* Limpiar el prop `error` muerto de
   `DeleteProjectModal`.
3. Al re-enviar: actualizar `progress/impl_project-crud.md` con la
   verificación de R5 de `project-status-tracking` (o la referencia al
   cambio de spec) y re-correr `npm run verify`.

No hace falta rehacer nada más: el resto del diff quedó bien y no necesita
otra pasada.

---

# Segunda vuelta — 2026-07-29 (post-fix `b61b0bd`)

**Verdict: APPROVED**

El único motivo bloqueante de la primera vuelta está **resuelto**. La
feature `project-crud` queda aprobada para pasar a `done`, con las
condiciones no bloqueantes de la primera vuelta intactas (ver más abajo:
la nota de QA humana end-to-end sigue siendo obligatoria al cerrar).

Revisión hecha por una sesión que no escribió este código, leyendo el
código real y corriendo `npm run verify` de forma independiente.

## 1. Motivo del rechazo anterior — RESUELTO

`implementer` aplicó la **Opción A** del review anterior. Verificado en
`app/proyectos/page.tsx` (leído completo, no solo el resumen):

- `page.tsx:95-117` — rama `!loading && !error && projects.length === 0`:
  el bloque de empty state está restaurado literalmente (mismo contenedor
  centrado, mismo ícono SVG de documento con `#2C40FF0f` / `#2C40FF22`,
  mismo título "Sin proyectos cargados"). Confirmado con
  `git diff 3afa68b HEAD -- app/proyectos/page.tsx`: respecto de la versión
  pre-feature los únicos cambios en ese bloque son el `padding`
  (`"56px 24px"` → `"56px 24px 24px"`), el copy del subtítulo y el
  `CreateProjectCard` agregado. **R5 de `project-status-tracking` cumplido**
  — hay un empty state real, no una lista en blanco.
- `page.tsx:113-115` — dentro de ese mismo bloque,
  `<CreateProjectCard onClick={handleOpenCreate} />` envuelto en
  `maxWidth: 280`. **R1 de `project-crud` cumplido también con 0 proyectos**:
  la card "Crear proyecto" es visible y accionable. `CreateProjectCard`
  usa `width: "100%"` + `minHeight: 120`, así que se adapta al contenedor
  angosto sin romperse.
- `page.tsx:119-124` — rama `projects.length > 0` sin cambios respecto de
  la primera entrega: grid con `CreateProjectCard` como **primer** elemento
  seguido del `.map()` de `ProjectCard` (R1 al pie de la letra).

Las dos condiciones se satisfacen **simultáneamente**, que era exactamente
lo que pedía el review anterior. El cambio de copy ("Vuelve a revisar más
tarde" → "Crea el primero para empezar a hacer seguimiento") es el ajuste
menor que la Opción A autorizaba: R5 solo exige "un empty state consistente
con el resto de la app", y el bloque lo sigue siendo.

Transición verificada por lectura: al crear el primer proyecto desde el
empty state, `handleCreated` (`page.tsx:60-62`) hace
`setProjects((prev) => [...prev, project])`, `projects.length` pasa a 1 y la
página cambia sola a la rama del grid, con el drawer abierto en modo vista
(R3). No queda ningún estado intermedio inconsistente.

## 2. Limpieza del prop `error` — no rompió nada

`git diff e59d793 HEAD -- app/proyectos/DeleteProjectModal.tsx
app/proyectos/ProjectDrawer.tsx` muestra exactamente 3 borrados y ninguna
adición: la línea `error: string | null` de la interfaz `Props`, el
parámetro desestructurado, el bloque `{error && (<p .../>)}` y el
`error={null}` del call site. Nada más.

**R15 de `project-crud` sigue cumplido.** Verificado en el código, no en el
reporte:
- `ProjectDrawer.tsx:141-145` (`catch` de `handleDeleteConfirm`):
  `setShowDeleteModal(false)` + `setDeleteError(...)`, y **no** llama a
  `onDeleted` → el proyecto no se quita del listado.
- `ProjectDrawer.tsx:346-348`: el `deleteError` se pinta dentro del cuerpo
  del drawer. Ese render vive en la rama
  `formMode === "view" && !loading && !error && project !== null`, que es
  precisamente el estado en que queda el drawer tras un `DELETE` fallido
  (`project` sigue seteado, `formMode` nunca cambió, `loading`/`error` de
  carga siguen en `false`) — o sea, el mensaje **sí** es alcanzable.
- El estado `deleteError` y su setter siguen intactos; lo eliminado era el
  camino paralelo muerto dentro del modal, no este.

Confirmado además que no quedaron referencias huérfanas: las únicas
menciones de `DeleteProjectModal`/`deleteError` en `app/` son las 6 líneas
esperadas (import, estado, render del error, call site, definición).

R14 (Escape anidado) tampoco se vio afectado: `ProjectDrawer.tsx:94` mantiene
el `if (showDeleteModal) return;` y `DeleteProjectModal.tsx:13-19` su propio
listener.

## 3. `npm run verify` — corrido por mí, exit 0

No confié en el reporte de `implementer`. Corrido de forma independiente
sobre el árbol actual (working tree limpio, `git status --short` vacío):

```
npm run lint            → PASS
npm run build           → PASS; /api/proyectos y /api/proyectos/[id]
                          siguen listadas como rutas dinámicas (ƒ)
npm run test            → PASS, 2 archivos / 9 tests
npm run check-sdd-state → PASS, "single active feature: project-crud (in_review)"
EXIT=0
```

## 4. Checkpoints (`CHECKPOINTS.md` → "Before `in_review`") — re-verificados

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Todas las tareas de `tasks.md` marcadas `[x]` | **PASS** — T1-T8 todas `[x]` |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí, exit 0 |
| 3 | Cambios en `lib/` tienen test Vitest real | **PASS con reserva** — sin cambios desde la vuelta 1; ver Nota 1 de arriba (sigue vigente, y `lib/projects.ts` no se tocó en el fix) |
| 4 | `progress/impl_<feature>.md` con verificación por `R<n>` | **PASS** — R1-R26 sin huecos, más la sección "Fix post-rechazo (2026-07-29)" que agrega la verificación explícita de R5 de `project-status-tracking` y re-confirma R1. La primera parte del reporte quedó intacta, como corresponde |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS (no aplica)** — `git diff --name-only 3afa68b HEAD` confirma que ningún archivo de `app/components/` fue tocado en toda la feature; ver Nota 2 de la vuelta 1 |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — solo `project-crud` en `in_review` |
| — | **Fidelidad al spec aprobado** | **PASS** — era el único FAIL de la vuelta 1; resuelto (§1) |

## 5. Observaciones de la vuelta 1 — estado

- **Bloqueos de entorno (sin Supabase, sin PIN):** ya evaluados y aceptados
  en la primera vuelta. **La condición sigue en pie y viaja a `done`:** al
  cerrar, `leader` debe dejar en `progress/history.md` y en la entrada de
  `feature_list.json` la nota de **"pendiente de QA humana end-to-end antes
  de uso real en dev"** (crear 201, editar 200, borrar 200 + confirmar la
  cascada de `project_kpis`/`project_weekly_updates` en Supabase, y
  `PATCH`/`DELETE` con id inexistente → 404). A esa lista se suma ahora un
  ítem visual menor: **ver el empty state con 0 proyectos** (el fix no se
  pudo verificar en navegador, solo por lectura de código).
- **Las 5 desviaciones de `design.md`:** ya evaluadas en la vuelta 1. La #2
  (empty state) queda resuelta; la #4 (prop `error` muerto) queda cerrada
  con la limpieza de esta vuelta. Las otras tres se mantienen tal cual,
  aceptadas.
- **Notas 1, 4 y 5** de la vuelta 1 siguen vigentes como tales (fricción de
  redacción en `docs/specs.md:113` para `leader`/`spec-author`; la feature
  necesitó commits sucesivos en `dev`; falta la entrada de
  `progress/history.md`, tarea de `leader` al cerrar). Ninguna es
  bloqueante.

## Veredicto final

**APPROVED.** No queda ningún ítem bloqueante. `leader` puede mover
`project-crud` a `done`, arrastrando la nota de QA humana pendiente descrita
arriba.
