import { escapeHtml } from "./escapeHtml";

// Único punto de entrada (R17): ProjectDrawer.tsx y ProjectTimeline.tsx llaman
// exclusivamente a esta función, nunca arman HTML de formato por su cuenta.
//
// Contrato de seguridad (R15/R16): `parseInline()` siempre escapa el texto
// crudo del usuario ANTES de envolverlo en cualquier etiqueta — el conjunto
// de etiquetas que este archivo puede emitir es fijo y cerrado (`strong`,
// `em`, `u`, `s`, `ul`, `ol`, `li`, `blockquote`); nunca se inserta HTML
// crudo proporcionado por el usuario.
export function renderFormattedText(raw: string): string {
  const lines = raw.split("\n");
  const htmlParts: string[] = [];

  let i = 0;
  while (i < lines.length) {
    if (isBulletLine(lines[i])) {
      const group = takeWhile(lines, i, isBulletLine);
      htmlParts.push(
        `<ul>${group.map((l) => `<li>${parseInline(stripPrefix(l, /^-\s/))}</li>`).join("")}</ul>`
      );
      i += group.length;
    } else if (isOrderedLine(lines[i])) {
      const group = takeWhile(lines, i, isOrderedLine);
      htmlParts.push(
        `<ol>${group.map((l) => `<li>${parseInline(stripPrefix(l, /^\d+\.\s/))}</li>`).join("")}</ol>`
      );
      i += group.length;
    } else if (isQuoteLine(lines[i])) {
      const group = takeWhile(lines, i, isQuoteLine);
      htmlParts.push(
        `<blockquote>${group.map((l) => parseInline(stripPrefix(l, /^>\s/))).join("<br>")}</blockquote>`
      );
      i += group.length;
    } else {
      htmlParts.push(parseInline(lines[i]));
      i += 1;
      if (i < lines.length) htmlParts.push("\n"); // línea "plana": el \n literal se preserva (R14)
    }
  }
  return htmlParts.join("");
}

function isBulletLine(line: string): boolean {
  return /^-\s/.test(line);
}

function isOrderedLine(line: string): boolean {
  return /^\d+\.\s/.test(line);
}

function isQuoteLine(line: string): boolean {
  return /^>\s/.test(line);
}

function takeWhile(lines: string[], start: number, pred: (line: string) => boolean): string[] {
  const out: string[] = [];
  let i = start;
  while (i < lines.length && pred(lines[i])) {
    out.push(lines[i]);
    i += 1;
  }
  return out;
}

function stripPrefix(line: string, prefixPattern: RegExp): string {
  return line.replace(prefixPattern, "");
}

// Escapa PRIMERO (R15) y solo después envuelve en las etiquetas fijas de R16
// — nunca al revés. `text` que llega acá siempre es una línea o fragmento de
// línea de texto crudo del usuario, jamás HTML ya construido. Marcadores
// desbalanceados (R19) simplemente no matchean su regex y quedan visibles
// como texto literal, sin lanzar ninguna excepción.
function parseInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\+\+(.+?)\+\+/g, "<u>$1</u>");
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>"); // después de ** para no consumir sus asteriscos
  return html;
}
