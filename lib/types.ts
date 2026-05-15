export interface TeamMember {
  id: string;
  name: string;
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

export interface Template {
  id?: string;
  assignmentId: string;
  memberId: string;
  memberName: string;
  title: string;
  agenda: string[];
  keyPoints: string[];
  notes: string;
}
