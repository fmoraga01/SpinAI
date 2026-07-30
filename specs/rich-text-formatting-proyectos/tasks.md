# Tasks — Formato de texto en los textareas de Resumen/Nota de `/proyectos`

Orden sugerido: parser puro + tests primero (rápido de verificar aislado
y es la pieza con mayor responsabilidad de seguridad), luego el toolbar +
textarea compartido, luego integración en los 2 puntos de edición, luego
integración en los 2 puntos de lectura, luego verificación end-to-end.

- [x] **T1 — `lib/richText.ts` (`renderFormattedText`) + tests** (`R12`-`R20`)
  - Implementar `renderFormattedText(raw: string): string` según
    `design.md`: separa por líneas, agrupa líneas consecutivas de
    viñeta/numerada/cita en `<ul>`/`<ol>`/`<blockquote>`, y aplica
    `parseInline()` (escapado primero vía `escapeHtml()`, luego
    `**`→`<strong>`, `++`→`<u>`, `~~`→`<s>`, `*`→`<em>` en ese orden) a
    cada línea/fragmento restante.
  - Agregar tests en `lib/richText.test.ts` cubriendo, como mínimo: cada
    uno de los 7 marcadores por separado; texto plano sin marcadores
    (debe devolver el texto escapado sin etiquetas nuevas, R14); texto con
    intento de inyección HTML (`<script>alert(1)</script>`,
    `<img src=x onerror=alert(1)>`) — debe salir completamente escapado,
    sin ninguna etiqueta `<script>`/`<img>` real en el output (R15); un
    marcador desbalanceado (ej. `**sin cerrar`) — no debe lanzar excepción
    y debe mostrar los asteriscos literales (R19); una lista con viñeta de
    2+ líneas consecutivas agrupada en un solo `<ul>`; combinación de
    negrita + cursiva en la misma línea; y confirmar que el output nunca
    contiene ninguna etiqueta fuera del set fijo de R16
    (`strong`/`em`/`u`/`s`/`ul`/`ol`/`li`/`blockquote`).
  - Correr `npm run test` y confirmar que todos pasan antes de continuar.

- [x] **T2 — `FormattingToolbar.tsx`** (`R1`-`R9`)
  - Nuevo componente `app/proyectos/FormattingToolbar.tsx`: 7 botones
    (negrita, cursiva, subrayado, tachado, viñeta, numerada, cita), cada
    uno invocando `wrapSelection`/`prefixLines` (según `design.md`) sobre
    un `ref` de `<textarea>` recibido por props, junto con `value` y
    `onChange` del campo controlado.
  - Implementar `wrapSelection` (negrita/cursiva/subrayado/tachado, R2-R6)
    y `prefixLines` (viñeta/numerada/cita, R7-R9) tal como están descritos
    en `design.md`, incluyendo la restauración de foco/selección con
    `requestAnimationFrame` tras el `onChange`.
  - Sin estado de "botón activo" ni toggle-off — confirmar que el
    comportamiento de "clickear de nuevo anida marcadores" queda tal cual
    (limitación aceptada, no implementar detección de toggle).
  - Iconos/labels de los 7 botones: usar `@heroicons/react` (ya es
    dependencia del repo) si hay iconos apropiados, o texto corto (ej.
    "B", "I", "S", "¶") si no — criterio visual lo define `implementer`
    corriendo `design-check` (ver T5).

- [x] **T3 — `FormattableTextarea.tsx`** (`R1`, `R10`, `R11`)
  - Nuevo componente `app/proyectos/FormattableTextarea.tsx`: compone
    `FormattingToolbar` + `<textarea>` controlado, mismo `inputStyle`/
    `focusHandlers` que ya usan `ProjectForm.tsx`/`WeeklyUpdateFields.tsx`
    hoy (reutilizar esas constantes/funciones, extraerlas a un módulo
    común si `implementer` lo considera más limpio que duplicarlas).
  - Props mínimas: `value: string`, `onChange: (v: string) => void`,
    `placeholder?: string`, `rows?: number` — mismo shape que el
    `<textarea>` que reemplaza en cada punto de uso, para que el reemplazo
    en `ProjectForm.tsx`/`WeeklyUpdateFields.tsx` sea un cambio mínimo.

- [x] **T4 — Integrar `FormattableTextarea` en los 2 puntos de edición** (`R1`, `R10`, `R11`, `R17`)
  - `ProjectForm.tsx`: reemplazar el `<textarea>` de "Resumen" (línea
    ~232) por `<FormattableTextarea value={values.summary} onChange={...}
    ...>` — cubre las apariciones (1) creación y (3) edición, ya que es el
    mismo componente para ambos modos.
  - `WeeklyUpdateFields.tsx`: reemplazar el `<textarea>` de "Nota" (línea
    ~69) por `<FormattableTextarea value={values.note} onChange={...}
    ...>` — cubre las apariciones (2), (4), (5) de una sola vez, al ser
    componente compartido por `ProjectForm.tsx`, `AddUpdateForm.tsx` y
    `ProjectTimeline.tsx`.
  - Confirmar visualmente (manual) que la validación de campo obligatorio
    ya existente (`values.summary.trim()`, `values.note.trim()`, de
    `project-crud`/`weekly-update-entry`) sigue funcionando sin cambios —
    no debería requerir tocar esa lógica, ya que `FormattableTextarea`
    sigue exponiendo el mismo `value: string`.

- [x] **T5 — `design-check` sobre los componentes nuevos/modificados de T2-T4**
  - Correr el skill `design-check` sobre `FormattingToolbar.tsx`,
    `FormattableTextarea.tsx`, `ProjectForm.tsx` y `WeeklyUpdateFields.tsx`
    tras los cambios de T2-T4 (regla obligatoria de `docs/specs.md` para
    cambios en `app/proyectos/*.tsx`). Documentar resultado en
    `progress/impl_rich-text-formatting-proyectos.md`.

- [x] **T6 — Renderizado en `ProjectDrawer.tsx`** (`R12`, `R14`, `R15`-`R17`)
  - Reemplazar `<p>{project.summary}</p>` (línea ~339-341) por un `<div>`
    con `whiteSpace: "pre-wrap"` (mismos estilos de fuente/color/line-height
    ya existentes) y `dangerouslySetInnerHTML={{ __html:
    renderFormattedText(project.summary) }}`, usando el import de
    `renderFormattedText` de `lib/richText.ts` (único punto de entrada,
    R17 — no construir HTML de formato en el componente).
  - Verificación manual: un resumen con cada uno de los 7 marcadores
    aplicados se ve formateado correctamente; un resumen de un proyecto
    existente sin marcadores (texto plano, dato real hoy en Supabase dev)
    se sigue viendo exactamente igual que antes de esta feature (R14).

- [x] **T7 — Renderizado en `ProjectTimeline.tsx`** (`R13`-`R17`)
  - Mismo reemplazo que T6, aplicado a `{group.update.note}` (línea
    ~236-238), preservando el `whiteSpace: "pre-wrap"` ya presente hoy en
    ese `<p>`.
  - Verificación manual: una nota de avance con formato se ve
    correctamente en el timeline; una nota preexistente sin formato se ve
    igual que antes.

- [x] **T8 — `design-check` sobre los cambios de lectura de T6-T7**
  - Correr `design-check` sobre `ProjectDrawer.tsx` y `ProjectTimeline.tsx`
    tras los cambios. Documentar resultado.

- [ ] **T9 — QA manual end-to-end (los 5 puntos de aparición)** — parcialmente
  verificado, ver `progress/impl_rich-text-formatting-proyectos.md`: sin
  acceso a browser tool ni PIN real en este sandbox (mismo bloqueo que
  features anteriores), no se pudo ejercitar clicks reales de los 7 botones
  contra un `<textarea>` vivo en el navegador ni el guardado real contra
  Supabase. Lo que sí se cubrió: `renderFormattedText()` con inputs
  equivalentes a los 5 puntos de aparición vía Vitest (R12-R20, incluida la
  inyección `<script>`/`<img onerror>` de R15), y revisión de código de
  `wrapSelection`/`prefixLines` línea por línea contra `design.md`. Pendiente
  de QA humana real en navegador antes de dar la feature por completamente
  probada.
  - Crear un proyecto nuevo: aplicar los 7 tipos de formato al campo
    "Resumen" usando los botones de la toolbar, confirmar que el texto
    guardado (visible al reabrir en modo edición) conserva los
    marcadores crudos (R11), y que el modo vista del drawer lo muestra
    formateado (R12).
  - En el mismo formulario de creación, aplicar formato al campo "Nota"
    de "Primer avance semanal (opcional)", confirmar que se guarda y se
    muestra formateado en el timeline tras crear el proyecto.
  - Editar un proyecto existente: aplicar formato al "Resumen", guardar,
    confirmar que se ve formateado en modo vista y que reabrir edición
    muestra el markdown crudo.
  - Agregar un avance nuevo desde el drawer (`AddUpdateForm`): aplicar
    formato a la "Nota", confirmar que aparece formateado en el timeline
    sin recargar la página.
  - Editar un avance existente desde el timeline (edición inline):
    aplicar/cambiar formato en la "Nota", guardar, confirmar que se
    actualiza formateado.
  - Probar cada uno de los 7 botones al menos una vez con selección de
    texto y una vez sin selección (solo cursor), confirmando el
    comportamiento de R2/R3 (envolver vs. insertar marcadores vacíos con
    cursor en medio) para negrita/cursiva/subrayado/tachado, y R7-R9 para
    las 3 variantes de línea (viñeta/numerada/cita), incluyendo una
    selección que abarca 2+ líneas.
  - Confirmar que un resumen/nota real ya existente en Supabase dev (sin
    marcadores) se sigue viendo exactamente igual que antes de esta
    feature, tanto en el drawer como en el timeline (R14) — no debe
    aparecer ningún asterisco/marcador suelto ni cambiar el salto de
    línea/espaciado.
  - Intentar escribir manualmente caracteres tipo `<script>alert(1)</script>`
    en el campo "Nota" o "Resumen" (sin usar los botones, tipeo directo) y
    confirmar en el modo vista que se muestra como texto literal (con los
    símbolos `<`/`>` visibles), sin ejecutar ningún script ni romper el
    layout de la página (R15).

- [x] **T10 — Verificación y traceability**
  - Correr `npm run verify` (lint + build + test + check-sdd-state) —
    debe incluir los tests nuevos de `lib/richText.test.ts` de T1.
  - Escribir `progress/impl_rich-text-formatting-proyectos.md` con, para
    cada `R1`-`R20`: el o los archivo(s) tocados y cómo se verificó (test
    de Vitest para R12-R20 vía `renderFormattedText`, QA manual para el
    resto). Incluir los resultados de `design-check` de T5/T8.
  - Si algo queda pendiente de QA humana real en navegador (mismo patrón
    que otras features recientes de este repo, ej. por falta de acceso a
    browser tool en el sandbox), reportarlo explícitamente acá en vez de
    asumir que funciona.
