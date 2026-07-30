"use client";

import { useRef } from "react";
import FormattingToolbar from "./FormattingToolbar";
import { inputStyle, focusHandlers } from "./formStyles";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

// Compone FormattingToolbar + <textarea> controlado, visualmente pegados
// como un solo campo (toolbar sin borde inferior/radius abajo, textarea sin
// borde superior/radius arriba) — mismo inputStyle/focusHandlers que el
// resto de los campos de /proyectos. El textarea sigue siendo texto plano
// en todo momento (R10); solo agrega la barra de botones (R1) que envuelve
// o prefija la selección/línea actual (R2-R9). La precarga de contenido con
// marcadores ya guardados (R11) es responsabilidad de quien pasa `value`,
// sin transformación acá.
export default function FormattableTextarea({ value, onChange, placeholder, rows = 7 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
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
          borderTop: "none",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
        {...focusHandlers()}
      />
    </div>
  );
}
