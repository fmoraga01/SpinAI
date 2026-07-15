"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  kind?: "error" | "success";
  onDismiss: () => void;
  durationMs?: number;
}

export default function Toast({ message, kind = "error", onDismiss, durationMs = 5000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [onDismiss, durationMs]);

  const isError = kind === "error";
  const accent = isError ? "#EF4444" : "#059669";

  return (
    <div
      role="alert"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 300,
        display: "flex", alignItems: "center", gap: 10,
        background: "var(--color-surface-elevated)",
        border: `1px solid ${accent}55`,
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        maxWidth: "min(420px, calc(100vw - 32px))",
      }}
    >
      <span style={{ color: accent, fontSize: 16, flexShrink: 0 }}>{isError ? "⚠" : "✓"}</span>
      <span style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        style={{
          marginLeft: 4, background: "transparent", border: "none",
          color: "#6B7280", cursor: "pointer", fontSize: 14, flexShrink: 0,
          padding: 2, lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
