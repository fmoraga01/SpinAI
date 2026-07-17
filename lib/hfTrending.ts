import { getSupabase } from "./supabase";

export interface HfTrendingItem {
  id: string;
  title: string;
  url: string;
  author: string | null;
  summary: string | null;
  likes: number | null;
  pipelineTag: string | null;
}

function rowToItem(row: Record<string, unknown>): HfTrendingItem {
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

export async function loadHfTrending(): Promise<{ models: HfTrendingItem[]; papers: HfTrendingItem[] }> {
  const { data, error } = await getSupabase()
    .from("hf_trending")
    .select("*")
    .order("likes", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    models: rows.filter((r) => r.kind === "model").map(rowToItem),
    papers: rows.filter((r) => r.kind === "paper").map(rowToItem),
  };
}
