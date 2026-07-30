import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ARXIV_URL =
  "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=30";

type AuthorTag = { name?: string } | string;
interface ArxivItem extends Parser.Item {
  // xml2js solo envuelve en array cuando hay >1 <author>; con un único
  // autor llega como objeto suelto, no como array de un elemento.
  author?: AuthorTag[] | AuthorTag;
}

const parser: Parser<Record<string, unknown>, ArxivItem> = new Parser({
  timeout: 15000,
  customFields: {
    item: [["author", "author", { keepArray: true }]],
  },
});

function extractArxivId(link: string): string {
  const match = link.match(/abs\/([^/]+)$/);
  return match ? match[1] : link;
}

function extractAuthorNames(author: ArxivItem["author"]): string[] {
  const list = Array.isArray(author) ? author : author ? [author] : [];
  return list
    .map((a) => (typeof a === "string" ? a : a?.name))
    .filter((n): n is string => !!n);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let feed;
  try {
    feed = await parser.parseURL(ARXIV_URL);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Fetch de arXiv falló", detail: msg }, { status: 502 });
  }

  const rows = (feed.items ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      arxiv_id: extractArxivId(item.link!),
      title: item.title!.trim().replace(/\s+/g, " "),
      authors: extractAuthorNames(item.author),
      summary: item.summary?.trim().replace(/\s+/g, " ").slice(0, 500) || null,
      url: item.link!,
      published_at: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "arXiv no devolvió papers" }, { status: 502 });
  }

  const { error } = await getSupabaseAdmin()
    .from("research_papers")
    .upsert(rows, { onConflict: "arxiv_id", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: rows.length });
}
