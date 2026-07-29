# Requirements — Agregar avances semanales (`project_weekly_updates`) desde `/proyectos`

Feature id: `weekly-update-entry`. EARS notation, numbered `R1`, `R2`, ...
Contexto previo: `specs/project-status-tracking/` (listado + drawer, lectura
de `updates`, ya `done`) y `specs/project-crud/` (crear/editar/eliminar
`projects`, ya `done`). Esta spec agrega **solo creación** de filas en
`project_weekly_updates` desde la UI — no repite requirements ya cubiertos
en esas dos specs anteriores (siguen vigentes sin cambios).

**Alcance explícito, confirmado por el usuario**: únicamente **agregar**
avances nuevos, en dos puntos de entrada — el formulario de creación de
proyecto (`ProjectForm.tsx`, modo creación) y el drawer de detalle
(`ProjectDrawer.tsx`/`ProjectTimeline.tsx`, proyecto ya existente). Editar
o eliminar avances existentes queda **fuera de alcance**, sigue vía SQL
Editor de Supabase.

## Primer avance al crear un proyecto

- **R1**: WHEN un usuario tiene el formulario de creación de proyecto
  abierto (`ProjectForm.tsx`, `mode="create"`) THEN el sistema SHALL
  mostrar una sección opcional "Primer avance semanal (opcional)" con tres
  campos: fecha (semana), estado, y nota — además de los 4 campos ya
  existentes de `project-crud` (nombre, país, unidad de negocio, resumen).
- **R2**: WHILE los tres campos de la sección de avance del formulario de
  creación están todos vacíos THEN el sistema SHALL tratar el avance como
  no incluido — no bloquea el submit del proyecto (la sección es
  enteramente opcional, R4/R8 de `project-crud` sobre habilitación del
  botón no cambian).
- **R3**: IF el usuario completa **parcialmente** la sección de avance
  (algún campo no vacío pero no los tres) THEN el sistema SHALL deshabilitar
  el submit del formulario completo y SHALL mostrar un mensaje indicando
  que faltan campos del avance — evita crear un avance a medias o
  silenciosamente ignorarlo.
- **R4**: WHEN el usuario confirma la creación del proyecto (botón "Crear
  proyecto") con la sección de avance completa (los tres campos no vacíos)
  THEN el sistema SHALL primero crear el proyecto vía `POST /api/proyectos`
  (comportamiento sin cambios de `project-crud`) y, si la respuesta es
  `2xx`, SHALL a continuación crear el avance vía `POST
  /api/proyectos/<id>/avances` usando el `id` del proyecto recién creado.
- **R5**: IF `POST /api/proyectos` (creación del proyecto) falla THEN el
  sistema SHALL mostrar el error existente de `project-crud` (R5) y SHALL
  NOT intentar crear el avance — sin proyecto no hay a qué asociarlo.
- **R6**: IF el proyecto se crea correctamente (R4) pero
  `POST /api/proyectos/<id>/avances` falla THEN el sistema SHALL dejar el
  drawer en modo vista mostrando el proyecto ya creado (sin revertir la
  creación del proyecto) y SHALL mostrar un mensaje de error indicando que
  el avance no se pudo guardar, distinguible del error de creación del
  proyecto (R5) — el usuario puede reintentar agregar el avance manualmente
  después vía el flujo de R9-R14.

## Agregar avances desde el drawer de detalle (proyecto existente)

- **R7**: WHEN el drawer está en modo vista de un proyecto existente THEN
  el sistema SHALL mostrar un botón "Agregar avance" en la sección "Avance
  semanal" (junto al título de esa sección, encima de `ProjectTimeline`).
- **R8**: WHEN el usuario hace click en "Agregar avance" THEN el sistema
  SHALL mostrar un formulario inline (fecha/semana, estado, nota) por
  encima de la lista de `ProjectTimeline` existente, sin ocultar los
  avances ya registrados ni salir del modo vista del drawer (a diferencia
  del formulario de editar/eliminar proyecto de `project-crud`, que sí
  reemplaza el contenido del drawer).
- **R9**: WHILE el formulario de "Agregar avance" tiene el campo de fecha,
  estado o nota vacío THEN el sistema SHALL deshabilitar su botón de
  confirmar — mismo patrón de habilitación que `ProjectForm.tsx` (R4 de
  `project-crud`).
- **R10**: WHEN el usuario confirma el formulario de "Agregar avance" con
  los tres campos completos THEN el sistema SHALL enviar `POST
  /api/proyectos/<id>/avances` con el payload, y si la respuesta es `2xx`
  SHALL agregar el avance devuelto a `project.updates` en memoria (sin
  refetch completo del proyecto), SHALL refrescar el `HealthBadge` del
  header del drawer en consecuencia (ya se deriva de `updates` vía
  `healthFromTimeline`, sin lógica adicional), y SHALL cerrar el formulario
  inline volviendo a mostrar solo el botón "Agregar avance" y la lista
  actualizada.
- **R11**: WHEN el usuario cancela el formulario de "Agregar avance" (botón
  "Cancelar") THEN el sistema SHALL descartar los valores ingresados y
  SHALL cerrar el formulario inline sin llamar a la API.
- **R12**: IF `POST /api/proyectos/<id>/avances` responde con error
  (`4xx`/`5xx`) THEN el sistema SHALL mostrar un mensaje de error dentro
  del formulario inline y SHALL mantener los valores ingresados por el
  usuario (mismo criterio que R5/R10 de `project-crud`).

## Selección de semana (`weekOf` = lunes)

- **R13**: WHEN el usuario elige una fecha en el selector de fecha del
  formulario de avance (tanto en R1 como en R8) THEN el sistema SHALL
  calcular automáticamente el lunes de esa semana (en zona horaria local
  del navegador) y SHALL usar esa fecha calculada como el `weekOf` a
  enviar — el usuario nunca necesita saber ni recordar la convención "hay
  que elegir un lunes" (ver `design.md` para el cálculo exacto y la
  alternativa descartada de exigir un lunes exacto en el input nativo).
- **R14**: WHEN el sistema calcula el lunes de la semana (R13) THEN SHALL
  mostrar debajo del selector de fecha un texto de confirmación con el
  formato "Semana del <fecha>" usando el mismo formato que `weekLabel()` de
  `ProjectTimeline.tsx`, para que el usuario vea exactamente qué fecha se
  va a guardar antes de confirmar.

## API — `POST /api/proyectos/<id>/avances`

- **R15**: WHEN `POST /api/proyectos/<id>/avances` recibe una request sin
  cookie `spinai_token` válida THEN el sistema SHALL responder `401` sin
  crear ningún registro.
- **R16**: WHEN `POST /api/proyectos/<id>/avances` recibe un body con
  `weekOf` ausente/no parseable como fecha, `status` ausente o fuera de
  `["on_track", "at_risk", "delayed"]`, o `note` vacía (tras `trim()`) THEN
  el sistema SHALL responder `400` sin crear el registro, con un mensaje
  indicando qué campo falta o es inválido.
- **R17**: IF `POST /api/proyectos/<id>/avances` se invoca con un `id` de
  proyecto que no corresponde a ningún proyecto existente THEN el sistema
  SHALL responder `404` sin crear el registro (mismo criterio de
  "verificar existencia antes de escribir" que usa `PATCH`/`DELETE
  /api/proyectos/<id>` de `project-crud`).
- **R18**: WHEN `POST /api/proyectos/<id>/avances` recibe un body válido
  para un `id` de proyecto existente y la sesión es válida THEN el sistema
  SHALL insertar una fila en `project_weekly_updates` vía
  `getSupabaseAdmin()` con `project_id` igual al `id` de la ruta, y SHALL
  responder `201` con el `WeeklyUpdate` creado (mapeado con `rowToUpdate()`
  ya existente en `lib/projects.ts`).

## Confidencialidad y control de acceso (heredado, reafirmado)

- **R19**: WHEN se define la ruta API nueva (`POST
  /api/proyectos/<id>/avances`) THEN el sistema SHALL reutilizar
  exactamente `isAuthenticated()` (`lib/auth.ts`) y `getSupabaseAdmin()`
  (`lib/supabaseAdmin.ts`) ya existentes — sin agregar ninguna policy de
  RLS nueva para `anon`/`authenticated` en `project_weekly_updates` (sigue
  siendo `service_role`-only, igual que en `project-status-tracking` y
  `project-crud`).

## Fuera de alcance (explícito)

- **Editar o eliminar avances existentes** — confirmado explícitamente
  fuera de alcance por el usuario. No se agrega `PATCH`/`DELETE` a
  `/api/proyectos/<id>/avances`, ni ninguna UI para modificar/quitar filas
  ya guardadas de `project_weekly_updates`. Sigue gestionándose vía SQL
  Editor de Supabase, igual que hoy.
- **KPIs (`project_kpis`)** — sin cambios, sigue fuera de alcance (mismo
  criterio que `project-crud`).
- **Validación de `week_of` = lunes a nivel de base de datos** (constraint
  SQL) — no se agrega en esta feature; la garantía es 100% del lado del
  cliente (R13). Ver `design.md`, sección "Supuestos a validar con el
  usuario", para el razonamiento de por qué se decide así y qué implica.
- **No se agrega ningún sistema de permisos granular** — mismo criterio
  "todo o nada" que `project-crud`/`project-status-tracking`: cualquier
  sesión autenticada con el PIN puede agregar avances a cualquier
  proyecto.
