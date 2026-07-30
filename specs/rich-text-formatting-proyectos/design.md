# Design — Formato de texto en los textareas de Resumen/Nota de `/proyectos`

## Decisión central: markdown-en-texto-plano (toolbar de botones) vs WYSIWYG

Dos alternativas evaluadas, ya presentadas por el usuario:

1. **Markdown-en-texto-plano con toolbar** — los botones manipulan
   `selectionStart`/`selectionEnd` de un `<textarea>` nativo para envolver
   o prefijar la selección con sintaxis markdown (`**negrita**`, etc.). El
   textarea sigue siendo texto plano en todo momento; el formato solo se
   ve al renderizar en modo lectura.
2. **Editor WYSIWYG real (`contentEditable`)** — el usuario ve el
   resultado formateado mientras escribe; se guarda HTML directamente.

**Se elige (1).** Razones:

- **Superficie de seguridad mucho menor.** Con (1), lo único que llega del
  cliente es una `string` de texto plano — nunca HTML. El HTML solo se
  genera del lado del parser, controlado 100% por este código, en el
  momento de renderizar en modo lectura. Con (2), el propio editor
  produce HTML directamente desde la edición del usuario (via
  `document.execCommand`/`Selection`/`Range` API, notoriamente
  inconsistente entre navegadores y con historial largo de bugs de
  sanitización en proyectos que lo intentan sin una librería madura como
  Slate/TipTap/ProseMirror) — instalar una librería WYSIWYG de ese calibre
  es una dependencia grande y no trivial para un repo hoy minimalista
  (`package.json` tiene 7 dependencies de producción, todas puntuales:
  Supabase, jose, next, nodemailer, react, rss-parser, heroicons).
- **Coherencia con el resto del repo.** Los 5 lugares donde aparece este
  campo ya son `<textarea>` controlados simples (`WeeklyUpdateFields.tsx`,
  `ProjectForm.tsx`), con el mismo `inputStyle` que el resto del
  formulario. Migrar a `contentEditable` cambia el modelo de estado
  (HTML en vez de string), el foco/blur, la validación de "campo
  obligatorio no vacío" (`values.summary.trim()`, `values.note.trim()`
  ya usados en `project-crud`/`weekly-update-entry`), y probablemente
  requiere revisar esas validaciones para no romperlas con HTML vacío
  tipo `<p><br></p>`. Alto riesgo de regresión en las 3 features `done`
  que ya dependen de ese comportamiento.
- **Alcance pedido por el usuario ya apunta a esto**: "los botones
  envuelven la selección con `**negrita**`... sigue siendo un textarea
  plano mientras se edita" es exactamente cómo se describió la opción 1 en
  el pedido — se confirma como la lectura correcta, no una interpretación
  libre.

**Alternativa descartada explícitamente: (2) WYSIWYG/contentEditable** —
mayor complejidad, mayor superficie de sanitización, dependencia nueva no
trivial, y no es lo que pidió el usuario.

## Convención de subrayado: `++texto++` (marcador propio, no HTML crudo)

CommonMark y GFM no tienen sintaxis nativa de subrayado. Dos alternativas:

1. **`<u>texto</u>` HTML crudo embebido en el markdown guardado** —
   descartado: implicaría que el parser de lectura tenga que reconocer y
   permitir *una* etiqueta HTML específica proveniente directamente del
   usuario, abriendo la puerta conceptual a "a veces sí dejamos pasar HTML
   del usuario". Aunque técnicamente se podría filtrar solo `<u>`/`</u>`
   con una expresión regular estricta, es un patrón frágil: cualquier
   descuido futuro (ej. "agreguemos también `<span>` para tal cosa") band
   convertiría el escape hatch en una vulnerabilidad real. Preferible no
   abrir esa puerta en absoluto.
2. **Marcador custom `++texto++`, interpretado a mano por el parser
   propio de este proyecto** — elegido. El texto entre los marcadores
   pasa por el mismo pipeline de escapado que cualquier otro texto (R15);
   el parser es quien decide envolver ese texto ya escapado en `<u>`,
   nunca el usuario. Sin ambigüedad ni excepción de "HTML permitido".

**Se elige (2).**

## Parser propio (~100 líneas) vs librería de markdown

Evaluado con el criterio explícito de "repo minimalista, evitar
dependencias grandes sin necesidad" (`package.json` hoy sin ninguna
librería de parseo de texto):

- **Librería de markdown genérica** (ej. `marked`, `markdown-it`) —
  descartada: (a) soportan un superset enorme de sintaxis (tablas,
  encabezados, imágenes, HTML crudo embebido por defecto en varias de
  ellas — `markdown-it` permite HTML crudo salvo que se desactive
  explícitamente) que no se necesita y que hay que auditar/desactivar con
  cuidado; (b) ninguna soporta el marcador custom de subrayado `++...++`
  de forma nativa, habría que post-procesar de todas formas; (c) trae su
  propio historial de CVEs de XSS en el pasado si no se configuran con
  cuidado (`html: false` explícito, sanitizador aparte para los casos que
  igual dejan pasar), lo cual va exactamente en contra del espíritu de la
  auditoría de seguridad reciente de este repo
  (`specs/supabase-rls-lockdown/`, cuyo principio rector fue "no confiar
  en datos sin sanear"); (d) tamaño de bundle no despreciable para 7
  tipos de formato acotados.
- **Parser propio, acotado exactamente a los 7 tipos soportados** —
  elegido. Superficie mínima: el propio proyecto controla el 100% del
  conjunto de etiquetas de salida (ver R16), sin ninguna ruta de escape a
  HTML crudo del usuario. Más fácil de razonar sobre su seguridad que
  configurar correctamente una librería genérica para negar todo lo que
  no se necesita.

**Se elige el parser propio.**

## Arquitectura de archivos

```
lib/
  richText.ts        # [nuevo] parser puro: renderFormattedText(raw: string): string
                      # (HTML ya escapado/saneado, ver más abajo)
  richText.test.ts    # [nuevo] tests de Vitest, sin jsdom (string -> string)

app/proyectos/
  FormattingToolbar.tsx   # [nuevo] barra de 7 botones + lógica de inserción/wrap
                          # sobre un ref de <textarea>; sin estado propio de "activo"
  FormattableTextarea.tsx # [nuevo] compone FormattingToolbar + <textarea> controlado,
                          # mismo `inputStyle`/focusHandlers ya usados por
                          # ProjectForm.tsx/WeeklyUpdateFields.tsx (reexportados o
                          # extraídos a un módulo común si conviene evitar duplicación)
  ProjectForm.tsx         # [modificado] el <textarea> de "Resumen" pasa a ser
                          # <FormattableTextarea> (misma prop value/onChange)
  WeeklyUpdateFields.tsx  # [modificado] el <textarea> de "Nota" pasa a ser
                          # <FormattableTextarea> (misma prop value/onChange) —
                          # cubre las 3 apariciones (2), (4), (5) de una sola vez,
                          # como ya ocurre hoy con el resto de este componente
  ProjectDrawer.tsx       # [modificado] `{project.summary}` (línea ~340) pasa a
                          # renderizar `renderFormattedText(project.summary)` vía
                          # dangerouslySetInnerHTML, envuelto en un <div> con
                          # whiteSpace: "pre-wrap" (mismo criterio que R14/R-preservar
                          # whitespace)
  ProjectTimeline.tsx     # [modificado] `{group.update.note}` pasa a lo mismo,
                          # manteniendo el whiteSpace: "pre-wrap" ya existente en esa
                          # línea hoy
```

No se toca ningún archivo de `app/api/**` ni ninguna migración de Supabase
— confirma R18/R19 (sin cambio de esquema ni de validación de servidor).

## `FormattingToolbar.tsx` — inserción/wrap sobre el textarea nativo

Patrón estándar para toolbars de markdown sobre `<textarea>` controlado
(sin `document.execCommand`, deprecado y no confiable):

```ts
function wrapSelection(
  el: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  before: string,
  after: string = before
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(next);
  // El valor controlado se re-aplica al DOM en el próximo render; la
  // selección hay que restaurarla a mano después de que React actualice
  // el value, si no el cursor queda al final del textarea.
  requestAnimationFrame(() => {
    el.focus();
    const selStart = start + before.length;
    const selEnd = selStart + selected.length;
    el.setSelectionRange(selStart, selEnd);
  });
}

function prefixLines(
  el: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  prefix: string
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  // Expande la selección a los límites de línea completa antes de prefijar,
  // para no partir una línea a la mitad.
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIdx = value.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : prefix + line))
    .join("\n");
  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(lineStart, lineStart + prefixed.length);
  });
}
```

- Negrita/cursiva/subrayado/tachado (R2-R6) usan `wrapSelection` con
  `**`, `*`, `++`, `~~` respectivamente. Sin selección, `selected` es `""`
  y el cursor queda entre los marcadores (R3) — mismo código, sin rama
  especial.
- Lista con viñeta/numerada/cita (R7-R9) usan `prefixLines` con `- `,
  `1. `, `> ` respectivamente.
- **Limitación aceptada, documentada (no resuelta en esta feature):**
  clickear el mismo botón dos veces sobre texto ya envuelto anida
  marcadores (`****texto****`) en vez de quitarlos — no hay detección de
  "toggle off". Confirmado como fuera de alcance por el usuario (ver
  `requirements.md`, "Fuera de alcance"). Igualmente, `prefixLines` sí
  evita doble-prefijo exacto en el mismo click (`line.startsWith(prefix)`)
  para que aplicar viñeta sobre una línea ya viñeteada no la rompa, pero
  esto es una guarda barata, no un toggle real (clickear negrita de nuevo
  sí anida, ya que detectar "todo el bloque seleccionado está envuelto en
  `**...**`" es más ambiguo y se decide no implementarlo).
- Sin estado de "botón activo/presionado" — confirmado fuera de alcance
  (requeriría parsear la posición del cursor contra el markdown circundante
  en cada evento de selección, complejidad no pedida por el usuario).

`FormattableTextarea.tsx` mantiene el `ref` al `<textarea>` y pasa
`el, value, onChange` a cada handler de botón del toolbar.

## `lib/richText.ts` — parser puro y su contrato de seguridad

```ts
import { escapeHtml } from "./escapeHtml";

// Único punto de entrada (R17): ProjectDrawer.tsx y ProjectTimeline.tsx
// llaman exclusivamente a esta función, nunca arman HTML de formato por su
// cuenta.
export function renderFormattedText(raw: string): string {
  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isBulletLine(lines[i])) {
      const group = takeWhile(lines, i, isBulletLine);
      htmlParts.push(`<ul>${group.map((l) => `<li>${parseInline(stripPrefix(l, /^-\s/))}</li>`).join("")}</ul>`);
      i += group.length;
    } else if (isOrderedLine(lines[i])) {
      const group = takeWhile(lines, i, isOrderedLine);
      htmlParts.push(`<ol>${group.map((l) => `<li>${parseInline(stripPrefix(l, /^\d+\.\s/))}</li>`).join("")}</ol>`);
      i += group.length;
    } else if (isQuoteLine(lines[i])) {
      const group = takeWhile(lines, i, isQuoteLine);
      htmlParts.push(`<blockquote>${group.map((l) => parseInline(stripPrefix(l, /^>\s/))).join("<br>")}</blockquote>`);
      i += group.length;
    } else {
      htmlParts.push(parseInline(lines[i]));
      i += 1;
      if (i < lines.length) htmlParts.push("\n"); // línea "plana": el \n literal se preserva
    }
  }
  return htmlParts.join("");
}

// Escapa PRIMERO (R15) y solo después envuelve en las etiquetas fijas de
// R16 — nunca al revés. `text` que llega acá siempre es una línea o
// fragmento de línea de texto crudo del usuario, jamás HTML ya construido.
function parseInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\+\+(.+?)\+\+/g, "<u>$1</u>");
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>"); // después de ** para no consumir sus asteriscos
  return html;
}
```

(Helpers `isBulletLine`/`isOrderedLine`/`isQuoteLine`/`takeWhile`/
`stripPrefix` son funciones puras auxiliares triviales — `implementer`
las define según convenga, no hace falta fijar su firma exacta acá.)

**Por qué este orden es seguro (justifica R15/R16 de `requirements.md`):**
`escapeHtml()` corre **antes** de cualquier `replace` que inserte
etiquetas. Los caracteres que `escapeHtml` neutraliza (`&<>"'`) no
incluyen `*`, `+`, `~`, `-`, `.`, `>` al inicio de línea usados como
marcadores — así que los marcadores sobreviven el escapado intactos y
siguen siendo reconocibles por los `replace` de formato, mientras que
cualquier intento del usuario de escribir HTML/JS literal
(`<img src=x onerror=...>`, `<script>`) ya quedó convertido en entidades
inertes antes de que el parser toque una sola etiqueta. Ningún `replace`
inserta contenido crudo sin pasar por este escapado previo — no existe
ninguna ruta donde el string final contenga HTML no generado por este
archivo.

**Texto con marcadores desbalanceados (R19)** — ej. `**negrita sin
cerrar` — el regex `\*\*(.+?)\*\*` simplemente no matchea (no hay cierre),
así que el texto se muestra literal con los asteriscos visibles, sin
romper el render ni lanzar excepción. Comportamiento aceptado, coherente
con cualquier editor markdown minimalista sin validación estricta.

**Compatibilidad con texto plano preexistente (R14)** — un resumen/nota
sin ningún marcador simplemente no matchea ningún `replace`, así que
`parseInline` devuelve el texto escapado tal cual, y como no hay líneas
`- `/`1. `/`> ` tampoco se generan `<ul>`/`<ol>`/`<blockquote>`; el
resultado son líneas de texto separadas por `\n` literales, que el `<div>`
contenedor con `whiteSpace: "pre-wrap"` (igual que hoy) renderiza
exactamente como se ve actualmente.

## Renderizado en `ProjectDrawer.tsx`/`ProjectTimeline.tsx`

```tsx
<div
  style={{ fontSize: 14.5, color: "var(--color-text-secondary)", lineHeight: "22px", margin: "0 0 16px", whiteSpace: "pre-wrap" }}
  dangerouslySetInnerHTML={{ __html: renderFormattedText(project.summary) }}
/>
```

Es el único uso de `dangerouslySetInnerHTML` en estos dos componentes, y
está justificado porque el HTML que recibe viene exclusivamente de
`renderFormattedText()` (R17) — nunca de un string armado a mano en el
componente ni de otra fuente. `ProjectTimeline.tsx` aplica el mismo
patrón sobre `group.update.note`, reemplazando el `<p style={{ ...
whiteSpace: "pre-wrap" }}>{group.update.note}</p>` actual por un `<div>`
con `dangerouslySetInnerHTML` y el mismo `whiteSpace: "pre-wrap"`.

## `design-check`

`FormattingToolbar.tsx`, `FormattableTextarea.tsx`, y los cambios en
`ProjectForm.tsx`/`WeeklyUpdateFields.tsx`/`ProjectDrawer.tsx`/
`ProjectTimeline.tsx` tocan `app/proyectos/*.tsx` — corre el skill
`design-check` sobre cada uno según la regla de `docs/specs.md`, resultado
documentado en `progress/impl_rich-text-formatting-proyectos.md`.

## Supabase / auth / cron

- **Sin cambio de esquema** — confirma R18. `projects.summary` y
  `project_weekly_updates.note` siguen siendo `text` sin restricción.
- **Sin cambio de auth ni de RLS** — el guardado sigue pasando por las
  mismas rutas API ya existentes (`project-crud`, `weekly-update-entry`,
  `weekly-update-edit-delete`), sin ninguna validación de servidor nueva
  sobre el contenido del campo (R19).
- Cron: no aplica.
