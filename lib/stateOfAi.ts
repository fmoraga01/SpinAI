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
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rowToModel(row: Record<string, unknown>): AiModel {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    creatorName: (row.creator_name as string | null) ?? null,
    creatorSlug: (row.creator_slug as string | null) ?? null,
    releaseDate: (row.release_date as string | null) ?? null,
    intelligenceIndex: toNumber(Number(row.intelligence_index)),
    codingIndex: toNumber(Number(row.coding_index)),
    mathIndex: toNumber(Number(row.math_index)),
    priceInput1m: toNumber(Number(row.price_input_1m)),
    priceOutput1m: toNumber(Number(row.price_output_1m)),
    priceBlended1m: toNumber(Number(row.price_blended_1m)),
    tokensPerSecond: toNumber(Number(row.tokens_per_second)),
    ttftSeconds: toNumber(Number(row.ttft_seconds)),
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
