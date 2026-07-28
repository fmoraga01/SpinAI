import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToProject } from "@/lib/projects";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .select("*, project_kpis(*), project_weekly_updates(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // 22P02 = invalid_text_representation — el id no parsea como uuid,
    // es un caso de "no encontrado", no un error del servidor.
    if (error.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  return NextResponse.json(rowToProject(data));
}
