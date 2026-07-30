"use client";

import { ListBulletIcon, NumberedListIcon } from "@heroicons/react/24/outline";

// Patrón estándar para toolbars de markdown sobre <textarea> controlado (sin
// document.execCommand, deprecado y no confiable) — ver design.md.
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
  // selección hay que restaurarla a mano después de que React actualice el
  // value, si no el cursor queda al final del textarea.
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

// No hay ícono de heroicons para "cita" que calce razonablemente — SVG propio
// minimalista, mismo estilo de trazo (viewBox 24, stroke actual, sin relleno)
// que ListBulletIcon/NumberedListIcon de @heroicons/react/24/outline.
function QuoteIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d="M7.5 8.25A2.25 2.25 0 0 0 5.25 10.5v2.25A2.25 2.25 0 0 0 7.5 15h.75v1.5a2.25 2.25 0 0 1-2.25 2.25" />
      <path d="M16.5 8.25a2.25 2.25 0 0 0-2.25 2.25v2.25a2.25 2.25 0 0 0 2.25 2.25h.75v1.5a2.25 2.25 0 0 1-2.25 2.25" />
    </svg>
  );
}

const buttonStyle: React.CSSProperties = {
  width: 27,
  height: 27,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 150ms ease",
};

function onButtonHover(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = "var(--color-border)";
}
function onButtonLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = "transparent";
}

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}

// Barra de 7 botones (R1) sobre un <textarea> nativo de texto plano: cada
// botón envuelve la selección (negrita/cursiva/subrayado/tachado, R2-R6) o
// prefija las líneas seleccionadas (viñeta/numerada/cita, R7-R9). Sin estado
// de "botón activo" ni toggle-off — confirmado fuera de alcance (ver
// requirements.md, "Fuera de alcance").
export default function FormattingToolbar({ textareaRef, value, onChange }: Props) {
  // Los handlers de click leen `textareaRef.current` en el momento del
  // evento (nunca durante el render) — cada botón llama a esta función
  // directamente desde su propio `onClick`, no a través de un closure
  // devuelto por un helper intermedio.
  function handleWrap(before: string, after: string = before) {
    const el = textareaRef.current;
    if (!el) return;
    wrapSelection(el, value, onChange, before, after);
  }

  function handlePrefix(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    prefixLines(el, value, onChange, prefix);
  }

  return (
    <div
      role="toolbar"
      aria-label="Formato de texto"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "4px 6px",
        background: "var(--color-surface-elevated)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <button
        type="button"
        aria-label="Negrita"
        title="Negrita"
        onClick={() => handleWrap("**")}
        style={{ ...buttonStyle, fontSize: 13, fontWeight: 700 }}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        B
      </button>
      <button
        type="button"
        aria-label="Cursiva"
        title="Cursiva"
        onClick={() => handleWrap("*")}
        style={{ ...buttonStyle, fontSize: 13, fontStyle: "italic" }}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        I
      </button>
      <button
        type="button"
        aria-label="Subrayado"
        title="Subrayado"
        onClick={() => handleWrap("++")}
        style={{ ...buttonStyle, fontSize: 13, textDecoration: "underline" }}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        U
      </button>
      <button
        type="button"
        aria-label="Tachado"
        title="Tachado"
        onClick={() => handleWrap("~~")}
        style={{ ...buttonStyle, fontSize: 13, textDecoration: "line-through" }}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        S
      </button>

      <div style={{ width: 1, alignSelf: "stretch", margin: "0 4px", background: "var(--color-border)", flexShrink: 0 }} />

      <button
        type="button"
        aria-label="Lista con viñeta"
        title="Lista con viñeta"
        onClick={() => handlePrefix("- ")}
        style={buttonStyle}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        <ListBulletIcon style={{ width: 16, height: 16 }} />
      </button>
      <button
        type="button"
        aria-label="Lista numerada"
        title="Lista numerada"
        onClick={() => handlePrefix("1. ")}
        style={buttonStyle}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        <NumberedListIcon style={{ width: 16, height: 16 }} />
      </button>
      <button
        type="button"
        aria-label="Cita"
        title="Cita"
        onClick={() => handlePrefix("> ")}
        style={buttonStyle}
        onMouseEnter={onButtonHover}
        onMouseLeave={onButtonLeave}
      >
        <QuoteIcon style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}
