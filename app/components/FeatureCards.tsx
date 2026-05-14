"use client";

import Link from "next/link";

const features = [
  {
    href: "/equipo",
    icon: "⬡",
    title: "Equipo",
    description:
      "Agrega a todos los integrantes y activa o desactiva quién participa en la ruleta cada semana.",
    cta: "Gestionar equipo →",
  },
  {
    href: "/ruleta",
    icon: "◎",
    title: "Ruleta",
    description:
      "Gira la ruleta y deja que el azar decida quién lidera la próxima reunión del viernes.",
    cta: "Girar ahora →",
  },
  {
    href: "/historial",
    icon: "▤",
    title: "Historial",
    description:
      "Consulta quién tiene el turno los próximos viernes y revisa los turnos anteriores.",
    cta: "Ver historial →",
  },
];

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {features.map((f) => (
        <Link key={f.href} href={f.href} style={{ textDecoration: "none" }}>
          <div
            style={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "28px",
              height: "100%",
              transition: "border-color 200ms ease, box-shadow 200ms ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#2C40FF44";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-glow)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: 22, color: "var(--color-primary)", marginBottom: 16 }}>
              {f.icon}
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#fff",
                marginBottom: 10,
                letterSpacing: "-0.01em",
              }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                lineHeight: "22px",
                color: "var(--color-tertiary)",
                marginBottom: 20,
              }}
            >
              {f.description}
            </p>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-primary)" }}>
              {f.cta}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
