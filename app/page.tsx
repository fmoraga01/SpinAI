import Nav from "./components/Nav";
import AnimatedGrid from "./components/AnimatedGrid";
import HomeCTAs from "./components/HomeCTAs";

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
          <HomeCTAs />
        </div>
      </section>

    </div>
  );
}
