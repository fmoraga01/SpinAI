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

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
    .insert({ name: name.trim(), summary: summary.trim(), country: country.trim(), business_unit: businessUnit.trim() })
    .select("*, project_kpis(*), project_weekly_updates(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToProject(data), { status: 201 });
}
