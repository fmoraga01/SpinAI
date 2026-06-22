"use client";

import { useEffect, useState } from "react";
import { Assignment, Template, SlideTheme, SlideFont } from "@/lib/types";
import { THEMES, THEME_ORDER } from "@/lib/themes";
import { FONTS, FONT_ORDER } from "@/lib/fonts";
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
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
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

function ThemePicker({ value, onChange }: { value: SlideTheme; onChange: (t: SlideTheme) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        Diseño
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {THEME_ORDER.map((key) => {
          const th = THEMES[key];
          const selected = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                background: "transparent",
                border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                transition: "border-color 150ms",
                boxShadow: selected ? "0 0 0 1px var(--color-primary)" : "none",
              }}
            >
              {/* Mini slide preview */}
              <div style={{ background: th.bg, padding: "10px 10px 6px" }}>
                {/* Accent bar simulating title */}
                <div style={{ height: 3, width: "60%", background: th.accent, borderRadius: 2, marginBottom: 6, opacity: 0.9 }} />
                {/* Content lines */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ height: 2, width: "80%", background: th.textColor, borderRadius: 1, opacity: 0.25 }} />
                  <div style={{ height: 2, width: "65%", background: th.textColor, borderRadius: 1, opacity: 0.18 }} />
                  <div style={{ height: 2, width: "72%", background: th.textColor, borderRadius: 1, opacity: 0.18 }} />
                </div>
              </div>
              {/* Label */}
              <div style={{
                padding: "5px 8px",
                background: selected ? "#2C40FF12" : "var(--color-surface-elevated)",
                borderTop: `1px solid ${selected ? "var(--color-primary)33" : "var(--color-border)"}`,
                fontSize: 10,
                fontWeight: selected ? 600 : 500,
                color: selected ? "var(--color-primary)" : "#6B7280",
                textAlign: "center",
                transition: "background 150ms, color 150ms",
              }}>
                {th.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FontPicker({ value, onChange }: { value: SlideFont; onChange: (f: SlideFont) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        Tipografía
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {FONT_ORDER.map((key) => {
          const f = FONTS[key];
          const selected = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                background: selected ? "#2C40FF12" : "var(--color-surface-elevated)",
                border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "10px 8px 8px",
                cursor: "pointer",
                textAlign: "center",
                transition: "border-color 150ms, background 150ms",
                boxShadow: selected ? "0 0 0 1px var(--color-primary)" : "none",
              }}
            >
              <div style={{
                fontFamily: f.titleFamily,
                fontWeight: f.titleWeight,
                fontSize: 18,
                letterSpacing: f.titleTracking,
                color: selected ? "var(--color-primary)" : "var(--color-text-primary)",
                marginBottom: 4,
                transition: "color 150ms",
              }}>
                {f.sample}
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: selected ? 600 : 500,
                color: selected ? "var(--color-primary)" : "#6B7280",
                transition: "color 150ms",
              }}>
                {f.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TemplateEditor({ assignment, onBack, onPresent }: Props) {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState<string[]>([""]);
  const [theme, setTheme] = useState<SlideTheme>("default");
  const [font, setFont] = useState<SlideFont>("sans");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    loadTemplate(assignment.id).then((t) => {
      if (t) {
        setTitle(t.title);
        setAgenda(t.agenda.length > 0 ? t.agenda : [""]);
        setTheme(t.theme ?? "default");
        setFont(t.font ?? "sans");
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
      theme,
      font,
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
    setPresenting(true);
    // Must call requestFullscreen synchronously inside the click handler
    // before any await — browsers reject it outside a user gesture context
    document.documentElement.requestFullscreen?.().catch(() => {});
    await saveTemplate(buildTemplate());
    onPresent(buildTemplate());
  }

  if (loading || presenting) {
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

      {/* Theme picker */}
      <ThemePicker value={theme} onChange={setTheme} />

      {/* Font picker */}
      <FontPicker value={font} onChange={setFont} />

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
