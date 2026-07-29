# Requirements — CRUD de Proyectos (`/proyectos`)

Feature id: `project-crud`. EARS notation, numbered `R1`, `R2`, ...
Contexto previo: `specs/project-status-tracking/` (listado + drawer de detalle,
solo lectura, ya `done`). Esta spec agrega crear/editar/eliminar sobre esa
misma base — no repite requirements ya cubiertos ahí (R1-R17 de esa spec
siguen vigentes sin cambios).

## Crear proyecto

- **R1**: WHEN un usuario ve el grid de `/proyectos` THEN el sistema SHALL
  mostrar una card "Crear proyecto" como **primer elemento** del grid,
  antes de las `ProjectCard` existentes, con ícono `+` centrado y label
  debajo, estilo fill tenue del color primario (ver `design.md` para los
  valores exactos).
- **R2** *(modificado 2026-07-29 por `project-status-field`)*: WHEN un
  usuario hace click en la card "Crear proyecto" THEN el sistema SHALL
  abrir `ProjectDrawer` en **modo creación**, con un formulario vacío
  (nombre, país, unidad de negocio, resumen, ~~y~~ **más** estado — quinto
  campo obligatorio agregado por `project-status-field`) — mismo drawer
  reutilizado, no un modal nuevo ni una página nueva. Ver
  `specs/project-status-field/requirements.md` R15.
- **R3** *(modificado 2026-07-29 por `project-status-field`)*: WHEN el
  usuario completa el formulario de creación con todos los campos
  requeridos no vacíos y confirma (botón "Crear proyecto") THEN el sistema
  SHALL enviar `POST /api/proyectos` con el payload (ahora incluyendo
  `status`, ver `specs/project-status-field/requirements.md` R16), y si la
  respuesta es `2xx` SHALL agregar el proyecto devuelto al listado en
  memoria (sin recargar la página) y dejar el drawer abierto mostrando ese
  proyecto en modo vista.
- **R4** *(modificado 2026-07-29 por `project-status-field`)*: WHILE el
  formulario de creación tiene al menos un campo requerido vacío (ahora 5
  campos, no 4 — ver R2) THEN el sistema SHALL deshabilitar el botón de
  confirmar — mismo patrón que el botón "Agregar" de `MembersPanel.tsx`
  (`disabled={!name.trim()}`).
- **R5**: IF `POST /api/proyectos` responde con error (`4xx`/`5xx`) THEN el
  sistema SHALL mostrar un mensaje de error dentro del formulario del
  drawer y SHALL mantener los valores ingresados por el usuario (no se
  pierden al fallar el guardado).

## Editar proyecto

- **R6**: WHEN el drawer está en modo vista de un proyecto existente THEN
  el sistema SHALL mostrar un botón "Editar" en el header del drawer,
  junto al badge de estado de salud existente.
- **R7** *(modificado 2026-07-29 por `project-status-field`)*: WHEN el
  usuario hace click en "Editar" THEN el sistema SHALL mostrar el mismo
  formulario completo de R2, prellenado con los valores actuales del
  proyecto (nombre, país, unidad de negocio, resumen, **y estado** — ver
  `specs/project-status-field/requirements.md` R17) — no edición inline
  campo por campo (decisión explícita del usuario, distinto al patrón de
  `MembersPanel.tsx`).
- **R8** *(modificado 2026-07-29 por `project-status-field`)*: WHEN el
  usuario confirma cambios válidos en modo edición (mismo criterio de
  campos no vacíos que R4) THEN el sistema SHALL enviar `PATCH
  /api/proyectos/<id>` con los ~~4~~ **5** campos editables (agrega
  `status`), y si la respuesta es `2xx` SHALL reemplazar el proyecto
  correspondiente en el listado en memoria con los datos devueltos y SHALL
  volver el drawer a modo vista.
- **R9**: WHEN el usuario cancela la edición (botón "Cancelar") THEN el
  sistema SHALL descartar los cambios no guardados en el formulario y
  SHALL volver el drawer a modo vista con los datos originales del
  proyecto (sin llamar a la API).
- **R10**: IF `PATCH /api/proyectos/<id>` responde con error THEN el
  sistema SHALL mostrar un mensaje de error dentro del formulario de
  edición y SHALL mantener los valores ingresados (mismo comportamiento
  que R5).

## Eliminar proyecto

- **R11**: WHEN el drawer está en modo vista de un proyecto existente THEN
  el sistema SHALL mostrar un botón "Eliminar" junto a "Editar".
- **R12**: WHEN el usuario hace click en "Eliminar" THEN el sistema SHALL
  mostrar un **modal de confirmación** (no el patrón inline de dos pasos
  de `MembersPanel.tsx`) que incluye el nombre del proyecto y un texto de
  advertencia indicando que también se eliminarán sus KPIs y avances
  semanales.
- **R13**: WHEN el usuario confirma la eliminación en el modal THEN el
  sistema SHALL enviar `DELETE /api/proyectos/<id>`, y si la respuesta es
  `2xx` SHALL quitar el proyecto del listado en memoria y SHALL cerrar
  tanto el modal de confirmación como el `ProjectDrawer`.
- **R14**: WHEN el usuario cancela el modal de confirmación (botón
  "Cancelar" o click en el backdrop del modal) THEN el sistema SHALL
  cerrar el modal sin eliminar nada, dejando el drawer en modo vista tal
  como estaba.
- **R15**: IF `DELETE /api/proyectos/<id>` responde con error THEN el
  sistema SHALL cerrar el modal de confirmación, SHALL mostrar un mensaje
  de error dentro del drawer, y SHALL NOT quitar el proyecto del listado
  en memoria.

## API — `POST /api/proyectos`

- **R16**: WHEN `POST /api/proyectos` recibe una request sin cookie
  `spinai_token` válida THEN el sistema SHALL responder `401` sin crear
  ningún registro.
- **R17** *(modificado 2026-07-29 por `project-status-field`)*: WHEN `POST
  /api/proyectos` recibe un body con `name`, `country`, `businessUnit`,
  `summary` **o `status`** vacío(s)/inválido(s) (tras `trim()`) o
  ausente(s) THEN el sistema SHALL responder `400` sin crear el registro,
  con un mensaje indicando qué campo falta. Ver
  `specs/project-status-field/requirements.md` R27.
- **R18** *(modificado 2026-07-29 por `project-status-field`)*: WHEN `POST
  /api/proyectos` recibe un body válido (incluyendo `status`) y la sesión
  es válida THEN el sistema SHALL insertar una fila en `projects` vía
  `getSupabaseAdmin()` y responder `201` con el `Project` creado
  (`kpis: []`, `updates: []`, dado que no se crean filas relacionadas
  automáticamente al crear un proyecto).

## API — `PATCH /api/proyectos/<id>`

- **R19**: WHEN `PATCH /api/proyectos/<id>` recibe una request sin cookie
  válida THEN el sistema SHALL responder `401` sin modificar nada.
- **R20** *(modificado 2026-07-29 por `project-status-field`)*: WHEN
  `PATCH /api/proyectos/<id>` recibe un body con alguno de los ~~4~~ **5**
  campos editables vacío/inválido o ausente THEN el sistema SHALL responder
  `400` sin modificar el registro (misma validación que R17 — el
  formulario siempre envía los 5 campos juntos, ver `design.md`). Ver
  `specs/project-status-field/requirements.md` R27.
- **R21** *(modificado 2026-07-29 por `project-status-field`)*: WHEN
  `PATCH /api/proyectos/<id>` recibe un body válido (incluyendo `status`)
  para un `id` existente y la sesión es válida THEN el sistema SHALL
  actualizar la fila en `projects` y responder `200` con el `Project`
  actualizado, incluyendo sus `kpis`/`updates` existentes sin modificarlos.
- **R22**: IF `PATCH /api/proyectos/<id>` se invoca con un `id` que no
  corresponde a ningún proyecto existente THEN el sistema SHALL responder
  `404` sin modificar nada.

## API — `DELETE /api/proyectos/<id>`

- **R23**: WHEN `DELETE /api/proyectos/<id>` recibe una request sin cookie
  válida THEN el sistema SHALL responder `401` sin eliminar nada.
- **R24**: WHEN `DELETE /api/proyectos/<id>` recibe un `id` existente y la
  sesión es válida THEN el sistema SHALL eliminar la fila de `projects`
  (la cascada de `project_kpis`/`project_weekly_updates` ocurre a nivel de
  base de datos vía `on delete cascade`, ya definido en la migración
  existente — no requiere lógica adicional en la ruta) y SHALL responder
  `200` con `{ ok: true }`.
- **R25**: IF `DELETE /api/proyectos/<id>` se invoca con un `id` que no
  corresponde a ningún proyecto existente THEN el sistema SHALL responder
  `404` sin eliminar nada.

## Confidencialidad y control de acceso (heredado, reafirmado)

- **R26**: WHEN se definen las 3 rutas API nuevas (`POST`, `PATCH`,
  `DELETE`) THEN el sistema SHALL reutilizar exactamente `isAuthenticated()`
  (`lib/auth.ts`) y `getSupabaseAdmin()` (`lib/supabaseAdmin.ts`) ya
  existentes — sin agregar ninguna policy de RLS nueva para `anon`/
  `authenticated` en `projects`/`project_kpis`/`project_weekly_updates`
  (siguen siendo `service_role`-only, igual que en
  `project-status-tracking`).

## Fuera de alcance (explícito)

- **KPIs (`project_kpis`) no son editables desde el formulario de
  crear/editar proyecto de esta primera versión** — *supuesto a validar
  con el usuario*, ver `design.md` sección "Supuestos a validar con el
  usuario" para el razonamiento. Se gestionan igual que hoy (vía SQL
  Editor de Supabase, fuera de este repo).
- Los avances semanales (`project_weekly_updates`) quedan explícitamente
  **fuera de alcance** de esta feature — ya tienen su propio flujo manual
  vía SQL Editor, documentado aparte, no se toca acá.
- No se agrega ningún sistema de permisos granular (quién puede
  crear/editar/eliminar qué proyecto) — cualquier sesión autenticada con
  el PIN puede hacer las 3 operaciones sobre cualquier proyecto, igual
  criterio de acceso "todo o nada" que ya usa `R16`/`R17` de
  `project-status-tracking` para lectura.
- No se agrega historial de cambios / auditoría de quién editó o eliminó
  un proyecto.
