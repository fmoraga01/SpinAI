"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../components/Nav";
import { loadNews } from "@/lib/news";
import { NewsItem } from "@/lib/types";
import { SUBSCRIPTION_SOURCES } from "@/lib/newsSources";

function formatRelative(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(isoStr).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

function NewsCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: 14,
        background: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="animate-pulse" style={{ width: 96, height: 96, borderRadius: "var(--radius-md)", background: "var(--color-border)", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
        <div className="animate-pulse" style={{ width: 100, height: 12, borderRadius: 4, background: "var(--color-border)" }} />
        <div className="animate-pulse" style={{ width: "80%", height: 16, borderRadius: 4, background: "var(--color-border)" }} />
        <div className="animate-pulse" style={{ width: "55%", height: 16, borderRadius: 4, background: "var(--color-border)" }} />
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: 14,
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#2C40FF44";
          e.currentTarget.style.boxShadow = "var(--shadow-glow)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            style={{ width: 96, height: 96, objectFit: "cover", borderRadius: "var(--radius-md)", flexShrink: 0 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                background: "var(--color-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "2px 8px",
                flexShrink: 0,
              }}
            >
              {item.source}
            </span>
            {SUBSCRIPTION_SOURCES.has(item.source) && (
              <span
                title="Este artículo puede requerir una suscripción para leerse completo"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#F59E0B",
                  background: "#F59E0B15",
                  border: "1px solid #F59E0B33",
                  borderRadius: "var(--radius-md)",
                  padding: "2px 7px",
                  flexShrink: 0,
                }}
              >
                Suscripción requerida
              </span>
            )}
            <span title={new Date(item.publishedAt).toLocaleString("es-CL")} style={{ fontSize: 11, color: "#4B5563", fontWeight: 500 }}>
              {formatRelative(item.publishedAt)}
            </span>
          </div>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
              lineHeight: "20px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.title}
          </h3>
          {item.summary && (
            <p
              style={{
                fontSize: 13,
                color: "var(--color-tertiary)",
                margin: 0,
                lineHeight: "18px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.summary}
            </p>
          )}
        </div>
        <span style={{ fontSize: 16, color: "var(--color-primary)", flexShrink: 0, alignSelf: "center" }}>↗</span>
      </div>
    </a>
  );
}

export default function NoticiasPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  useEffect(() => {
    loadNews(0)
      .then(({ items, hasMore }) => {
        setItems(items);
        setHasMore(hasMore);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items: more, hasMore: moreLeft } = await loadNews(nextPage);
      setItems((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(moreLeft);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const sources = useMemo(() => Array.from(new Set(items.map((i) => i.source))).sort(), [items]);
  const visibleItems = useMemo(
    () => (activeSource ? items.filter((i) => i.source === activeSource) : items),
    [items, activeSource]
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Nav />
      <div className="max-w-3xl mx-auto px-6" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Noticias de IA
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-tertiary)", marginBottom: 28 }}>
          Lo último de inteligencia artificial, de fuentes técnicas confiables.
        </p>

        {sources.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 24 }}>
            {[null, ...sources].map((s) => {
              const active = activeSource === s;
              return (
                <button
                  key={s ?? "all"}
                  onClick={() => setActiveSource(s)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-md)",
                    color: active ? "#fff" : "var(--color-tertiary)",
                    background: active ? "#2C40FF22" : "transparent",
                    border: "1px solid " + (active ? "#2C40FF55" : "var(--color-border)"),
                    cursor: "pointer",
                  }}
                >
                  {s ?? "Todas"}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-tertiary)", fontSize: 14 }}>
            No se pudieron cargar las noticias en este momento. Intenta de nuevo más tarde.
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 24px", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "var(--radius-md)",
              background: "#2C40FF0f", border: "1px solid #2C40FF22",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2C40FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h11l5 5v11H4z" />
                <path d="M9 9h6M9 13h6M9 17h3" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Sin noticias nuevas</p>
              <p style={{ fontSize: 13, color: "#4B5563", margin: 0, maxWidth: 260, lineHeight: "20px" }}>
                Todavía no hay noticias cargadas. Vuelve a revisar más tarde.
              </p>
            </div>
          </div>
        )}

        {!loading && visibleItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleItems.map((item) => <NewsCard key={item.id} item={item} />)}
          </div>
        )}

        {!loading && !activeSource && hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: "10px 20px",
                borderRadius: "var(--radius-md)",
                color: "var(--color-primary)",
                background: "transparent",
                border: "1px solid var(--color-primary)",
                cursor: loadingMore ? "wait" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore ? "Cargando..." : "Cargar más noticias"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
