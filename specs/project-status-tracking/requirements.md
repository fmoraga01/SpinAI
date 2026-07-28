# Requirements — Status de Proyectos

Feature id: `project-status-tracking`. EARS notation, numbered `R1`, `R2`, ...

## Listado de proyectos (`/proyectos`)

- **R1**: WHEN un usuario autenticado navega a `/proyectos` THEN el sistema
  SHALL mostrar una lista de tarjetas, una por proyecto, con: nombre del
  proyecto, país, negocio, badge de estado de salud, y fecha de última
  actualización.
- **R2**: WHEN se calcula el estado de salud de un proyecto para su tarjeta
  THEN el sistema SHALL derivarlo del semáforo (`on_track` / `at_risk` /
  `delayed`) de la entrada más reciente del timeline semanal de ese
  proyecto.
- **R3**: IF un proyecto no tiene ninguna entrada de avance semanal THEN el
  sistema SHALL mostrar un estado neutro ("sin datos") en vez de asumir
  `on_track` u otro estado.
- **R4**: WHEN un usuario hace click en una tarjeta de proyecto THEN el
  sistema SHALL navegar al detalle de ese proyecto (`/proyectos/<id>`).
- **R5**: WHEN la lista de proyectos está vacía (0 proyectos) THEN el
  sistema SHALL mostrar un empty state consistente con el resto de la app
  (ver `noticias/page.tsx` como precedente), no una lista en blanco.

## Detalle de proyecto (`/proyectos/<id>`)

- **R6**: WHEN un usuario navega a `/proyectos/<id>` con un `id` de
  proyecto válido THEN el sistema SHALL mostrar: nombre del proyecto,
  resumen de la iniciativa, país, negocio, la lista de KPIs clave-valor del
  proyecto, y el timeline de avances semanales.
- **R7**: WHEN un usuario navega a `/proyectos/<id>` con un `id` que no
  corresponde a ningún proyecto existente THEN el sistema SHALL mostrar un
  estado "proyecto no encontrado" en vez de un error sin manejar (crash o
  página en blanco).
- **R8**: WHEN un proyecto no define ningún KPI THEN el sistema SHALL
  omitir la sección de métricas clave o mostrar un estado vacío explícito,
  sin renderizar una lista vacía silenciosa que confunda al usuario.
- **R9**: WHEN el timeline de avances semanales de un proyecto tiene una o
  más entradas THEN el sistema SHALL agruparlas por semana, en orden
  cronológico descendente (la más reciente primero), mostrando para cada
  entrada: fecha de la semana, estado/semáforo, y texto de la actualización.
- **R10**: WHEN un proyecto no tiene ninguna entrada de avance semanal
  THEN el sistema SHALL mostrar un estado vacío para esa sección en vez de
  un timeline en blanco sin explicación.

## Datos

- **R11**: WHEN se carga el módulo de datos de proyectos (`lib/projects.ts`
  o equivalente) THEN el sistema SHALL exponer exactamente 4 proyectos
  dummy, todos con país `"Chile"`, cada uno con un negocio distinto entre
  un conjunto razonable de unidades de negocio (ej. Retail, Banca, Seguros,
  Telco).
- **R12**: WHEN se modela el campo país de un proyecto THEN el sistema
  SHALL representarlo como un campo de texto libre/tipado (no un enum
  cerrado a un solo valor), de forma que agregar países adicionales en el
  futuro no requiera cambiar la forma del modelo de datos.
- **R13**: WHEN se modela el campo de KPIs de un proyecto THEN el sistema
  SHALL representarlo como una lista de pares clave-valor de largo variable
  (no columnas fijas), permitiendo que cada proyecto defina sus propias
  métricas.

## Navegación

- **R14**: WHEN un usuario ve el `Nav` en cualquier página de la app THEN
  el sistema SHALL mostrar un enlace "Status de Proyectos" que navega a
  `/proyectos`, siguiendo el mismo patrón visual y de estado activo que los
  enlaces existentes a "Noticias de IA" y "State of AI".

## Fuera de alcance (explícito)

- No se implementa autenticación/autorización adicional — la ruta hereda
  la protección de `PinGate` en `app/layout.tsx` a nivel raíz (sin
  requisito nuevo).
- No se implementa persistencia en Supabase en esta iteración — los datos
  son dummy/estáticos en `lib/`, ver `design.md` para el plan de migración
  futura.
- No se implementa edición/creación de proyectos ni de entradas del
  timeline desde la UI — es una vista de solo lectura.
