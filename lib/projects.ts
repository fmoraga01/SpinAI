import { ProjectStatus, Project, ProjectKpi, WeeklyUpdate } from "./types";

interface KpiRow {
  label: string;
  value: string;
  position: number;
}

interface UpdateRow {
  id: string;
  week_of: string;
  note: string;
}

interface ProjectRow {
  id: string;
  name: string;
  summary: string;
  country: string;
  business_unit: string;
  status: ProjectStatus;
  project_kpis?: KpiRow[] | null;
  project_weekly_updates?: UpdateRow[] | null;
}

export const VALID_STATUSES: ProjectStatus[] = ["desarrollo", "piloto", "produccion"];

export function rowToKpi(row: KpiRow): ProjectKpi {
  return { label: row.label, value: row.value };
}

export function rowToUpdate(row: UpdateRow): WeeklyUpdate {
  return { id: row.id, weekOf: row.week_of, note: row.note };
}

export function rowToProject(row: ProjectRow): Project {
  const kpis = [...(row.project_kpis ?? [])].sort((a, b) => a.position - b.position);
  const updates = [...(row.project_weekly_updates ?? [])];
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    country: row.country,
    businessUnit: row.business_unit,
    status: row.status,
    kpis: kpis.map(rowToKpi),
    updates: updates.map(rowToUpdate),
  };
}

/**
 * Dado un string de fecha "YYYY-MM-DD", devuelve el lunes de esa semana
 * (también "YYYY-MM-DD"). Usa mediodía local (`T12:00:00`) para construir
 * el `Date`, mismo truco que ya usa `weekLabel()` en `ProjectTimeline.tsx`
 * para evitar que la conversión UTC corra la fecha un día — y arma el
 * string de salida con getFullYear/getMonth/getDate (hora local), nunca
 * con `toISOString()`, por la misma razón.
 */
export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0 = domingo ... 6 = sábado
  const diff = day === 0 ? -6 : 1 - day; // días a restar para llegar al lunes
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function loadProjects(): Promise<Project[]> {
  const res = await fetch("/api/proyectos");
  if (!res.ok) throw new Error(`No se pudieron cargar los proyectos (${res.status})`);
  return res.json();
}

export async function loadProject(id: string): Promise<Project | null> {
  const res = await fetch(`/api/proyectos/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`No se pudo cargar el proyecto (${res.status})`);
  return res.json();
}

export interface ProjectFormValues {
  name: string;
  country: string;
  businessUnit: string;
  summary: string;
  status: ProjectStatus;
}

export async function createProject(values: ProjectFormValues): Promise<Project> {
  const res = await fetch("/api/proyectos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo crear el proyecto (${res.status})`);
  return res.json();
}

export async function updateProject(id: string, values: ProjectFormValues): Promise<Project> {
  const res = await fetch(`/api/proyectos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo actualizar el proyecto (${res.status})`);
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo eliminar el proyecto (${res.status})`);
}

export interface WeeklyUpdateFormValues {
  weekOf: string; // "YYYY-MM-DD", ya calculado como lunes por mondayOf()
  note: string;
}

export async function createWeeklyUpdate(projectId: string, values: WeeklyUpdateFormValues): Promise<WeeklyUpdate> {
  const res = await fetch(`/api/proyectos/${projectId}/avances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo guardar el avance (${res.status})`);
  return res.json();
}

export async function updateWeeklyUpdate(projectId: string, updateId: string, values: WeeklyUpdateFormValues): Promise<WeeklyUpdate> {
  const res = await fetch(`/api/proyectos/${projectId}/avances/${updateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo actualizar el avance (${res.status})`);
  return res.json();
}

export async function deleteWeeklyUpdate(projectId: string, updateId: string): Promise<void> {
  const res = await fetch(`/api/proyectos/${projectId}/avances/${updateId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `No se pudo eliminar el avance (${res.status})`);
}
