import Link from "next/link";
import Nav from "./components/Nav";
import FeatureCards from "./components/FeatureCards";

function GridDecoration() {
  const cols = 10;
  const rows = 12;
  const heights = [3, 6, 9, 5, 11, 4, 8, 7, 10, 6, 5, 9, 4, 11, 7, 3, 8, 6, 10, 5];

  return (
    <div
      className="absolute right-0 top-0 h-full w-1/2 pointer-events-none overflow-hidden"
      style={{ maskImage: "linear-gradient(to left, rgba(0,0,0,0.6), transparent)" }}
    >
      <div
        className="absolute right-0 top-0 h-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 36px)`,
          gap: 4,
          alignItems: "end",
          paddingBottom: 0,
        }}
      >
        {Array.from({ length: cols }).map((_, col) =>
          Array.from({ length: rows }).map((_, row) => {
            const h = heights[(col * rows + row) % heights.length];
            const opacity = 0.08 + (h / 12) * 0.45;
            const isBlue = h > 7;
            return (
              <div
                key={`${col}-${row}`}
                style={{
                  width: 32,
                  height: 28,
                  borderRadius: 3,
                  background: isBlue ? "#2C40FF" : "#1a2040",
                  opacity,
                  border: isBlue ? "1px solid #2C40FF55" : "1px solid #1f2333",
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "calc(100vh - 60px)" }}
      >
        <GridDecoration />

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
