"use client";

import { useRef } from "react";
import FormattingToolbar from "./FormattingToolbar";
import { inputStyle } from "./formStyles";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

// Compone FormattingToolbar + <textarea> controlado, visualmente pegados
// como un solo campo. El borde vive en este wrapper (no en la toolbar ni en
// el textarea por separado, a diferencia de un intento anterior) para que al
// enfocar el textarea todo el borde del campo —incluida la parte de arriba,
// donde está la toolbar— pase a var(--color-primary) vía :focus-within (CSS
// puro). Antes, la toolbar tenía su propio borde gris fijo sin relación al
// foco, y el textarea no tenía borde superior (borderTop: none) para que
// ambos se vieran pegados — el resultado era que el resaltado azul de foco
// nunca llegaba a la parte de arriba del campo (bug reportado por el
// usuario: "la barra tapa el estilo del hover"). El textarea sigue siendo
// texto plano en todo momento (R10); solo agrega la barra de botones (R1)
// que envuelve o prefija la selección/línea actual (R2-R9). La precarga de
// contenido con marcadores ya guardados (R11) es responsabilidad de quien
// pasa `value`, sin transformación acá.
export default function FormattableTextarea({ value, onChange, placeholder, rows = 7 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className="sp-formattable-field"
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        transition: "border-color 150ms ease",
      }}
    >
      <style>{`
        .sp-formattable-field:focus-within {
          border-color: var(--color-primary);
        }
      `}</style>
      <FormattingToolbar textareaRef={textareaRef} value={value} onChange={onChange} />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...inputStyle,
          resize: "vertical",
          lineHeight: "20px",
          display: "block",
          border: "none",
          borderRadius: 0,
          outline: "none",
        }}
      />
    </div>
  );
}
