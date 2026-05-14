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

  // Find next Friday (5 = Friday)
  const dayOfWeek = current.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
  current.setDate(current.getDate() + daysUntilFriday);

  for (let i = 0; i < count; i++) {
    fridays.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 7);
  }

  return fridays;
}
