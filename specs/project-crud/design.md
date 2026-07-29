# Design — CRUD de Proyectos (`/proyectos`)

## Contexto (UX ya aprobada por el usuario, no se re-deriva acá)

Investigación de UX y aprobación ya ocurrieron en la conversación previa a
esta spec (ver brief de `leader`). Se documenta acá solo en términos de
implementación:

1. **Crear**: card "Crear proyecto" como primer elemento del grid en
   `page.tsx`, estilo fill tenue del color primario. Abre `ProjectDrawer`
   en modo creación (mismo drawer reutilizado).
2. **Editar**: botón "Editar" en el header del drawer que pasa el panel a
   un formulario completo (4 campos relacionados), no edición inline como
   `MembersPanel.tsx`.
3. **Eliminar**: modal de confirmación explícito que nombra el proyecto,
   no el patrón inline de dos pasos de `MembersPanel.tsx` — justificado
   por la cascada real de datos (KPIs + timeline).

## Alcance técnico

```
app/proyectos/
  page.tsx                 # [modificado] agrega CreateProjectCard como primer ítem del grid,
                            # estado projects en memoria (crear/editar/eliminar sin refetch completo)
  CreateProjectCard.tsx     # [nuevo] card "+", abre el drawer en modo creación
  ProjectCard.tsx           # sin cambios
  ProjectDrawer.tsx         # [modificado] agrega modo "create"/"edit" además del existente "view",
                            # botones Editar/Eliminar en el header, formulario completo inline
  ProjectForm.tsx           # [nuevo] formulario compartido (nombre, país, negocio, resumen),
                            # usado tanto en modo creación como edición dentro de ProjectDrawer
  DeleteProjectModal.tsx    # [nuevo] modal de confirmación centrado, nombra el proyecto
  ProjectTimeline.tsx       # sin cambios
  HealthBadge.tsx           # sin cambios

app/api/proyectos/
  route.ts                  # [modificado] agrega POST (R16-R18), GET existente sin cambios
  [id]/route.ts              # [modificado] agrega PATCH (R19-R22) y DELETE (R23-R25),
                             # GET existente sin cambios

lib/
  projects.ts                # [modificado] agrega createProject(), updateProject(id, patch),
                             # deleteProject(id) — fetch a las rutas API nuevas, mismo patrón
                             # que loadProjects()/loadProject()
```

Sigue el mismo patrón de capas que `project-status-tracking`: componentes
en `app/proyectos/`, lógica de fetch/mappers en `lib/projects.ts`, rutas
API server-only con `isAuthenticated()` + `getSupabaseAdmin()`. No se
introduce ninguna carpeta ni convención nueva.

## Estado en memoria vs. refetch

Para que crear/editar/eliminar se sientan inmediatos (sin flash de loading
en todo el grid), `page.tsx` actualiza su array `projects` en memoria con
la respuesta de la API en vez de volver a llamar `loadProjects()`:

- Crear: `setProjects(prev => [...prev, created])`.
- Editar: `setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))`.
- Eliminar: `setProjects(prev => prev.filter(p => p.id !== id))`.

Esto requiere que `ProjectDrawer` reciba callbacks desde `page.tsx`:

```ts
<ProjectDrawer
  projectId={selectedId}
  mode={creating ? "create" : "view"}   // ver "Modos del drawer" abajo
  onClose={() => { setSelectedId(null); setCreating(false); }}
  onCreated={(p) => setProjects(prev => [...prev, p])}
  onUpdated={(p) => setProjects(prev => prev.map(x => x.id === p.id ? p : x))}
  onDeleted={(id) => setProjects(prev => prev.filter(x => x.id !== id))}
/>
```

`page.tsx` agrega dos piezas de estado nuevas junto al `selectedId`
existente: `creating: boolean` (abre el drawer vacío, sin `projectId`) y
mantiene `selectedId` para abrir en modo vista/edición de un proyecto
existente. Los dos flujos comparten el mismo componente `ProjectDrawer`,
nunca están abiertos los dos a la vez (mismo criterio "un solo drawer
global" ya usado en el resto de la app).

## Modos del drawer (`ProjectDrawer.tsx`)

`ProjectDrawer` gana un estado interno `formMode: "view" | "form"`
(además del `mode` que recibe por props para distinguir "vengo de crear"
vs "vengo de ver/editar"):

- **Abierto por `CreateProjectCard`** (`mode="create"`, `projectId=null`):
  monta directo en `formMode="form"` con `ProjectForm` vacío — no hace
  `loadProject()` (no hay nada que cargar).
- **Abierto por `ProjectCard`** (`mode="view"`, `projectId` seteado):
  mismo comportamiento actual — `loadProject(id)`, `formMode="view"` una
  vez cargado. El header agrega los botones "Editar"/"Eliminar" junto al
  `HealthBadge` existente (ver R6/R11).
- **Click en "Editar"** (solo disponible en `formMode="view"`): pasa a
  `formMode="form"` con `ProjectForm` prellenado desde el `project` ya
  cargado en estado. No dispara ningún fetch adicional.
- **Cancelar en el formulario** (R9): si venía de "Editar"
  (`projectId` no nulo), vuelve a `formMode="view"` sin llamar a la API.
  Si venía de "Crear" (`projectId` nulo, nada guardado aún), cierra el
  drawer entero (`onClose()`) — no hay un "modo vista" al que volver
  porque el proyecto todavía no existe.
- **Guardar en el formulario**: si `projectId` es `null` → `POST`
  (`createProject`), llama `onCreated(created)` y pasa a `formMode="view"`
  mostrando el proyecto recién creado (con su `id` real). Si `projectId`
  no es `null` → `PATCH` (`updateProject`), llama `onUpdated(updated)` y
  vuelve a `formMode="view"`.
- **Click en "Eliminar"** (solo disponible en `formMode="view"`): abre
  `DeleteProjectModal` como overlay adicional (`z-index` por encima del
  drawer, `z: 60`) — el drawer sigue montado detrás. Confirmar llama
  `deleteProject(id)`, luego `onDeleted(id)` y `onClose()`. Cancelar solo
  cierra el modal.

El backdrop/click-fuera/`Escape` del drawer siguen cerrando todo el drawer
en cualquier `formMode` (comportamiento heredado de `Drawer.tsx`/
`ProjectDrawer.tsx` actual) — **excepto** mientras `DeleteProjectModal`
está abierto, donde `Escape`/click-fuera cierran primero el modal, no el
drawer (un nivel de overlay a la vez, mismo criterio que cualquier
modal-sobre-modal).

## `ProjectForm.tsx` (nuevo, compartido crear/editar)

Formulario controlado con 4 campos, mismo lenguaje visual que los inputs
de `MembersPanel.tsx` (`var(--color-surface-elevated)` + `var(--color-border)`,
focus a `#2C40FF`):

```ts
interface ProjectFormValues {
  name: string;
  country: string;
  businessUnit: string;
  summary: string;
}

interface Props {
  initialValues: ProjectFormValues;   // vacíos en modo creación, del proyecto en modo edición
  submitLabel: string;                 // "Crear proyecto" | "Guardar cambios"
  onSubmit: (values: ProjectFormValues) => Promise<void>;  // ProjectDrawer maneja el POST/PATCH real
  onCancel: () => void;
  error: string | null;                // mensaje de R5/R10, lo controla ProjectDrawer
}
```

- `name`, `country`, `businessUnit`: `<input type="text">`. `summary`:
  `<textarea>` (multilínea, a diferencia de los inputs de una línea de
  `MembersPanel`, porque el resumen ya se muestra como párrafo largo en
  modo vista).
  provincia/country: texto libre, mismo criterio que `R12` de
  `project-status-tracking` (no un `<select>` cerrado).
- Validación de habilitación de submit (R4/R8): botón disabled mientras
  `!name.trim() || !country.trim() || !businessUnit.trim() || !summary.trim()`
  — mismo patrón `disabled={...}` que el botón "Agregar" de
  `MembersPanel.tsx`.
- `error` se renderiza como un bloque de texto rojo (`#F87171`, mismo tono
  que usa `MembersPanel.tsx` para el estado "¿Seguro?") arriba del botón
  de submit, sin limpiar los valores del formulario (R5/R10).
- `onSubmit` es `async` y `ProjectForm` deshabilita el botón mientras la
  promesa está pendiente (evita doble-submit) — estado local `submitting`.

## `CreateProjectCard.tsx` (nuevo)

Replica el bloque de ícono `+` que ya existe como referencia visual en el
empty state de `page.tsx` (líneas ~68-77 actuales: `width: 52, height: 52,
borderRadius: "var(--radius-md)", background: "#2C40FF0f", border: "1px
solid #2C40FF22"`), pero como una card completa del tamaño de una
`ProjectCard` normal (mismo `padding: 18`, misma `height: 100%`) con el
ícono `+` centrado y el label "Crear proyecto" debajo, en vez de
extraer un componente de ícono genérico nuevo — mismos valores de color
que ya usa el empty state, no un nuevo token.

```tsx
<button type="button" onClick={onClick} style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}>
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 10, height: "100%", minHeight: 120, padding: 18,
    background: "#2C40FF0f", border: "1px dashed #2C40FF44", borderRadius: "var(--radius-md)",
    transition: "border-color 150ms ease",
  }}>
    {/* ícono + inline, mismo trazo que el SVG del empty state */}
    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>Crear proyecto</span>
  </div>
</button>
```

Border `dashed` en vez del `solid` que usa el ícono del empty state — es
la única diferencia deliberada, para distinguir visualmente "esto es una
acción" de "esto es contenido" dentro del mismo grid (mismo criterio que
usan afordances de "add new" en UIs de grid genéricas). `implementer`
puede ajustar el valor exacto si `design-check` lo marca como
inconsistente con los tokens de `app/globals.css`.

## `DeleteProjectModal.tsx` (nuevo)

Modal centrado (no un drawer lateral) — distinto del patrón de
`Drawer.tsx` a propósito, porque es una confirmación puntual, no un panel
de navegación:

```ts
interface Props {
  projectName: string;
  onConfirm: () => void;   // ProjectDrawer maneja el DELETE real y sus callbacks
  onCancel: () => void;
  deleting: boolean;       // deshabilita los botones mientras la request está en curso
  error: string | null;    // R15
}
```

- Backdrop `rgba(0,0,0,0.6)` (mismo tono que `Drawer.tsx`, sin blur — es
  un modal simple, no necesita el mismo peso visual que el drawer),
  `onClick` en el backdrop dispara `onCancel` (R14).
- Panel centrado, `max-width: 420px`, `background: var(--color-surface)`,
  `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`.
- Texto: `¿Eliminar "${projectName}"?` como título, seguido de `Esto
  también borrará sus KPIs y avances semanales.` como cuerpo (texto
  literal de R12).
- Dos botones: "Cancelar" (`onCancel`) y "Eliminar" (`onConfirm`,
  estilizado en rojo `#F87171`, mismo tono que el estado "¿Seguro?" de
  `MembersPanel.tsx` — consistencia de color para acciones destructivas
  en toda la app).
- `Escape` cierra el modal (`onCancel`) — mismo `useEffect` con
  `keydown` que ya usa `ProjectDrawer.tsx`, sin propagar al drawer de
  atrás (`e.stopPropagation()` no es necesario porque el modal es el
  único listener activo mientras está montado — `ProjectDrawer` no
  registra un segundo listener duplicado, simplemente ambos existen y el
  del modal gana porque se monta después / el usuario ve el modal
  primero. `implementer` debe verificar en QA manual que `Escape` con el
  modal abierto no cierra accidentalmente el drawer de fondo también —
  si el navegador dispara ambos handlers, hay que cortar la propagación
  explícitamente o desregistrar el listener del drawer mientras el modal
  está abierto).

## Rutas API — `POST /api/proyectos`

```ts
export async function POST(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, summary, country, businessUnit } = body ?? {};
  const missing = [
    !name?.trim() && "name",
    !summary?.trim() && "summary",
    !country?.trim() && "country",
    !businessUnit?.trim() && "businessUnit",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos requeridos faltantes: ${missing.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .insert({ name: name.trim(), summary: summary.trim(), country: country.trim(), business_unit: businessUnit.trim() })
    .select("*, project_kpis(*), project_weekly_updates(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToProject(data), { status: 201 });
}
```

Reutiliza `rowToProject()` ya existente en `lib/projects.ts` — el insert
no crea filas en `project_kpis`/`project_weekly_updates`, así que el
`select` anidado simplemente devuelve arrays vacíos, coherente con R18.

## Rutas API — `PATCH /api/proyectos/<id>` y `DELETE /api/proyectos/<id>`

Se agregan como named exports adicionales en el mismo
`app/api/proyectos/[id]/route.ts` que ya tiene `GET`, mismo patrón de
`params: Promise<{ id: string }>` que usa el `GET` existente:

```ts
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, summary, country, businessUnit } = body ?? {};
  const missing = [/* misma validación que POST, ver arriba */];
  if (missing.length > 0) return NextResponse.json({ error: `...` }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .update({ name: name.trim(), summary: summary.trim(), country: country.trim(), business_unit: businessUnit.trim() })
    .eq("id", id)
    .select("*, project_kpis(*), project_weekly_updates(*)")
    .maybeSingle();

  if (error) {
    if (error.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  return NextResponse.json(rowToProject(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();
  // Verificar existencia antes de borrar para poder devolver 404 (R25) en vez de
  // un 200 silencioso sobre un id inexistente — mismo criterio de honestidad de
  // respuesta que ya usa el GET existente con maybeSingle().
  const { data: existing, error: findError } = await db.from("projects").select("id").eq("id", id).maybeSingle();
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Por qué PATCH y no PUT**: el formulario siempre envía los 4 campos
juntos (no hay actualización parcial real desde la UI en esta versión),
así que PUT (reemplazo completo del recurso) sería semánticamente
correcto también — se elige `PATCH` porque dentro del payload no van
`kpis`/`updates` (que sí son parte del recurso `Project` completo pero no
se tocan acá), y `PATCH` comunica mejor "actualizo un subconjunto de
campos del recurso" sin implicar que el resto (`kpis`, `updates`) se
reemplaza o se pierde. Es una elección de claridad de API, no de
comportamiento — ver "Alternativas" abajo.

**Cascada de borrado**: no requiere lógica manual — la migración
`20260728120000_crear_projects.sql` ya define `project_id uuid not null
references projects(id) on delete cascade` en ambas tablas relacionadas
(ver `design.md` de `project-status-tracking`), así que un `delete` sobre
`projects` basta.

## `lib/projects.ts` — funciones nuevas

```ts
export interface ProjectFormValues {
  name: string;
  country: string;
  businessUnit: string;
  summary: string;
}

export async function createProject(values: ProjectFormValues): Promise<Project> {
  const res = await fetch("/api/proyectos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo crear el proyecto (${res.status})`);
  return res.json();
}

export async function updateProject(id: string, values: ProjectFormValues): Promise<Project> {
  const res = await fetch(`/api/proyectos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo actualizar el proyecto (${res.status})`);
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo eliminar el proyecto (${res.status})`);
}
```

Mismo patrón `fetch()` same-origin que `loadProjects()`/`loadProject()`
ya usan — la cookie `spinai_token` viaja sola, sin pasar token a mano. Los
mensajes de error de la API (R17/R20/R25, etc.) se propagan al `catch` de
`ProjectDrawer`, que los muestra vía el prop `error` de `ProjectForm` /
`DeleteProjectModal`.

## Supuestos a validar con el usuario

- **KPIs excluidos del formulario de crear/editar en esta primera
  versión.** El modelo `Project` incluye `kpis: ProjectKpi[]`, pero el
  pedido original ("agregar, editar y eliminar proyectos") no mencionó
  KPIs explícitamente, y agregar una lista dinámica label/value al
  formulario (agregar/quitar filas, reordenar `position`) es una pieza de
  UX y validación no trivial que no fue parte de la dirección aprobada.
  Se deja **fuera de esta iteración**: los KPIs de un proyecto nuevo
  quedan en `[]` al crearlo (ver R18), y siguen gestionándose vía SQL
  Editor de Supabase igual que hoy, tanto para proyectos nuevos como
  existentes. Si el usuario los quiere en el formulario, es una
  iteración siguiente con su propia spec (edición de listas dinámicas
  tiene su propio diseño de UX que vale la pena tratar aparte).
- **`PATCH` reemplaza los 4 campos completos, no soporta updates
  parciales de un solo campo desde la API.** Ver razonamiento en la
  sección de rutas API arriba — el formulario siempre envía los 4 juntos,
  así que no hay necesidad de soportar, por ejemplo, `PATCH { name }`
  solo. Si en el futuro se agrega edición inline campo por campo (como
  `MembersPanel.tsx`), la ruta ya soporta el método correcto; solo
  cambiaría la validación para no exigir los 4 campos si se decide
  permitir updates parciales reales.

## Alternativas consideradas y descartadas

- **Modal centrado nuevo para crear/editar, en vez de reutilizar
  `ProjectDrawer`** — descartado explícitamente por el usuario: el drawer
  ya es el patrón establecido para "ver un proyecto", reutilizarlo para
  crear/editar evita introducir un segundo contenedor visual para el
  mismo dominio de datos.
- **Edición inline campo por campo, como `MembersPanel.tsx`** —
  descartado explícitamente por el usuario: acá son 4+ campos
  relacionados que tiene sentido revisar/cancelar como conjunto, a
  diferencia de un nombre o email sueltos.
- **Confirmación de borrado inline de dos pasos ("✕" → "¿Seguro?"), como
  `MembersPanel.tsx`** — descartado explícitamente por el usuario: acá el
  borrado tiene cascada real de datos relacionados (KPIs + timeline), a
  diferencia de remover un integrante del equipo, que es trivialmente
  reversible (se puede volver a agregar).
- **`PUT` en vez de `PATCH` para editar** — descartado por la razón de
  claridad semántica explicada arriba (no se toca la porción
  `kpis`/`updates` del recurso); el comportamiento real es idéntico, así
  que no es una decisión de alto impacto, pero se documenta para que
  quede claro que fue deliberada.
- **Refetch completo de `loadProjects()` tras cada mutación, en vez de
  actualizar el array en memoria** — descartado: la API ya devuelve el
  `Project` completo en la respuesta de `POST`/`PATCH` (`rowToProject()`
  aplicado al `select` anidado), así que no hace falta un segundo
  round-trip; actualizar el estado local en `page.tsx` es más simple y
  más rápido para el usuario.
- **Verificar existencia con un `select` separado antes del `DELETE`
  (en vez de simplemente hacer `delete().eq("id", id)` y listo)** —
  se eligió deliberadamente para poder distinguir "no existía" (`404`,
  R25) de "existía y se borró" (`200`), ya que un `delete` de Supabase
  sobre un id inexistente no siempre distingue eso por sí solo sin pedir
  las filas afectadas de vuelta; el costo de una query extra es
  aceptable dado que estas operaciones no son de alto volumen.

## Supabase / auth / cron

- **No hay cambio de schema** — las 3 tablas y sus índices/RLS ya existen
  desde `project-status-tracking`; esta feature solo agrega rutas API que
  escriben sobre ellas usando el mismo `service_role` que ya usan las
  rutas `GET`.
- **No hay cambio de auth** — reutiliza `isAuthenticated()` y
  `getSupabaseAdmin()` tal cual existen hoy, sin variables de entorno
  nuevas.
- **No hay cambio de RLS** — sigue sin policy para `anon`/`authenticated`
  en las 3 tablas (R26); las escrituras nuevas pasan igual que las
  lecturas por el `service_role` key server-side.
- Cron: no aplica.
