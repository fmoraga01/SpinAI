import Nav from "./components/Nav";
import AnimatedGrid from "./components/AnimatedGrid";
import HomeCTAs from "./components/HomeCTAs";
import HeroChip from "./components/HeroChip";

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
            <HeroChip />
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
            El destino habló.{" "}
            <span style={{ color: "var(--color-primary)" }}>Te toca a ti.</span>
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
