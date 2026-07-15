"use client";

import { useEffect, useState } from "react";
import { Assignment, Template, SlideTheme, SlideFont, SlideSize, TeamMember, AgendaTimingItem } from "@/lib/types";
import { THEMES, THEME_ORDER } from "@/lib/themes";
import { FONTS, FONT_ORDER } from "@/lib/fonts";
import { SIZES, SIZE_ORDER } from "@/lib/sizes";
import { loadTemplate, saveTemplate } from "@/lib/storage";

interface Props {
  assignment: Assignment;
  members: TeamMember[];
  onBack: () => void;
  onPresent: (template: Template) => void;
}

interface AgendaDraft {
  text: string;
  minutes: number;
  memberId: string | null;
  memberName: string | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

function distributeEvenly(count: number, totalMinutes: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalMinutes / count);
  const remainder = totalMinutes - base * count;
  return Array.from({ length: count }, (_, i) => Math.max(1, base + (i < remainder ? 1 : 0)));
}

function MinutesField({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  const [draft, setDraft] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(String(value));
  }

  function commit() {
    const parsed = parseInt(draft, 10);
    const clamped = Number.isFinite(parsed) ? Math.max(min, parsed) : min;
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  }

  const stepBtnStyle: React.CSSProperties = {
    width: 22, height: 26, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "none", color: "#6B7280",
    fontSize: 13, fontWeight: 600, cursor: "pointer", lineHeight: 1,
    transition: "color 150ms",
  };

  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center",
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={stepBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setDraft(e.target.value); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{
          width: 30, textAlign: "center", background: "transparent", border: "none",
          color: "var(--color-text-primary)", fontSize: 12, outline: "none", padding: "6px 0",
        }}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={stepBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
      >
        +
      </button>
    </div>
  );
}

function AgendaEditor({
  items,
  timingEnabled,
  members,
  onChange,
}: {
  items: AgendaDraft[];
  timingEnabled: boolean;
  members: TeamMember[];
  onChange: (items: AgendaDraft[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const activeMembers = members.filter((m) => m.active);

  function update(index: number, patch: Partial<AgendaDraft>) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function add() {
    onChange([...items, { text: "", minutes: 5, memberId: null, memberName: null }]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function onDragStart(i: number) {
    setDragIndex(i);
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOver(i);
  }

  function onDrop(i: number) {
    const from = dragIndex;
    if (from === null || from === i) { setDragOver(null); return; }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    onChange(next);
    setDragIndex(null);
    setDragOver(null);
  }

  function onDragEnd() {
    setDragIndex(null);
    setDragOver(null);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        Agenda
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              borderRadius: "var(--radius-md)",
              outline: dragOver === i ? "2px solid var(--color-primary)" : "2px solid transparent",
              transition: "outline 100ms",
              opacity: dragIndex === i ? 0.4 : 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(i)}
              onDragEnd={onDragEnd}
              className="flex items-center gap-2"
            >
              <span
                style={{
                  cursor: "grab", color: "#9CA3AF", fontSize: 12,
                  flexShrink: 0, userSelect: "none", paddingLeft: 2,
                }}
                title="Arrastrar para reordenar"
              >
                ⠿
              </span>
              <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, minWidth: 18, textAlign: "right" }}>
                {i + 1}
              </span>
              <input
                value={item.text}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="Ej: Revisión de objetivos"
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
            {timingEnabled && (
              <div className="flex items-center gap-2" style={{ paddingLeft: 46 }}>
                <MinutesField value={item.minutes} onChange={(n) => update(i, { minutes: n })} />
                <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0 }}>min ·</span>
                <select
                  value={item.memberId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const m = activeMembers.find((mm) => mm.id === id);
                    update(i, { memberId: id, memberName: m ? m.name : null });
                  }}
                  style={{
                    flex: 1,
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "6px 8px",
                    fontSize: 12,
                    color: "var(--color-text-primary)",
                    outline: "none",
                  }}
                >
                  <option value="">Sin responsable</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
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

function TimingSection({
  enabled,
  onToggle,
  totalMinutes,
  onTotalMinutesChange,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  totalMinutes: number;
  onTotalMinutesChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        Tiempo de reunión
      </p>
      <div
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "14px 16px",
        }}
      >
        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>
            Opcional. Define el tiempo total y repártelo entre los ítems de la agenda.
          </p>
          <button
            role="switch"
            aria-checked={enabled}
            aria-label="Activar tiempo de reunión"
            onClick={() => onToggle(!enabled)}
            style={{
              width: 38, height: 22, borderRadius: 11, flexShrink: 0,
              border: "1px solid var(--color-border)",
              background: enabled ? "var(--color-primary)" : "var(--color-surface)",
              position: "relative", cursor: "pointer", padding: 0,
              transition: "background 150ms",
            }}
          >
            <span
              style={{
                position: "absolute", top: 1, left: enabled ? 17 : 1,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left 150ms",
              }}
            />
          </button>
        </div>
        {enabled && (
          <div className="flex items-center gap-3" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 6 }}>
              Total
              <MinutesField value={totalMinutes} onChange={onTotalMinutesChange} />
              min
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemePicker({ value, onChange }: { value: SlideTheme; onChange: (t: SlideTheme) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        Plantillas
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

function SizePicker({ value, onChange }: { value: SlideSize; onChange: (s: SlideSize) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4B5563" }}>
        Tamaño de fuente
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {SIZE_ORDER.map((key) => {
          const s = SIZES[key];
          const selected = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                padding: "10px 8px",
                background: selected ? "#2C40FF12" : "var(--color-surface-elevated)",
                border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer", textAlign: "center",
                transition: "border-color 150ms, background 150ms",
                boxShadow: selected ? "0 0 0 1px var(--color-primary)" : "none",
              }}
            >
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: selected ? "var(--color-primary)" : "var(--color-text-primary)",
                lineHeight: 1, marginBottom: 4,
                transition: "color 150ms",
              }}>
                {s.key}
              </div>
              <div style={{
                fontSize: 10, fontWeight: selected ? 600 : 500,
                color: selected ? "var(--color-primary)" : "#6B7280",
                transition: "color 150ms",
              }}>
                {s.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TemplateEditor({ assignment, members, onBack, onPresent }: Props) {
  const [title, setTitle] = useState("");
  const [agendaItems, setAgendaItems] = useState<AgendaDraft[]>([{ text: "", minutes: 5, memberId: null, memberName: null }]);
  const [timingEnabled, setTimingEnabled] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(15);
  const [theme, setTheme] = useState<SlideTheme>("default");
  const [font, setFont] = useState<SlideFont>("sans");
  const [size, setSize] = useState<SlideSize>("md");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    loadTemplate(assignment.id).then((t) => {
      if (t) {
        setTitle(t.title);
        const texts = t.agenda.length > 0 ? t.agenda : [""];
        const timingItems: AgendaTimingItem[] = t.timing?.items ?? [];
        setAgendaItems(texts.map((text, i) => ({
          text,
          minutes: timingItems[i]?.minutes ?? 5,
          memberId: timingItems[i]?.memberId ?? null,
          memberName: timingItems[i]?.memberName ?? null,
        })));
        setTimingEnabled(t.timing?.enabled ?? false);
        setTotalMinutes(t.timing?.totalMinutes ?? Math.max(texts.length * 5, 5));
        setTheme(t.theme ?? "default");
        setFont(t.font ?? "sans");
        setSize(t.size ?? "md");
      }
      setLoading(false);
    });
  }, [assignment.id]);

  function nonEmptyMinutesSum(items: AgendaDraft[]): number {
    return items.filter((a) => a.text.trim() !== "").reduce((sum, a) => sum + a.minutes, 0);
  }

  function distribute(total: number) {
    setAgendaItems((prev) => {
      const minutesList = distributeEvenly(prev.length, total);
      return prev.map((item, i) => ({ ...item, minutes: minutesList[i] ?? item.minutes }));
    });
  }

  function handleToggleTiming(next: boolean) {
    setTimingEnabled(next);
    if (next) {
      const nonEmptyCount = Math.max(1, agendaItems.filter((a) => a.text.trim() !== "").length);
      const suggestedTotal = totalMinutes > 0 ? totalMinutes : nonEmptyCount * 5;
      setTotalMinutes(suggestedTotal);
      distribute(suggestedTotal);
    }
  }

  function handleTotalMinutesChange(next: number) {
    setTotalMinutes(next);
    distribute(next);
  }

  function handleAgendaItemsChange(next: AgendaDraft[]) {
    if (!timingEnabled) {
      setAgendaItems(next);
      return;
    }
    if (next.length !== agendaItems.length) {
      // Ítem agregado o quitado: redistribuye desde el total vigente.
      const minutesList = distributeEvenly(next.length, totalMinutes);
      setAgendaItems(next.map((item, i) => ({ ...item, minutes: minutesList[i] ?? item.minutes })));
      return;
    }
    // Edición manual del tiempo de un ítem puntual: el total pasa a ser la nueva suma.
    const nextSum = nonEmptyMinutesSum(next);
    if (nextSum !== nonEmptyMinutesSum(agendaItems)) {
      setTotalMinutes(nextSum);
    }
    setAgendaItems(next);
  }

  function buildTemplate(): Template {
    const nonEmpty = agendaItems.filter((a) => a.text.trim() !== "");
    return {
      assignmentId: assignment.id,
      memberId: assignment.memberId ?? "",
      memberName: assignment.memberName ?? "",
      title,
      agenda: nonEmpty.map((a) => a.text),
      keyPoints: [],
      notes: "",
      theme,
      font,
      size,
      timing: timingEnabled
        ? {
            enabled: true,
            totalMinutes,
            items: nonEmpty.map((a): AgendaTimingItem => ({ minutes: a.minutes, memberId: a.memberId, memberName: a.memberName })),
          }
        : null,
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

      {/* Tiempo de reunión */}
      <TimingSection
        enabled={timingEnabled}
        onToggle={handleToggleTiming}
        totalMinutes={totalMinutes}
        onTotalMinutesChange={handleTotalMinutesChange}
      />

      {/* Agenda */}
      <AgendaEditor
        items={agendaItems}
        timingEnabled={timingEnabled}
        members={members}
        onChange={handleAgendaItemsChange}
      />

      {/* Theme picker */}
      <ThemePicker value={theme} onChange={setTheme} />

      {/* Font picker */}
      <FontPicker value={font} onChange={setFont} />

      {/* Size picker */}
      <SizePicker value={size} onChange={setSize} />

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
