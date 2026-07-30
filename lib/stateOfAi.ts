export interface AiModel {
  id: string;
  name: string;
  slug: string;
  creatorName: string | null;
  creatorSlug: string | null;
  releaseDate: string | null;
  intelligenceIndex: number | null;
  codingIndex: number | null;
  mathIndex: number | null;
  priceInput1m: number | null;
  priceOutput1m: number | null;
  priceBlended1m: number | null;
  tokensPerSecond: number | null;
  ttftSeconds: number | null;
  fetchedAt: string;
}

// Dato público — pasa por app/api/public/ai-models (getSupabaseAdmin
// server-side, mapeo de fila cruda incluido ahí). Ver
// specs/supabase-rls-lockdown/design.md, punto 4.
export async function loadAiModels(): Promise<AiModel[]> {
  const res = await fetch("/api/public/ai-models");
  if (!res.ok) throw new Error(`No se pudieron cargar los modelos (${res.status})`);
  return res.json();
}

// La API devuelve variantes del mismo modelo (reasoning/high/low...) que
// comparten slug. Para el reporte nos quedamos con la variante más
// inteligente de cada slug.
export function bestVariantPerSlug(models: AiModel[]): AiModel[] {
  const best = new Map<string, AiModel>();
  for (const m of models) {
    const current = best.get(m.slug);
    if (!current || (m.intelligenceIndex ?? -1) > (current.intelligenceIndex ?? -1)) {
      best.set(m.slug, m);
    }
  }
  return Array.from(best.values());
}

export function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return `$${value < 10 ? value.toFixed(2) : value.toFixed(1)}`;
}

export function formatIndex(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatReleaseDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { month: "short", year: "numeric" });
}

export interface ExecutiveSummary {
  thisWeekReleases: AiModel[];
  last30Count: number;
  prev30Count: number;
  growthPct: number | null;
  leader: AiModel;
  mostActiveLab: { name: string; count: number } | null;
}

// Resumen ejecutivo armado con plantillas sobre los datos (sin LLM): todo
// lo que dice es directamente derivable de release_date/intelligence_index
// del snapshot actual — no requiere histórico guardado en el tiempo.
export function buildExecutiveSummary(models: AiModel[], now: number = Date.now()): ExecutiveSummary | null {
  const withIntelligence = models.filter((m) => m.intelligenceIndex !== null);
  if (withIntelligence.length === 0) return null;
  const leader = withIntelligence[0];

  const day = 86400000;
  const thisWeekReleases = models.filter(
    (m) => m.releaseDate && now - new Date(m.releaseDate).getTime() <= 7 * day
  );

  const last30 = models.filter((m) => m.releaseDate && now - new Date(m.releaseDate).getTime() <= 30 * day);
  const prev30 = models.filter((m) => {
    if (!m.releaseDate) return false;
    const age = now - new Date(m.releaseDate).getTime();
    return age > 30 * day && age <= 60 * day;
  });
  const growthPct = prev30.length > 0 ? ((last30.length - prev30.length) / prev30.length) * 100 : null;

  const labCounts = new Map<string, number>();
  for (const m of last30) {
    if (m.creatorName) labCounts.set(m.creatorName, (labCounts.get(m.creatorName) ?? 0) + 1);
  }
  const topLab = Array.from(labCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostActiveLab = topLab ? { name: topLab[0], count: topLab[1] } : null;

  return { thisWeekReleases, last30Count: last30.length, prev30Count: prev30.length, growthPct, leader, mostActiveLab };
}

export interface MonthlyCount {
  key: string; // YYYY-MM
  label: string;
  count: number;
}

// Distribución de lanzamientos por mes — derivable del snapshot actual
// porque release_date es un dato histórico fijo por modelo.
export function monthlyReleaseCounts(models: AiModel[], months: number = 6): MonthlyCount[] {
  const now = new Date();
  const buckets: MonthlyCount[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: d.toLocaleDateString("es-CL", { month: "short" }), count: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const m of models) {
    if (!m.releaseDate) continue;
    const key = m.releaseDate.slice(0, 7);
    const bucket = byKey.get(key);
    if (bucket) bucket.count++;
  }
  return buckets;
}
