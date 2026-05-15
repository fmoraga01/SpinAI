"use client";

import { useState, useEffect } from "react";
import { AppData } from "@/lib/types";
import { loadData, confirmBulkAssignment, BulkAssignmentPreview } from "@/lib/storage";
import Nav from "@/app/components/Nav";
import Roulette from "@/app/components/Roulette";

export default function RuletaPage() {
  const [data, setData] = useState<AppData>({ members: [], assignments: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(loadData());
    setMounted(true);
  }, []);

  function refresh() { setData(loadData()); }

  function handleAssignAll(previews: BulkAssignmentPreview[]) {
    confirmBulkAssignment(previews);
    refresh();
  }

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
            Gira para asignar a todos los integrantes en viernes consecutivos.
          </p>
        </div>
        <Roulette
          members={data.members}
          onAssignAll={handleAssignAll}
        />
      </main>
    </div>
  );
}
