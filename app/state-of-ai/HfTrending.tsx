"use client";

import { useEffect, useState } from "react";
import { HfTrendingItem, loadHfTrending } from "@/lib/hfTrending";

function LikesBadge({ likes, icon }: { likes: number | null; icon: string }) {
  if (likes === null) return null;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-primary)",
        background: "#2C40FF15",
        border: "1px solid #2C40FF33",
        borderRadius: "var(--radius-md)",
        padding: "2px 7px",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {icon} {likes}
    </span>
  );
}

function ItemCard({
  item, icon, showSummary, compact,
}: { item: HfTrendingItem; icon: string; showSummary: boolean; compact: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block", height: "100%" }}
    >
      <div
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          height: "100%",
          transition: "border-color 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2C40FF44"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
      >
        {compact ? (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, lineHeight: "18px", wordBreak: "break-word" }}>
              {item.title}
            </p>
            <div style={{ marginTop: 8 }}>
              <LikesBadge likes={item.likes} icon={icon} />
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, lineHeight: "18px" }}>
              {item.title}
            </p>
            <LikesBadge likes={item.likes} icon={icon} />
          </div>
        )}
        {item.author && (
          <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "6px 0 0" }}>
            {item.author}
            {item.pipelineTag ? ` · ${item.pipelineTag}` : ""}
          </p>
        )}
        {showSummary && item.summary && (
          <p style={{ fontSize: 11.5, color: "var(--color-tertiary)", margin: "6px 0 0", lineHeight: "16px" }}>
            {item.summary.length > 140 ? `${item.summary.slice(0, 140)}…` : item.summary}
          </p>
        )}
      </div>
    </a>
  );
}

function Column({
  label, items, icon, showSummary, emptyMessage, gridClassName, compact,
}: {
  label: string;
  items: HfTrendingItem[];
  icon: string;
  showSummary: boolean;
  emptyMessage: string;
  gridClassName: string;
  compact: boolean;
}) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-tertiary)", margin: "0 0 10px" }}>
        {label}
      </p>
      {items.length === 0 ? (
        <div style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: 12.5, color: "var(--color-tertiary)", margin: 0 }}>{emptyMessage}</p>
        </div>
      ) : (
        <div className={gridClassName}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} icon={icon} showSummary={showSummary} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HfTrending() {
  const [models, setModels] = useState<HfTrendingItem[]>([]);
  const [papers, setPapers] = useState<HfTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadHfTrending()
      .then(({ models, papers }) => {
        setModels(models);
        setPapers(papers);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 64, borderRadius: "var(--radius-md)", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 90, borderRadius: "var(--radius-md)", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-tertiary)", margin: 0 }}>
          No se pudieron cargar los datos de Hugging Face en este momento.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <Column
        label="Modelos"
        items={models}
        icon="♥"
        showSummary={false}
        compact
        gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
        emptyMessage="Aún no hay modelos cargados — el cron diario poblará esta sección."
      />
      <Column
        label="Papers"
        items={papers}
        icon="▲"
        showSummary
        compact={false}
        gridClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
        emptyMessage="Aún no hay papers cargados — el cron diario poblará esta sección."
      />
    </div>
  );
}
