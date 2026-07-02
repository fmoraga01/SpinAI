import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { getSupabase } from "@/lib/supabase";
import { NEWS_SOURCES } from "@/lib/newsSources";

const parser = new Parser({ timeout: 10000 });

function extractImage(item: Parser.Item): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image")) {
    return item.enclosure.url;
  }
  const match = (item.content ?? "").match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabase();
  const results: Record<string, { ok: boolean; count?: number; error?: string }> = {};
  let totalUpserted = 0;

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.feedUrl);
      const rows = (feed.items ?? [])
        .filter((item) => item.link && item.title)
        .slice(0, 20)
        .map((item) => ({
          source: source.name,
          title: item.title!.trim(),
          url: item.link!,
          summary: item.contentSnippet?.trim().slice(0, 300) || null,
          image_url: extractImage(item),
          published_at: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
        }));

      if (rows.length > 0) {
        const { error } = await db
          .from("news_items")
          .upsert(rows, { onConflict: "url", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }

      results[source.name] = { ok: true, count: rows.length };
      totalUpserted += rows.length;
    } catch (err) {
      results[source.name] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({ ok: true, totalUpserted, results });
}
