import { getSupabase } from "./supabase";
import { NewsItem } from "./types";

const PAGE_SIZE = 20;

function rowToNewsItem(row: Record<string, unknown>): NewsItem {
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

export async function loadNews(page: number = 0): Promise<{ items: NewsItem[]; hasMore: boolean }> {
  const db = getSupabase();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await db
    .from("news_items")
    .select("*")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const items = (data ?? []).map(rowToNewsItem);
  return { items, hasMore: items.length === PAGE_SIZE };
}
