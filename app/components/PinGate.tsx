"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "spinai_auth";
const PIN = process.env.NEXT_PUBLIC_PIN ?? "";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAuthed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (authed === false) setTimeout(() => inputRef.current?.focus(), 80);
  }, [authed]);

  function submit() {
    if (value.trim().toUpperCase() === PIN.toUpperCase()) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setShaking(true);
      setValue("");
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => { setError(false); inputRef.current?.focus(); }, 1200);
    }
  }

  // Still checking localStorage
  if (authed === null) return null;

  // Authenticated — render app normally
  if (authed) return <>{children}</>;

  // PIN screen
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--color-bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32,
    }}>
      {/* Subtle grid background */}
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
      <div
        style={{
          display: "flex", flexDirection: "column", gap: 12,
          width: "100%", maxWidth: 280, position: "relative",
          animation: shaking ? "shake 0.45s ease" : "none",
        }}
      >
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(false); }}
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
          style={{
            width: "100%", padding: "12px",
            background: "var(--color-primary)",
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius-md)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", boxShadow: "var(--shadow-glow-sm)",
            transition: "opacity 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Entrar
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
