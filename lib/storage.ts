import { AppData, TeamMember, Assignment } from "./types";

const STORAGE_KEY = "spinai_data";

function getDefaultData(): AppData {
  return { members: [], assignments: [] };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    return JSON.parse(raw) as AppData;
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addMember(name: string): TeamMember {
  const data = loadData();
  const member: TeamMember = {
    id: crypto.randomUUID(),
    name: name.trim(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  data.members.push(member);
  saveData(data);
  return member;
}

export function toggleMember(id: string): void {
  const data = loadData();
  const member = data.members.find((m) => m.id === id);
  if (member) {
    member.active = !member.active;
    saveData(data);
  }
}

export function removeMember(id: string): void {
  const data = loadData();
  data.members = data.members.filter((m) => m.id !== id);
  saveData(data);
}

export function addAssignment(memberId: string, date: string): Assignment {
  const data = loadData();
  const member = data.members.find((m) => m.id === memberId);
  if (!member) throw new Error("Member not found");
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    memberId,
    memberName: member.name,
    date,
    createdAt: new Date().toISOString(),
  };
  data.assignments.push(assignment);
  saveData(data);
  return assignment;
}

export function removeAssignment(id: string): void {
  const data = loadData();
  data.assignments = data.assignments.filter((a) => a.id !== id);
  saveData(data);
}

export function getNextFridays(count: number = 8): string[] {
  const fridays: string[] = [];
  const today = new Date();
  const current = new Date(today);

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

export interface BulkAssignmentPreview {
  memberId: string;
  memberName: string;
  date: string;
}

export function buildBulkAssignmentPreview(): BulkAssignmentPreview[] {
  const data = loadData();
  const activeMembers = data.members.filter((m) => m.active);
  if (activeMembers.length === 0) return [];

  const assignedDates = new Set(data.assignments.map((a) => a.date));

  // Get enough available Fridays (skip already assigned)
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

export function confirmBulkAssignment(previews: BulkAssignmentPreview[]): void {
  const data = loadData();
  const now = new Date().toISOString();
  for (const p of previews) {
    data.assignments.push({
      id: crypto.randomUUID(),
      memberId: p.memberId,
      memberName: p.memberName,
      date: p.date,
      createdAt: now,
    });
  }
  saveData(data);
}
