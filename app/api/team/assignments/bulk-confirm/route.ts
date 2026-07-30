import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { BulkAssignmentPreview } from "@/lib/teamRows";

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const previews: BulkAssignmentPreview[] | undefined = body?.previews;
  if (!Array.isArray(previews)) {
    return NextResponse.json({ error: "Campo requerido faltante: previews" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  // Fetch existing unassigned slots to know which dates need UPDATE vs INSERT
  const { data: unassigned } = await db
    .from("assignments")
    .select("id, date")
    .is("member_id", null);
  const unassignedByDate = new Map((unassigned ?? []).map((r) => [r.date as string, r.id as string]));

  const toUpdate = previews.filter((p) => unassignedByDate.has(p.date));
  const toInsert = previews.filter((p) => !unassignedByDate.has(p.date));

  try {
    await Promise.all([
      ...toUpdate.map((p) =>
        db.from("assignments")
          .update({ member_id: p.memberId, member_name: p.memberName })
          .eq("id", unassignedByDate.get(p.date)!)
      ),
      toInsert.length > 0
        ? db.from("assignments").insert(toInsert.map((p) => ({
            member_id: p.memberId,
            member_name: p.memberName,
            date: p.date,
          }))).then(({ error }) => { if (error) throw new Error(error.message); })
        : Promise.resolve(),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
