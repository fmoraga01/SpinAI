"use client";

import { useState, useEffect } from "react";
import { AppData } from "@/lib/types";
import { loadData, removeAssignment } from "@/lib/storage";
import Nav from "@/app/components/Nav";
import Schedule from "@/app/components/Schedule";

export default function HistorialPage() {
  const [data, setData] = useState<AppData>({ members: [], assignments: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(loadData());
    setMounted(true);
  }, []);

  function refresh() { setData(loadData()); }

  if (!mounted) return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#4B5563" }}>
            Registro
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.1 }}>
            Historial de Turnos
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Próximas asignaciones y registro de reuniones anteriores.
          </p>
        </div>
        <Schedule
          assignments={data.assignments}
          onRemove={(id) => { removeAssignment(id); refresh(); }}
        />
      </main>
    </div>
  );
}
