export interface NewsSource {
  name: string;
  feedUrl: string;
  requiresSubscription?: boolean;
}

// Fuentes curadas por calidad y confiabilidad técnica. Ver investigación
// del feature de Noticias para el criterio de selección.
export const NEWS_SOURCES: NewsSource[] = [
  { name: "OpenAI", feedUrl: "https://openai.com/news/rss.xml" },
  { name: "Google DeepMind", feedUrl: "https://deepmind.google/blog/rss.xml" },
  { name: "Hugging Face", feedUrl: "https://huggingface.co/blog/feed.xml" },
  { name: "MIT Technology Review", feedUrl: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" },
  { name: "The Verge", feedUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { name: "Ars Technica", feedUrl: "https://arstechnica.com/ai/feed/" },
  { name: "TechCrunch", feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { name: "VentureBeat", feedUrl: "https://venturebeat.com/category/ai/feed/" },
  { name: "Wired", feedUrl: "https://www.wired.com/feed/tag/ai/latest/rss", requiresSubscription: true },
  { name: "Import AI", feedUrl: "https://importai.substack.com/feed" },
];

export const SUBSCRIPTION_SOURCES = new Set(
  NEWS_SOURCES.filter((s) => s.requiresSubscription).map((s) => s.name)
);
