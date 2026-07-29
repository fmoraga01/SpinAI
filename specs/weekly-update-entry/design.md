# Design — Agregar avances semanales (`project_weekly_updates`) desde `/proyectos`

## Alcance técnico

```
app/proyectos/
  ProjectForm.tsx            # [modificado] agrega prop showFirstUpdateSection, sección
                              # opcional "Primer avance semanal (opcional)" cuando true,
                              # onSubmit gana un segundo argumento (firstUpdate | null)
  WeeklyUpdateFields.tsx      # [nuevo] campos puros (fecha/estado/nota + label de semana
                              # calculada), sin botones — reutilizado por ProjectForm y
                              # por AddUpdateForm
  AddUpdateForm.tsx           # [nuevo] formulario inline (WeeklyUpdateFields + Cancelar/
                              # Agregar), usado dentro de ProjectDrawer en modo vista
  ProjectDrawer.tsx           # [modificado] botón "Agregar avance" junto al título de la
                              # sección "Avance semanal", estado addingUpdate, cablea
                              # AddUpdateForm y el firstUpdate opcional de ProjectForm
  ProjectTimeline.tsx         # [modificado, mínimo] exporta weekLabel() para reutilizar
                              # en WeeklyUpdateFields; el resto sin cambios (sigue de
                              # solo lectura sobre `updates`)
  HealthBadge.tsx             # [modificado, mínimo] exporta HEALTH_STATUS_LABELS para
                              # reutilizar las mismas 3 etiquetas ("En curso"/"En riesgo"/
                              # "Atrasado") en el <select> de estado del avance

app/api/proyectos/[id]/avances/
  route.ts                    # [nuevo] POST únicamente (R15-R18) — no PATCH/DELETE,
                              # confirmando el alcance "solo agregar"

lib/
  projects.ts                 # [modificado] agrega mondayOf() (pura, testeable),
                              # WeeklyUpdateFormValues, createWeeklyUpdate(projectId, values)
  projects.test.ts            # [modificado] agrega tests de mondayOf()
```

Mismo patrón de capas que `project-status-tracking`/`project-crud`:
componentes en `app/proyectos/`, lógica de fetch/mappers/helpers puros en
`lib/projects.ts`, rutas API server-only con `isAuthenticated()` +
`getSupabaseAdmin()`. No se introduce ninguna carpeta ni convención nueva.

## Cálculo del lunes de la semana (`R13`, `R14`)

Se decide que la UI **calcula el lunes automáticamente** a partir de
cualquier fecha que el usuario elija en un `<input type="date">` nativo —
el usuario nunca ve ni necesita entender la convención "hay que elegir un
lunes". Función pura nueva en `lib/projects.ts`, exportada y testeable sin
red (cumple la regla de traceability de `docs/specs.md` para lógica en
`lib/`):

```ts
/**
 * Dado un string de fecha "YYYY-MM-DD", devuelve el lunes de esa semana
 * (también "YYYY-MM-DD"). Usa mediodía local (`T12:00:00`) para construir
 * el `Date`, mismo truco que ya usa `weekLabel()` en `ProjectTimeline.tsx`
 * para evitar que la conversión UTC corra la fecha un día — y arma el
 * string de salida con getFullYear/getMonth/getDate (hora local), nunca
 * con `toISOString()`, por la misma razón.
 */
export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0 = domingo ... 6 = sábado
  const diff = day === 0 ? -6 : 1 - day; // días a restar para llegar al lunes
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
```

`WeeklyUpdateFields.tsx` llama `mondayOf(date)` en cada cambio del input de
fecha y muestra el resultado formateado con `weekLabel()` (exportado desde
`ProjectTimeline.tsx`, sin duplicar el formato `toLocaleDateString("es-CL",
...)`) como texto de confirmación: **"Semana del 6 de julio de 2026"**
(R14). El `weekOf` que finalmente se envía a la API es siempre
`mondayOf(date)`, nunca el `date` crudo elegido por el usuario.

Esto significa que **no se agrega ningún constraint de base de datos** que
valide que `week_of` sea lunes — la migración
`20260728120000_crear_projects.sql` queda sin cambios. La garantía es
100% del lado del cliente. Ver "Supuestos a validar con el usuario" abajo
para el trade-off.

## `WeeklyUpdateFields.tsx` (nuevo, compartido)

Componente puramente de campos, sin botones ni lógica de submit — lo
envuelven `ProjectForm.tsx` (sección opcional) y `AddUpdateForm.tsx`
(formulario inline del drawer), cada uno con su propio estado y botones:

```ts
interface WeeklyUpdateValues {
  date: string;              // valor crudo del <input type="date">, "" si vacío
  status: HealthStatus | "";
  note: string;
}

interface Props {
  values: WeeklyUpdateValues;
  onChange: (patch: Partial<WeeklyUpdateValues>) => void;
}
```

- Campo fecha: `<input type="date">`, mismo `inputStyle` que
  `ProjectForm.tsx` ya usa para los campos existentes.
- Campo estado: `<select>` con las 3 opciones de `HealthStatus`, usando
  `HEALTH_STATUS_LABELS` exportado desde `HealthBadge.tsx` ("En curso" /
  "En riesgo" / "Atrasado") — mismas etiquetas que ya ve el usuario en el
  badge del header, sin inventar un vocabulario nuevo.
- Campo nota: `<textarea rows={3}>`, mismo estilo que el campo "Resumen"
  de `ProjectForm.tsx`.
- Debajo del campo fecha, si `values.date` no está vacío: texto pequeño
  (`fontSize: 12, color: var(--color-tertiary)`) con "Semana del
  `weekLabel(mondayOf(values.date))`" (R14).

## `ProjectForm.tsx` — sección opcional de primer avance (`R1`-`R6`)

```ts
interface Props {
  initialValues: ProjectFormValues;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues, firstUpdate: WeeklyUpdateFormValues | null) => Promise<void>;
  onCancel: () => void;
  error: string | null;
  showFirstUpdateSection: boolean; // true solo en modo creación (project === null en ProjectDrawer)
}
```

`ProjectDrawer` pasa `showFirstUpdateSection={project === null}` — la
sección solo aparece la primera vez que se crea el proyecto (R1), nunca en
modo edición (editar los 4 campos del proyecto no debe mezclarse con
agregar avances, que ya tiene su propio flujo en R7-R12).

Estado interno nuevo en `ProjectForm`:

```ts
const [update, setUpdate] = useState<WeeklyUpdateValues>({ date: "", status: "", note: "" });
const updateFieldsFilled = [update.date, update.status, update.note].filter((v) => v !== "").length;
const updateIsEmpty = updateFieldsFilled === 0;
const updateIsPartial = updateFieldsFilled > 0 && updateFieldsFilled < 3;
```

- `updateIsEmpty` (R2): al hacer submit, se pasa `firstUpdate: null` a
  `onSubmit` — no se crea ningún avance.
- `updateIsPartial` (R3): se agrega a la condición existente `isValid` del
  formulario (`isValid && !updateIsPartial`), y se muestra un texto de
  ayuda bajo la sección: "Completa fecha, estado y nota para agregar el
  primer avance, o deja los tres vacíos." — mismo tono que el mensaje de
  error existente (`#F87171`, o un tono neutro si se prefiere distinguirlo
  de un error real; `implementer` puede ajustar el color exacto vía
  `design-check`).
- Los tres campos completos (R4): al hacer submit, se pasa
  `firstUpdate: { weekOf: mondayOf(update.date), status: update.status,
  note: update.note.trim() }`.

`handleSubmit` de `ProjectForm` no cambia su forma general — sigue siendo
`async`, deshabilita el botón mientras `submitting`, pero ahora llama
`onSubmit(values, firstUpdate)`.

## `ProjectDrawer.tsx` — orquestación de la creación en dos pasos (`R4`-`R6`)

```ts
async function handleFormSubmit(values: ProjectFormValues, firstUpdate: WeeklyUpdateFormValues | null) {
  setFormError(null);
  setFirstUpdateError(null);
  try {
    if (project === null) {
      const created = await createProject(values);   // R5: si esto falla, el catch de abajo maneja todo, firstUpdate ni se intenta
      setProject(created);
      onCreated(created);
      setFormMode("view");
      if (firstUpdate) {
        try {
          const update = await createWeeklyUpdate(created.id, firstUpdate);
          const withUpdate = { ...created, updates: [...created.updates, update] };
          setProject(withUpdate);
          onUpdated(withUpdate);
        } catch (e) {
          // R6: el proyecto ya se creó y se queda — solo se informa que el avance no se guardó.
          setFirstUpdateError(e instanceof Error ? e.message : "El proyecto se creó, pero no se pudo guardar el primer avance");
        }
      }
    } else {
      const updated = await updateProject(project.id, values);
      setProject(updated);
      onUpdated(updated);
      setFormMode("view");
    }
  } catch (e) {
    setFormError(e instanceof Error ? e.message : "Ocurrió un error inesperado");
  }
}
```

Nuevo estado `firstUpdateError: string | null`, reseteado igual que
`deleteError` en el `useEffect` de cierre del drawer. Se muestra en modo
vista con el mismo estilo de bloque de error que ya usa `deleteError`
(línea ~347 de `ProjectDrawer.tsx` actual), justo encima del resumen del
proyecto — así R6 queda visible apenas el drawer vuelve a modo vista tras
crear el proyecto.

### Botón "Agregar avance" y `AddUpdateForm.tsx` (`R7`-`R12`)

Nuevo estado en `ProjectDrawer`: `addingUpdate: boolean`,
`addUpdateError: string | null` (reseteados junto con el resto en el
cierre del drawer). En la sección "Avance semanal" del contenido (donde
hoy solo se renderiza `<ProjectTimeline updates={project.updates} />`):

```tsx
<section>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <p style={{ /* mismo estilo de título ya existente */ }}>Avance semanal</p>
    {!addingUpdate && (
      <button onClick={() => { setAddUpdateError(null); setAddingUpdate(true); }}>
        Agregar avance
      </button>
    )}
  </div>
  {addingUpdate && (
    <AddUpdateForm
      onSubmit={handleAddUpdate}
      onCancel={() => { setAddingUpdate(false); setAddUpdateError(null); }}
      error={addUpdateError}
    />
  )}
  <ProjectTimeline updates={project.updates} />
</section>
```

```ts
async function handleAddUpdate(values: WeeklyUpdateFormValues) {
  if (!project) return;
  setAddUpdateError(null);
  try {
    const update = await createWeeklyUpdate(project.id, values);
    const withUpdate = { ...project, updates: [...project.updates, update] };
    setProject(withUpdate);
    onUpdated(withUpdate);
    setAddingUpdate(false);
  } catch (e) {
    setAddUpdateError(e instanceof Error ? e.message : "No se pudo guardar el avance"); // R12
  }
}
```

`AddUpdateForm.tsx` envuelve `WeeklyUpdateFields` con botones
"Cancelar"/"Agregar" (mismo lenguaje visual de botones que
`ProjectForm.tsx`), disabled mientras algún campo esté vacío (R9) o
mientras la promesa de `onSubmit` está pendiente (mismo patrón
`submitting` que `ProjectForm.tsx`), y un bloque de error opcional (R12)
que no limpia los valores.

El `HealthBadge` del header del drawer no requiere ningún cambio: ya
deriva su estado de `healthFromTimeline(project.updates)` en cada render
(`lib/projects.ts`), así que actualizar `project.updates` en memoria (R10)
lo refresca automáticamente.

## Rutas API — `POST /api/proyectos/<id>/avances` (nuevo)

```ts
// app/api/proyectos/[id]/avances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToUpdate } from "@/lib/projects";

const VALID_STATUSES = ["on_track", "at_risk", "delayed"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { weekOf, status, note } = body ?? {};
  const missing = [
    !weekOf && "weekOf",
    !VALID_STATUSES.includes(status) && "status",
    !note?.trim() && "note",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos requeridos faltantes o inválidos: ${missing.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  // Verificar existencia del proyecto antes de insertar, mismo criterio que
  // PATCH/DELETE /api/proyectos/<id> de project-crud (404 honesto en vez de
  // insertar contra un project_id inexistente).
  const { data: project, error: findError } = await db.from("projects").select("id").eq("id", id).maybeSingle();
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { data, error } = await db
    .from("project_weekly_updates")
    .insert({ project_id: id, week_of: weekOf, status, note: note.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToUpdate(data), { status: 201 });
}
```

Reutiliza `rowToUpdate()` ya existente en `lib/projects.ts` (hoy privado
al módulo pero ya exportado — se usa igual que `rowToProject()`). No se
agrega `PATCH`/`DELETE` a este archivo (alcance explícito "solo agregar").

## `lib/projects.ts` — funciones nuevas

```ts
export interface WeeklyUpdateFormValues {
  weekOf: string; // "YYYY-MM-DD", ya calculado como lunes por mondayOf()
  status: HealthStatus;
  note: string;
}

export async function createWeeklyUpdate(projectId: string, values: WeeklyUpdateFormValues): Promise<WeeklyUpdate> {
  const res = await fetch(`/api/proyectos/${projectId}/avances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo guardar el avance (${res.status})`);
  return res.json();
}
```

Mismo patrón `fetch()` same-origin que `createProject()`/`updateProject()`
ya usan.

## Supuestos a validar con el usuario

- **`week_of` = lunes se garantiza solo en el cliente, sin constraint de
  base de datos.** Se decide así porque: (a) mantiene el alcance de esta
  feature acotado a UI + una ruta API nueva, sin tocar la migración de
  `project-status-tracking`; (b) el único punto de escritura hoy es esta
  UI (SQL Editor manual queda fuera del control del sistema de todas
  formas, un constraint no lo evitaría ahí tampoco sin que alguien
  recuerde respetarlo); (c) si en el futuro se agrega otro punto de
  entrada de escritura (por ejemplo, una API pública), sí valdría la pena
  reforzar con un `check` SQL en ese momento — no antes, para no
  sobre-construir. Si el usuario prefiere el constraint SQL desde ya, es
  un cambio de una línea de migración adicional, `implementer` puede
  agregarlo si se pide explícitamente durante la aprobación de esta spec.

## Alternativas consideradas y descartadas

- **Exigir que el usuario elija exactamente un lunes en el `<input
  type="date">` (validando y rechazando otras fechas)** — descartado: es
  peor UX (el usuario tiene que saber la convención y contar días), y el
  cálculo automático de R13 logra el mismo resultado sin fricción.
- **Guardar solo el número de semana/año en vez de una fecha exacta** —
  descartado: cambiaría el shape de `WeeklyUpdate.weekOf` (`ISO date`) y
  requeriría migrar la columna `week_of`/el resto de la UI que ya formatea
  fechas (`weekLabel()`, orden por `localeCompare`); fuera de proporción
  para lo que pide esta feature.
- **Modal centrado para "Agregar avance" (como `DeleteProjectModal.tsx`),
  en vez de formulario inline dentro del drawer** — descartado: agregar un
  avance es una acción frecuente y de bajo riesgo (a diferencia de
  borrar), un formulario inline sin overlay adicional es más rápido de
  usar semana a semana.
- **Reemplazar todo el contenido del drawer por el formulario de avance
  (como hace `ProjectForm` al editar el proyecto)** — descartado: el
  usuario probablemente quiere ver el historial de avances existentes
  mientras agrega uno nuevo (para no duplicar información o revisar el
  estado anterior), así que el formulario se agrega *encima* de
  `ProjectTimeline`, no en su lugar.
- **Combinar `WeeklyUpdateFields` y el submit en un solo componente por
  contexto (sin extraer una pieza compartida)** — descartado: los dos
  formularios (sección de `ProjectForm` y `AddUpdateForm` del drawer)
  comparten exactamente los mismos 3 campos y la misma lógica de
  "semana calculada"; duplicarlos sería repetir `mondayOf()` +
  `weekLabel()` + el `<select>` de estados dos veces.
- **Refetch completo del proyecto tras crear un avance, en vez de
  actualizar `project.updates` en memoria** — descartado por la misma
  razón que `project-crud`: la API ya devuelve el `WeeklyUpdate` completo
  (`rowToUpdate()`), un round-trip extra no aporta nada.

## Supabase / auth / cron

- **No hay cambio de schema** — `project_weekly_updates` ya existe desde
  `project-status-tracking`; esta feature solo agrega una ruta API que
  inserta filas usando el mismo `service_role` que ya usan las rutas
  existentes.
- **No hay cambio de auth** — reutiliza `isAuthenticated()` y
  `getSupabaseAdmin()` tal cual, sin variables de entorno nuevas.
- **No hay cambio de RLS** — sigue sin policy para `anon`/`authenticated`
  en `project_weekly_updates` (R19); la escritura nueva pasa por
  `service_role` server-side, igual que `projects`/`project_kpis`.
- Cron: no aplica.
