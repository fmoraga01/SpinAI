"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/equipo", label: "Equipo" },
  { href: "/ruleta", label: "Ruleta" },
  { href: "/historial", label: "Historial" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header
      style={{
        background: "rgba(8,9,15,0.8)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6 flex items-center justify-between"
        style={{ height: 60 }}
      >
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
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            SpinAI
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
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
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <Link
          href="/ruleta"
          style={{
            padding: "8px 18px",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            background: "var(--color-primary)",
            textDecoration: "none",
            boxShadow: "var(--shadow-glow-sm)",
            transition: "opacity 150ms ease",
          }}
        >
          Girar ahora
        </Link>
      </div>
    </header>
  );
}
