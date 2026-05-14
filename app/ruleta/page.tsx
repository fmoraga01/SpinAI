"use client";

import { useState, useEffect } from "react";
import { AppData } from "@/lib/types";
import { loadData, addAssignment, getNextFridays } from "@/lib/storage";
import Nav from "@/app/components/Nav";
import Roulette from "@/app/components/Roulette";

export default function RuletaPage() {
  const [data, setData] = useState<AppData>({ members: [], assignments: [] });
  const [nextFridays, setNextFridays] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(loadData());
    setNextFridays(getNextFridays(8));
    setMounted(true);
  }, []);

  function refresh() { setData(loadData()); }

  const nextFriday = nextFridays[0] ?? "";
  const alreadyAssigned = data.assignments.some((a) => a.date === nextFriday);

  if (!mounted) return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <main className="max-w-md mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#4B5563" }}>
            Asignación
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.1 }}>
            Ruleta de Turno
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Gira y deja que el azar elija al líder del próximo viernes.
          </p>
        </div>
        <Roulette
          members={data.members}
          nextFriday={nextFriday}
          alreadyAssigned={alreadyAssigned}
          onAssign={(memberId, date) => { addAssignment(memberId, date); refresh(); }}
        />
      </main>
    </div>
  );
}
