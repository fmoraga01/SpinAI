import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clearLogsIfNoAssignments, rowToLog } from "@/lib/teamRows";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = getSupabaseAdmin();

  // If no assignments exist, wipe logs and return empty
  await clearLogsIfNoAssignments(db);

  const { data, error } = await db
    .from("assignment_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ entries: [], tableError: true });
  return NextResponse.json({ entries: (data ?? []).map(rowToLog), tableError: false });
}
