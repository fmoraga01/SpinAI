export interface HfTrendingItem {
  id: string;
  title: string;
  url: string;
  author: string | null;
  summary: string | null;
  likes: number | null;
  pipelineTag: string | null;
}

// Dato público — pasa por app/api/public/hf-trending (ver lib/news.ts).
export async function loadHfTrending(): Promise<{ models: HfTrendingItem[]; papers: HfTrendingItem[] }> {
  const res = await fetch("/api/public/hf-trending");
  if (!res.ok) throw new Error(`No se pudo cargar Hugging Face trending (${res.status})`);
  return res.json();
}
