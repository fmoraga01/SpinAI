export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
}

export interface Assignment {
  id: string;
  memberId: string | null;
  memberName: string | null;
  date: string; // ISO date string (Friday)
  createdAt: string;
}

export interface AppData {
  members: TeamMember[];
  assignments: Assignment[];
}

export type SlideTheme = "default" | "minimal" | "blueprint" | "warm";
export type SlideFont = "sans" | "mono" | "serif" | "impact";
export type SlideSize = "sm" | "md" | "lg";

export interface AgendaTimingItem {
  minutes: number;
  memberId: string | null;
  memberName: string | null;
}

export interface MeetingTiming {
  enabled: boolean;
  totalMinutes: number;
  items: AgendaTimingItem[]; // paralelo a agenda[]: mismo orden y longitud
}

export interface Template {
  id?: string;
  assignmentId: string;
  memberId: string;
  memberName: string;
  title: string;
  agenda: string[];
  keyPoints: string[];
  notes: string;
  theme: SlideTheme;
  font: SlideFont;
  size: SlideSize;
  timing: MeetingTiming | null;
}

export interface LogEntry {
  id: string;
  memberAName: string;
  memberBName: string;
  dateA: string;
  dateB: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  url: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string;
}

export interface ProjectKpi {
  label: string; // "Adopción"
  value: string; // "42%" — string libre, admite unidades/formato variado
}

export type HealthStatus = "on_track" | "at_risk" | "delayed";

export interface WeeklyUpdate {
  id: string;
  weekOf: string; // ISO date (lunes de la semana)
  note: string;
}

export interface Project {
  id: string;
  name: string;
  summary: string;
  country: string; // texto libre — hoy siempre "Chile"
  businessUnit: string; // texto libre — "Paris" | "Easy" hoy
  status: HealthStatus;
  kpis: ProjectKpi[];
  updates: WeeklyUpdate[]; // orden de inserción arbitrario; se ordena al leer
}
