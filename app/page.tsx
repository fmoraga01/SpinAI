import Link from "next/link";
import Nav from "./components/Nav";
import FeatureCards from "./components/FeatureCards";
import AnimatedGrid from "./components/AnimatedGrid";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "calc(100vh - 60px)" }}
      >
        <AnimatedGrid />

        <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col justify-center" style={{ minHeight: "calc(100vh - 60px)", paddingTop: 80, paddingBottom: 80 }}>

          {/* Tag */}
          <div className="mb-6">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-primary)",
                background: "#2C40FF15",
                border: "1px solid #2C40FF33",
                borderRadius: "var(--radius-md)",
                padding: "4px 12px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  boxShadow: "var(--shadow-glow-sm)",
                  display: "inline-block",
                }}
              />
              Reuniones de equipo · Viernes
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(48px, 7vw, 88px)",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "#fff",
              maxWidth: 700,
              marginBottom: 28,
            }}
          >
            Decide quién lidera,{" "}
            <span style={{ color: "var(--color-primary)" }}>sin debates.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 18,
              fontWeight: 500,
              lineHeight: "28px",
              color: "var(--color-text-secondary)",
              maxWidth: 480,
              marginBottom: 48,
            }}
          >
            SpinAI asigna aleatoriamente quién conduce la reunión de equipo cada
            viernes. Justo, simple y sin discusiones.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/ruleta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                fontWeight: 500,
                color: "#fff",
                background: "var(--color-primary)",
                textDecoration: "none",
                boxShadow: "var(--shadow-glow)",
                transition: "opacity 150ms ease",
                border: "1px solid var(--color-primary)",
              }}
            >
              Girar la ruleta
              <span style={{ fontSize: 18 }}>↗</span>
            </Link>
            <Link
              href="/equipo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                border: "1px solid var(--color-border-bright)",
                background: "transparent",
                transition: "border-color 150ms ease",
              }}
            >
              Gestionar equipo
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
