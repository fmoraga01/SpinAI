# Requirements — Formato de texto en los textareas de Resumen/Nota de `/proyectos`

Feature id: `rich-text-formatting-proyectos`. EARS notation, numbered `R1`,
`R2`, ... Contexto previo: `specs/project-crud/` (textarea "Resumen", ya
`done`), `specs/weekly-update-entry/` y `specs/weekly-update-edit-delete/`
(textarea "Nota", componente compartido `WeeklyUpdateFields.tsx`, ya
`done`). Esta spec agrega **formato de texto** a esos dos campos existentes
— no agrega ni quita ningún campo, ni cambia su validación de
vacío/obligatoriedad ya definida en esas specs anteriores.

**Alcance explícito, confirmado por el usuario (no renegociar):**

- Tipos de formato: negrita, cursiva, subrayado, tachado, lista con
  viñeta, lista numerada, cita. Exactamente estos 7 — ninguno más (sin
  encabezados, enlaces, imágenes, tablas, color, tamaño de fuente, etc.).
- Interacción: barra de herramientas con botones. Se descarta
  explícitamente la opción de solo atajos de teclado/escritura markdown
  sin UI de botones.
- Aplica a las 4 vistas / 5 apariciones de textarea listadas abajo, todas
  con el mismo comportamiento de formato (ver R17 sobre por qué son 5
  apariciones pero 2 puntos de implementación).

## Dónde aparece el formato (contexto, no requirement en sí)

1. Textarea "Resumen" — `ProjectForm.tsx`, modo creación de proyecto.
2. Textarea "Nota" — `WeeklyUpdateFields.tsx` dentro de `ProjectForm.tsx`,
   sección "Primer avance semanal (opcional)", modo creación.
3. Textarea "Resumen" — `ProjectForm.tsx`, modo edición de proyecto (mismo
   componente que 1, vía `initialValues`/`submitLabel`).
4. Textarea "Nota" — `WeeklyUpdateFields.tsx` dentro de `AddUpdateForm.tsx`,
   drawer de detalle, agregar avance.
5. Textarea "Nota" — `WeeklyUpdateFields.tsx` dentro de `ProjectTimeline.tsx`,
   edición inline de un avance existente.

(1) y (3) son el mismo textarea de `ProjectForm.tsx`; (2), (4) y (5) son el
mismo componente compartido `WeeklyUpdateFields.tsx`. Es decir, 5
apariciones visibles se resuelven en **2 puntos de código** más el
componente de toolbar nuevo que ambos van a reutilizar (ver `design.md`).

## Toolbar y edición (textarea sigue siendo texto plano mientras se edita)

- **R1**: WHEN el usuario ve cualquiera de las 5 apariciones de textarea
  listadas arriba THEN el sistema SHALL mostrar una barra de herramientas
  con 7 botones (negrita, cursiva, subrayado, tachado, lista con viñeta,
  lista numerada, cita) inmediatamente encima del textarea correspondiente.
- **R2**: WHEN el usuario selecciona texto dentro del textarea y hace click
  en el botón de negrita THEN el sistema SHALL envolver la selección con
  `**` al inicio y al final (sintaxis markdown estándar), SHALL actualizar
  el valor del campo controlado (`onChange`), y SHALL restaurar el foco y
  la selección visual sobre el texto recién envuelto (sin marcadores) para
  que el usuario pueda seguir escribiendo o aplicar otro formato de
  inmediato.
- **R3**: WHEN el usuario hace click en el botón de negrita sin tener texto
  seleccionado (solo un cursor) THEN el sistema SHALL insertar `****` en la
  posición del cursor y SHALL dejar el cursor posicionado entre ambos pares
  de asteriscos, listo para escribir el texto en negrita.
- **R4**: WHEN el usuario hace click en el botón de cursiva (con o sin
  selección) THEN el sistema SHALL aplicar el mismo comportamiento de R2/R3
  usando `*` como marcador (un asterisco a cada lado).
- **R5**: WHEN el usuario hace click en el botón de subrayado (con o sin
  selección) THEN el sistema SHALL aplicar el mismo comportamiento de R2/R3
  usando `++` como marcador — convención propia de este proyecto, ya que
  no existe sintaxis estándar de subrayado ni en CommonMark ni en GFM (ver
  `design.md` para la justificación de por qué no se usa `<u>` HTML crudo).
- **R6**: WHEN el usuario hace click en el botón de tachado (con o sin
  selección) THEN el sistema SHALL aplicar el mismo comportamiento de R2/R3
  usando `~~` como marcador (sintaxis GFM estándar).
- **R7**: WHEN el usuario hace click en el botón de lista con viñeta THEN
  el sistema SHALL anteponer `- ` a cada línea comprendida en la selección
  actual (o a la línea donde está el cursor, si no hay selección) que no
  tenga ya ese prefijo, y SHALL mantener la selección de esas líneas tras
  la operación.
- **R8**: WHEN el usuario hace click en el botón de lista numerada THEN el
  sistema SHALL anteponer `1. ` a cada línea comprendida en la selección
  actual (o a la línea del cursor) de la misma forma que R7 — el número
  literal insertado es siempre `1.`; la numeración secuencial visible la
  calcula el renderizador de solo lectura (R12-R14), no el texto guardado.
- **R9**: WHEN el usuario hace click en el botón de cita THEN el sistema
  SHALL anteponer `> ` a cada línea comprendida en la selección actual (o
  a la línea del cursor) de la misma forma que R7.
- **R10**: WHILE el usuario edita cualquiera de las 5 apariciones de
  textarea (creando o editando contenido existente) THEN el sistema SHALL
  mostrar siempre el texto crudo con los marcadores de formato visibles
  (`**`, `*`, `++`, `~~`, `- `, `1. `, `> `) — no se aplica ningún render
  WYSIWYG mientras se edita; el textarea sigue siendo un `<textarea>`
  nativo de texto plano en todo momento.
- **R11**: WHEN el usuario abre un formulario de edición sobre contenido ya
  guardado con marcadores de formato (editar resumen de proyecto, editar
  nota de un avance existente) THEN el sistema SHALL precargar el textarea
  con el texto crudo exactamente como está guardado (incluyendo
  marcadores) — mismo comportamiento de precarga que ya existe hoy para
  texto plano, sin transformación adicional.

## Renderizado en las vistas de solo lectura

- **R12**: WHEN se muestra el resumen de un proyecto en modo vista
  (`ProjectDrawer.tsx`, hoy `{project.summary}` como texto plano) THEN el
  sistema SHALL interpretar los 7 marcadores de formato soportados y
  SHALL renderizar el resultado como HTML con el formato visual
  correspondiente (negrita, cursiva, subrayado, tachado, listas, cita),
  en vez de mostrar los marcadores literales.
- **R13**: WHEN se muestra la nota de un avance semanal en el timeline
  (`ProjectTimeline.tsx`, hoy `{group.update.note}` como texto plano con
  `whiteSpace: pre-wrap`) THEN el sistema SHALL aplicar el mismo
  renderizado de R12.
- **R14**: WHEN el texto a renderizar (resumen o nota) fue creado antes de
  esta feature y no contiene ningún marcador de formato (texto plano puro)
  THEN el renderizado SHALL verse visualmente equivalente a como se ve
  hoy — mismos saltos de línea y espacios/tabulaciones respetados (mismo
  criterio que el `whiteSpace: pre-wrap` ya existente en
  `ProjectTimeline.tsx`), sin asteriscos ni otros marcadores sueltos
  visibles y sin que el renderizador interprete accidentalmente texto
  plano preexistente como formato no intencional.

## Seguridad — saneamiento del HTML renderizado

- **R15**: WHEN el sistema construye el HTML de salida para R12/R13 THEN
  todo contenido de texto libre ingresado por el usuario (incluyendo
  cualquier carácter `<`, `>`, `&`, `"`, `'` que el usuario haya escrito,
  con o sin intención de formatear) SHALL pasar por escapado de HTML
  (`escapeHtml()` de `lib/escapeHtml.ts` o equivalente) **antes** de que el
  parser envuelva ese texto en cualquier etiqueta de formato — el usuario
  nunca puede lograr que su texto se interprete como HTML/JS ejecutable,
  incluida la marca de subrayado `++...++` (R5), que NUNCA acepta HTML
  crudo (`<u>`) como mecanismo de entrada.
- **R16**: THE parser de formato SHALL emitir exclusivamente un conjunto
  fijo y predeterminado de etiquetas HTML que el propio parser construye
  (`<strong>`, `<em>`, `<u>`, `<s>`, `<ul>`, `<ol>`, `<li>`,
  `<blockquote>`), nunca etiquetas ni atributos derivados de texto
  ingresado por el usuario — no hay paso alguno en el que HTML
  proporcionado por el usuario (crudo o parseado por una librería externa
  no controlada por este proyecto) se inserte sin pasar primero por R15.
- **R17**: WHEN el HTML generado por R12/R13 se renderiza en React THEN el
  sistema SHALL usarlo únicamente a través de una función pura y
  centralizada (un solo punto de entrada, reusado por `ProjectDrawer.tsx`
  y `ProjectTimeline.tsx`) — no se permite que ningún componente construya
  o concatene HTML de formato por su cuenta, para que el saneamiento de
  R15/R16 sea imposible de saltarse por accidente en una vista futura.

## Persistencia — sin cambios de esquema

- **R18**: WHEN el usuario guarda un resumen o una nota con marcadores de
  formato THEN el sistema SHALL almacenarlos como texto plano (markdown +
  la convención `++...++` de R5) en las mismas columnas `text` ya
  existentes (`projects.summary`, `project_weekly_updates.note`) — SHALL
  NOT requerir ninguna migración de esquema ni columna nueva.
- **R19**: WHEN se guarda o se lee un resumen/nota vía las rutas API ya
  existentes (`POST`/`PATCH /api/proyectos`, `POST`/`PATCH
  /api/proyectos/<id>/avances`) THEN el sistema SHALL tratar el campo
  como una cadena de texto libre igual que hoy — SHALL NOT agregar
  validación de servidor sobre la sintaxis de formato (un texto con
  marcadores desbalanceados, ej. `**negrita sin cerrar`, sigue siendo un
  valor válido a guardar; el renderizador de lectura debe tolerarlo sin
  romperse, ver `design.md`).

## Lógica pura y traceability

- **R20**: THE función de parseo/renderizado de formato (ej.
  `lib/richText.ts`) SHALL ser una función pura sin dependencias de DOM ni
  del navegador (recibe un `string`, devuelve un `string` de HTML) para
  poder testearse con Vitest sin jsdom, cumpliendo la regla de
  traceability de `docs/specs.md` para lógica en `lib/`.

## Fuera de alcance (explícito)

- **Edición WYSIWYG / contentEditable** — descartado explícitamente por el
  usuario a favor de una toolbar sobre un `<textarea>` de texto plano (ver
  `design.md`, alternativas descartadas).
- **Detección de "¿está la selección actual en negrita?" para resaltar el
  botón como activo/presionado** — no se implementa; los botones no tienen
  estado visual de "activo", solo insertan/envuelven texto al hacer click.
  Ver `design.md`.
- **Toggle/des-formateo al hacer click de nuevo sobre texto ya envuelto**
  (ej. clickear negrita sobre `**texto**` ya seleccionado para quitar los
  asteriscos) — no se implementa; clickear de nuevo anida marcadores
  (`****texto****`). Limitación aceptada, documentada en `design.md`.
- **Otros tipos de formato** (encabezados, enlaces, imágenes, tablas,
  color, alineación, fuente) — fuera de alcance, confirmado por el
  usuario.
- **Atajos de teclado** (`Ctrl+B`, etc.) — no requeridos por esta spec; si
  se agregan en el futuro no cambian el mecanismo de guardado/renderizado
  aquí definido.
- **Validación de sintaxis de formato en el servidor** — ver R19.
