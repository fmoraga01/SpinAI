import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToProject } from "@/lib/projects";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .select("*, project_kpis(*), project_weekly_updates(*)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const projects = (data ?? []).map(rowToProject);
  return NextResponse.json(projects);
}
