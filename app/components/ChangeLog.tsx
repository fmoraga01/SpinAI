"use client";

import { useEffect, useState } from "react";
import { loadLogs } from "@/lib/storage";
import { LogEntry } from "@/lib/types";
import { usePrefersReducedMotion } from "@/app/state-of-ai/useReducedMotion";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatRelative(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(isoStr).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export default function ChangeLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    loadLogs().then(({ entries, tableError }) => {
      setLogs(entries);
      setTableError(tableError);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div style={{ width: 20, height: 20, border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (tableError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
        <div style={{
          background: "#FF4D4D0f", border: "1px solid #FF4D4D33",
          borderRadius: "var(--radius-md)", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#F87171", margin: 0 }}>Tabla no encontrada</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: "18px" }}>
            Ejecuta este SQL en el editor de Supabase para activar el log:
          </p>
        </div>
        <pre style={{
          background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)", padding: "14px 16px",
          fontSize: 11, color: "#9CA3AF", lineHeight: 1.7, margin: 0,
          overflowX: "auto", whiteSpace: "pre-wrap",
        }}>{`create table assignment_logs (
  id uuid primary key default gen_random_uuid(),
  member_a_name text not null,
  member_b_name text not null,
  date_a text not null,
  date_b text not null,
  created_at timestamptz default now()
);`}</pre>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "48px 24px", gap: 16,
        animation: prefersReducedMotion ? undefined : "changelogEmptyIn 320ms ease-in-out",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "var(--radius-md)",
          background: "#2C40FF0f", border: "1px solid #2C40FF22",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2C40FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Sin cambios registrados</p>
          <p style={{ fontSize: 13, color: "#4B5563", margin: 0, maxWidth: 240, lineHeight: "20px" }}>
            Los intercambios de turno entre integrantes aparecerán aquí.
          </p>
        </div>
        <style>{`@keyframes changelogEmptyIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {logs.map((log, i) => (
        <div key={log.id} style={{ display: "flex", gap: 16, position: "relative" }}>
          {/* Timeline line */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#2C40FF15", border: "1px solid #2C40FF33",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2C40FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            {i < logs.length - 1 && (
              <div style={{ width: 1, flex: 1, background: "var(--color-border)", margin: "4px 0" }} />
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingBottom: i < logs.length - 1 ? 20 : 0 }}>
            <p style={{ fontSize: 11, color: "#4B5563", margin: "6px 0 8px", fontWeight: 500 }}>
              {formatRelative(log.createdAt)}
            </p>
            <div style={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* Member A */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "var(--radius-md)",
                    background: "#2C40FF22", border: "1px solid #2C40FF55",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "var(--color-primary)", flexShrink: 0,
                  }}>
                    {log.memberAName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {log.memberAName}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "var(--color-primary)",
                  background: "#2C40FF15", border: "1px solid #2C40FF33",
                  borderRadius: "var(--radius-md)", padding: "2px 8px", flexShrink: 0,
                }}>
                  {formatDate(log.dateA)} → {formatDate(log.dateB)}
                </span>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                <span style={{ fontSize: 10, color: "#4B5563", fontWeight: 500 }}>intercambiaron</span>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              </div>

              {/* Member B */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)", border: "1px solid #1f2333",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#9CA3AF", flexShrink: 0,
                  }}>
                    {log.memberBName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {log.memberBName}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "var(--color-primary)",
                  background: "#2C40FF15", border: "1px solid #2C40FF33",
                  borderRadius: "var(--radius-md)", padding: "2px 8px", flexShrink: 0,
                }}>
                  {formatDate(log.dateB)} → {formatDate(log.dateA)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
