import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeTiming } from "@/lib/teamRows";
import { Template } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { assignmentId } = await params;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("templates")
    .select("*")
    .eq("assignment_id", assignmentId)
    .single();

  if (!data) return NextResponse.json(null);

  const agenda: string[] = data.agenda ?? [];
  const template: Template = {
    id: data.id,
    assignmentId: data.assignment_id,
    memberId: data.member_id,
    memberName: data.member_name,
    title: data.title,
    agenda,
    keyPoints: data.key_points ?? [],
    notes: data.notes,
    theme: data.theme ?? "default",
    font: data.font ?? "sans",
    size: data.size ?? "md",
    timing: sanitizeTiming(data.timing, agenda.length),
  };
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { assignmentId } = await params;
  const body = await req.json();
  const template: Template = body ?? {};

  const row = {
    assignment_id: assignmentId,
    member_id: template.memberId,
    member_name: template.memberName,
    title: template.title,
    agenda: template.agenda,
    key_points: template.keyPoints,
    notes: template.notes,
    theme: template.theme,
    font: template.font,
    size: template.size,
    timing: template.timing,
    updated_at: new Date().toISOString(),
  };

  const db = getSupabaseAdmin();
  const { error } = await db.from("templates").upsert(row, { onConflict: "assignment_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
