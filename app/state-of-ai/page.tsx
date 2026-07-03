"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Nav from "../components/Nav";
import Scatter from "./Scatter";
import Ranking from "./Ranking";
import Comparator from "./Comparator";
import { AiModel, bestVariantPerSlug, formatIndex, formatPrice, loadAiModels } from "@/lib/stateOfAi";

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true // en SSR, sin animación
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

  function toggleCompare(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]
    );
  }

  const selectedModels = useMemo(
    () => selectedIds.map((id) => deduped.find((m) => m.id === id)).filter((m): m is AiModel => !!m),
    [selectedIds, deduped]
  );

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
            {/* Hero figure: modelo líder */}
            <div
              style={{
                ...tileStyle,
                padding: "28px 28px",
                marginBottom: 12,
                background: "linear-gradient(135deg, #141724 0%, #10131d 100%)",
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 10px" }}>
                Modelo líder en inteligencia
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
                  {stats.leader.name}
                </span>
                <span style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, color: "#5B6CFF", letterSpacing: "-0.01em" }}>
                  <CountUp value={stats.leader.intelligenceIndex!} />
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--color-tertiary)", margin: "8px 0 0" }}>
                {stats.leader.creatorName} lidera el índice de inteligencia de Artificial Analysis
                {stats.leader.releaseDate ? `, con un modelo lanzado ${relativeDate(stats.leader.releaseDate).toLowerCase()}` : ""}.
              </p>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: 12 }}>
              <div style={tileStyle}>
                <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", margin: 0, fontVariantNumeric: "tabular-nums" }}>{deduped.length}</p>
                <p style={{ fontSize: 12.5, color: "var(--color-tertiary)", margin: "4px 0 0", lineHeight: "18px" }}>
                  modelos evaluados en el snapshot actual
                </p>
              </div>
              <div style={tileStyle}>
                <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", margin: 0 }}>{stats.labLeader}</p>
                <p style={{ fontSize: 12.5, color: "var(--color-tertiary)", margin: "4px 0 0", lineHeight: "18px" }}>
                  laboratorio con más modelos en el top 20 ({stats.labLeaderCount})
                </p>
              </div>
              <div style={tileStyle}>
                <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", margin: 0, fontVariantNumeric: "tabular-nums" }}>{stats.releases30}</p>
                <p style={{ fontSize: 12.5, color: "var(--color-tertiary)", margin: "4px 0 0", lineHeight: "18px" }}>
                  modelos lanzados en los últimos 30 días
                </p>
              </div>
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 0",
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

            {/* Ranking */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="Ranking"
                title="¿Qué modelos lideran hoy?"
                subtitle="Los principales modelos ordenados por el índice de inteligencia de Artificial Analysis. Ordena por cualquier columna o filtra por laboratorio."
              />
              <Ranking models={deduped} selectedIds={selectedIds} onToggleCompare={toggleCompare} />
            </section>

            {/* Scatter */}
            <section style={{ marginBottom: 56 }}>
              <SectionHeading
                kicker="Eficiencia"
                title="El trade-off que importa: inteligencia vs precio"
                subtitle={`La pregunta no es cuál es el mejor modelo, sino cuál da más por tu presupuesto. ${stats.bestValue ? `Hoy, ${stats.bestValue.name} ofrece ${formatIndex(stats.bestValue.intelligenceIndex)} puntos de inteligencia por ${formatPrice(stats.bestValue.priceBlended1m)}/1M tokens.` : ""}`}
              />
              <Scatter models={deduped} />
            </section>

            {/* Comparador */}
            <section style={{ marginBottom: 40 }}>
              <SectionHeading
                kicker="Comparador"
                title="Compara los modelos que te interesan"
                subtitle="Hasta 4 modelos lado a lado: inteligencia, precio, velocidad y latencia, con el mejor valor de cada fila destacado."
              />
              <Comparator
                selected={selectedModels}
                allModels={deduped}
                onToggle={toggleCompare}
                onSelectPreset={setSelectedIds}
              />
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
