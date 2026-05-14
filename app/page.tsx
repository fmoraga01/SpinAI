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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-indigo-400 text-lg font-medium animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-3xl">🌀</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SpinAI</h1>
            <p className="text-xs text-gray-500">Asignador de reuniones de equipo · Viernes</p>
          </div>
        </div>
      </header>

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
