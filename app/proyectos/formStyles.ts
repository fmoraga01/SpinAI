// Estilos compartidos por los campos de formulario de /proyectos
// (ProjectForm.tsx, WeeklyUpdateFields.tsx, FormattableTextarea.tsx) —
// extraídos acá para no duplicar `inputStyle`/`focusHandlers` en cada
// componente que los usa.
export const inputStyle: React.CSSProperties = {
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  color: "var(--color-text-primary)",
  fontSize: 13,
  transition: "border-color 150ms ease",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export function focusHandlers(): {
  onFocus: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
} {
  return {
    onFocus: (e) => (e.currentTarget.style.borderColor = "#2C40FF"),
    onBlur: (e) => (e.currentTarget.style.borderColor = "var(--color-border)"),
  };
}
