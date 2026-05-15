import { supabase } from "./supabase";
import { AppData, TeamMember, Assignment } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function rowToMember(row: Record<string, unknown>): TeamMember {
  return {
    id: row.id as string,
    name: row.name as string,
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
  const [{ data: members }, { data: assignments }] = await Promise.all([
    supabase.from("members").select("*").order("created_at"),
    supabase.from("assignments").select("*").order("date"),
  ]);

  return {
    members: (members ?? []).map(rowToMember),
    assignments: (assignments ?? []).map(rowToAssignment),
  };
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function addMember(name: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from("members")
    .insert({ name: name.trim(), active: true })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToMember(data);
}

export async function toggleMember(id: string): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from("members")
    .select("active")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("members")
    .update({ active: !current.active })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function removeAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
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

  const { error } = await supabase.from("assignments").insert(rows);
  if (error) throw new Error(error.message);
}
