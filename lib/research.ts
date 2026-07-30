export interface ResearchPaper {
  id: string;
  arxivId: string;
  title: string;
  authors: string[];
  summary: string | null;
  url: string;
  publishedAt: string;
}

// Dato público — pasa por app/api/public/research (ver lib/news.ts).
export async function loadResearchPapers(limit: number = 12): Promise<ResearchPaper[]> {
  const res = await fetch(`/api/public/research?limit=${limit}`);
  if (!res.ok) throw new Error(`No se pudieron cargar los papers (${res.status})`);
  return res.json();
}
