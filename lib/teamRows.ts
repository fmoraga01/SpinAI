import type { SupabaseClient } from "@supabase/supabase-js";
import { AppData, Assignment, LogEntry, MeetingTiming, TeamMember } from "./types";

/**
 * Helpers server-side compartidos por las rutas de app/api/team/** —
 * mapeo de filas crudas de Supabase, limpieza de datos (asignaciones
 * huérfanas, logs sin asignaciones) y lógica de negocio que antes vivía en
 * lib/storage.ts corriendo con el cliente anon desde el navegador, movida
 * acá para correr server-side con getSupabaseAdmin() (ver
 * specs/supabase-rls-lockdown/design.md, punto 3). Solo se importa desde
 * app/api/team/** (nunca desde componentes "use client").
 */

export function rowToMember(row: Record<string, unknown>): TeamMember {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? undefined,
    active: row.active as boolean,
    createdAt: row.created_at as string,
  };
}

export function rowToAssignment(row: Record<string, unknown>): Assignment {
  return {
    id: row.id as string,
    memberId: (row.member_id as string | null) ?? null,
    memberName: (row.member_name as string | null) ?? null,
    date: row.date as string,
    createdAt: row.created_at as string,
  };
}

export function rowToLog(row: Record<string, unknown>): LogEntry {
  return {
    id: row.id as string,
    memberAName: row.member_a_name as string,
    memberBName: row.member_b_name as string,
    dateA: row.date_a as string,
    dateB: row.date_b as string,
    createdAt: row.created_at as string,
  };
}

export function nextFridayAfter(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export function sanitizeTiming(raw: unknown, agendaLength: number): MeetingTiming | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (!t.enabled || !Array.isArray(t.items)) return null;

  const items = t.items.slice(0, agendaLength).map((item) => {
    const i = (item ?? {}) as Record<string, unknown>;
    return {
      minutes: typeof i.minutes === "number" && i.minutes > 0 ? i.minutes : 1,
      memberId: (i.memberId as string | null) ?? null,
      memberName: (i.memberName as string | null) ?? null,
    };
  });
  while (items.length < agendaLength) items.push({ minutes: 1, memberId: null, memberName: null });

  return {
    enabled: true,
    totalMinutes: typeof t.totalMinutes === "number" && t.totalMinutes > 0 ? t.totalMinutes : items.reduce((s, i) => s + i.minutes, 0),
    items,
  };
}

export async function clearLogsIfNoAssignments(db: SupabaseClient): Promise<void> {
  const { count } = await db.from("assignments").select("*", { count: "exact", head: true });
  if (count === 0) await db.from("assignment_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

/**
 * Carga members + assignments, saneando asignaciones huérfanas (member_id
 * que ya no existe) y member_name desincronizado — misma lógica que la
 * loadData() original de lib/storage.ts, ahora corriendo server-side.
 */
export async function loadTeamData(db: SupabaseClient): Promise<AppData> {
  const [{ data: members }, { data: assignments }] = await Promise.all([
    db.from("members").select("*").order("created_at"),
    db.from("assignments").select("*").order("date"),
  ]);

  const memberMap = new Map((members ?? []).map((r) => [r.id as string, r.name as string]));
  const allAssignments = (assignments ?? []).map(rowToAssignment);

  // Remove orphaned assignments: assigned to a member_id that no longer exists
  const orphans = allAssignments.filter((a) => a.memberId && !memberMap.has(a.memberId));
  if (orphans.length > 0) {
    await db.from("assignments").delete().in("id", orphans.map((a) => a.id!));
  }

  const valid = allAssignments.filter((a) => !a.memberId || memberMap.has(a.memberId));

  // Sync stale member_name in assignments (handles renames before propagation fix)
  const stale = valid.filter((a) => a.memberId && memberMap.get(a.memberId) !== a.memberName);
  if (stale.length > 0) {
    await Promise.all(
      stale.map((a) =>
        db.from("assignments").update({ member_name: memberMap.get(a.memberId!) }).eq("id", a.id!)
      )
    );
    stale.forEach((a) => { a.memberName = memberMap.get(a.memberId!)!; });
  }

  return {
    members: (members ?? []).map(rowToMember),
    assignments: valid,
  };
}

export interface BulkAssignmentPreview {
  memberId: string;
  memberName: string;
  date: string;
}

/**
 * Misma lógica que buildBulkAssignmentPreview() original: arma el
 * preview de la próxima asignación masiva sin escribir en Supabase.
 */
export async function buildBulkPreview(db: SupabaseClient): Promise<BulkAssignmentPreview[]> {
  const data = await loadTeamData(db);
  const activeMembers = data.members.filter((m) => m.active);
  if (activeMembers.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  // Unassigned future slots (member removed) — fill these first
  const unassignedDates = data.assignments
    .filter((a) => !a.memberId && a.date >= today)
    .map((a) => a.date)
    .sort();
  // Already assigned future dates — skip these
  const takenDates = new Set(
    data.assignments.filter((a) => a.memberId).map((a) => a.date)
  );

  const needed = activeMembers.length;
  const newFridays = getNextFridays(needed + data.assignments.length + 4)
    .filter((d) => !takenDates.has(d) && !unassignedDates.includes(d));

  const available = [...unassignedDates, ...newFridays].slice(0, needed);

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
