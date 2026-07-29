# Review — `project-status-values-rename`

Reviewer independiente (no es la sesión que implementó). Auditoría completa
re-ejecutada desde cero: un intento anterior de este review quedó sin
respuesta, así que nada de ese intento se dio por bueno. Todo lo que se
afirma acá fue corrido/leído por este reviewer, no tomado del reporte de
`implementer`.

## Veredicto

**APROBADO.**

Dos observaciones menores, ninguna bloqueante (detalle al final): un
cross-reference obsoleto en un comentario de `ProjectDrawer.tsx` y la
entrada de `progress/history.md`, que corresponde a `leader` al cerrar.

Recordatorio operativo, no un defecto: la migración
`20260729180000_cambiar_valores_status_projects.sql` **no está aplicada** y
debe correrla el humano en Supabase dev. Hasta entonces la app en dev
quedará inconsistente con el código (la constraint vieja rechaza los
valores nuevos y `StatusBadge` haría `CONFIG[status]` → `undefined` con las
filas viejas). Esto es exactamente lo que la spec pidió (T1: "No aplicar la
migración"), no un hallazgo.

---

## CHECKPOINTS.md — "Before `in_review`"

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Todas las tareas de `tasks.md` marcadas `[x]` | **PASS** — T1-T12 marcadas, y cada una verificada contra el diff real, no solo contra la marca |
| 2 | `npm run verify` pasa (lint + build + test + check-sdd-state) | **PASS** — corrido por este reviewer, ver abajo |
| 3 | Lógica nueva/cambiada en `lib/` tiene test Vitest real | **PASS** — `lib/projects.test.ts`, 2 tests tocados, ninguno debilitado |
| 4 | `progress/impl_<feature>.md` con verificación para cada `R<n>` | **PASS** — R1-R16 cubiertos, sin huecos ni "N/A" sin justificar |
| 5 | Si cambió `app/components/*.tsx`, `design-check` corrido | **N/A justificado** — no cambió ningún `.tsx` bajo `app/components/` |
| 6 | `feature_list.json`: entrada en `in_review` | **PASS** — única feature activa |

### 2. `npm run verify` — corrido por este reviewer

```
lint             → eslint, sin errores
build            → next build OK, TS check limpio, 16 rutas
test             → vitest run: 2 files, 12/12 tests pasan
check-sdd-state  → ✓ single active feature: project-status-values-rename (in_review)
                   ✓ all spec_ready+ features have requirements/design/tasks on disk
                   ✓ feature_list.json is consistent with docs/specs.md
```

`verify` está encadenado con `&&`, así que llegar a `check-sdd-state`
implica que los 4 pasos pasaron.

### 5. `design-check` — N/A verificado, no asumido

`.claude/skills/design-check/SKILL.md:21` acota el skill textualmente:
"Only look at `.tsx` files under `app/components/`. Ignore everything
else." Los 4 `.tsx` tocados por esta feature (`StatusBadge.tsx`,
`ProjectCard.tsx`, `ProjectDrawer.tsx`, `ProjectForm.tsx`) están todos bajo
`app/proyectos/`. El checkpoint no aplica.

`implementer` igual hizo el chequeo manual equivalente y reportó que
`StatusBadge.tsx` usa hex literales en vez de `var(--color-...)`, incluido
`#2C40FF` que coincide con `--color-primary`. Confirmado que **no es drift
nuevo**: el `HealthBadge.tsx` eliminado ya usaba el mismo patrón
(`on_track: { color: "#22C55E", ... }`). Hallazgo reconocido y aceptado
explícitamente, no silenciado.

### 6. `feature_list.json` — una sola feature activa

9 features en `done`, `project-status-values-rename` en `in_review`.
Ninguna otra en `in_progress`/`in_review`. Sin tocar por este reviewer.

---

## Frentes auditados en detalle

### 1. Secuencia de la migración SQL — **PASS** (el punto crítico)

Leído el archivo real, no el bloque de `design.md`. La secuencia es
exactamente la correcta y la única segura contra los datos reales:

1. `alter table projects drop constraint projects_status_check;`
2. `update projects set status = 'desarrollo' where id = 'b19cbec7-1786-47e9-a51a-bd3fa376b5fb';`
3. `update projects set status = 'piloto'     where id = 'fcc466f1-c6e3-4f53-bf44-4797aa48816f';`
4. `update projects set status = 'desarrollo' where id = '887b9ea4-c746-4f93-9773-ef26c007d490';`
5. `alter table projects add constraint projects_status_check check (status in ('desarrollo', 'piloto', 'produccion'));`

Verificaciones puntuales:

- **Orden drop → update ×3 → add**: correcto. El riesgo que la spec quería
  evitar (agregar la constraint nueva antes de los `update`, que fallaría
  porque las 3 filas hoy dicen `on_track`) **no ocurre**. Tampoco ocurre el
  simétrico (update antes del drop, que la constraint vieja rechazaría).
- **Nombre de la constraint a dropear**: `projects_status_check` coincide
  carácter por carácter con la creada en
  `20260729120000_mover_status_a_projects.sql:40` (migración ya aplicada),
  así que el `drop` no va a fallar por nombre inexistente. El `drop` no usa
  `if exists` — correcto, es preferible que falle ruidoso a que siga de
  largo sobre una premisa falsa.
- **Los 3 `id`**: comparados carácter por carácter contra la tabla de
  `requirements.md`. Coinciden los 3.
- **El mapeo**: `b19cbec7...` (Asistente de ventas Easy 2.0) → `desarrollo`,
  `fcc466f1...` (Probador Virtual) → `piloto`, `887b9ea4...` (Asesor de
  proyectos) → `desarrollo`. Coincide exactamente con lo pedido por el
  usuario. Los comentarios inline nombran cada proyecto, lo que permite al
  humano revisar el mapeo sin cruzar contra la spec.
- **Update por `id`, no por `name`** (R2): correcto en los 3 casos.
- **R4 — sin cambio de tipo de columna ni RLS**: correcto. No hay
  `alter column ... type`, no hay `set not null`/`drop not null`, no hay
  ninguna sentencia de policy. Solo `drop constraint`, 3 `update`,
  `add constraint`.
- **Timestamp del archivo**: `20260729180000` > `20260729120000`, ordena
  después de la migración ya aplicada. Correcto.
- **Sin dominio viejo residual en otra tabla**: la migración anterior hizo
  `alter table project_weekly_updates drop column status` (línea 46), así
  que no queda ninguna otra columna con el `check` viejo dando vueltas.
- **Estado de aplicación**: **no aplicada**, y verificado que ningún agente
  *pudo* haberla aplicado — no existe ningún `.env*` en el repo, no hay
  `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` en el entorno, y
  no hay CLI de `supabase` instalado. Confirmado empíricamente durante el
  curl test más abajo: toda llamada que llega a la capa de datos muere con
  `"Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"`.

Salvedad ya anticipada por `design.md` y que vale repetirle al humano: si
entre hoy y el momento de aplicar se creara un proyecto nuevo, su fila
tendría un `status` del dominio viejo (la constraint vieja sigue activa
hasta el paso 1) y el `add constraint` del paso 5 fallaría contra ella.
`design.md:69-75` lo trata explícitamente como comportamiento correcto y
deseado, con la decisión de mapeo en manos del humano. De acuerdo.

### 2. Barrido sin referencias huérfanas — **PASS** (reproducido, no confiado)

Re-corrido el barrido de T10 por este reviewer:

```
grep -rn "on_track\|at_risk\|delayed\|HealthStatus\|HealthBadge\|HEALTH_STATUS_LABELS" app lib
→ sin resultados (exit 1)
```

Ampliado a todo el repo sobre archivos versionados (`git grep`), las únicas
apariciones restantes son intencionales y correctas:

- `feature_list.json` (los títulos de las 2 features describen el cambio de
  vocabulario — tienen que nombrar los valores viejos);
- `progress/history.md` e `impl_*.md` de features anteriores (bitácora
  append-only, no se reescribe);
- `specs/project-crud/` y `specs/project-status-field/` (registro
  histórico, tratado con notas in situ en T11 — ver punto 5).

Imports rotos hacia el `HealthBadge.tsx` eliminado: **ninguno**. Los 3
consumidores apuntan al archivo nuevo:

- `app/proyectos/ProjectCard.tsx:4` → `import StatusBadge from "./StatusBadge"` (uso en L41)
- `app/proyectos/ProjectDrawer.tsx:16` → idem (uso en L269)
- `app/proyectos/ProjectForm.tsx:6` → `import { PROJECT_STATUS_LABELS } from "./StatusBadge"`

Un import colgando habría reventado el `next build`, que pasó limpio — pero
igual se verificó por grep directo.

### 3. Decisión no explícita en `design.md`: default `"desarrollo"` — **PASS**

`app/proyectos/ProjectDrawer.tsx:361`:

```tsx
status: project?.status ?? "desarrollo",
```

`design.md` había descrito el cambio en `ProjectDrawer.tsx` como "solo el
import y el nombre de componente en el JSX", sin anticipar este literal.
Con `"on_track"` fuera de `ProjectStatus`, el código dejaba de tipar, así
que **había que cambiarlo sí o sí** — no era opcional.

El valor elegido es el correcto: `"desarrollo"` es la primera etapa de la
progresión (`desarrollo → piloto → producción`), es el primer elemento de
`VALID_STATUSES`, la primera clave de `PROJECT_STATUS_LABELS` (o sea, la
opción que el `<select>` muestra primero) y es a lo que la paleta le asigna
el gris neutro de "en construcción". Un proyecto recién creado en
`piloto`/`produccion` por default sería semánticamente incorrecto. La
decisión está documentada en `impl_*.md` en una sección propia en vez de
colada sin mención. Bien manejado.

### 4. Tests actualizados — **PASS**, siguen siendo tests reales

- `lib/projects.test.ts:41` — `expect(VALID_STATUSES).toEqual(["desarrollo", "piloto", "produccion"])`.
  `toEqual` sobre el array completo: sigue verificando contenido **y**
  orden **y** cardinalidad exactos. No se relajó a `toContain` ni a
  `.length`.
- `lib/projects.test.ts:12,20` — el row de ejemplo de `rowToProject()` usa
  `status: "piloto"` y el assert es `expect(project.status).toBe("piloto")`.
  Se eligió `"piloto"` y no el primer valor del enum, lo cual es
  ligeramente mejor: un `rowToProject()` que devolviera un default en vez
  de mapear el campo sería atrapado igual.
- El resto del test (KPIs ordenados por `position`, `updates`,
  `businessUnit`) quedó intacto — el cambio no aprovechó para recortar
  asserts.
- 12/12 tests pasan. Cero tests borrados, cero `skip`, cero `toBe(true)`
  degenerados.

### 5. Anotaciones en `specs/project-status-field/` — **PASS**, precisas

`requirements.md` de esta feature prometió anotar R1, R14 y R27. Verificado
contra el diff real: las 3 anotaciones existen, fechadas 2026-07-29, y cada
una es fiel a lo implementado.

- **R1** — anota que el dominio de la constraint fue reemplazado, apuntando
  a R1-R4 de esta spec. Preciso: lo que cambió es el dominio; la columna
  `status` en `projects` y su `not null` siguen vigentes, y la nota no
  afirma lo contrario.
- **R14** — anota que el contenido de `VALID_STATUSES` cambió por R7,
  aclarando que sigue centralizada en `lib/projects.ts` sin duplicación.
  Preciso: confirmado en `lib/projects.ts:26` y en el hecho de que las 2
  rutas API la importan en vez de tener copias.
- **R27** — anota que el dominio que dispara `400` pasó a los 3 valores
  nuevos y que el comportamiento (400 sin crear/modificar) no cambia.
  Preciso: confirmado por curl real, ver punto 6.
- `design.md` — nota al tope del archivo señalando que los 3 valores
  documentados fueron reemplazados, y que el documento **no se reescribe**.

Ninguna anotación reescribe historia ni edita el texto original de los
requirements: son adiciones marcadas y fechadas, mismo criterio que esa
spec ya había usado con las 4 specs anteriores a ella. Cumple lo que
`requirements.md` "Fuera de alcance" exigía explícitamente.

### 6. Rutas API sin cambio de código — **PASS**, verificado por curl real

Confirmado primero por lectura que ninguna de las 2 rutas tiene literales
viejos: ambas hacen `!VALID_STATUSES.includes(status) && "status"`
(`app/api/proyectos/route.ts:33`, `app/api/proyectos/[id]/route.ts:41`), y
`VALID_STATUSES` es la única fuente del dominio.

Ejercitado end-to-end: `next dev` en el puerto 3111 con `PIN=TESTPIN`,
sesión obtenida vía `POST /api/auth` (cookie JWT real, no forjada), y
después los casos. Resultados:

| Caso | Esperado | Obtenido |
|---|---|---|
| `POST` sin cookie | 401 | **401** |
| `POST` `status: "on_track"` (viejo) | 400 | **400** `{"error":"Campos requeridos faltantes: status"}` |
| `PATCH` `status: "at_risk"` (viejo) | 400 | **400** `{"error":"Campos requeridos faltantes: status"}` |
| `POST` `status: "desarrollo"` | pasa validación | **500** (no 400) |
| `POST` `status: "piloto"` | pasa validación | **500** (no 400) |
| `POST` `status: "produccion"` | pasa validación | **500** (no 400) |
| `PATCH` `status: "produccion"` | pasa validación | **500** (no 400) |

Los `500` son la señal correcta, no un fallo: la validación de `status`
corre **antes** de `getSupabaseAdmin()` en ambas rutas, así que un valor
inválido nunca llega a la base. Que los 3 valores nuevos devuelvan `500` y
no `400` prueba que atravesaron la validación y murieron recién en la capa
de datos — confirmado en el log del dev server, que registra 8 veces
`"Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"`. Este
sandbox no tiene credenciales de Supabase, así que el `201`/`200` con fila
realmente insertada (R14) es lo único que queda para QA humana.

Esto cubre **R13 empíricamente y completo**, y **R14 hasta el límite del
entorno** (validación superada; persistencia no ejercitable acá).

El servidor de dev fue cerrado al terminar; verificado que no quedó ningún
proceso `next dev` vivo.

---

## Trazabilidad R1-R16 → verificación

Cada `R<n>` tiene entrada en `impl_project-status-values-rename.md`.
Re-verificado independientemente:

| R | Verificación | Estado |
|---|---|---|
| R1 | `drop constraint` es la 1ª sentencia del `.sql` | PASS (lectura) |
| R2 | 3 `update` por `id` exacto, ids y mapeo carácter por carácter vs spec | PASS (lectura) |
| R3 | `add constraint` es la última sentencia, dominio nuevo | PASS (lectura) |
| R4 | Sin `alter column type`, sin sentencias de RLS en el `.sql` | PASS (lectura) |
| R5 | `lib/types.ts:78` `ProjectStatus = "desarrollo" \| "piloto" \| "produccion"`; `:92` `Project.status` retipado | PASS (lectura + build) |
| R6 | 4 call sites actualizados; `git grep HealthStatus` en `app`/`lib` vacío | PASS (grep + build) |
| R7 | `lib/projects.ts:26`; test `VALID_STATUSES` | PASS (test) |
| R8 | `StatusBadge.tsx:4-6` labels "Desarrollo"/"Piloto"/"Producción"; tilde solo en label, claves de código sin tilde | PASS (lectura) |
| R9 | `CONFIG` usa `#94A3B8`/`#2C40FF`/`#22C55E`, idéntico a `design.md` §3 | PASS (lectura) |
| R10 | `HealthBadge.tsx` borrado, `StatusBadge.tsx` creado, `PROJECT_STATUS_LABELS` exportada | PASS (diff) |
| R11 | `ProjectCard.tsx:4,41` y `ProjectDrawer.tsx:16,269`; diff sin otros cambios salvo el default de R-nota | PASS (diff) |
| R12 | `ProjectForm.tsx:52` `PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS)`; lógica de submit intacta en el diff | PASS (diff) |
| R13 | curl real: `on_track`/`at_risk` → 400 en POST y PATCH | PASS (curl) |
| R14 | curl real: los 3 valores nuevos pasan validación (500 de capa de datos, no 400). Persistencia pendiente de QA humana con Supabase | PASS parcial, límite de entorno documentado |
| R15 | `lib/projects.test.ts:41` | PASS (test) |
| R16 | `lib/projects.test.ts:12,20` | PASS (test) |

Sin `R<n>` huérfano. El único parcial (R14) tiene el límite explicitado y
es el mismo límite ya documentado y aceptado en `project-crud`,
`weekly-update-entry`, `weekly-update-edit-delete` y `project-status-field`.

---

## CHECKPOINTS.md — "Before `done`"

| Checkpoint | Resultado |
|---|---|
| `progress/review_<feature>.md` con pass/fail y veredicto | **PASS** — este archivo |
| Ningún `R<n>` sin verificación | **PASS** — R1-R16 cubiertos |
| Una sola feature `in_progress`/`in_review` | **PASS** |
| `progress/history.md` con entrada de la feature | **PENDIENTE** — corresponde a `leader` al cerrar la sesión |

---

## Observaciones menores (no bloqueantes)

1. **Cross-reference obsoleto en un comentario.**
   `app/proyectos/ProjectDrawer.tsx:361` dice
   `// modo creación: "desarrollo" como default del <select> (mismo criterio que R4 de la migración)`.
   Ese "R4" venía heredado de `project-status-field`, donde R4 sí era el
   default del backfill. En la spec de **esta** feature, R4 es "no tocar el
   tipo de columna ni RLS", y el mapeo/etapa inicial es R2. El comentario
   ahora apunta a un requirement que no dice lo que el comentario sugiere.
   La misma cita imprecisa se repite en
   `impl_project-status-values-rename.md` ("mismo criterio ... que R4 de la
   migración usa para el mapeo real"). Es solo un comentario: no afecta
   comportamiento, tipos ni tests. Se deja anotado para que se corrija de
   paso en el próximo toque de ese archivo, no amerita reabrir la feature.

2. **`progress/history.md` sin entrada todavía.** Es un checkpoint de
   "Before `done`" que ejecuta `leader` en el cierre de sesión, no
   `implementer`. No cuenta en contra de esta implementación.

---

## Recordatorio para el humano antes de cerrar

La migración **no está aplicada**. Hasta que se aplique en Supabase dev:

- las 3 filas siguen diciendo `on_track` y la constraint vieja sigue
  activa, así que crear/editar un proyecto desde la UI fallará (la base
  rechaza `desarrollo`/`piloto`/`produccion`);
- el badge de `/proyectos` recibirá `"on_track"`, que ya no es clave de
  `CONFIG` en `StatusBadge.tsx` — se rompería al desestructurar
  `CONFIG[status]`.

Esto es consecuencia esperada de un cambio de vocabulario donde código y
datos se sincronizan en el momento de aplicar la migración; no es un
defecto de la implementación. La QA visual del punto (a) de T12 (badge de
los 3 proyectos reales con label y color nuevos) queda pendiente para
después de aplicarla, tal como T12 anticipó.
