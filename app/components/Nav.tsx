"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDrawer, DrawerView } from "./DrawerContext";
import { loadData } from "@/lib/storage";

function hasUpcomingAssignments(assignments: { date: string }[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return assignments.some((a) => new Date(a.date + "T12:00:00") >= today);
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: "6px 14px",
        borderRadius: "var(--radius-md)",
        fontSize: 14,
        fontWeight: 500,
        color: active ? "#fff" : "var(--color-tertiary)",
        background: active ? "#2C40FF22" : "transparent",
        border: "1px solid " + (active ? "#2C40FF55" : "transparent"),
        textDecoration: "none",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--color-primary)";
          e.currentTarget.style.background = "#2C40FF1a";
          e.currentTarget.style.borderColor = "#2C40FF55";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--color-tertiary)";
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "transparent";
        }
      }}
    >
      {children}
    </Link>
  );
}

export default function Nav() {
  const { drawer, openDrawer } = useDrawer();
  const pathname = usePathname();
  const homeActive = pathname === "/";
  const noticiasActive = pathname?.startsWith("/noticias") ?? false;
  const proyectosActive = pathname?.startsWith("/proyectos") ?? false;
  const stateOfAiActive = pathname?.startsWith("/state-of-ai") ?? false;
  const [rouletteVisible, setRouletteVisible] = useState<boolean | null>(null);

  useEffect(() => {
    loadData().then(({ assignments }) => {
      setRouletteVisible(!hasUpcomingAssignments(assignments));
    });
  }, [drawer]);

  const visibleLinks: { view: DrawerView; label: string }[] = [
    { view: "historial", label: "Calendario de asignados" },
    { view: "equipo", label: "Equipo" },
    ...(rouletteVisible === true ? [{ view: "ruleta" as DrawerView, label: "Ruleta" }] : []),
    { view: "log", label: "Log de cambios" },
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
          <NavLink href="/" active={homeActive}>Home</NavLink>
          <NavLink href="/proyectos" active={proyectosActive}>Status de Proyectos</NavLink>
          <NavLink href="/noticias" active={noticiasActive}>Noticias de IA</NavLink>
          <NavLink href="/state-of-ai" active={stateOfAiActive}>State of AI</NavLink>
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
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--color-primary)";
                    e.currentTarget.style.background = "#2C40FF1a";
                    e.currentTarget.style.borderColor = "#2C40FF55";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--color-tertiary)";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }
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
