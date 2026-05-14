"use client";

import { useState } from "react";
import { TeamMember } from "@/lib/types";

interface Props {
  members: TeamMember[];
  onAdd: (name: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function MembersPanel({ members, onAdd, onToggle, onRemove }: Props) {
  const [name, setName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  }

  function handleRemove(id: string) {
    if (confirmRemove === id) {
      onRemove(id);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(id);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">👥</span> Equipo
      </h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del integrante..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Agregar
        </button>
      </form>

      {members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Aún no hay integrantes. ¡Agrega el primero!
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                m.active
                  ? "border-indigo-100 bg-indigo-50"
                  : "border-gray-100 bg-gray-50 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggle(m.id)}
                  title={m.active ? "Desactivar" : "Activar"}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    m.active
                      ? "bg-indigo-500 border-indigo-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {m.active && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm font-medium ${m.active ? "text-gray-800" : "text-gray-400"}`}>
                  {m.name}
                </span>
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  confirmRemove === m.id
                    ? "bg-red-100 text-red-600 font-semibold"
                    : "text-gray-400 hover:text-red-500"
                }`}
              >
                {confirmRemove === m.id ? "¿Seguro?" : "✕"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-gray-400">
        {members.filter((m) => m.active).length} activos · {members.length} total
      </p>
    </div>
  );
}
