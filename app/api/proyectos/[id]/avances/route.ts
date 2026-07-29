import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToUpdate } from "@/lib/projects";

const VALID_STATUSES = ["on_track", "at_risk", "delayed"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { weekOf, status, note } = body ?? {};
  const missing = [
    !weekOf && "weekOf",
    !VALID_STATUSES.includes(status) && "status",
    !note?.trim() && "note",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos requeridos faltantes o inválidos: ${missing.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  // Verificar existencia del proyecto antes de insertar, mismo criterio que
  // PATCH/DELETE /api/proyectos/<id> de project-crud (404 honesto en vez de
  // insertar contra un project_id inexistente).
  const { data: project, error: findError } = await db.from("projects").select("id").eq("id", id).maybeSingle();
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { data, error } = await db
    .from("project_weekly_updates")
    .insert({ project_id: id, week_of: weekOf, status, note: note.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToUpdate(data), { status: 201 });
}
