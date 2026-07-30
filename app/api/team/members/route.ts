import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getNextFridays, nextFridayAfter, rowToMember } from "@/lib/teamRows";

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, email } = body ?? {};
  if (!name?.trim()) {
    return NextResponse.json({ error: "Campo requerido faltante: name" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("members")
    .insert({ name: name.trim(), email: email?.trim() || null, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const member = rowToMember(data);

  // Find the last assigned date and place the new member one Friday after it
  const { data: lastRow } = await db
    .from("assignments")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  const nextDate = lastRow && lastRow.length > 0
    ? nextFridayAfter(lastRow[0].date as string)
    : getNextFridays(1)[0];

  await db.from("assignments").insert({
    member_id: member.id,
    member_name: member.name,
    date: nextDate,
  });

  return NextResponse.json(member, { status: 201 });
}
