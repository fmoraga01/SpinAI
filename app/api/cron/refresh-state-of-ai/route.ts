import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const AA_MODELS_URL = "https://artificialanalysis.ai/api/v2/data/llms/models";

interface AaModel {
  id?: string;
  name?: string;
  slug?: string;
  release_date?: string | null;
  model_creator?: { name?: string; slug?: string } | null;
  evaluations?: Record<string, number | null> | null;
  pricing?: {
    price_1m_input_tokens?: number | null;
    price_1m_output_tokens?: number | null;
    price_1m_blended_3_to_1?: number | null;
  } | null;
  median_output_tokens_per_second?: number | null;
  median_time_to_first_token_seconds?: number | null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.AA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AA_API_KEY not configured" }, { status: 500 });
  }

  let payload: { data?: AaModel[] };
  try {
    const res = await fetch(AA_MODELS_URL, { headers: { "x-api-key": apiKey } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Artificial Analysis respondió ${res.status}` },
        { status: 502 }
      );
    }
    payload = await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Fetch failed", detail: msg }, { status: 502 });
  }

  const now = new Date().toISOString();
  const rows = (payload.data ?? [])
    .filter((m) => m.id && m.name && m.slug)
    .map((m) => ({
      id: m.id!,
      name: m.name!.trim(),
      slug: m.slug!,
      creator_name: m.model_creator?.name ?? null,
      creator_slug: m.model_creator?.slug ?? null,
      release_date: m.release_date ?? null,
      intelligence_index: num(m.evaluations?.artificial_analysis_intelligence_index),
      coding_index: num(m.evaluations?.artificial_analysis_coding_index),
      math_index: num(m.evaluations?.artificial_analysis_math_index),
      evaluations: m.evaluations ?? {},
      price_input_1m: num(m.pricing?.price_1m_input_tokens),
      price_output_1m: num(m.pricing?.price_1m_output_tokens),
      price_blended_1m: num(m.pricing?.price_1m_blended_3_to_1),
      tokens_per_second: num(m.median_output_tokens_per_second),
      ttft_seconds: num(m.median_time_to_first_token_seconds),
      fetched_at: now,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "La API no devolvió modelos" }, { status: 502 });
  }

  const { error } = await getSupabaseAdmin().from("ai_models").upsert(rows, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: rows.length });
}
