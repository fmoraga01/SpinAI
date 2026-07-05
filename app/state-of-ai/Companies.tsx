"use client";

import { useMemo } from "react";
import { AiModel, formatIndex } from "@/lib/stateOfAi";
import CompanyLogo from "./CompanyLogo";

interface CompanyStats {
  name: string;
  slug: string | null;
  modelCount: number;
  topModel: AiModel;
  latestRelease: string | null;
}

export default function Companies({ models }: { models: AiModel[] }) {
  const companies = useMemo<CompanyStats[]>(() => {
    const byCreator = new Map<string, AiModel[]>();
    for (const m of models) {
      if (!m.creatorName) continue;
      if (!byCreator.has(m.creatorName)) byCreator.set(m.creatorName, []);
      byCreator.get(m.creatorName)!.push(m);
    }

    return Array.from(byCreator.entries())
      .map(([name, list]) => {
        const withIndex = list.filter((m) => m.intelligenceIndex !== null);
        const topModel = [...withIndex].sort((a, b) => b.intelligenceIndex! - a.intelligenceIndex!)[0] ?? list[0];
        const releases = list.filter((m) => m.releaseDate).map((m) => m.releaseDate!);
        const latestRelease = releases.length > 0 ? releases.sort().at(-1)! : null;
        const slug = list.find((m) => m.creatorSlug)?.creatorSlug ?? null;
        return { name, slug, modelCount: list.length, topModel, latestRelease };
      })
      .sort((a, b) => (b.topModel.intelligenceIndex ?? -Infinity) - (a.topModel.intelligenceIndex ?? -Infinity))
      .slice(0, 9);
  }, [models]);

  if (companies.length === 0) return null;

  const maxTop = Math.max(...companies.map((c) => c.topModel.intelligenceIndex ?? 0));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {companies.map((c) => (
        <div
          key={c.name}
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <CompanyLogo slug={c.slug} name={c.name} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: 0 }}>{c.name}</p>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: "0 0 14px" }}>
            {c.modelCount} {c.modelCount === 1 ? "modelo evaluado" : "modelos evaluados"}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#5B6CFF", fontVariantNumeric: "tabular-nums" }}>
              {formatIndex(c.topModel.intelligenceIndex)}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--color-tertiary)" }}>índice del modelo insignia</span>
          </div>
          <div style={{ width: "100%", height: 4, borderRadius: 4, background: "var(--color-border)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", borderRadius: 4, background: "#5B6CFF", width: `${((c.topModel.intelligenceIndex ?? 0) / maxTop) * 100}%` }} />
          </div>

          <div style={{ paddingTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4B5563", margin: "0 0 4px" }}>
              Modelo líder
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", margin: 0 }}>
              {c.topModel.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
