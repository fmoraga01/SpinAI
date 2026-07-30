# Review — `rich-text-formatting-proyectos`

**Veredicto: APPROVED**

Revisado por una sesión independiente de la que implementó (no escribí este
código). Commit revisado: `8d9ba82` en `dev` (`ae76aac` encima solo cambia
`feature_list.json` a `in_review`). `npm run verify` corrido de forma
independiente, no tomado del reporte de `implementer`. El contrato de
seguridad de `lib/richText.ts` (orden escapado→envuelto, set fijo de tags) se
verificó leyendo el código línea por línea y ejecutando `renderFormattedText`
manualmente con inputs de inyección (`<script>`, `<img onerror>`), no solo
leyendo el reporte ni los tests.

---

## Checkpoints — `Before in_review`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS (con matiz)** — T1-T8 y T10 `[x]`. T9 (QA end-to-end en navegador, los 5 puntos de aparición con clicks reales) queda `[ ]`, con nota explícita del motivo (sin PIN real ni browser tool en este sandbox) y detalle de qué sí se cubrió sin eso (`renderFormattedText()` vía Vitest para R12-R20 incluida la inyección XSS, revisión de código línea por línea de `wrapSelection`/`prefixLines` contra `design.md`). No es un check-off silencioso. Mismo patrón ya aceptado como PASS-con-matiz en `review_project-crud.md`, `review_weekly-update-edit-delete.md` y `review_supabase-rls-lockdown.md` para el mismo tipo de bloqueo de entorno (sandbox sin credenciales/browser tool). |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí, exit 0: `lint` limpio, `build` compila (26 rutas, incluida `/proyectos` como estática `○`), `test` 36/36 en 4 archivos (22 preexistentes + 14 nuevos de `lib/richText.test.ts`), `check-sdd-state` OK ("single active feature: rich-text-formatting-proyectos (in_review)"). |
| 3 | Cambios en `lib/` con test Vitest real | **PASS** — `lib/richText.ts` (nuevo, la pieza de mayor responsabilidad de seguridad de esta feature) tiene `lib/richText.test.ts` con 14 tests: cada uno de los 7 marcadores por separado, texto plano sin marcadores (R14), combinación negrita+cursiva, marcador desbalanceado sin excepción (R19), 3 tests de inyección HTML (`<script>`, `<img onerror>`, combinado con negrita) confirmando escapado antes de envolver (R15), y un test que extrae todas las etiquetas del output y confirma que pertenecen al set fijo (R16). Corridos por mí, pasan. |
| 4 | `progress/impl_<feature>.md` con verificación por cada `R<n>` | **PASS** — R1-R20 todas tienen entrada, sin huecos ni "N/A" sin justificar. Las que dependen de clicks reales en navegador (R1-R4, R7-R9, R11-R13) están etiquetadas explícitamente como "no ejercitado con clicks reales"/"no verificado visualmente" en vez de declaradas como probadas sin sustento; las de seguridad (R15, R16) y las de lógica pura (R14, R20) están respaldadas por tests reales que corrí yo también. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS (no aplica literalmente, pero cubierto igual)** — `git diff 1973f70..8d9ba82 --stat` no toca ningún archivo de `app/components/`; todo el cambio de UI es `app/proyectos/*.tsx` (fuera del scope literal del checkpoint 5 / de `docs/specs.md` línea 123, que solo dispara el skill para `app/components/*.tsx`). `design.md`/`tasks.md` (T5/T8) de esta spec, ya aprobados por el usuario, extendieron esa obligación a `app/proyectos/*.tsx` de todas formas — `implementer` documentó en `impl_*.md` haber aplicado manualmente el mismo criterio del skill (`app/globals.css` como referencia) sobre los 6 archivos nuevos/modificados, ya que el skill en sí está hardcodeado a `app/components/`. Verifiqué independientemente con grep: sin hex nuevo en `FormattingToolbar.tsx`/`FormattableTextarea.tsx`/`formStyles.ts` (el único hex, `#2C40FF` en `focusHandlers`, es código movido tal cual desde `ProjectForm.tsx`/`WeeklyUpdateFields.tsx`, no nuevo — confirmado con `git diff`); `borderRadius` siempre `var(--radius-md)` salvo `0` explícito en `FormattableTextarea.tsx` para fusionar visualmente el textarea con la toolbar (caso legítimo, no un bypass de token); `ProjectDrawer.tsx`/`ProjectTimeline.tsx` mantienen exactamente los mismos valores de `fontSize`/`color`/`lineHeight`/`margin` que tenían antes de la feature. Sin findings. |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — solo `rich-text-formatting-proyectos` en `in_review`; el resto en `done`. Confirmado también por `check-sdd-state`. |

## Checkpoints — `Before done`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | `progress/review_<feature>.md` con pass/fail y veredicto | **PASS** — este archivo. |
| 2 | Ningún `R<n>` sin entrada de verificación | **PASS** — ver checkpoint 4 arriba. |
| 3 | Una sola feature activa | **PASS**. |
| 4 | `progress/history.md` con entrada resumen | **PENDIENTE de `leader`** al cierre — no es responsabilidad de `implementer`/`reviewer`. |

---

## Verificación dirigida — el contrato de seguridad de `lib/richText.ts` (el punto central de esta revisión)

Leí `lib/richText.ts` completo (no solo el resumen de `impl_*.md`):

- **Orden escapado→envuelto confirmado con mis propios ojos.** `parseInline()`
  (línea ~76 de `lib/richText.ts`) llama `escapeHtml(text)` **primero** y solo
  después aplica los 4 `.replace()` de formato (`**`→`<strong>`, `++`→`<u>`,
  `~~`→`<s>`, `*`→`<em>`, en ese orden — `*` va después de `**` para no
  consumir sus asteriscos). Ningún `replace` corre antes del escapado. Esto es
  exactamente lo que `design.md` especifica y lo que R15 exige.
- **Test manual propio** (no confié en `lib/richText.test.ts`, lo repetí yo
  con `npx tsx`):
  ```
  "<script>alert(1)</script>"          => "&lt;script&gt;alert(1)&lt;/script&gt;"
  "<img src=x onerror=alert(1)>"       => "&lt;img src=x onerror=alert(1)&gt;"
  "**<img src=x onerror=alert(1)>**"   => "<strong>&lt;img src=x onerror=alert(1)&gt;</strong>"
  "normal text"                        => "normal text"
  "++subrayado++"                      => "<u>subrayado</u>"
  ```
  Ninguna etiqueta `<script>`/`<img>` real en ningún output — solo entidades
  escapadas. El caso combinado confirma que el escapado ocurre *antes* de que
  el marcador de negrita envuelva el texto, no al revés.
- **Set fijo de etiquetas confirmado por lectura, no solo por el test.** Grep
  manual de todos los strings literales `<...>` que aparecen en
  `lib/richText.ts`: `<ul>`, `<li>`, `<ol>`, `<blockquote>`, `<br>`,
  `<strong>`, `<u>`, `<s>`, `<em>` (y sus cierres) — exactamente el set de
  R16 más `<br>`, que es un literal hardcodeado por el propio parser (nunca
  derivado de texto del usuario) para separar líneas de una misma cita, tal
  como especifica `design.md` línea 235 y documenta el comentario de
  `lib/richText.test.ts` junto a `ALLOWED_TAGS`. No hay ninguna otra ruta en
  el archivo que construya una etiqueta a partir de un valor no literal.
- **`escapeHtml()` (`lib/escapeHtml.ts`)**: escapa exactamente `&<>"'`, ninguno
  de los cuales se usa como marcador de formato (`*`, `+`, `~`, `-`, `.`, `>`
  al inicio de línea sí sobrevive el escapado — pero `>` al *inicio* de línea
  para citas se consume vía `stripPrefix`/regex *antes* de pasar por
  `escapeHtml` en `parseInline`, ya que `renderFormattedText` primero separa
  el prefijo `> ` con `stripPrefix(l, /^>\s/)` y solo el resto de la línea va
  a `parseInline` — no hay inconsistencia).

## `ProjectDrawer.tsx`/`ProjectTimeline.tsx` — único punto de entrada (R17)

`grep -rn "dangerouslySetInnerHTML" app/proyectos/` da exactamente 2
resultados, uno por archivo, ambos con `__html: renderFormattedText(...)`
como único valor (`project.summary` en `ProjectDrawer.tsx`,
`group.update.note` en `ProjectTimeline.tsx`) — ningún HTML armado a mano ni
concatenado con el string crudo del usuario en ninguno de los dos
componentes. Confirmado con `git diff` que el cambio real es exactamente ese
reemplazo de `<p>{...}</p>` por `<div dangerouslySetInnerHTML=.../>`,
preservando `whiteSpace: "pre-wrap"` y todos los demás valores de estilo que
ya existían antes de la feature (R14).

## Compatibilidad con texto plano preexistente (R14)

Confirmado por lectura de código + test (`"texto plano sin marcadores..."`,
`lib/richText.test.ts`): un input sin ningún marcador no matchea ningún
`replace` de formato y no genera `<ul>`/`<ol>`/`<blockquote>`, así que
`renderFormattedText` devuelve el texto escapado con los `\n` originales
intactos — mismo criterio de render que el `<p style="whiteSpace: pre-wrap">`
que reemplazó. No verificado contra un dato real de Supabase dev (bloqueo de
sandbox, documentado), pero la lógica pura está probada de forma
determinística y no depende de datos reales para este caso.

## Cobertura de las 5 apariciones

`grep -n "<textarea" app/proyectos/*.tsx` da un único resultado real
(`FormattableTextarea.tsx`) — ningún `<textarea>` plano suelto en ningún
punto de edición. `grep -n "FormattableTextarea|WeeklyUpdateFields"` confirma
que `ProjectForm.tsx` usa `<FormattableTextarea>` directamente para "Resumen"
(apariciones 1 y 3) y `<WeeklyUpdateFields>` para el primer avance (aparición
2); `AddUpdateForm.tsx` y `ProjectTimeline.tsx` también usan
`<WeeklyUpdateFields>` (apariciones 4 y 5); `WeeklyUpdateFields.tsx` a su vez
usa `<FormattableTextarea>` internamente para "Nota" — las 5 apariciones
quedan cubiertas por los 2 puntos de integración que describe `design.md`.

## Diseño visual (toolbar de 7 botones, 2 grupos, divisor)

Leí `FormattingToolbar.tsx` completo: 4 botones de caracter (B/I/U/S̶ con
`fontWeight`/`fontStyle`/`textDecoration` reales en el glyph, no solo texto
plano) + divisor vertical `1px var(--color-border)` + 3 botones de bloque
(`ListBulletIcon`/`NumberedListIcon` de `@heroicons/react`, más un
`QuoteIcon` SVG propio en el mismo estilo de trazo `stroke="currentColor"`).
Mismo hover (`onButtonHover`/`onButtonLeave` → `background:
var(--color-border)`) que documenta el pedido del orquestador. La toolbar y
el textarea comparten borde/radius (`FormattableTextarea.tsx`: toolbar sin
`borderBottom`/radius inferior, textarea sin `borderTop`/radius superior),
visualmente un solo campo. Coincide con la descripción de la maqueta que el
usuario aprobó. No tengo forma de comparar pixel a pixel sin browser tool
(mismo bloqueo que el resto de la feature), pero el código no inventa nada
fuera de ese lenguaje visual.

## Validación de campo obligatorio no rota

`grep -n "\.trim()"` sobre `ProjectForm.tsx`/`AddUpdateForm.tsx`/
`ProjectTimeline.tsx` confirma que `values.summary.trim()`,
`values.note.trim()`, `editValues.note.trim()` siguen intactos, sin tocar —
`FormattableTextarea` expone el mismo `value: string`/`onChange: (v: string)
=> void` que el `<textarea>` que reemplazó, sin cambiar el modelo de datos
(`lib/projects.ts` no aparece en el diff de esta feature).

## Fuera de alcance — confirmado que no se tocó

- Ningún archivo de `app/api/**` ni `supabase/migrations/` aparece en
  `git show 8d9ba82 --stat` — sin migración de esquema ni validación de
  servidor nueva (R18/R19), confirmado.
- `lib/projects.ts` no tocado — el tipo `ProjectFormValues`/
  `WeeklyUpdateFormValues` sigue siendo `string` plano para `summary`/`note`.

---

## Notas no bloqueantes

**Nota 1 — QA humana end-to-end pendiente (T9).** Mismo bloqueo documentado
en `project-crud`, `weekly-update-entry`, `weekly-update-edit-delete` y
`supabase-rls-lockdown`: sin PIN real ni browser tool en este sandbox, no se
pudo ejercitar clicks reales de los 7 botones contra un `<textarea>` vivo, ni
el guardado/render real contra Supabase dev. `implementer` fue honesto al
respecto (T9 sin marcar `[x]`, sección "Bloqueado" explícita en
`impl_*.md`). Debe viajar a `progress/history.md` cuando `leader` cierre,
listando como mínimo: (a) click-through real de los 7 botones con y sin
selección en los 5 puntos de aparición, (b) confirmar que un resumen/nota
real preexistente en Supabase dev se sigue viendo igual (R14) contra datos
reales, (c) comparación visual de la toolbar contra la maqueta aprobada
pixel a pixel.

**Nota 2 — decisión de `implementer` no cubierta explícitamente por
`design.md`: incluir `<br>` en el set de tags permitido.** `R16` enumera
`strong/em/u/s/ul/ol/li/blockquote` sin nombrar `br`, pero el snippet de
referencia de `design.md` (aprobado junto con el resto de la spec) sí usa
`join("<br>")` para separar líneas de una misma cita. `implementer` lo
implementó tal cual el snippet aprobado y lo documentó explícitamente en
`impl_*.md` y en un comentario junto a `ALLOWED_TAGS` en el test — no es una
desviación silenciosa, es una inconsistencia menor entre la prosa de R16 y el
código de referencia de la misma spec aprobada. `<br>` es un literal
hardcodeado por el parser, nunca derivado de texto del usuario, así que no
abre superficie de inyección nueva. No bloqueante, pero si `spec-author`
toca esta spec de nuevo valdría la pena alinear la prosa de R16 con el
snippet.

---

## Veredicto final

**APPROVED.** El contrato de seguridad de `lib/richText.ts` es correcto y lo
verifiqué de forma independiente (lectura línea por línea + ejecución manual
de casos de inyección): el escapado corre siempre antes de que cualquier
marcador envuelva el texto, y el set de etiquetas de salida es fijo y
cerrado. Los 2 componentes de lectura usan `renderFormattedText()` como único
punto de entrada, sin HTML armado a mano. Las 5 apariciones de textarea están
cubiertas sin ningún `<textarea>` plano suelto. La validación de campo
obligatorio y el modelo de datos (`text` plano, sin migración) no cambiaron.
`npm run verify` pasa, corrido de forma independiente (36/36 tests). La
trazabilidad R1-R20 está completa sin huecos. El único checkbox sin marcar de
`tasks.md` (T9) es QA de navegador bloqueada por el mismo límite de sandbox
ya aceptado en 4 features previas de este repo, documentado honestamente sin
inflar el estado. `leader` puede mover `rich-text-formatting-proyectos` a
`done`, arrastrando la condición de QA humana pendiente de la Nota 1 hacia
`progress/history.md`.
