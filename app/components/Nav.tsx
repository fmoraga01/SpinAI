"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDrawer, DrawerView } from "./DrawerContext";
import { loadData } from "@/lib/storage";

function hasUpcomingAssignments(assignments: { date: string }[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return assignments.some((a) => new Date(a.date + "T12:00:00") >= today);
}

export default function Nav() {
  const { drawer, openDrawer } = useDrawer();
  const [rouletteVisible, setRouletteVisible] = useState(true);

  useEffect(() => {
    loadData().then(({ assignments }) => {
      setRouletteVisible(!hasUpcomingAssignments(assignments));
    });
  }, [drawer]);

  const visibleLinks: { view: DrawerView; label: string }[] = [
    { view: "equipo", label: "Equipo" },
    ...(rouletteVisible ? [{ view: "ruleta" as DrawerView, label: "Ruleta" }] : []),
    { view: "historial", label: "Historial" },
  ];

  return (
    <header
      style={{
        background: "rgba(8,9,15,0.8)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ height: 60 }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              boxShadow: "var(--shadow-glow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
              color: "#fff",
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
            SpinAI
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-tertiary)",
              background: "transparent",
              border: "1px solid transparent",
              textDecoration: "none",
              transition: "all 150ms ease",
            }}
          >
            Inicio
          </Link>

          {visibleLinks.map(({ view, label }) => {
            const active = drawer === view;
            return (
              <button
                key={view}
                onClick={() => openDrawer(active ? null : view)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-md)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "#fff" : "var(--color-tertiary)",
                  background: active ? "#2C40FF22" : "transparent",
                  border: "1px solid " + (active ? "#2C40FF55" : "transparent"),
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
