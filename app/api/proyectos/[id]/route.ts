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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, summary, country, businessUnit } = body ?? {};
  const missing = [
    !name?.trim() && "name",
    !summary?.trim() && "summary",
    !country?.trim() && "country",
    !businessUnit?.trim() && "businessUnit",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos requeridos faltantes: ${missing.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .update({ name: name.trim(), summary: summary.trim(), country: country.trim(), business_unit: businessUnit.trim() })
    .eq("id", id)
    .select("*, project_kpis(*), project_weekly_updates(*)")
    .maybeSingle();

  if (error) {
    if (error.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  return NextResponse.json(rowToProject(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();
  // Verificar existencia antes de borrar para poder devolver 404 (R25) en vez de
  // un 200 silencioso sobre un id inexistente — mismo criterio de honestidad de
  // respuesta que ya usa el GET existente con maybeSingle().
  const { data: existing, error: findError } = await db.from("projects").select("id").eq("id", id).maybeSingle();
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
