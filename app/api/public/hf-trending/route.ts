import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function rowToItem(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
    author: (row.author as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    likes: (row.likes as number | null) ?? null,
    pipelineTag: (row.pipeline_tag as string | null) ?? null,
  };
}

export async function GET() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("hf_trending")
    .select("*")
    .order("likes", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    models: rows.filter((r) => r.kind === "model").map(rowToItem),
    papers: rows.filter((r) => r.kind === "paper").map(rowToItem),
  });
}
