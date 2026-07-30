import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function rowToModel(row: Record<string, unknown>) {
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

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("ai_models")
    .select("*")
    .order("intelligence_index", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(rowToModel));
}
