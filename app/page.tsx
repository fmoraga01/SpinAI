"use client";

import { useState, useEffect } from "react";
import { AppData } from "@/lib/types";
import {
  loadData,
  addMember,
  toggleMember,
  removeMember,
  addAssignment,
  removeAssignment,
  getNextFridays,
} from "@/lib/storage";
import MembersPanel from "./components/MembersPanel";
import Roulette from "./components/Roulette";
import Schedule from "./components/Schedule";

export default function Home() {
  const [data, setData] = useState<AppData>({ members: [], assignments: [] });
  const [nextFridays, setNextFridays] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(loadData());
    setNextFridays(getNextFridays(8));
    setMounted(true);
  }, []);

  function refresh() {
    setData(loadData());
  }

  function handleAddMember(name: string) {
    addMember(name);
    refresh();
  }

  function handleToggleMember(id: string) {
    toggleMember(id);
    refresh();
  }

  function handleRemoveMember(id: string) {
    removeMember(id);
    refresh();
  }

  function handleAssign(memberId: string, date: string) {
    addAssignment(memberId, date);
    refresh();
  }

  function handleRemoveAssignment(id: string) {
    removeAssignment(id);
    refresh();
  }

  const nextFriday = nextFridays[0] ?? "";
  const alreadyAssigned = (date: string) =>
    data.assignments.some((a) => a.date === date);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#2C40FF] animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-[#2C40FF] animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-[#2C40FF] animate-bounce" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-white text-lg font-bold"
              style={{
                background: "var(--color-primary)",
                boxShadow: "var(--shadow-glow-sm)",
                borderRadius: "var(--radius-md)",
              }}
            >
              S
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                SpinAI
              </h1>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Asignador de reuniones · Viernes
              </p>
            </div>
          </div>
          <div
            className="text-xs px-3 py-1 font-medium"
            style={{
              color: "var(--color-primary)",
              border: "1px solid #2C40FF44",
              borderRadius: "var(--radius-md)",
              background: "#2C40FF11",
            }}
          >
            {data.members.filter((m) => m.active).length} activos
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <MembersPanel
              members={data.members}
              onAdd={handleAddMember}
              onToggle={handleToggleMember}
              onRemove={handleRemoveMember}
            />
          </div>

          <div className="lg:col-span-1">
            <Roulette
              members={data.members}
              nextFriday={nextFriday}
              alreadyAssigned={alreadyAssigned(nextFriday)}
              onAssign={handleAssign}
            />
          </div>

          <div className="lg:col-span-1">
            <Schedule
              assignments={data.assignments}
              onRemove={handleRemoveAssignment}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
