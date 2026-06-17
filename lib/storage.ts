import { getSupabase } from "./supabase";
import { AppData, TeamMember, Assignment, Template, LogEntry } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function rowToMember(row: Record<string, unknown>): TeamMember {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? undefined,
    active: row.active as boolean,
    createdAt: row.created_at as string,
  };
}

function rowToAssignment(row: Record<string, unknown>): Assignment {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    memberName: row.member_name as string,
    date: row.date as string,
    createdAt: row.created_at as string,
  };
}

// ─── Load ────────────────────────────────────────────────────────────────────

export async function loadData(): Promise<AppData> {
  const db = getSupabase();
  const [{ data: members }, { data: assignments }] = await Promise.all([
    db.from("members").select("*").order("created_at"),
    db.from("assignments").select("*").order("date"),
  ]);

  const memberIds = new Set((members ?? []).map((r) => r.id as string));
  const allAssignments = (assignments ?? []).map(rowToAssignment);

  // Remove orphaned assignments whose member no longer exists
  const orphans = allAssignments.filter((a) => !memberIds.has(a.memberId));
  if (orphans.length > 0) {
    await db.from("assignments").delete().in("id", orphans.map((a) => a.id!));
  }

  return {
    members: (members ?? []).map(rowToMember),
    assignments: allAssignments.filter((a) => memberIds.has(a.memberId)),
  };
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function addMember(name: string): Promise<TeamMember> {
  const { data, error } = await getSupabase()
    .from("members")
    .insert({ name: name.trim(), active: true })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToMember(data);
}

export async function updateMemberEmail(id: string, email: string): Promise<void> {
  const { error } = await getSupabase()
    .from("members")
    .update({ email: email.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleMember(id: string): Promise<void> {
  const { data: current, error: fetchError } = await getSupabase()
    .from("members")
    .select("active")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await getSupabase()
    .from("members")
    .update({ active: !current.active })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function clearLogsIfNoAssignments(db: ReturnType<typeof getSupabase>): Promise<void> {
  const { count } = await db.from("assignments").select("*", { count: "exact", head: true });
  if (count === 0) await db.from("assignment_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

export async function removeMember(id: string): Promise<void> {
  const db = getSupabase();
  await db.from("assignments").delete().eq("member_id", id);
  const { error } = await db.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await clearLogsIfNoAssignments(db);
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function removeAssignment(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await clearLogsIfNoAssignments(db);
}

export async function swapAssignmentMembers(idA: string, idB: string): Promise<void> {
  const db = getSupabase();
  const { data, error } = await db
    .from("assignments")
    .select("id, member_id, member_name, date")
    .in("id", [idA, idB]);
  if (error) throw new Error(error.message);

  const a = data!.find((r) => r.id === idA)!;
  const b = data!.find((r) => r.id === idB)!;

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
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function loadLogs(): Promise<{ entries: LogEntry[]; tableError: boolean }> {
  const db = getSupabase();

  // If no assignments exist, wipe logs and return empty
  await clearLogsIfNoAssignments(db);

  const { data, error } = await db
    .from("assignment_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { entries: [], tableError: true };
  const entries = (data ?? []).map((r) => ({
    id: r.id as string,
    memberAName: r.member_a_name as string,
    memberBName: r.member_b_name as string,
    dateA: r.date_a as string,
    dateB: r.date_b as string,
    createdAt: r.created_at as string,
  }));
  return { entries, tableError: false };
}

// ─── Bulk assignment ─────────────────────────────────────────────────────────

export interface BulkAssignmentPreview {
  memberId: string;
  memberName: string;
  date: string;
}

export function getNextFridays(count: number = 8): string[] {
  const fridays: string[] = [];
  const current = new Date();

  const dayOfWeek = current.getDay();
  const daysUntilFriday = dayOfWeek < 5 ? 5 - dayOfWeek : dayOfWeek === 5 ? 7 : 6;
  current.setDate(current.getDate() + daysUntilFriday);

  for (let i = 0; i < count; i++) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    fridays.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
  }

  return fridays;
}

export async function buildBulkAssignmentPreview(): Promise<BulkAssignmentPreview[]> {
  const data = await loadData();
  const activeMembers = data.members.filter((m) => m.active);
  if (activeMembers.length === 0) return [];

  const assignedDates = new Set(data.assignments.map((a) => a.date));

  const needed = activeMembers.length;
  const candidates = getNextFridays(needed + assignedDates.size + 4);
  const available = candidates.filter((d) => !assignedDates.has(d)).slice(0, needed);

  // Fisher-Yates shuffle
  const shuffled = [...activeMembers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((member, i) => ({
    memberId: member.id,
    memberName: member.name,
    date: available[i],
  }));
}

export async function confirmBulkAssignment(previews: BulkAssignmentPreview[]): Promise<void> {
  const rows = previews.map((p) => ({
    member_id: p.memberId,
    member_name: p.memberName,
    date: p.date,
  }));

  const { error } = await getSupabase().from("assignments").insert(rows);
  if (error) throw new Error(error.message);
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function loadTemplate(assignmentId: string): Promise<Template | null> {
  const { data } = await getSupabase()
    .from("templates")
    .select("*")
    .eq("assignment_id", assignmentId)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    assignmentId: data.assignment_id,
    memberId: data.member_id,
    memberName: data.member_name,
    title: data.title,
    agenda: data.agenda ?? [],
    keyPoints: data.key_points ?? [],
    notes: data.notes,
  };
}

export async function saveTemplate(template: Template): Promise<void> {
  const row = {
    assignment_id: template.assignmentId,
    member_id: template.memberId,
    member_name: template.memberName,
    title: template.title,
    agenda: template.agenda,
    key_points: template.keyPoints,
    notes: template.notes,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getSupabase()
    .from("templates")
    .upsert(row, { onConflict: "assignment_id" });

  if (error) throw new Error(error.message);
}
