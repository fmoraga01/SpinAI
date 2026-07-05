"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "../components/Nav";
import ValuePicks from "./ValuePicks";
import Ranking from "./Ranking";
import Timeline from "./Timeline";
import Companies from "./Companies";
import Summary from "./Summary";
import Trends from "./Trends";
import Research from "./Research";
import CategoryGrid from "./CategoryGrid";
import { usePrefersReducedMotion } from "./useReducedMotion";
import { AiModel, bestVariantPerSlug, buildExecutiveSummary, formatIndex, formatPrice, loadAiModels } from "@/lib/stateOfAi";
import { AI_LANDSCAPE, AI_AGENTS } from "@/lib/aiLandscape";

function InfoTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 270,
            padding: "10px 12px",
            background: "#1A1D2E",
            border: "1px solid var(--color-border-bright)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 24px -8px rgba(0,0,0,0.6)",
            fontSize: 12.5,
            fontWeight: 400,
            lineHeight: "18px",
            color: "var(--color-text-secondary)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function CountUp({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || started.current) return;
      started.current = true;
      const t0 = performance.now();
      const duration = 800;
      function tick(now: number) {
        const progress = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(value * eased);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, reduced]);

  return <span ref={ref}>{(reduced ? value : display).toFixed(decimals)}</span>;
}

function relativeDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86400000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`;
}

function StatTile({
  value, label, index,
}: { value: string | number; label: string; index: number }) {
  return (
    <div
      className="soa-stat-tile"
      style={{
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "20px 22px",
        // @ts-expect-error custom property for CSS stagger delay
        "--soa-i": index,
      }}
    >
      <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: "0 0 10px", lineHeight: "18px" }}>
        {label}
      </p>
      <p style={{ fontSize: 42, fontWeight: 700, color: "#fff", margin: 0, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 6px" }}>
        {kicker}
      </p>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.015em" }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: "var(--color-tertiary)", margin: 0, maxWidth: 560, lineHeight: "21px" }}>
        {subtitle}
      </p>
    </div>
  );
}

export default function StateOfAiPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    loadAiModels()
      .then(setModels)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const deduped = useMemo(
    () =>
      bestVariantPerSlug(models)
        .filter((m) => m.intelligenceIndex !== null)
        .sort((a, b) => b.intelligenceIndex! - a.intelligenceIndex!),
    [models]
  );

  const stats = useMemo(() => {
    if (deduped.length === 0) return null;
    const leader = deduped[0];

    const top20 = deduped.slice(0, 20);
    const labCounts = new Map<string, number>();
    for (const m of top20) {
      if (m.creatorName) labCounts.set(m.creatorName, (labCounts.get(m.creatorName) ?? 0) + 1);
    }
    const [labLeader, labLeaderCount] = Array.from(labCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];

    const cutoff30 = now - 30 * 86400000;
    const releases30 = deduped.filter((m) => m.releaseDate && new Date(m.releaseDate).getTime() >= cutoff30).length;

    const bestValue = deduped
      .filter((m) => m.priceBlended1m !== null && m.intelligenceIndex! >= leader.intelligenceIndex! * 0.8)
      .sort((a, b) => a.priceBlended1m! - b.priceBlended1m!)[0] ?? null;

    const latest = deduped
      .filter((m) => m.releaseDate)
      .sort((a, b) => b.releaseDate!.localeCompare(a.releaseDate!))
      .slice(0, 4);

    const updatedAt = models.reduce((acc, m) => (m.fetchedAt > acc ? m.fetchedAt : acc), "");

    return { leader, labLeader, labLeaderCount, releases30, bestValue, latest, updatedAt };
  }, [deduped, models, now]);

  const summary = useMemo(() => buildExecutiveSummary(deduped, now), [deduped, now]);

  function toggleCompare(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]
    );
  }

  const tileStyle: React.CSSProperties = {
    background: "var(--color-surface-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "18px 20px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <div className="max-w-5xl mx-auto px-6" style={{ paddingTop: 56, paddingBottom: 80 }}>

        {/* Hero */}
        <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 10px" }}>
          State of AI · 2026
        </p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 12px", maxWidth: 640 }}>
          El estado de la inteligencia artificial, en datos
        </h1>
        <p style={{ fontSize: 15.5, color: "var(--color-text-secondary)", maxWidth: 560, lineHeight: "24px", margin: "0 0 40px" }}>
          Un observatorio del ecosistema de IA que se actualiza solo: qué modelos lideran,
          quién los construye y cuál conviene según tu caso.
        </p>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: 88, borderRadius: "var(--radius-md)", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }} />
            ))}
          </div>
        )}

        {!loading && (error || !stats) && (
          <div style={{ ...tileStyle, textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
              {error ? "No se pudieron cargar los datos" : "Aún no hay datos cargados"}
            </p>
            <p style={{ fontSize: 13, color: "#4B5563", margin: 0, lineHeight: "20px" }}>
              {error
                ? "Intenta de nuevo más tarde."
                : "Ejecuta el cron de actualización (/api/cron/refresh-state-of-ai) para poblar el snapshot de modelos."}
            </p>
          </div>
        )}

        {!loading && stats && (
          <>
            <style>{`
              @media (prefers-reduced-motion: no-preference) {
                .soa-stat-tile {
                  opacity: 0;
                  transform: translateY(8px);
                  animation: soa-reveal 380ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                  animation-delay: calc(var(--soa-i) * 90ms);
                }
                @keyframes soa-reveal { to { opacity: 1; transform: translateY(0); } }
              }
              .soa-stat-tile {
                transition: transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out;
              }
              .soa-stat-tile:hover {
                transform: translateY(-3px);
                border-color: rgba(91,108,255,0.35);
                box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5), 0 0 28px -10px rgba(91,108,255,0.18);
              }
              .soa-launch-row {
                border-left: 2px solid transparent;
                transition: border-color 150ms ease-out, transform 150ms ease-out;
              }
              .soa-launch-row:hover {
                border-left-color: #5B6CFF;
                transform: translateX(2px);
              }
            `}</style>

            {/* Hero figure: modelo líder */}
            <div
              style={{
                ...tileStyle,
                position: "relative",
                overflow: "hidden",
                padding: "44px 32px 36px",
                marginBottom: 16,
                boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 40px -24px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ position: "relative", zIndex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 14px" }}>
                  Modelo líder en inteligencia
                </p>
                <p style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 2px", letterSpacing: "-0.005em" }}>
                  {stats.leader.name}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "clamp(64px, 9vw, 120px)",
                      fontWeight: 800,
                      lineHeight: 1,
                      letterSpacing: "-0.03em",
                      color: "#fff",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <CountUp value={stats.leader.intelligenceIndex!} />
                  </span>
                  <InfoTooltip text="Puntaje de 0 a 100 de Artificial Analysis que combina 9 evaluaciones independientes en razonamiento, conocimiento general, matemáticas y programación en un solo número comparable.">

                    <span
                      tabIndex={0}
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
                        cursor: "help",
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
                          flexShrink: 0,
                        }}
                      />
                      Índice de inteligencia
                    </span>
                  </InfoTooltip>
                </div>
                <p style={{ fontSize: 13.5, color: "var(--color-tertiary)", margin: "12px 0 0" }}>
                  {stats.leader.creatorName} lidera el ranking de Artificial Analysis
                  {stats.leader.releaseDate ? `, con un modelo lanzado ${relativeDate(stats.leader.releaseDate).toLowerCase()}` : ""}.
                </p>
              </div>
            </div>

            {/* Stat tiles — mismo tamaño */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: 16 }}>
              <StatTile
                value={stats.releases30}
                label="Modelos lanzados en los últimos 30 días"
                index={0}
              />
              <StatTile
                value={deduped.length}
                label="Modelos evaluados en el snapshot actual"
                index={1}
              />
              <StatTile
                value={stats.labLeader}
                label={`Laboratorio con más modelos en el top 20 (${stats.labLeaderCount})`}
                index={2}
              />
            </div>

            {/* Últimos lanzamientos */}
            <div style={{ ...tileStyle, marginBottom: 56 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 12px" }}>
                Últimos lanzamientos
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {stats.latest.map((m, i) => (
                  <div
                    key={m.id}
                    className="soa-launch-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 0 10px 10px",
                      borderBottom: i < stats.latest.length - 1 ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "1px 0 0" }}>{m.creatorName}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--color-primary)", background: "#2C40FF15", border: "1px solid #2C40FF33", borderRadius: "var(--radius-md)", padding: "2px 8px", fontVariantNumeric: "tabular-nums" }}>
                        Índice {formatIndex(m.intelligenceIndex)}
                      </span>
                      <span style={{ fontSize: 11.5, color: "#4B5563", whiteSpace: "nowrap" }}>{relativeDate(m.releaseDate!)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen automático */}
            {summary && (
              <section style={{ marginBottom: 56 }}>
                <SectionHeading
                  kicker="Resumen"
                  title="¿Qué está pasando ahora mismo?"
                  subtitle="Una vista rápida de los acontecimientos más importantes del ecosistema, actualizada automáticamente con la información más reciente."
                />
                <Summary summary={summary} />
              </section>
            )}

            {/* Timeline */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="Historia"
                title="¿Qué ha pasado últimamente?"
                subtitle="Los lanzamientos más recientes evaluados por Artificial Analysis, en orden cronológico."
              />
              <Timeline models={deduped} />
            </section>

            {/* Ranking + comparador integrado */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="Ranking"
                title="¿Qué modelos lideran hoy?"
                subtitle="Los principales modelos ordenados por el índice de inteligencia de Artificial Analysis. Ordena por cualquier columna, filtra por laboratorio, y agrega hasta 4 a la comparación de abajo con el botón «+»."
              />
              <Ranking
                models={deduped}
                selectedIds={selectedIds}
                onToggleCompare={toggleCompare}
                onSelectPreset={setSelectedIds}
              />
            </section>

            {/* Eficiencia */}
            <section style={{ marginBottom: 40 }}>
              <SectionHeading
                kicker="Eficiencia"
                title="El trade-off que importa: inteligencia vs precio"
                subtitle={`La pregunta no es cuál es el mejor modelo, sino cuál da más por tu presupuesto. ${stats.bestValue ? `Hoy, ${stats.bestValue.name} ofrece ${formatIndex(stats.bestValue.intelligenceIndex)} puntos de inteligencia por ${formatPrice(stats.bestValue.priceBlended1m)}/1M tokens.` : ""}`}
              />
              <ValuePicks models={deduped} leader={stats.leader} />
            </section>

            {/* Tendencias */}
            <section style={{ marginBottom: 56 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 24px" }}>
                Tendencias
              </p>
              <Trends models={deduped} />
            </section>

            {/* Empresas */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="Empresas"
                title="¿Quién está liderando la carrera?"
                subtitle="Laboratorios ordenados por el índice de inteligencia promedio de sus modelos evaluados."
              />
              <Companies models={deduped} />
            </section>

            {/* Investigación */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="Investigación"
                title="¿Qué se está publicando ahora?"
                subtitle="Papers recientes de arXiv en inteligencia artificial (categoría cs.AI)."
              />
              <Research />
            </section>

            {/* AI Landscape */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="AI Landscape"
                title="El mapa del ecosistema"
                subtitle="Una selección curada de las piezas que componen el ecosistema de IA hoy — no exhaustiva, sí representativa."
              />
              <CategoryGrid categories={AI_LANDSCAPE} />
            </section>

            {/* Agentes de IA */}
            <section style={{ marginBottom: 40 }}>
              <SectionHeading
                kicker="Agentes de IA"
                title="La ola agéntica"
                subtitle="Frameworks, protocolos y plataformas que definen cómo se construyen agentes hoy."
              />
              <CategoryGrid categories={AI_AGENTS} />
            </section>

            {/* Atribución (requerida por los términos de Artificial Analysis) */}
            <p style={{ fontSize: 12, color: "#4B5563", margin: 0, borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              Datos:{" "}
              <a
                href="https://artificialanalysis.ai/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-tertiary)", textDecoration: "underline" }}
              >
                Artificial Analysis
              </a>
              {stats.updatedAt
                ? ` · Actualizado ${new Date(stats.updatedAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}`
                : ""}
              {" "}· Se actualiza automáticamente cada día.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
