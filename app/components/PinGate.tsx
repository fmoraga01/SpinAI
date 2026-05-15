"use client";

import { useState, useEffect, useRef } from "react";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth by hitting the API — if cookie is valid the middleware already
  // lets the page through; we probe with a lightweight request to know the state
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed === false) setTimeout(() => inputRef.current?.focus(), 80);
  }, [authed]);

  async function submit() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value.trim() }),
      });

      if (res.ok) {
        setAuthed(true);
      } else {
        setError(true);
        setShaking(true);
        setValue("");
        setTimeout(() => setShaking(false), 500);
        setTimeout(() => { setError(false); inputRef.current?.focus(); }, 1200);
      }
    } finally {
      setLoading(false);
    }
  }

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--color-bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle at 60% 40%, #2C40FF0a 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative" }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: "var(--radius-md)",
          background: "var(--color-primary)",
          boxShadow: "var(--shadow-glow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 22, color: "#fff",
        }}>
          S
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          SpinAI
        </span>
        <p style={{ fontSize: 13, color: "#4B5563", margin: 0 }}>
          Ingresa el PIN para continuar
        </p>
      </div>

      {/* PIN form */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12,
        width: "100%", maxWidth: 280, position: "relative",
        animation: shaking ? "shake 0.45s ease" : "none",
      }}>
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••••••"
          autoComplete="off"
          style={{
            width: "100%",
            background: "var(--color-surface-elevated)",
            border: `1px solid ${error ? "#F87171" : "var(--color-border)"}`,
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            fontSize: 16,
            letterSpacing: "0.2em",
            color: "var(--color-text-primary)",
            outline: "none",
            textAlign: "center",
            transition: "border-color 150ms",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--color-primary)"; }}
          onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--color-border)"; }}
        />

        {error && (
          <p style={{ fontSize: 12, color: "#F87171", textAlign: "center", margin: 0 }}>
            PIN incorrecto. Inténtalo de nuevo.
          </p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%", padding: "12px",
            background: "var(--color-primary)",
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius-md)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            boxShadow: "var(--shadow-glow-sm)",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 150ms",
          }}
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
