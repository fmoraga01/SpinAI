import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { idA, idB } = body ?? {};
  if (!idA || !idB) {
    return NextResponse.json({ error: "Campos requeridos faltantes: idA, idB" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("assignments")
    .select("id, member_id, member_name, date")
    .in("id", [idA, idB]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const a = data!.find((r) => r.id === idA);
  const b = data!.find((r) => r.id === idB);
  if (!a || !b) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

  // Swap members between assignments
  await Promise.all([
    db.from("assignments").update({ member_id: b.member_id, member_name: b.member_name }).eq("id", idA),
    db.from("assignments").update({ member_id: a.member_id, member_name: a.member_name }).eq("id", idB),
  ]);

  // Insert log entry separately so a missing table doesn't break the swap
  await db.from("assignment_logs").insert({
    member_a_name: a.member_name,
    member_b_name: b.member_name,
    date_a: a.date,
    date_b: b.date,
  });

  return NextResponse.json({ ok: true });
}
