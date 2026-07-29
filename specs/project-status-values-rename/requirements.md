# Requirements — Cambiar los valores de `projects.status` a etapa de ciclo de vida

Feature id: `project-status-values-rename`. EARS notation, numbered `R1`,
`R2`, ...

Contexto previo: `specs/project-status-field/` (`done`, aplicada en Supabase
dev 2026-07-29) movió el campo `status` del avance semanal al proyecto, con
tres valores de "salud/riesgo": `on_track` / `at_risk` / `delayed`
(semáforo verde/ámbar/rojo). Esta spec **no vuelve a mover el campo ni
cambia su estructura** — cambia el **significado semántico** de los tres
valores que ya existen: de "salud del proyecto" a "etapa del ciclo de
vida", con los valores de código `desarrollo` / `piloto` / `produccion`
(sin tildes, `snake_case`/ASCII, mismo criterio que el resto del schema; la
tilde va solo en la etiqueta de UI "Producción").

Decisión ya confirmada explícitamente por el humano, no a re-preguntar: el
mapeo de los 3 proyectos reales existentes en Supabase dev al momento de
escribir esta spec es

| Proyecto (nombre) | `id` | status viejo | status nuevo |
|---|---|---|---|
| Asistente de ventas Easy 2.0 | `b19cbec7-1786-47e9-a51a-bd3fa376b5fb` | `on_track` | `desarrollo` |
| Probador Virtual | `fcc466f1-c6e3-4f53-bf44-4797aa48816f` | `on_track` | `piloto` |
| Asesor de proyectos | `887b9ea4-c746-4f93-9773-ef26c007d490` | `on_track` | `desarrollo` |

La migración de esta feature (R1-R4) actualiza estas 3 filas por `id`
exacto, no por nombre.

## Esquema de datos (Supabase)

- **R1**: WHEN se aplica la migración nueva de esta feature THEN el sistema
  SHALL eliminar primero la constraint `projects_status_check` existente
  (`check (status in ('on_track', 'at_risk', 'delayed'))`) — un `update` a
  un valor fuera de ese dominio falla mientras la constraint vieja siga
  activa, así que el `drop constraint` SHALL ejecutarse antes que cualquier
  `update` de fila.
- **R2**: WHEN la constraint vieja fue eliminada (R1) THEN el sistema SHALL
  actualizar exactamente las 3 filas de `projects` listadas en la tabla de
  arriba, cada una por su `id` exacto (no por `name`, para ser robusto ante
  un rename futuro del proyecto), al valor nuevo correspondiente
  (`desarrollo` para `b19cbec7-...` y `887b9ea4-...`, `piloto` para
  `fcc466f1-...`).
- **R3**: WHEN las 3 filas fueron actualizadas (R2) THEN el sistema SHALL
  agregar una constraint nueva `projects_status_check` con
  `check (status in ('desarrollo', 'piloto', 'produccion'))` — el `add
  constraint` SHALL ejecutarse después de los `update`, nunca antes,
  porque de lo contrario falla contra filas que todavía dicen `on_track` en
  el momento en que Postgres valida la constraint nueva contra los datos
  existentes.
- **R4**: WHEN se define la migración de esta feature THEN el sistema SHALL
  NO modificar el tipo de columna (`text not null` se mantiene sin cambios,
  solo cambia la constraint) y SHALL NO tocar ninguna policy de RLS —
  mismo criterio que `project-status-field`.

## Tipos y constantes (`lib/types.ts`, `lib/projects.ts`)

- **R5**: WHEN se define el tipo hoy llamado `HealthStatus` en
  `lib/types.ts` THEN el sistema SHALL renombrarlo a `ProjectStatus` y
  SHALL redefinir sus tres literales como `"desarrollo" | "piloto" |
  "produccion"` — el nombre viejo describía "salud/riesgo", que ya no es lo
  que el campo representa tras esta feature; ver `design.md` para la
  alternativa descartada de dejar el nombre `HealthStatus` sin cambios.
- **R6**: WHEN cualquier archivo importa el tipo renombrado (R5) THEN el
  sistema SHALL actualizar el import a `ProjectStatus` en todos los call
  sites: `lib/projects.ts`, `app/proyectos/HealthBadge.tsx` (o su nuevo
  nombre, ver R10), `app/proyectos/ProjectForm.tsx`, y
  `lib/projects.test.ts`.
- **R7**: WHEN se define `VALID_STATUSES` en `lib/projects.ts` THEN el
  sistema SHALL redefinirla como `["desarrollo", "piloto", "produccion"]`
  (mismo orden que representa la progresión del ciclo de vida) — sigue
  siendo la única fuente de verdad reutilizada por las rutas API de
  `/api/proyectos` (sin duplicación nueva, mismo criterio que
  `project-status-field` R14).

## Badge / etiquetas de UI (`HealthBadge.tsx` → `StatusBadge.tsx`)

- **R8**: WHEN se muestra la etiqueta de texto de cada valor de estado en
  la UI (badge y `<select>` del formulario) THEN el sistema SHALL usar
  exactamente "Desarrollo", "Piloto", "Producción" (con tilde en
  "Producción" — la tilde va solo en la label, nunca en el valor de código
  `producción` no existe, es `produccion`).
- **R9**: WHEN se define la paleta de colores del badge de estado THEN el
  sistema SHALL usar una paleta de **progresión de etapa** (no de
  riesgo/semáforo) — ver `design.md` para la paleta elegida
  (gris → azul de marca → verde) y el razonamiento de por qué ya no aplica
  verde/ámbar/rojo.
- **R10**: WHEN se evalúa si conviene renombrar el componente `HealthBadge`
  y la constante `HEALTH_STATUS_LABELS` THEN el sistema SHALL renombrarlos
  a `StatusBadge` (archivo `app/proyectos/StatusBadge.tsx`) y
  `PROJECT_STATUS_LABELS` respectivamente — mismo razonamiento que R5: el
  nombre viejo ("Health") ya no describe lo que el componente muestra, y el
  alcance del rename es acotado (2 archivos que solo importan el
  componente por nombre, `ProjectDrawer.tsx` y `ProjectCard.tsx`, más el
  propio archivo y `ProjectForm.tsx`) — ver `design.md` para el detalle de
  alcance que justifica no dejarlo como "sobre-ingeniería".
- **R11**: WHEN `ProjectDrawer.tsx` y `ProjectCard.tsx` importan el
  componente renombrado (R10) THEN el sistema SHALL actualizar sus imports
  a `StatusBadge` desde `./StatusBadge` — sin cambios a la lógica de esos
  dos archivos más allá del import y el nombre del componente usado en el
  JSX.

## Formulario de proyecto (`ProjectForm.tsx`)

- **R12**: WHEN el `<select>` de "Estado" del formulario de crear/editar
  proyecto construye sus opciones THEN el sistema SHALL derivarlas de
  `PROJECT_STATUS_LABELS` (R10) — sin cambios a la lógica de habilitación
  de submit ni al resto del formulario, dado que la interacción (elegir uno
  de tres valores de un `<select>`) no cambia, solo cambian los tres
  valores/labels disponibles.

## Rutas API (`/api/proyectos`, `/api/proyectos/<id>`)

- **R13**: WHEN `POST /api/proyectos` o `PATCH /api/proyectos/<id>` reciben
  un body con `status` ausente o fuera de `["desarrollo", "piloto",
  "produccion"]` THEN el sistema SHALL responder `400` sin
  crear/modificar el registro — comportamiento sin cambios respecto a
  `project-status-field` R27, solo cambia el dominio de valores válidos
  (ya cubierto mecánicamente por R7, dado que ambas rutas ya reutilizan
  `VALID_STATUSES` en vez de tener su propia lista).
- **R14**: WHEN `POST /api/proyectos` o `PATCH /api/proyectos/<id>` reciben
  un body válido con uno de los tres valores nuevos THEN el sistema SHALL
  insertar/actualizar la fila con ese valor y responder `201`/`200`
  respectivamente, igual que antes — comportamiento sin cambios más allá
  del dominio de valores.

## Tests (`lib/projects.test.ts`)

- **R15**: WHEN el test de `VALID_STATUSES` verifica su contenido THEN el
  sistema SHALL esperar exactamente `["desarrollo", "piloto",
  "produccion"]`.
- **R16**: WHEN el test de `rowToProject()` construye una fila de ejemplo
  con un valor de `status` THEN el sistema SHALL usar uno de los tres
  valores nuevos (p. ej. `"piloto"`) en vez de `"at_risk"`, y SHALL
  verificar que `project.status` refleja ese valor nuevo.

## Fuera de alcance (explícito)

- No se toca la estructura de la columna `projects.status` (sigue siendo
  `text not null` con `check`) — solo cambia el dominio de valores
  permitidos por la constraint.
- No se toca RLS ni el modelo de autenticación.
- No se agregan más de 3 valores ni se cambia el número de valores
  posibles.
- No se toca `project_weekly_updates` — los avances siguen sin campo de
  estado (eso quedó resuelto y cerrado en `project-status-field`).
- No se re-pregunta el mapeo de los 3 proyectos reales — ya confirmado por
  el humano (ver tabla al inicio de este documento), se usa tal cual en la
  migración.
- No se actualiza `specs/project-status-field/` para reflejar los valores
  nuevos como si siempre hubieran sido así — esa spec queda tal cual
  documentó su momento (mover el campo), con una nota breve que apunta a
  esta spec para los valores actuales (ver `design.md`).

## Requirements retirados/modificados de `project-status-field`

Anotado in situ en `specs/project-status-field/requirements.md` con una
nota fechada 2026-07-29 que apunta de vuelta a esta spec (mismo criterio ya
usado en esa spec para las cuatro specs anteriores):

- **R1** *(modificado)*: la constraint documentada ahí
  (`check (status in ('on_track', 'at_risk', 'delayed'))`) fue reemplazada
  por la de esta spec (R3): `check (status in ('desarrollo', 'piloto',
  'produccion'))`. El resto de R1 (columna `status` en `projects`, `not
  null`) sigue vigente sin cambios.
- **R14** *(modificado)*: `VALID_STATUSES` pasa de `["on_track", "at_risk",
  "delayed"]` a `["desarrollo", "piloto", "produccion"]` (R7 de esta
  spec). Sigue centralizada en `lib/projects.ts`, sin duplicación nueva.
- **R27** *(modificado)*: el dominio de valores válidos que hace fallar con
  `400` pasa a `["desarrollo", "piloto", "produccion"]` (R13 de esta
  spec). El comportamiento (400 sin crear/modificar) no cambia.
