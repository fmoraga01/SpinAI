import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToUpdate } from "@/lib/projects";

async function findUpdate(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, updateId: string) {
  // Filtra por project_id Y id a la vez (R18) — un updateId válido pero de
  // otro proyecto se trata igual que uno inexistente, nunca 500 ni éxito
  // silencioso cruzado entre proyectos.
  return db
    .from("project_weekly_updates")
    .select("id")
    .eq("id", updateId)
    .eq("project_id", projectId)
    .maybeSingle();
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, updateId } = await params;
  const body = await req.json();
  const { weekOf, note } = body ?? {};
  const missing = [
    (!weekOf || Number.isNaN(new Date(weekOf).getTime())) && "weekOf",
    !note?.trim() && "note",
  ].filter(Boolean);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos requeridos faltantes o inválidos: ${missing.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: findError } = await findUpdate(db, id, updateId);
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });

  const { data, error } = await db
    .from("project_weekly_updates")
    .update({ week_of: weekOf, note: note.trim() })
    .eq("id", updateId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToUpdate(data), { status: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, updateId } = await params;
  const db = getSupabaseAdmin();
  const { data: existing, error: findError } = await findUpdate(db, id, updateId);
  if (findError && findError.code === "22P02") return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Avance no encontrado" }, { status: 404 });

  const { error } = await db.from("project_weekly_updates").delete().eq("id", updateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
