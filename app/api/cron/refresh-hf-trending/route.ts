import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// La API pública no expone un sort de "trending" real para modelos (se
// probó sort=trending y sort=trending_score, ambos rechazados — el
// algoritmo de trending de HF es interno a su sitio). sort=createdAt
// tampoco sirve: los 100 más nuevos son en su mayoría subidas automáticas
// con 0 likes (HF recibe cientos de uploads por hora). Aproximación que sí
// funciona, verificada en vivo: traemos los 100 modelos con más likes de
// siempre (sort=likes) y de esos filtramos a los actualizados en los
// últimos 30 días (10 de 100 califican) — "populares que siguen activos",
// en vez de un ranking estático congelado o ruido de subidas nuevas.
const HF_MODELS_URL = "https://huggingface.co/api/models?sort=likes&limit=100&full=true";
const HF_PAPERS_URL = "https://huggingface.co/api/daily_papers?sort=trending&limit=6";
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface HfModel {
  id?: string;
  author?: string | null;
  likes?: number | null;
  pipeline_tag?: string | null;
  createdAt?: string | null;
  lastModified?: string | null;
}

interface HfPaperFields {
  id?: string;
  title?: string;
  summary?: string | null;
  upvotes?: number | null;
  authors?: ({ name?: string } | string)[] | null;
}

// El endpoint /api/daily_papers no está documentado oficialmente y no pudimos
// verificar su shape en vivo (huggingface.co bloqueado en este entorno). Las
// referencias indirectas sugieren que a veces envuelve los campos del paper
// en una clave "paper" y otras veces los deja planos — soportamos ambas para
// no romper el cron si el shape real difiere de lo esperado. Verificar con
// el resultado real del cron antes de confiar ciegamente en esta sección.
function extractPaperFields(item: { paper?: HfPaperFields } & HfPaperFields): HfPaperFields {
  return item.paper ?? item;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let models: HfModel[];
  let papersPayload: unknown;
  try {
    const [modelsRes, papersRes] = await Promise.all([
      fetch(HF_MODELS_URL),
      fetch(HF_PAPERS_URL),
    ]);
    if (!modelsRes.ok || !papersRes.ok) {
      const modelsBody = modelsRes.ok ? null : await modelsRes.text();
      const papersBody = papersRes.ok ? null : await papersRes.text();
      return NextResponse.json(
        {
          error: `Hugging Face respondió ${modelsRes.status}/${papersRes.status}`,
          modelsBody: modelsBody?.slice(0, 500),
          papersBody: papersBody?.slice(0, 500),
        },
        { status: 502 }
      );
    }
    models = await modelsRes.json();
    papersPayload = await papersRes.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Fetch failed", detail: msg }, { status: 502 });
  }

  // Ver comentario de extractPaperFields: shape no verificado, soportamos
  // tanto {results: [...]} como un array plano en el nivel superior.
  const papers: ({ paper?: HfPaperFields } & HfPaperFields)[] = Array.isArray(papersPayload)
    ? papersPayload
    : ((papersPayload as { results?: unknown[] })?.results ?? []);

  const now = new Date().toISOString();

  const recentCutoff = Date.now() - RECENT_WINDOW_MS;
  const modelRows = (models ?? [])
    .filter((m) => m.id)
    .filter((m) => {
      const dateStr = m.lastModified ?? m.createdAt;
      if (!dateStr) return false;
      const t = new Date(dateStr).getTime();
      return Number.isFinite(t) && t >= recentCutoff;
    })
    .sort((a, b) => (num(b.likes) ?? 0) - (num(a.likes) ?? 0))
    .slice(0, 5)
    .map((m) => ({
      id: m.id!,
      kind: "model" as const,
      title: m.id!,
      url: `https://huggingface.co/${m.id}`,
      author: m.author ?? m.id!.split("/")[0] ?? null,
      summary: null,
      likes: num(m.likes),
      pipeline_tag: m.pipeline_tag ?? null,
      fetched_at: now,
    }));

  const paperRows = papers
    .map(extractPaperFields)
    .filter((p) => p.id && p.title)
    .map((p) => {
      // Igual que Research.tsx: 3 autores + "+N" en vez de la lista completa,
      // que en algunos papers puede tener más de 20 nombres.
      const authorNames = (p.authors ?? [])
        .map((a) => (typeof a === "string" ? a : a?.name))
        .filter((n): n is string => !!n);
      const author =
        authorNames.length > 0
          ? `${authorNames.slice(0, 3).join(", ")}${authorNames.length > 3 ? ` +${authorNames.length - 3}` : ""}`
          : null;

      return {
        id: p.id!,
        kind: "paper" as const,
        title: p.title!.trim().replace(/\s+/g, " "),
        url: `https://huggingface.co/papers/${p.id}`,
        author,
        summary: p.summary?.trim().replace(/\s+/g, " ").slice(0, 500) || null,
        likes: num(p.upvotes),
        pipeline_tag: null,
        fetched_at: now,
      };
    });

  if (modelRows.length === 0 && paperRows.length === 0) {
    return NextResponse.json({ error: "Hugging Face no devolvió datos" }, { status: 502 });
  }

  const db = getSupabase();

  if (modelRows.length > 0) {
    const { error } = await db.from("hf_trending").delete().eq("kind", "model");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { error: insertError } = await db.from("hf_trending").insert(modelRows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (paperRows.length > 0) {
    const { error } = await db.from("hf_trending").delete().eq("kind", "paper");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { error: insertError } = await db.from("hf_trending").insert(paperRows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, models: modelRows.length, papers: paperRows.length });
}
