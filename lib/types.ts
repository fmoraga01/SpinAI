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
  memberId: string;
  memberName: string;
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
}

export interface LogEntry {
  id: string;
  memberAName: string;
  memberBName: string;
  dateA: string;
  dateB: string;
  createdAt: string;
}
