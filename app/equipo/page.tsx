"use client";

import { useState, useEffect } from "react";
import { AppData } from "@/lib/types";
import { loadData, addMember, toggleMember, removeMember } from "@/lib/storage";
import Nav from "@/app/components/Nav";
import MembersPanel from "@/app/components/MembersPanel";

export default function EquipoPage() {
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
            Gestión
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.1 }}>
            Equipo
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Agrega integrantes y elige quién participa en la ruleta.
          </p>
        </div>
        <MembersPanel
          members={data.members}
          onAdd={(name) => { addMember(name); refresh(); }}
          onToggle={(id) => { toggleMember(id); refresh(); }}
          onRemove={(id) => { removeMember(id); refresh(); }}
        />
      </main>
    </div>
  );
}
