import { getSupabase } from "./supabase";

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

function toNumber(value: unknown): number | null {
  // ojo: Number(null) da 0, no NaN — hay que descartar null/undefined antes
  // de convertir, o un valor NULL de la DB termina mostrándose como "0.0".
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function rowToModel(row: Record<string, unknown>): AiModel {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    creatorName: (row.creator_name as string | null) ?? null,
    creatorSlug: (row.creator_slug as string | null) ?? null,
    releaseDate: (row.release_date as string | null) ?? null,
    intelligenceIndex: toNumber(row.intelligence_index),
    codingIndex: toNumber(row.coding_index),
    mathIndex: toNumber(row.math_index),
    priceInput1m: toNumber(row.price_input_1m),
    priceOutput1m: toNumber(row.price_output_1m),
    priceBlended1m: toNumber(row.price_blended_1m),
    tokensPerSecond: toNumber(row.tokens_per_second),
    ttftSeconds: toNumber(row.ttft_seconds),
    fetchedAt: row.fetched_at as string,
  };
}

export async function loadAiModels(): Promise<AiModel[]> {
  const { data, error } = await getSupabase()
    .from("ai_models")
    .select("*")
    .order("intelligence_index", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToModel);
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

export interface CostTrendPoint {
  slug: string;
  releaseDate: string;
  costPerPoint: number; // USD por 1M tokens, por cada punto de índice de inteligencia
}

// Cuánto cuesta un punto de índice de inteligencia, modelo a modelo, en orden
// de lanzamiento — muestra que la inteligencia se abarata con el tiempo,
// más allá de cuántos modelos nuevos salen por mes.
export function costOfIntelligenceTrend(models: AiModel[], sampleSize: number = 14): CostTrendPoint[] {
  return models
    .filter(
      (m): m is AiModel & { releaseDate: string; priceBlended1m: number; intelligenceIndex: number } =>
        !!m.releaseDate && m.priceBlended1m !== null && m.priceBlended1m > 0 && m.intelligenceIndex !== null && m.intelligenceIndex > 0
    )
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(-sampleSize)
    .map((m) => ({ slug: m.slug, releaseDate: m.releaseDate, costPerPoint: m.priceBlended1m / m.intelligenceIndex }));
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
