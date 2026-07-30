import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const PAGE_SIZE = 20;

function rowToNewsItem(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    source: row.source as string,
    title: row.title as string,
    url: row.url as string,
    summary: (row.summary as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    publishedAt: row.published_at as string,
  };
}

// Dato público (news_items solo permite `select` a anon vía R2/R4 de todas
// formas) — igual usa getSupabaseAdmin() por consistencia con el resto de
// app/api/**, ver "Alternativas consideradas" en design.md.
export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") ?? "0") || 0;
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("news_items")
    .select("*")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map(rowToNewsItem);
  return NextResponse.json({ items, hasMore: items.length === PAGE_SIZE });
}
