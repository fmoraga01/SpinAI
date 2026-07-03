import { getSupabase } from "./supabase";

export interface ResearchPaper {
  id: string;
  arxivId: string;
  title: string;
  authors: string[];
  summary: string | null;
  url: string;
  publishedAt: string;
}

function rowToPaper(row: Record<string, unknown>): ResearchPaper {
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

export async function loadResearchPapers(limit: number = 12): Promise<ResearchPaper[]> {
  const { data, error } = await getSupabase()
    .from("research_papers")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToPaper);
}
