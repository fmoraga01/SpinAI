import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clearLogsIfNoAssignments } from "@/lib/teamRows";

// Reemplaza updateMemberName (body { name }) y updateMemberEmail
// (body { email }) — una sola ruta de recurso, el handler distingue por
// las claves presentes en el body (ver design.md).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, email } = body ?? {};
  if (name === undefined && email === undefined) {
    return NextResponse.json({ error: "Body debe incluir name y/o email" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  if (name !== undefined) {
    const trimmed = name.trim();
    const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
      db.from("members").update({ name: trimmed }).eq("id", id),
      db.from("assignments").update({ member_name: trimmed }).eq("member_id", id),
      db.from("templates").update({ member_name: trimmed }).eq("member_id", id),
    ]);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  if (email !== undefined) {
    const { error } = await db.from("members").update({ email: email.trim() || null }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();

  // Mark future assignments as unassigned instead of deleting them
  const today = new Date().toISOString().slice(0, 10);
  await db.from("assignments")
    .update({ member_id: null, member_name: null })
    .eq("member_id", id)
    .gte("date", today);
  // Delete past assignments (no longer relevant)
  await db.from("assignments").delete().eq("member_id", id).lt("date", today);

  const { error } = await db.from("members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await clearLogsIfNoAssignments(db);
  return NextResponse.json({ ok: true });
}
