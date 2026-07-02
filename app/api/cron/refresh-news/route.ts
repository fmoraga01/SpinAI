import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { getSupabase } from "@/lib/supabase";
import { NEWS_SOURCES } from "@/lib/newsSources";

interface MediaTag {
  $?: { url?: string; medium?: string };
}

interface ItemWithMedia extends Parser.Item {
  "media:content"?: MediaTag[];
  "media:thumbnail"?: MediaTag[];
}

const parser: Parser<Record<string, unknown>, ItemWithMedia> = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: true }],
      ["media:thumbnail", "media:thumbnail", { keepArray: true }],
    ],
  },
});

function firstMediaUrl(tags: MediaTag[] | undefined): string | null {
  const withUrl = tags?.find((tag) => tag.$?.url && (!tag.$.medium || tag.$.medium === "image"));
  return withUrl?.$?.url ?? null;
}

function extractImage(item: ItemWithMedia): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image")) {
    return item.enclosure.url;
  }
  const mediaContent = firstMediaUrl(item["media:content"]);
  if (mediaContent) return mediaContent;
  const mediaThumbnail = firstMediaUrl(item["media:thumbnail"]);
  if (mediaThumbnail) return mediaThumbnail;
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
