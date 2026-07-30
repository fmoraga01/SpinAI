import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function rowToPaper(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    arxivId: row.arxiv_id as string,
    title: row.title as string,
    authors: (row.authors as string[] | null) ?? [],
    summary: (row.summary as string | null) ?? null,
    url: row.url as string,
    publishedAt: row.published_at as string,
  };
}

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "12") || 12;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("research_papers")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(rowToPaper));
}
