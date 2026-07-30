import { NewsItem } from "./types";

// Dato público — ya no llama a Supabase directo (anon key), pasa por
// app/api/public/news (getSupabaseAdmin server-side). Ver
// specs/supabase-rls-lockdown/design.md, punto 4. Sin auth: dato público.
export async function loadNews(page: number = 0): Promise<{ items: NewsItem[]; hasMore: boolean }> {
  const res = await fetch(`/api/public/news?page=${page}`);
  if (!res.ok) throw new Error(`No se pudieron cargar las noticias (${res.status})`);
  return res.json();
}
