import { HealthStatus, Project, ProjectKpi, WeeklyUpdate } from "./types";

interface KpiRow {
  label: string;
  value: string;
  position: number;
}

interface UpdateRow {
  id: string;
  week_of: string;
  status: HealthStatus;
  note: string;
}

interface ProjectRow {
  id: string;
  name: string;
  summary: string;
  country: string;
  business_unit: string;
  project_kpis?: KpiRow[] | null;
  project_weekly_updates?: UpdateRow[] | null;
}

export function rowToKpi(row: KpiRow): ProjectKpi {
  return { label: row.label, value: row.value };
}

export function rowToUpdate(row: UpdateRow): WeeklyUpdate {
  return { id: row.id, weekOf: row.week_of, status: row.status, note: row.note };
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
    kpis: kpis.map(rowToKpi),
    updates: updates.map(rowToUpdate),
  };
}

/**
 * Deriva el estado de salud de un proyecto a partir de la entrada más
 * reciente (por weekOf) de su timeline de avances semanales. Devuelve
 * `null` si no hay ninguna entrada (R3) — no asume `on_track` por defecto.
 */
export function healthFromTimeline(updates: WeeklyUpdate[]): HealthStatus | null {
  if (updates.length === 0) return null;
  const latest = [...updates].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
  return latest.status;
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
