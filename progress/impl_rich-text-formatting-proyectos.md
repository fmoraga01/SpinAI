# Implementación — rich-text-formatting-proyectos

## Resumen

Implementado `specs/rich-text-formatting-proyectos/` siguiendo `design.md`
prácticamente al pie de la letra: parser puro `lib/richText.ts`
(`renderFormattedText`), toolbar de 7 botones `FormattingToolbar.tsx`
(`wrapSelection`/`prefixLines` tal como los define `design.md`),
`FormattableTextarea.tsx` (toolbar + `<textarea>` visualmente pegados),
integrado en los 2 puntos de edición (`ProjectForm.tsx`,
`WeeklyUpdateFields.tsx` — cubre las 5 apariciones) y en los 2 puntos de
lectura (`ProjectDrawer.tsx`, `ProjectTimeline.tsx`, vía
`dangerouslySetInnerHTML` con el único punto de entrada `renderFormattedText`).
`npm run verify` pasa completo (lint + build + test + check-sdd-state), 14
tests nuevos de Vitest en `lib/richText.test.ts` (36/36 en el repo).

**Bloqueado, mismo entorno que features anteriores** (`project-crud`,
`weekly-update-entry`, etc.): sin `.env.local`/credenciales Supabase ni PIN
real ni herramienta de navegador en este sandbox, no se pudo hacer QA de
click-through real de los 7 botones sobre un `<textarea>` vivo en el
navegador, ni guardar/recargar contenido real contra Supabase (T9). Lo que
sí se cubrió sin backend real: `renderFormattedText()` con inputs
equivalentes a los 5 puntos de aparición vía Vitest (cubre R12-R20 casi por
completo, incluida la inyección `<script>`/`<img onerror>` de R15), y
revisión de código exhaustiva de `wrapSelection`/`prefixLines` línea por
línea contra `design.md`, `npm run dev` + `curl` confirmando que `/proyectos`
sigue sirviendo 200 tras los cambios. Ver detalle en T9 de `tasks.md` y en
la sección "Traceability por requisito" abajo — no se dio nada de UI
interactiva por "hecho" sin ese sustento.

No se improvisó ningún workaround para sortear estos bloqueos (no se
hardcodeó un PIN ni se mockeó Supabase).

## Archivos tocados

- `lib/richText.ts` (nuevo) — `renderFormattedText(raw: string): string`,
  parser puro sin dependencias de DOM (T1, R20).
- `lib/richText.test.ts` (nuevo) — 14 tests de Vitest (T1).
- `app/proyectos/FormattingToolbar.tsx` (nuevo) — 7 botones,
  `wrapSelection`/`prefixLines` (T2).
- `app/proyectos/FormattableTextarea.tsx` (nuevo) — compone
  `FormattingToolbar` + `<textarea>` controlado (T3).
- `app/proyectos/formStyles.ts` (nuevo) — `inputStyle`/`focusHandlers`
  extraídos de `ProjectForm.tsx`/`WeeklyUpdateFields.tsx` (ver "Decisiones"
  #1) para que `FormattableTextarea.tsx` los reutilice sin duplicar.
- `app/proyectos/ProjectForm.tsx` — importa `inputStyle`/`focusHandlers` de
  `./formStyles` (ya no los define localmente), campo "Resumen" ahora
  `<FormattableTextarea>` (T4).
- `app/proyectos/WeeklyUpdateFields.tsx` — mismo cambio que `ProjectForm.tsx`,
  campo "Nota" ahora `<FormattableTextarea>` — cubre las 3 apariciones (2),
  (4), (5) al ser componente compartido de `ProjectForm.tsx`,
  `AddUpdateForm.tsx` y `ProjectTimeline.tsx` (T4).
- `app/proyectos/ProjectDrawer.tsx` — `{project.summary}` pasa a
  `dangerouslySetInnerHTML={{ __html: renderFormattedText(project.summary) }}`
  dentro de un `<div whiteSpace: "pre-wrap">` (T6).
- `app/proyectos/ProjectTimeline.tsx` — mismo reemplazo sobre
  `{group.update.note}`, preservando el `whiteSpace: "pre-wrap"` ya
  existente (T7).
- `specs/rich-text-formatting-proyectos/tasks.md` — T1-T8, T10 marcadas
  `[x]`; T9 dejada `[ ]` con nota explícita de qué se pudo/no se pudo
  verificar sin browser tool/PIN real.

## Decisiones de implementación no 100% explícitas en `design.md`

1. **`inputStyle`/`focusHandlers` extraídos a `app/proyectos/formStyles.ts`**
   — `design.md`/`tasks.md` (T3) dejaban la decisión explícitamente a
   criterio de `implementer` ("reutilizar esas constantes/funciones,
   extraerlas a un módulo común si conviene evitar duplicación"). Se
   extrajeron porque ya estaban duplicadas idénticamente en
   `ProjectForm.tsx` y `WeeklyUpdateFields.tsx` antes de esta feature, y
   `FormattableTextarea.tsx` necesitaba el mismo estilo — copiarlas una
   tercera vez habría sido la duplicación explícita que la instrucción del
   orquestador pidió evitar ("no dupliques"). `ProjectForm.tsx` y
   `WeeklyUpdateFields.tsx` ahora importan de `./formStyles` en vez de
   definir sus propias constantes locales; el valor y comportamiento no
   cambia (mismo objeto/función, solo movidos de archivo).
2. **`FormattingToolbar.tsx`: `handleWrap`/`handlePrefix` como funciones
   con nombre en vez del helper `withTextarea(fn)` curried que sugería la
   prosa inicial** — la regla de ESLint `react-hooks/refs` (React Compiler)
   rechaza leer `textareaRef.current` dentro de una función devuelta por un
   helper intermedio invocado durante el render (falso positivo de
   "acceso a ref durante el render", aunque el acceso real solo ocurre en
   el evento `onClick`). Se resolvió inlineando la lectura de
   `textareaRef.current` directamente dentro de `handleWrap`/`handlePrefix`,
   funciones invocadas únicamente desde `onClick={() => handleWrap(...)}` —
   mismo comportamiento funcional que `design.md` describe (`wrapSelection`/
   `prefixLines` sin cambios), solo una forma distinta de conectarlos a los
   botones para pasar el linter del repo. `npm run lint` queda en verde.
3. **Ícono de "cita" (`QuoteIcon`)**: no existe un ícono en
   `@heroicons/react/24/outline` para "cita"/blockquote que calce
   razonablemente (sí para viñeta `ListBulletIcon` y numerada
   `NumberedListIcon`, usados tal cual). Se agregó un SVG propio
   minimalista (`viewBox 24`, `stroke="currentColor"`, `strokeWidth 1.6`,
   dos comillas de apertura) en el mismo estilo de trazo que los íconos de
   heroicons — exactamente lo que `design.md`/la maqueta aprobada por el
   usuario anticipaban como opción de fallback.
4. **Toolbar: divisor vertical de 1px `var(--color-border)` entre el grupo
   de 4 botones de caracter y el grupo de 3 de bloque** — detalle visual de
   la maqueta aprobada por el usuario (no estaba en `design.md`, que dejaba
   el criterio visual a `implementer`/`design-check`), implementado como un
   `<div>` de `width: 1, alignSelf: "stretch"`.
5. **`renderFormattedText`: el `<br>` literal que separa líneas consecutivas
   de cita dentro de un mismo `<blockquote>`** viene directo del snippet de
   referencia de `design.md` (`join("<br>")`). El propio texto de R16
   enumera el set fijo como `strong/em/u/s/ul/ol/li/blockquote` sin mencionar
   `br` explícitamente, pero `design.md` (parte de la misma spec aprobada)
   sí lo especifica en su implementación de referencia. Se implementó tal
   cual `design.md` — el `<br>` es un literal hardcodeado por el parser,
   nunca derivado de texto del usuario, así que no abre ninguna superficie
   de inyección nueva y cumple la garantía de seguridad que R16 protege
   (aunque no esté nombrado en la enumeración literal de esa frase). El test
   `lib/richText.test.ts` documenta esto explícitamente en un comentario
   junto al set `ALLOWED_TAGS` de los tests de R16.

## `design-check` (T5/T8, obligatorio por tocar `app/proyectos/*.tsx`)

El scope por defecto del skill (`.claude/skills/design-check/SKILL.md`) es
`app/components/*.tsx`; se aplicó el mismo criterio manualmente contra
`app/globals.css` sobre los 6 archivos nuevos/modificados de
`app/proyectos/`:

- **Colores**: sin hex nuevos. `FormattingToolbar.tsx` usa exclusivamente
  `var(--color-border)` (hover de botones y divisor), `var(--color-text-secondary)`
  (color base de íconos/letras) y `currentColor` en los SVG (hereda el color
  del botón). `FormattableTextarea.tsx`/`formStyles.ts` reutilizan
  `inputStyle` ya existente sin cambios de color.
- **`border-radius`**: siempre `var(--radius-md)` (toolbar arriba, textarea
  abajo, botones individuales), sin valores hardcodeados.
- **`fontSize`**: 13 en los botones de letra (B/I/U/S) y en el `<textarea>`
  (heredado de `inputStyle`) — dentro de la escala 10-15px ya establecida en
  `app/proyectos/`.
- **`boxShadow`**: ninguno nuevo — los botones de la toolbar no son CTAs
  primarios, siguen el patrón `background` transparente/hover ya usado en
  `ProjectCard.tsx` (`CardMenu`) y `ProjectTimeline.tsx`
  (`actionButtonStyle`), no `var(--shadow-glow-sm)`.
- **`ProjectDrawer.tsx`/`ProjectTimeline.tsx`**: los `<div>` que reemplazan
  a los `<p>` de solo lectura mantienen exactamente los mismos valores de
  `fontSize`/`color`/`lineHeight`/`margin`/`whiteSpace` que tenían antes —
  ningún valor nuevo introducido.
- Sin findings pendientes.

## Verificación automatizada

```
npm run lint             → sin errores
npm run build              → compila, TS check ok, /proyectos sigue listada
                             como ruta estática (○)
npm run test                → 36 tests pasan (22 preexistentes + 14 nuevos
                             de lib/richText.test.ts, T1)
npm run check-sdd-state     → ok, "single active feature:
                             rich-text-formatting-proyectos (in_progress)"
npm run verify               → exit 0 end-to-end (los 4 comandos anteriores
                             en secuencia)
```

## Verificación manual real (`npm run dev` local)

- `curl -s -o /dev/null -w "%{http_code}"  http://localhost:3000/proyectos`
  → `200` (la ruta sigue sirviendo tras los cambios de `ProjectDrawer.tsx`/
  `ProjectTimeline.tsx`).
- Sin PIN real ni herramienta de navegador disponibles en este sandbox
  (mismo bloqueo documentado en `progress/impl_weekly-update-entry.md` y
  `progress/impl_supabase-rls-lockdown.md`): no se pudo pasar el `PinGate`
  para interactuar de verdad con la toolbar, hacer click en los 7 botones,
  ni ver el resultado renderizado en el navegador contra datos reales de
  Supabase dev.

## Traceability por requisito

- **R1** (toolbar de 7 botones inmediatamente encima del textarea en las 5
  apariciones): manual QA por lectura de código —
  `FormattableTextarea.tsx` renderiza `<FormattingToolbar>` antes del
  `<textarea>` dentro del mismo `<div>` contenedor; `ProjectForm.tsx`
  (Resumen, apariciones 1 y 3) y `WeeklyUpdateFields.tsx` (Nota, apariciones
  2/4/5, componente compartido de `ProjectForm.tsx`/`AddUpdateForm.tsx`/
  `ProjectTimeline.tsx`) usan `<FormattableTextarea>` en el único lugar
  donde antes había un `<textarea>` plano. **No verificado visualmente en
  navegador** (bloqueo PIN/browser, ver arriba).
- **R2** (negrita con selección → envuelve con `**`, restaura foco/
  selección sobre el texto sin marcadores): manual QA por lectura de
  código — `wrapSelection(el, value, onChange, "**")` en
  `FormattingToolbar.tsx` (idéntico al snippet de `design.md`): calcula
  `selected = value.slice(start, end)`, arma `next` con `before + selected +
  after`, llama `onChange(next)`, y en `requestAnimationFrame` hace
  `el.focus()` + `el.setSelectionRange(start + before.length, start +
  before.length + selected.length)` — selecciona exactamente el texto
  envuelto, sin los marcadores. **No ejercitado con clicks reales**
  (bloqueo browser).
- **R3** (negrita sin selección → inserta `****` con cursor en medio):
  manual QA por lectura de código — mismo `wrapSelection`, sin rama
  especial: cuando `start === end`, `selected` es `""`, así que `next`
  inserta `before + after` = `**` + `**` = `****` en la posición del
  cursor, y `setSelectionRange` deja `selStart === selEnd === start + 2`
  (justo entre ambos pares). **No ejercitado con clicks reales**.
- **R4** (cursiva, mismo comportamiento con `*`): manual QA por lectura de
  código — botón "Cursiva" llama `handleWrap("*")` → `wrapSelection(el,
  value, onChange, "*")`, mismo código que R2/R3 con `before = after = "*"`.
- **R5** (subrayado con `++`, nunca HTML `<u>` crudo como mecanismo de
  entrada): manual QA por lectura de código — botón "Subrayado" llama
  `handleWrap("++")`; el único lugar donde aparece la etiqueta `<u>` en
  todo el código es como salida de `parseInline()` en `lib/richText.ts`
  (`html.replace(/\+\+(.+?)\+\+/g, "<u>$1</u>")`), nunca como algo que el
  usuario pueda escribir directamente y que se inserte sin pasar por
  `escapeHtml()` primero. **Verificado por test real** —
  `lib/richText.test.ts`, `"subrayado: envuelve ++texto++ en <u>"`.
- **R6** (tachado con `~~`, sintaxis GFM estándar): manual QA por lectura
  de código — botón "Tachado" llama `handleWrap("~~")`. **Verificado por
  test real** — `lib/richText.test.ts`, `"tachado: envuelve ~~texto~~ en
  <s>"`.
- **R7** (viñeta: antepone `- ` a cada línea de la selección/línea del
  cursor que no lo tenga ya, mantiene la selección): manual QA por lectura
  de código — botón "Lista con viñeta" llama `handlePrefix("- ")` →
  `prefixLines(el, value, onChange, "- ")`, idéntico al snippet de
  `design.md`: expande a límites de línea completa
  (`value.lastIndexOf("\n", start - 1) + 1` / `value.indexOf("\n", end)`),
  mapea cada línea del bloque con `line.startsWith(prefix) ? line : prefix +
  line` (evita doble-prefijo, tal como documenta `design.md`), y
  `setSelectionRange(lineStart, lineStart + prefixed.length)` mantiene la
  selección sobre el bloque completo tras la operación. **No ejercitado con
  clicks reales**.
- **R8** (numerada: mismo comportamiento con `1. ` literal, la numeración
  visible la calcula el renderizador de lectura): manual QA por lectura de
  código — botón "Lista numerada" llama `handlePrefix("1. ")`, mismo
  `prefixLines`; el lado de lectura (`lib/richText.ts`) agrupa líneas
  `/^\d+\.\s/` consecutivas en un único `<ol><li>...</li></ol>` — la
  numeración secuencial (`1.`, `2.`, `3.`...) la renderiza el navegador vía
  el `<ol>` nativo, nunca el texto guardado (que siempre tiene el literal
  `1. ` en cada línea). **Verificado por test real** —
  `lib/richText.test.ts`, `"lista numerada: agrupa líneas '1. ' consecutivas
  en un solo <ol>"`.
- **R9** (cita: antepone `> ` de la misma forma que R7): manual QA por
  lectura de código — botón "Cita" llama `handlePrefix("> ")`, mismo
  `prefixLines`.
- **R10** (textarea siempre muestra texto crudo con marcadores visibles,
  nunca WYSIWYG mientras se edita): manual QA por lectura de código —
  `FormattableTextarea.tsx` renderiza un `<textarea>` nativo controlado
  (`value={value}`, `onChange={(e) => onChange(e.target.value)}`) sin
  ninguna transformación entre el `value` recibido y lo que se muestra;
  `renderFormattedText()` solo se invoca desde `ProjectDrawer.tsx`/
  `ProjectTimeline.tsx` (modo lectura), nunca desde `FormattableTextarea.tsx`
  ni `FormattingToolbar.tsx`.
- **R11** (precarga de contenido con marcadores ya guardados, sin
  transformación): manual QA por lectura de código —
  `FormattableTextarea` recibe `value` directamente de `values.summary`/
  `values.note` (ya poblados desde `initialValues`/`editValues` en
  `ProjectForm.tsx`/`ProjectTimeline.tsx`, comportamiento preexistente de
  `project-crud`/`weekly-update-edit-delete`, sin tocar), sin ningún parseo
  ni escapado adicional antes de mostrarlo en el `<textarea>`.
- **R12** (`ProjectDrawer.tsx` renderiza el resumen formateado en vez de
  texto plano): manual QA por lectura de código —
  `dangerouslySetInnerHTML={{ __html: renderFormattedText(project.summary)
  }}` reemplaza `{project.summary}`, único uso de `dangerouslySetInnerHTML`
  en el componente. **Verificado indirectamente por test real** —
  `renderFormattedText()` (la función que produce el HTML) está cubierta
  por los 14 tests de `lib/richText.test.ts`. **No verificado visualmente
  en navegador** (bloqueo).
- **R13** (mismo renderizado en `ProjectTimeline.tsx` para la nota):
  manual QA por lectura de código — mismo reemplazo sobre
  `{group.update.note}`, preservando `whiteSpace: "pre-wrap"`.
- **R14** (texto plano preexistente sin marcadores se ve igual que antes):
  **verificado por test real** —
  `lib/richText.test.ts`, `"texto plano sin marcadores: devuelve el texto
  escapado, sin etiquetas nuevas"` — confirma que `"hola mundo"` y
  `"línea 1\nlínea 2"` pasan sin ningún `<ul>`/`<ol>`/`<blockquote>`/tag de
  formato, preservando el `\n` literal (que el `<div whiteSpace:
  "pre-wrap">` ya existente sigue rindiendo igual que el `<p>` anterior).
  **No verificado visualmente contra un proyecto real de Supabase dev**
  (bloqueo).
- **R15** (escapado de HTML antes de envolver en etiquetas de formato,
  incluido `++...++`, nunca HTML crudo del usuario): **verificado por test
  real** — 3 tests explícitos: `<script>alert(1)</script>` y `<img
  src=x onerror=alert(1)>` salen completamente escapados (`&lt;script&gt;`,
  `&lt;img`, sin ninguna etiqueta real `<script>`/`<img` en el output), y
  un caso combinado (`**<img src=x onerror=alert(1)>**`) confirma que el
  escapado ocurre *antes* de que el marcador de negrita envuelva el texto
  (`<strong>&lt;img src=x onerror=alert(1)&gt;</strong>`, nunca
  `<strong><img ...></strong>`).
- **R16** (set fijo y cerrado de etiquetas de salida, nunca derivadas del
  usuario): **verificado por test real** — test dedicado que combina los 7
  tipos de formato con un intento de inyección en la misma entrada,
  extrae todas las etiquetas del HTML resultante con una regex y confirma
  que el 100% pertenece al set `strong/em/u/s/ul/ol/li/blockquote/br` (ver
  "Decisiones" #5 sobre por qué se incluye `br`).
- **R17** (único punto de entrada `renderFormattedText`, ningún componente
  arma HTML de formato por su cuenta): manual QA por lectura de código —
  `grep`/lectura confirma que `dangerouslySetInnerHTML` aparece
  exactamente 2 veces en todo `app/proyectos/` (`ProjectDrawer.tsx`,
  `ProjectTimeline.tsx`), ambas con `__html: renderFormattedText(...)`
  como único valor — ningún otro componente concatena o construye HTML de
  formato.
- **R18** (se guarda como texto plano en las columnas `text` existentes,
  sin migración): manual QA por lectura de código — `FormattableTextarea`
  expone el mismo `value: string`/`onChange: (v: string) => void` que el
  `<textarea>` que reemplaza; `ProjectForm.tsx`/`WeeklyUpdateFields.tsx`
  siguen guardando `values.summary`/`values.note` como `string` sin cambios
  al tipo `ProjectFormValues`/`WeeklyUpdateFormValues` (`lib/projects.ts`,
  no tocado). Confirmado que no se agregó ninguna migración SQL nueva en
  `supabase/migrations/` para esta feature.
- **R19** (rutas API existentes tratan el campo como string libre, sin
  validación de sintaxis nueva): manual QA por lectura de código —
  `app/api/proyectos/route.ts`, `app/api/proyectos/[id]/route.ts`,
  `app/api/proyectos/[id]/avances/route.ts` y
  `.../avances/[updateId]/route.ts` no se tocaron en esta feature (`git
  diff` no los incluye); su validación existente (`values.trim() !== ""`)
  sigue aplicando igual sobre un string que ahora puede contener
  marcadores, sin distinguir sintaxis. **Complementado por test real** —
  `lib/richText.test.ts`, `"marcador desbalanceado no lanza excepción..."`
  confirma que `renderFormattedText("**sin cerrar")` no lanza excepción y
  muestra los asteriscos literales, coherente con guardar/leer un valor con
  marcadores desbalanceados sin romper el renderizador de lectura.
- **R20** (función pura sin DOM/navegador, testeable con Vitest sin
  jsdom): **verificado por test real** — `vitest.config.ts` no configura
  `environment: "jsdom"` para `lib/**/*.test.ts` (mismo entorno que
  `lib/sizes.test.ts`/`lib/projects.test.ts`/`lib/teamRows.test.ts`
  preexistentes) y los 14 tests de `lib/richText.test.ts` pasan sin
  ninguna referencia a `document`/`window` — `renderFormattedText()` recibe
  un `string` y devuelve un `string`, sin ningún acceso a DOM.

## Bloqueado — pasos pendientes del humano

1. QA end-to-end real en navegador (T9 de `tasks.md`) de los 5 puntos de
   aparición: los 7 botones con y sin selección, guardar/reabrir en modo
   edición (marcadores crudos preservados, R11), y el render formateado en
   modo vista (R12-R14) contra datos reales de Supabase dev — no se pudo
   ejercitar en este sandbox por falta de PIN real/herramienta de
   navegador, mismo bloqueo que features anteriores de este repo.
2. Confirmar visualmente que un resumen/nota real ya existente en Supabase
   dev (creado antes de esta feature, sin marcadores) se sigue viendo
   exactamente igual en el drawer y el timeline (R14) — cubierto por test a
   nivel de función pura, pero no contra datos reales en el navegador.
3. Confirmar visualmente el criterio de diseño de la toolbar (2 grupos de
   botones, divisor, `border-radius`/`border` compartido con el textarea)
   contra la maqueta aprobada por el usuario — implementado según la
   descripción exacta recibida, pero sin captura de pantalla real para
   comparar pixel a pixel.
