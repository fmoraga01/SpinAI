"use client";

import { useMemo, useState } from "react";
import { WeeklyUpdate } from "@/lib/types";
import { mondayOf, WeeklyUpdateFormValues } from "@/lib/projects";
import WeeklyUpdateFields, { WeeklyUpdateValues } from "./WeeklyUpdateFields";

export function weekLabel(weekOf: string): string {
  return new Date(weekOf + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

interface Group {
  key: string;
  update: WeeklyUpdate;
}

interface Props {
  updates: WeeklyUpdate[];
  onEdit: (id: string, values: WeeklyUpdateFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const actionButtonStyle: React.CSSProperties = {
  height: 24,
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 500,
  padding: "0 8px",
  flexShrink: 0,
};

export default function ProjectTimeline({ updates, onEdit, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<WeeklyUpdateValues>({ date: "", note: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  const groups = useMemo<Group[]>(() => {
    return [...updates]
      .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
      .map((update) => ({ key: update.id, update }));
  }, [updates]);

  const isEditValid = editValues.date !== "" && editValues.note.trim() !== "";

  function startEdit(update: WeeklyUpdate) {
    setEditingId(update.id);
    setEditValues({ date: update.weekOf, note: update.note }); // R2: precarga con los valores actuales
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null); // R6: descarta lo editado, no llama a la API
  }

  async function confirmEdit() {
    if (!editingId || !isEditValid || editSubmitting) return;
    setEditSubmitting(true);
    try {
      await onEdit(editingId, {
        weekOf: mondayOf(editValues.date),
        note: editValues.note.trim(),
      });
      setEditingId(null);
      setEditError(null); // R5
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "No se pudo actualizar el avance"); // R7: mantiene la fila en edición con los valores
    } finally {
      setEditSubmitting(false);
    }
  }

  function startConfirmDelete(id: string) {
    setConfirmDeleteId(id);
    // R10: auto-revierte a los 3s si no se confirma, sin tocar la API.
    setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000);
  }

  async function handleDeleteClick(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id); // R11
      setConfirmDeleteId(null);
      setDeleteError((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      setConfirmDeleteId(null); // R13: revierte al estado inicial "Eliminar" con un error visible en la fila
      setDeleteError((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : "No se pudo eliminar el avance" }));
    } finally {
      setDeletingId(null);
    }
  }

  if (groups.length === 0) {
    return (
      <div
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
          padding: "32px 18px",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: 0 }}>
          Este proyecto todavía no tiene avances semanales registrados.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`
        .proyecto-timeline-row {
          transition: border-color 150ms ease-out, background 150ms ease-out;
        }
        .proyecto-timeline-row:hover {
          border-color: rgba(91,108,255,0.4);
          background: var(--color-surface-elevated-hover, var(--color-surface-elevated));
        }
        .proyecto-timeline-row-actions {
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms ease-out;
        }
        .proyecto-timeline-row:hover .proyecto-timeline-row-actions {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      {groups.map((group, gi) => {
        const isEditingRow = editingId === group.update.id;
        return (
          <div key={group.key} style={{ display: "flex", gap: 20 }}>
            {/* Riel de tiempo */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 12 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%", marginTop: 6,
                  background: "#5B6CFF22", border: "1px solid #5B6CFF66", flexShrink: 0,
                }}
              />
              {gi < groups.length - 1 && (
                <div style={{ width: 1, flex: 1, background: "var(--color-border)", margin: "6px 0" }} />
              )}
            </div>

            {/* Contenido de la semana */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: gi < groups.length - 1 ? 20 : 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-tertiary)", margin: "0 0 8px" }}>
                Semana del {weekLabel(group.update.weekOf)}
              </p>
              <div
                className="proyecto-timeline-row"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                }}
              >
                {isEditingRow ? (
                  <>
                    <WeeklyUpdateFields
                      values={editValues}
                      onChange={(patch) => setEditValues((v) => ({ ...v, ...patch }))}
                      noteRows={11}
                    />
                    {editError && <p style={{ fontSize: 12, color: "#F87171", margin: 0 }}>{editError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{
                          flex: 1,
                          background: "transparent",
                          color: "var(--color-text-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          padding: "9px 16px",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={confirmEdit}
                        disabled={!isEditValid || editSubmitting}
                        style={{
                          flex: 1,
                          background: isEditValid && !editSubmitting ? "var(--color-primary)" : "#1a2035",
                          color: "var(--color-text-primary)",
                          border: "1px solid " + (isEditValid && !editSubmitting ? "var(--color-primary)" : "var(--color-border)"),
                          borderRadius: "var(--radius-md)",
                          padding: "9px 16px",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: isEditValid && !editSubmitting ? "pointer" : "not-allowed",
                          boxShadow: isEditValid && !editSubmitting ? "var(--shadow-glow-sm)" : "none",
                        }}
                      >
                        {editSubmitting ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: "19px", width: "100%", whiteSpace: "pre-wrap" }}>
                      {group.update.note}
                    </p>
                    <div
                      className="proyecto-timeline-row-actions"
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        display: "flex",
                        gap: 6,
                        padding: "4px 4px 4px 24px",
                        borderRadius: "var(--radius-md)",
                        background: "linear-gradient(90deg, transparent, var(--color-surface-elevated) 22px)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => startEdit(group.update)}
                        disabled={editingId !== null}
                        style={{
                          ...actionButtonStyle,
                          opacity: editingId !== null ? 0.5 : 1,
                          cursor: editingId !== null ? "not-allowed" : "pointer",
                        }}
                      >
                        Editar
                      </button>
                      {confirmDeleteId === group.update.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(group.update.id)}
                          disabled={deletingId === group.update.id}
                          style={{ ...actionButtonStyle, color: "#F87171", borderColor: "#F87171", background: "#F8717122" }}
                        >
                          {deletingId === group.update.id ? "Eliminando…" : "¿Seguro?"}
                        </button>
                      ) : (
                        <button type="button" onClick={() => startConfirmDelete(group.update.id)} style={actionButtonStyle}>
                          Eliminar
                        </button>
                      )}
                    </div>
                    {deleteError[group.update.id] && (
                      <p style={{ fontSize: 12, color: "#F87171", margin: 0 }}>{deleteError[group.update.id]}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
