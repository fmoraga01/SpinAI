# Design — Editar y eliminar avances semanales (`project_weekly_updates`) desde `/proyectos`

## Alcance técnico

```
app/proyectos/
  ProjectTimeline.tsx         # [modificado] deja de ser puramente de solo lectura:
                               # cada fila gana estado propio de edición/borrado,
                               # controles "Editar"/"Eliminar" visibles al hover,
                               # reutiliza WeeklyUpdateFields en modo edición
  ProjectDrawer.tsx           # [modificado] pasa onEditUpdate/onDeleteUpdate a
                               # ProjectTimeline, implementa handleEditUpdate/
                               # handleDeleteUpdate (actualizan project.updates
                               # en memoria, igual que handleAddUpdate ya hace)
  WeeklyUpdateFields.tsx      # sin cambios — se reutiliza tal cual, ya es un
                               # componente puro de campos sin botones

app/api/proyectos/[id]/avances/
  route.ts                    # sin cambios (POST se queda igual)
  [updateId]/
    route.ts                  # [nuevo] PATCH + DELETE (R15-R20), mismo patrón
                               # isAuthenticated() + getSupabaseAdmin() + 404
                               # honesto que el resto de rutas de /proyectos

lib/
  projects.ts                  # [modificado] agrega updateWeeklyUpdate() y
                               # deleteWeeklyUpdate(), mismo patrón fetch() que
                               # createWeeklyUpdate()
```

Mismo patrón de capas que las tres specs anteriores de `/proyectos`:
componentes en `app/proyectos/`, fetch/mappers en `lib/projects.ts`, rutas
API server-only. No se introduce ninguna carpeta ni convención nueva.

## Decisión de UX — editar: fila expandida a formulario, no click-to-edit por campo

Dos precedentes en el repo, ninguno un calce perfecto:

- `MembersPanel.tsx`: click-to-edit **por campo** (nombre y email se editan
  y guardan independientemente uno del otro).
- `AddUpdateForm.tsx`/`ProjectForm.tsx`: formulario completo con los N
  campos juntos, un solo submit, reutilizando `WeeklyUpdateFields.tsx`.

Se elige el segundo patrón para editar un avance — **la fila entera se
convierte en el formulario de `WeeklyUpdateFields` con un submit único**
(R2, R5) — por una razón concreta que no aplica a `MembersPanel`: los tres
campos de un avance (`weekOf`, `status`, `note`) no son independientes entre
sí de la misma forma que nombre/email de un integrante. `weekOf` en
particular requiere el mismo cálculo `mondayOf()` que ya usa el flujo de
creación — editar solo la fecha sin volver a pasar por ese cálculo
reintroduciría el riesgo que R13 de `weekly-update-entry` ya resolvió (que
el usuario tenga que saber la convención "elegí un lunes"). Guardar campo
por campo también implicaría 1-3 llamadas a la API por edición en vez de
una, y el usuario de este panel edita avances con poca frecuencia (a
diferencia de renombrar un integrante, que es un ajuste rápido y aislado) —
no hay el mismo beneficio de "edición rápida in situ campo a campo" que
justifica el patrón de `MembersPanel`.

Se descarta explícitamente:
- **Reutilizar el patrón campo-por-campo de `MembersPanel`** — fragmentaría
  la validación de `weekOf` (necesita `mondayOf()` sobre la fecha elegida,
  no tiene sentido aplicado a un campo aislado sin ver el resto) y
  multiplicaría los round-trips a la API sin beneficio de UX perceptible
  para este caso de uso.
- **Modal centrado (como `ProjectForm` en modo edición de proyecto, o
  `DeleteProjectModal`)** — descartado: editar un avance es una operación
  de bajo riesgo sobre un solo registro, no justifica sacar al usuario del
  contexto del timeline (querría seguir viendo las semanas alrededor de la
  que está editando).

## Decisión de UX — eliminar: confirmación inline de dos pasos, no modal

Mismo análisis de precedentes que arriba. Se elige el patrón de
`MembersPanel.tsx` (click "✕"/"Eliminar" → "¿Seguro?" con auto-revert a 3s,
R9-R10) en vez del modal de `DeleteProjectModal.tsx`, por proporción de
impacto:

| | `DeleteProjectModal` (borrar proyecto) | Este caso (borrar 1 avance) |
|---|---|---|
| Hijos afectados | Cascada: todos los `project_kpis` + todos los `project_weekly_updates` del proyecto | Ninguno — un avance no tiene hijos |
| Alcance del dato perdido | Todo el proyecto y su historial completo | Una fila, una semana |
| Frecuencia esperada | Rara (una vez por proyecto, si acaso) | Ocasional (corregir una entrada semanal mal cargada) |

Borrar un avance es más parecido en impacto a quitar un integrante de una
lista (una fila, sin cascada, corregible re-creando el avance a mano si fue
un error) que a borrar un proyecto entero. El modal con backdrop y texto de
advertencia explícito tiene sentido cuando la pérdida es severa e
irreversible en múltiples tablas; aquí sería fricción desproporcionada para
una acción de "corregir una entrada semanal". Se descarta:

- **Modal centrado tipo `DeleteProjectModal`** — desproporcionado para el
  impacto real (una fila, sin cascada); rompería además la posibilidad de
  editar/borrar varias filas en la misma sesión sin reabrir un overlay cada
  vez.
- **Borrado directo sin ninguna confirmación** — descartado: sigue siendo
  una acción destructiva sin deshacer (no hay historial ni papelera, ver
  "Fuera de alcance" en `requirements.md`), amerita al menos un paso de
  confirmación, igual que `MembersPanel`.

## `ProjectTimeline.tsx` — estado por fila

`ProjectTimeline` deja de ser un componente puramente de presentación y
pasa a manejar estado de interacción local (no de datos — los datos siguen
viniendo de `project.updates` vía props), igual de contenido que
`MembersPanel` maneja `confirmRemove`/`editingName`/`editingEmail`
internamente:

```ts
interface Props {
  updates: WeeklyUpdate[];
  onEdit: (id: string, values: WeeklyUpdateFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const [editingId, setEditingId] = useState<string | null>(null);
const [editValues, setEditValues] = useState<WeeklyUpdateValues>({ date: "", status: "", note: "" });
const [editError, setEditError] = useState<string | null>(null);
const [editSubmitting, setEditSubmitting] = useState(false);

const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [deleteError, setDeleteError] = useState<Record<string, string>>({});
```

- `startEdit(update)`: `setEditingId(update.id)`, precarga `editValues` con
  `{ date: update.weekOf, status: update.status, note: update.note }` (R2).
  `weekOf` ya es un lunes válido (todo avance existente pasó por
  `mondayOf()` al crearse), así que precargarlo tal cual en el `<input
  type="date">` es seguro — el recálculo de `mondayOf()` al confirmar (R5)
  es un no-op sobre ese valor salvo que el usuario cambie explícitamente la
  fecha.
- Mientras `editingId !== null`, el control "Editar" de las demás filas se
  renderiza deshabilitado (R3) y el control "Eliminar" de la fila en
  edición no se renderiza (R12).
- `confirmDelete(id)`: primer click de "Eliminar" ⇒
  `setConfirmDeleteId(id)` + `setTimeout(() => setConfirmDeleteId((cur) =>
  cur === id ? null : cur), 3000)` (mismo patrón exacto que
  `MembersPanel.handleRemove`, R10); segundo click (mientras
  `confirmDeleteId === id`) ⇒ llama a `onDelete(id)`.
- Los controles "Editar"/"Eliminar" de cada fila se muestran con
  `opacity: 0` por defecto y `opacity: 1` en `.proyecto-timeline-row:hover`
  (mismo mecanismo CSS que ya resalta borde/fondo/`translateX` al hover,
  solo se agrega una regla más al bloque `<style>` existente) — evita
  saturar visualmente timelines largos mientras mantiene el control
  descubrible.

Renderizado de una fila:

```tsx
<div className="proyecto-timeline-row" style={{ ...existing }}>
  {editingId === group.update.id ? (
    <>
      <WeeklyUpdateFields values={editValues} onChange={(patch) => setEditValues((v) => ({ ...v, ...patch }))} />
      {editError && <p style={{ fontSize: 12, color: "#F87171", margin: "8px 0 0" }}>{editError}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={cancelEdit} type="button">Cancelar</button>
        <button onClick={confirmEdit} disabled={!isEditValid || editSubmitting} type="button">
          {editSubmitting ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </>
  ) : (
    <>
      <p>{group.update.note}</p>
      <div className="proyecto-timeline-row-actions" style={{ opacity: 0 /* 1 on row hover */ }}>
        <button onClick={() => startEdit(group.update)} disabled={editingId !== null}>Editar</button>
        {editingId !== group.update.id && (
          confirmDeleteId === group.update.id
            ? <button onClick={() => handleDeleteClick(group.update.id)} disabled={deletingId === group.update.id}>
                {deletingId === group.update.id ? "Eliminando…" : "¿Seguro?"}
              </button>
            : <button onClick={() => setConfirmDeleteId(group.update.id)}>Eliminar</button>
        )}
      </div>
      {deleteError[group.update.id] && (
        <p style={{ fontSize: 12, color: "#F87171", margin: "6px 0 0" }}>{deleteError[group.update.id]}</p>
      )}
    </>
  )}
</div>
```

`confirmEdit`/`handleDeleteClick` llaman a los callbacks `onEdit`/`onDelete`
pasados por `ProjectDrawer` (que hacen el `fetch` real) y manejan
loading/error localmente, igual que `AddUpdateForm` maneja su propio
`submitting`/`error` hoy — `ProjectTimeline` no habla con la API
directamente, mantiene la separación ya establecida ("componentes hacen
fetch a través de `lib/projects.ts`, orquestados desde `ProjectDrawer`").

`estado (`status`) mostrado por fila`: la spec `project-status-tracking`
retiró explícitamente el badge por fila del timeline (documentado en su
`design.md`). Esta feature no lo reintroduce en modo lectura — solo
aparece un `<select>` de estado cuando la fila está en modo edición
(idéntico alcance visual a `AddUpdateForm`), consistente con esa decisión
previa.

## `ProjectDrawer.tsx` — orquestación de editar/borrar (`R5`-`R7`, `R11`, `R13`)

```ts
async function handleEditUpdate(updateId: string, values: WeeklyUpdateFormValues) {
  if (!project) throw new Error("Proyecto no cargado");
  const updated = await updateWeeklyUpdate(project.id, updateId, values); // deja que el error se propague a ProjectTimeline (R7)
  const withUpdate = {
    ...project,
    updates: project.updates.map((u) => (u.id === updateId ? updated : u)),
  };
  setProject(withUpdate);
  onUpdated(withUpdate);
}

async function handleDeleteUpdate(updateId: string) {
  if (!project) throw new Error("Proyecto no cargado");
  await deleteWeeklyUpdate(project.id, updateId); // deja que el error se propague a ProjectTimeline (R13)
  const withoutUpdate = { ...project, updates: project.updates.filter((u) => u.id !== updateId) };
  setProject(withoutUpdate);
  onUpdated(withoutUpdate);
}
```

A diferencia de `handleAddUpdate` (que atrapa el error y lo guarda en un
`useState` de `ProjectDrawer`), `handleEditUpdate`/`handleDeleteUpdate` **no
atrapan el error** — lo dejan propagar para que `ProjectTimeline` lo maneje
en el estado local de la fila correspondiente (`editError`/`deleteError`
por `id`, ver arriba). Esto evita levantar un estado de error a nivel de
todo el drawer para un problema que es específico de una fila entre
potencialmente muchas — mismo motivo por el que `MembersPanel` no necesita
un estado de error global para sus acciones por fila.

`ProjectDrawer` pasa `onEdit={handleEditUpdate}`
`onDelete={handleDeleteUpdate}` a `ProjectTimeline` — nombres de prop
alineados con la interfaz real (`onEdit`/`onDelete`), corregido post-review
para no dejar el documento contradiciendo al código ya mergeado (ver
"Alternativas"/nota de `implementer` en `progress/impl_weekly-update-edit-delete.md`).
No se agrega
ningún `useState` nuevo en `ProjectDrawer` para esta feature — todo el
estado de interacción de editar/borrar vive en `ProjectTimeline` (más
cohesivo: es estado de UI de esa lista específica, no del drawer en
general).

## Rutas API — `PATCH`/`DELETE /api/proyectos/<id>/avances/<updateId>` (nuevo)

```ts
// app/api/proyectos/[id]/avances/[updateId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToUpdate } from "@/lib/projects";

const VALID_STATUSES = ["on_track", "at_risk", "delayed"];

async function findUpdate(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, updateId: string) {
  // Filtra por project_id Y id a la vez (R18) — un updateId válido pero de
  // otro proyecto se trata igual que uno inexistente, nunca 500 ni éxito
  // silencioso cruzado entre proyectos.
  return db
    .from("project_weekly_updates")
    .select("id")
    .eq("id", updateId)
    .eq("project_id", projectId)
    .maybeSingle();
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, updateId } = await params;
  const body = await req.json();
  const { weekOf, status, note } = body ?? {};
  const missing = [
    (!weekOf || Number.isNaN(new Date(weekOf).getTime())) && "weekOf",
    !VALID_STATUSES.includes(status) && "status",
    !note?.trim() && "note",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos requeridos faltantes o inválidos: ${missing.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: findError } = await findUpdate(db, id, updateId);
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });

  const { data, error } = await db
    .from("project_weekly_updates")
    .update({ week_of: weekOf, status, note: note.trim() })
    .eq("id", updateId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToUpdate(data), { status: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, updateId } = await params;
  const db = getSupabaseAdmin();
  const { data: existing, error: findError } = await findUpdate(db, id, updateId);
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });

  const { error } = await db.from("project_weekly_updates").delete().eq("id", updateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

No se toca `id` en ninguna verificación de "el proyecto existe" por
separado — filtrar `project_weekly_updates` por `id` **y** `project_id` a
la vez ya cubre ambos casos (`id` de proyecto inexistente y `updateId`
inexistente) con una sola query, sin necesidad de dos round-trips como en
`POST /api/proyectos/<id>/avances` (que sí necesita verificar el proyecto
por separado porque ahí todavía no existe ninguna fila de
`project_weekly_updates` que filtrar). El `22P02` (uuid inválido) puede
salir tanto de un `id` como de un `updateId` mal formado — en ambos casos
el resultado correcto es el mismo 404 "Avance no encontrado", no hace
falta distinguir cuál de los dos era inválido.

`POST /api/proyectos/<id>/avances` (`route.ts`, mismo directorio) queda sin
cambios — vive en un archivo separado (`route.ts` vs.
`[updateId]/route.ts`), Next.js App Router permite ambos conviviendo bajo
`avances/` sin conflicto de rutas.

## `lib/projects.ts` — funciones nuevas

```ts
export async function updateWeeklyUpdate(projectId: string, updateId: string, values: WeeklyUpdateFormValues): Promise<WeeklyUpdate> {
  const res = await fetch(`/api/proyectos/${projectId}/avances/${updateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo actualizar el avance (${res.status})`);
  return res.json();
}

export async function deleteWeeklyUpdate(projectId: string, updateId: string): Promise<void> {
  const res = await fetch(`/api/proyectos/${projectId}/avances/${updateId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo eliminar el avance (${res.status})`);
}
```

Mismo patrón `fetch()` same-origin que `createWeeklyUpdate()`/
`updateProject()`/`deleteProject()` ya usan — reutiliza `WeeklyUpdateFormValues`
ya exportado por `weekly-update-entry`, no se agrega ningún tipo nuevo.

## Alternativas consideradas y descartadas

- **Patrón click-to-edit por campo (`MembersPanel`) para editar avances** —
  ver sección de decisión arriba: fragmentaría el cálculo de `mondayOf()` y
  multiplicaría llamadas a la API sin beneficio de UX para este caso.
- **Modal centrado (`DeleteProjectModal`) para confirmar borrado de un
  avance** — ver sección de decisión arriba: desproporcionado para el
  impacto real (una fila, sin cascada).
- **Una sola ruta API `PATCH /api/proyectos/<id>/avances` con el
  `updateId` en el body en vez de en el path** — descartada: rompe la
  convención REST ya establecida por `PATCH`/`DELETE /api/proyectos/<id>`
  (recurso identificado en la URL, no en el body), y el path anidado
  `avances/<updateId>` es más consistente con cómo Next.js App Router ya
  organiza rutas dinámicas en este proyecto.
- **Refetch completo del proyecto tras editar/borrar, en vez de actualizar
  `project.updates` en memoria** — descartado por la misma razón que
  `weekly-update-entry`/`project-crud`: la API ya devuelve el dato
  necesario (`WeeklyUpdate` actualizado en `PATCH`, nada que necesitar en
  `DELETE` salvo el `id` que ya se tiene), un round-trip extra no aporta
  nada.
- **Deshabilitar completamente "Agregar avance" mientras una fila está en
  edición o confirmando borrado** — descartada: no hay conflicto de estado
  real entre agregar un avance nuevo y editar/borrar uno existente (viven
  en componentes/estados distintos — `addingUpdate` en `ProjectDrawer` vs.
  `editingId`/`confirmDeleteId` en `ProjectTimeline`), agregar esa
  restricción sería fricción sin beneficio.
- **Endpoint de borrado "soft" (columna `deleted_at`) en vez de `DELETE`
  real** — descartado: fuera de proporción para esta feature: no hay
  ningún otro dato en `/proyectos` que use soft-delete (`project-crud` ya
  usa `DELETE` real para proyectos completos), y no se pidió ninguna
  funcionalidad de "papelera"/deshacer.

## Supabase / auth / cron

- **No hay cambio de schema** — `project_weekly_updates` ya existe desde
  `project-status-tracking`; esta feature solo agrega dos rutas API que
  actualizan/borran filas usando el mismo `service_role` que ya usan las
  rutas existentes.
- **No hay cambio de auth** — reutiliza `isAuthenticated()` y
  `getSupabaseAdmin()` tal cual, sin variables de entorno nuevas.
- **No hay cambio de RLS** — sigue sin policy para `anon`/`authenticated`
  en `project_weekly_updates` (R21); la escritura/borrado nuevos pasan por
  `service_role` server-side, igual que el resto de `/proyectos`.
- Cron: no aplica.
