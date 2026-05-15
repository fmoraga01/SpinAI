"use client";

import { useEffect, useState } from "react";
import { Assignment, Template } from "@/lib/types";
import { loadTemplate, saveTemplate } from "@/lib/storage";

interface Props {
  assignment: Assignment;
  onBack: () => void;
  onPresent: (template: Template) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

function ListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  function update(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function add() {
    onChange([...items, ""]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        {label}
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, minWidth: 18, textAlign: "right" }}>
              {i + 1}
            </span>
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              style={{
                flex: 1,
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--color-text-primary)",
                outline: "none",
                transition: "border-color 150ms",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
            <button
              onClick={() => remove(i)}
              style={{
                width: 28, height: 28, flexShrink: 0,
                background: "transparent", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)", color: "#374151",
                cursor: "pointer", fontSize: 12, display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "border-color 150ms, color 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F87171"; e.currentTarget.style.color = "#F87171"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "#374151"; }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={add}
          style={{
            width: "100%", padding: "8px 12px",
            background: "transparent", border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-md)", color: "#4B5563",
            cursor: "pointer", fontSize: 13, textAlign: "left",
            transition: "border-color 150ms, color 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "#4B5563"; }}
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}

export default function TemplateEditor({ assignment, onBack, onPresent }: Props) {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate(assignment.id).then((t) => {
      if (t) {
        setTitle(t.title);
        setAgenda(t.agenda.length > 0 ? t.agenda : [""]);
      }
      setLoading(false);
    });
  }, [assignment.id]);

  function buildTemplate(): Template {
    return {
      assignmentId: assignment.id,
      memberId: assignment.memberId,
      memberName: assignment.memberName,
      title,
      agenda: agenda.filter((a) => a.trim() !== ""),
      keyPoints: [],
      notes: "",
    };
  }

  async function handleSave() {
    setSaving(true);
    await saveTemplate(buildTemplate());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePresent() {
    // Must call requestFullscreen synchronously inside the click handler
    // before any await — browsers reject it outside a user gesture context
    document.documentElement.requestFullscreen?.().catch(() => {});
    await saveTemplate(buildTemplate());
    onPresent(buildTemplate());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div style={{ width: 20, height: 20, border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment badge */}
      <div
        style={{
          background: "#2C40FF0f", border: "1px solid #2C40FF22",
          borderRadius: "var(--radius-md)", padding: "10px 14px",
        }}
      >
        <p className="text-xs" style={{ color: "#4B5563" }}>Reunión asignada</p>
        <p className="text-sm font-semibold capitalize" style={{ color: "var(--color-primary)" }}>
          {formatDate(assignment.date)}
        </p>
      </div>

      {/* Título */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
          Título
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Revisión de sprint Q2"
          style={{
            width: "100%",
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            outline: "none",
            transition: "border-color 150ms",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Agenda */}
      <ListEditor
        label="Agenda"
        items={agenda}
        placeholder="Ej: Revisión de objetivos"
        onChange={setAgenda}
      />


      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: "10px", minWidth: 80,
            background: "transparent", color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          ← Volver
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: "10px", minWidth: 100,
            background: saved ? "#059669" : "var(--color-surface-elevated)",
            color: saved ? "#fff" : "var(--color-text-secondary)",
            border: "1px solid " + (saved ? "#059669" : "var(--color-border)"),
            borderRadius: "var(--radius-md)",
            fontSize: 13, fontWeight: 500, cursor: saving ? "wait" : "pointer",
            transition: "background 300ms, border-color 300ms, color 300ms",
          }}
        >
          {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={handlePresent}
          style={{
            flex: 2, padding: "10px", minWidth: 120,
            background: "var(--color-primary)", color: "#fff",
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius-md)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "var(--shadow-glow-sm)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          ▶ Presentar
        </button>
      </div>
    </div>
  );
}
