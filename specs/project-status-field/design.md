# Design — Mover el campo de estado al proyecto

## Alcance técnico

```
supabase/migrations/
  20260729_____mover_status_a_projects.sql   # [nuevo] ver "Migración SQL" abajo

lib/
  types.ts        # [modificado] Project gana `status: HealthStatus`;
                    # WeeklyUpdate pierde `status`
  projects.ts      # [modificado] rowToProject/rowToUpdate, ProjectFormValues,
                    # WeeklyUpdateFormValues, VALID_STATUSES centralizado;
                    # healthFromTimeline() eliminada
  projects.test.ts # [modificado] se elimina el describe("healthFromTimeline", ...)

app/proyectos/
  ProjectForm.tsx         # [modificado] +campo "Estado" (5º campo obligatorio);
                            # sección "primer avance" pierde el <select> de estado
  WeeklyUpdateFields.tsx  # [modificado] pierde el campo "Estado" (usado por
                            # AddUpdateForm, ProjectForm, ProjectTimeline)
  AddUpdateForm.tsx       # [modificado] isValid cuenta 2 campos, no 3
  ProjectTimeline.tsx     # [modificado] isEditValid cuenta 2 campos; payload
                            # de edición sin status
  ProjectCard.tsx         # [modificado] lee project.status directo
  ProjectDrawer.tsx       # [modificado] lee project.status directo en el header;
                            # payload de creación/edición de proyecto incluye status
  HealthBadge.tsx         # [modificado] prop status: HealthStatus (sin | null),
                            # se retira el caso "Sin datos"

app/api/proyectos/
  route.ts                        # [modificado] POST valida/inserta status
  [id]/route.ts                   # [modificado] PATCH valida/actualiza status
  [id]/avances/route.ts           # [modificado] POST deja de validar/insertar status
  [id]/avances/[updateId]/route.ts # [modificado] PATCH deja de validar/actualizar status
```

Mismo patrón de capas que las cuatro specs anteriores de `/proyectos`. No se
introduce ninguna carpeta ni convención nueva — es un refactor de dónde vive
un campo existente, no una feature de UI nueva.

## Migración SQL

Archivo nuevo (nunca se edita `20260728120000_crear_projects.sql` ni
`20260728140000_reemplazar_seed_projects.sql`, ya aplicados), con timestamp
posterior al último existente (`20260728140000`) y anterior al momento en
que el humano la aplique — usar la fecha real de aplicación al nombrar el
archivo, siguiendo `supabase/migrations/README.md`
(`YYYYMMDDHHMMSS_descripcion_corta.sql`). Nombre sugerido:
`20260729120000_mover_status_a_projects.sql`.

**Por qué la secuencia importa**: el Supabase de dev del usuario ya tiene
al menos una fila en `projects` ("Probador Virtual", con un avance
`on_track`). Un `alter table projects add column status text not null`
directo falla contra esa fila existente (Postgres no puede inventar un
valor para una columna `not null` recién creada en filas que ya existen,
salvo que se le dé un `default`, y aun con `default` sería un valor
arbitrario, no uno derivado de datos reales). La secuencia correcta es:
agregar nullable → poblar vía backfill correlacionado por proyecto → recién
entonces aplicar `not null` + `check`.

```sql
-- Mueve el campo de estado (on_track/at_risk/delayed) del avance semanal
-- (`project_weekly_updates.status`) al proyecto (`projects.status`) — "el
-- estado es propio del proyecto, el avance no debe tener estados" (decisión
-- explícita del usuario, 2026-07-29). Ver
-- specs/project-status-field/requirements.md (R1-R6) y design.md.
--
-- Secuencia obligatoria: `projects` ya tiene datos reales en el Supabase de
-- dev del usuario (ver 20260728140000_reemplazar_seed_projects.sql), así
-- que un `add column ... not null` directo, sin backfill, falla contra
-- filas existentes. Se agrega la columna nullable primero, se puebla, y
-- solo entonces se aplica NOT NULL + el check.

-- 1. Agregar la columna, nullable por ahora (se cierra en el paso 3).
alter table projects add column status text;

-- 2. Backfill: para cada proyecto, tomar el status del avance semanal más
-- reciente (mayor week_of) vía subquery correlacionada — funciona para
-- cualquier número de proyectos existentes, no asume que solo existe
-- "Probador Virtual" ni hardcodea su id. Si un proyecto no tiene ningún
-- avance semanal, no hay de dónde derivar su estado; se usa 'on_track'
-- como único valor por defecto explícito para ese caso (no hay otro dato
-- disponible en ese escenario).
update projects p
set status = coalesce(
  (
    select u.status
    from project_weekly_updates u
    where u.project_id = p.id
    order by u.week_of desc
    limit 1
  ),
  'on_track'
)
where p.status is null;

-- 3. Toda fila tiene ya un valor: aplicar NOT NULL + el mismo check de 3
-- valores que ya tenía project_weekly_updates.status.
alter table projects
  alter column status set not null,
  add constraint projects_status_check check (status in ('on_track', 'at_risk', 'delayed'));

-- 4. Quitar el status del avance semanal — irreversible una vez aplicado
-- (se pierde el historial de estado por semana). Decisión consciente,
-- confirmada por el usuario antes de escribir esta spec: un avance semanal
-- pasa a tener solo week_of + note.
alter table project_weekly_updates drop column status;

-- No se toca RLS: projects y project_weekly_updates siguen sin policy para
-- anon/authenticated (deny-by-default), solo service_role server-side —
-- este cambio es de columnas, no de acceso.
```

Nota sobre el paso 2: se ejecuta el `update` **antes** del paso 4 (drop de
`project_weekly_updates.status`) a propósito — el backfill necesita leer esa
columna mientras todavía existe. Invertir el orden (drop primero) dejaría
sin fuente de datos al backfill.

## Alternativas consideradas y descartadas (migración)

- **`add column status text not null default 'on_track'` en un solo paso**
  — descartado: aunque evita el error de `not null` sobre filas existentes,
  asigna `'on_track'` a *todos* los proyectos existentes sin mirar su
  historial real, perdiendo información que sí está disponible (el status
  del avance más reciente). El backfill correlacionado (R3) es estrictamente
  mejor sin costo adicional relevante.
- **Backfill hardcodeado al proyecto "Probador Virtual" con su status
  conocido (`'on_track'`)** — descartado explícitamente por el pedido del
  usuario: "es más robusto que hardcodear... porque puede haber más
  proyectos reales para cuando el humano corra esto". El backfill
  correlacionado (R3) funciona igual con 1 o con N proyectos.
- **Mantener `project_weekly_updates.status` como columna nullable en vez de
  eliminarla (R5)** — descartado: dejaría una columna muerta que invita a
  reintroducir el campo por accidente (p. ej. un `insert` futuro que la
  llene sin darse cuenta de que ya no se usa), contradiciendo la directriz
  explícita "el avance no debe tener estados". El costo (perder el
  historial de estado por semana) ya fue aceptado conscientemente por el
  usuario.
- **Migración separada en dos archivos (uno para agregar+backfill+not null
  en `projects`, otro para el `drop column` en
  `project_weekly_updates`)** — descartado por simplicidad: ambos cambios
  son parte de la misma operación lógica ("mover el campo"), aplicarlos por
  separado solo multiplica los pasos manuales que el humano tiene que correr
  en el SQL Editor sin ningún beneficio de poder revertir uno sin el otro
  (no son reversibles de todas formas, ver R5).

## `healthFromTimeline()` — eliminar, no repropósitar

La función quedó huérfana: nada necesita ya "derivar el estado más reciente
del timeline" porque el estado vive directo en `project.status`. Se
considera y descarta repropósitarla (p. ej. convertirla en un helper que
lea `project.status` con alguna lógica adicional) — no hay ninguna lógica
adicional que aplicar, sería una función que envuelve `project.status` sin
agregar valor, puro indirection innecesario. Se elimina junto con su bloque
de tests en `lib/projects.test.ts` (`describe("healthFromTimeline", ...)`,
4 tests) — el bloque `describe("mondayOf", ...)` del mismo archivo no se
toca, sigue siendo lógica pura vigente sin relación con este cambio.

`ProjectCard.tsx` y `ProjectDrawer.tsx` pasan de:
```tsx
const status = healthFromTimeline(project.updates);
```
a simplemente:
```tsx
const status = project.status;
```
(en `ProjectDrawer.tsx`, literalmente `<HealthBadge status={project.status} />`
en vez de `<HealthBadge status={healthFromTimeline(project.updates)} />`).

## `HealthBadge.tsx` — retirar el caso `null`, no mantenerlo defensivo

Con `projects.status not null` (R1) y con `healthFromTimeline()` eliminada
(único origen de `null` en los dos call sites existentes), no queda ningún
punto de la UI que le pase `null` a `HealthBadge`. Se decide **retirar** el
caso `null` y tipar la prop como `status: HealthStatus` — no dejarlo
"por si acaso" de forma defensiva, por dos razones: (1) TypeScript ya
garantiza en tiempo de compilación que ningún caller puede pasar `null` una
vez que `Project.status` es `HealthStatus` no opcional, así que el chequeo
en runtime sería código muerto verificable estáticamente, no una red de
seguridad real; (2) mantenerlo invitaría a reintroducir accidentalmente un
`| null` en `Project.status` en el futuro sin que nadie note que
`HealthBadge` "silenciosamente" lo sigue soportando, ocultando una
regresión de modelo de datos en vez de que TypeScript la marque como error
de tipos inmediatamente.

Se descarta la alternativa **mantener `status: HealthStatus | null`
defensivamente** — el argumento de "por si el dato viene corrupto desde la
API" no aplica aquí: el error estaría en la capa de datos (columna `not
null`), no en la UI, y ocultarlo con un fallback visual silencioso sería
peor que dejar que TypeScript lo capture en cualquier caller nuevo.

`HEALTH_STATUS_LABELS` (reexportado, usado por `WeeklyUpdateFields.tsx` hoy
y por el nuevo `<select>` de `ProjectForm.tsx`) no cambia de forma —
sigue siendo `Record<HealthStatus, string>`.

## `ProjectForm.tsx` — campo "Estado" nuevo, y qué pasa con la sección de avance

El formulario gana un quinto campo "Estado" (mismo `<select>` que ya usaba
`WeeklyUpdateFields.tsx`, reutilizando `HEALTH_STATUS_LABELS`), tratado como
campo obligatorio igual que los otros cuatro — mismo criterio de
habilitación de submit (`isValid` pasa de 4 a 5 condiciones).

La sección "Primer avance semanal (opcional)" pierde su `<select>` de
estado (ya no tiene sentido ahí — el estado se captura una vez, a nivel de
proyecto, en el campo nuevo de arriba). `updateFieldsFilled` pasa de contar
`[update.date, update.status, update.note]` (3) a contar `[update.date,
update.note]` (2); `updateIsPartial` sigue siendo "algún campo lleno, no
todos" con el nuevo denominador de 2.

```ts
// Antes
const [update, setUpdate] = useState<WeeklyUpdateValues>({ date: "", status: "", note: "" });
const updateFieldsFilled = [update.date, update.status, update.note].filter((v) => v !== "").length;
const updateIsPartial = updateFieldsFilled > 0 && updateFieldsFilled < 3;
// firstUpdate: updateFieldsFilled === 3 ? {...} : null

// Después
const [update, setUpdate] = useState<WeeklyUpdateValues>({ date: "", note: "" });
const updateFieldsFilled = [update.date, update.note].filter((v) => v !== "").length;
const updateIsPartial = updateFieldsFilled > 0 && updateFieldsFilled < 2;
// firstUpdate: updateFieldsFilled === 2 ? {...} : null
```

`WeeklyUpdateValues` (exportado por `WeeklyUpdateFields.tsx`) pierde el
campo `status: HealthStatus | ""`, queda `{ date: string; note: string }`.

## `WeeklyUpdateFields.tsx` — se retira el `<Field label="Estado">`

Componente compartido por tres consumidores (`ProjectForm.tsx`,
`AddUpdateForm.tsx`, `ProjectTimeline.tsx`) — se edita una sola vez, los
tres heredan el cambio automáticamente (misma razón por la que ya era un
componente compartido). Se elimina el bloque `<Field label="Estado">` con
su `<select>`, y las props/import de `HealthStatus`/`HEALTH_STATUS_LABELS`
que ya no se necesitan ahí (el `<select>` de estado que sí sigue existiendo
vive ahora solo en `ProjectForm.tsx`, como campo del proyecto, no como
campo compartido de avance).

`AddUpdateForm.tsx` y la edición inline de `ProjectTimeline.tsx` ajustan su
`isValid`/`isEditValid` de 3 a 2 condiciones (`date !== "" && note.trim()
!== ""`), mismo patrón de simplificación que en `ProjectForm.tsx`.

## Consecuencia de UX a documentar: el badge ya no reacciona a editar/borrar un avance

Antes de esta feature, `handleEditUpdate`/`handleDeleteUpdate` en
`ProjectDrawer.tsx` refrescaban indirectamente el `HealthBadge` del header
porque este se derivaba de `project.updates` vía `healthFromTimeline()` —
editar el avance más reciente (o borrarlo) podía cambiar el badge visible.
Tras esta feature, el badge se lee de `project.status`, que es independiente
de `project.updates` — **editar o borrar un avance semanal ya no afecta el
badge de estado del proyecto**, solo `PATCH /api/proyectos/<id>` (vía el
campo "Estado" del formulario de editar proyecto) lo cambia. Esto es
exactamente el comportamiento pedido por el usuario ("el estado es propio
del proyecto"), pero se documenta acá porque es un cambio de comportamiento
observable respecto a `weekly-update-edit-delete` (su R5 mencionaba
"refrescar el HealthBadge... en consecuencia" al editar un avance — eso ya
no aplica, ver anotación en `weekly-update-edit-delete/requirements.md`).
No requiere ningún código nuevo — es una consecuencia natural de que
`ProjectCard`/`ProjectDrawer` dejan de llamar a `healthFromTimeline()`
(R24/R25), no algo a implementar aparte.

## `lib/projects.ts` — `VALID_STATUSES` centralizado

Hoy `VALID_STATUSES = ["on_track", "at_risk", "delayed"]` está duplicado en
`app/api/proyectos/[id]/avances/route.ts` y
`app/api/proyectos/[id]/avances/[updateId]/route.ts`. Con este cambio, las
rutas `POST /api/proyectos` y `PATCH /api/proyectos/<id>` **también**
necesitan validar `status` — sería una tercera copia. Se centraliza en
`lib/projects.ts`:

```ts
export const VALID_STATUSES: HealthStatus[] = ["on_track", "at_risk", "delayed"];
```

y las cuatro rutas (`route.ts` de `/api/proyectos`, `[id]/route.ts`,
`[id]/avances/route.ts`, `[id]/avances/[updateId]/route.ts`) importan desde
ahí. Las dos rutas de avances **dejan de usar** `VALID_STATUSES` para
validar `status` del body (ya no lo validan, R30) pero sí puede quedar
importada si en algún punto conviene, no es un requisito — lo único
obligatorio es que no quede una cuarta copia del array en ningún archivo
nuevo.

Se descarta **dejar `VALID_STATUSES` duplicado una tercera y cuarta vez**
en `app/api/proyectos/route.ts`/`[id]/route.ts` — exactamente el problema
que ya se señaló como "oportunidad de centralizar" en el pedido original de
esta feature; con dos rutas más necesitando la misma constante, seguir
duplicando ya no es defendible por simplicidad.

## Rutas API — payloads antes/después

```ts
// POST /api/proyectos (antes)
const { name, summary, country, businessUnit } = body ?? {};
// POST /api/proyectos (después)
const { name, summary, country, businessUnit, status } = body ?? {};
const missing = [
  !name?.trim() && "name",
  !summary?.trim() && "summary",
  !country?.trim() && "country",
  !businessUnit?.trim() && "businessUnit",
  !VALID_STATUSES.includes(status) && "status",
].filter(Boolean);
// insert({ ..., status })
```

Mismo patrón para `PATCH /api/proyectos/<id>`.

```ts
// POST /api/proyectos/<id>/avances (antes)
const { weekOf, status, note } = body ?? {};
const missing = [
  (!weekOf || Number.isNaN(new Date(weekOf).getTime())) && "weekOf",
  !VALID_STATUSES.includes(status) && "status",
  !note?.trim() && "note",
].filter(Boolean);
// insert({ project_id: id, week_of: weekOf, status, note: note.trim() })

// POST /api/proyectos/<id>/avances (después)
const { weekOf, note } = body ?? {};
const missing = [
  (!weekOf || Number.isNaN(new Date(weekOf).getTime())) && "weekOf",
  !note?.trim() && "note",
].filter(Boolean);
// insert({ project_id: id, week_of: weekOf, note: note.trim() })
```

Mismo patrón para `PATCH /api/proyectos/<id>/avances/<updateId>`. Un
`status` presente en el body de estas dos rutas se ignora (no se
desestructura hacia ninguna variable usada, así que ni siquiera llega al
`insert`/`update`) — no genera `400`, siguiendo R30 (compatibilidad con un
cliente desactualizado que todavía lo mande, aunque no debería ocurrir
porque `implementer` actualiza los tres formularios en la misma feature).

## Alternativas consideradas y descartadas (código)

- **Mantener `status` en ambas tablas (duplicado, sincronizado por
  trigger o por código)** — descartado de raíz: contradice directamente la
  directriz del usuario ("el avance no debe tener estados"); un trigger de
  sincronización añadiría complejidad de base de datos sin ningún requisito
  que lo justifique.
- **Migrar `status` a una tabla `project_status_history` con auditoría
  (fecha de cambio, status anterior) en vez de una sola columna en
  `projects`** — descartado: fuera de alcance explícito (ver "Fuera de
  alcance" en `requirements.md`), no fue pedido y agrega una tabla +
  UI completa que nadie solicitó.
- **Dejar el `<select>` de estado en `WeeklyUpdateFields.tsx` pero
  deshabilitado/oculto en vez de eliminarlo del componente** — descartado:
  dejaría código muerto (props `status`/`onChange` que nadie usa) y
  contradice la limpieza esperada de un cambio de modelo de datos completo,
  no parcial.

## Supabase / auth / cron

- **Cambio de schema**: sí — ver "Migración SQL" arriba. Aplicada
  manualmente por el humano en el SQL Editor de Supabase de dev, mismo
  flujo ya establecido en las cuatro specs anteriores (ningún agente tiene
  credenciales de Supabase).
- **No hay cambio de auth**: reutiliza `isAuthenticated()` y
  `getSupabaseAdmin()` tal cual, sin variables de entorno nuevas.
- **No hay cambio de RLS**: ver R6 — deny-by-default sin cambios.
- **Cron**: no aplica.

## Riesgo y orden de aplicación recomendado para el humano

Esta es la spec más riesgosa de las cinco de `/proyectos` porque toca
schema con datos reales de por medio (a diferencia de
`project-status-tracking`, cuya migración corrió contra una tabla vacía).
Orden recomendado una vez aprobada la spec e implementado el código:

1. Aplicar la migración SQL en el SQL Editor de Supabase de **dev** primero
   (nunca el código antes que el schema — el código nuevo asume que
   `projects.status` ya existe).
2. Verificar en el Table Editor que "Probador Virtual" quedó con
   `status = 'on_track'` (backfill correcto, dado que su único avance
   existente ya era `'on_track'`) y que `project_weekly_updates` ya no
   tiene columna `status`.
3. Recién entonces desplegar/probar el código de esta feature contra ese
   mismo entorno de dev.
