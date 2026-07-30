import { AppData, TeamMember, Template, LogEntry } from "./types";
import { getNextFridays as getNextFridaysShared } from "./teamRows";

/**
 * Cliente para las tablas confidenciales de equipo/asignaciones/plantillas/
 * logs — ya no llama a Supabase directo (anon key) desde el navegador,
 * sino que pasa por app/api/team/** (isAuthenticated + getSupabaseAdmin
 * server-side). Ver specs/supabase-rls-lockdown/design.md, punto 3. Las
 * firmas exportadas se mantienen idénticas a las de antes de esta feature
 * para no requerir cambios en los componentes consumidores.
 */

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body?.error ?? fallback;
}

// ─── Load ────────────────────────────────────────────────────────────────────

export async function loadData(): Promise<AppData> {
  const res = await fetch("/api/team");
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo cargar el equipo (${res.status})`));
  return res.json();
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function addMember(name: string, email?: string): Promise<TeamMember> {
  const res = await fetch("/api/team/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo agregar el miembro (${res.status})`));
  return res.json();
}

export async function updateMemberName(id: string, name: string): Promise<void> {
  const res = await fetch(`/api/team/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo actualizar el nombre (${res.status})`));
}

export async function updateMemberEmail(id: string, email: string): Promise<void> {
  const res = await fetch(`/api/team/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo actualizar el email (${res.status})`));
}

export async function toggleMember(id: string): Promise<void> {
  const res = await fetch(`/api/team/members/${id}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo activar/desactivar el miembro (${res.status})`));
}

export async function removeMember(id: string): Promise<void> {
  const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo eliminar el miembro (${res.status})`));
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function removeAssignment(id: string): Promise<void> {
  const res = await fetch(`/api/team/assignments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo eliminar la asignación (${res.status})`));
}

export async function swapAssignmentMembers(idA: string, idB: string): Promise<void> {
  const res = await fetch("/api/team/assignments/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idA, idB }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo intercambiar la asignación (${res.status})`));
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function loadLogs(): Promise<{ entries: LogEntry[]; tableError: boolean }> {
  const res = await fetch("/api/team/logs");
  if (!res.ok) return { entries: [], tableError: true };
  return res.json();
}

// ─── Bulk assignment ─────────────────────────────────────────────────────────

export interface BulkAssignmentPreview {
  memberId: string;
  memberName: string;
  date: string;
}

// Lógica pura (fechas, sin red) — se queda igual, ahora delegando al
// helper compartido de lib/teamRows.ts para no duplicar la implementación
// (el mismo cálculo también lo necesita app/api/team/assignments/bulk-preview
// server-side).
export function getNextFridays(count: number = 8): string[] {
  return getNextFridaysShared(count);
}

export async function buildBulkAssignmentPreview(): Promise<BulkAssignmentPreview[]> {
  const res = await fetch("/api/team/assignments/bulk-preview");
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo generar la asignación masiva (${res.status})`));
  return res.json();
}

export async function confirmBulkAssignment(previews: BulkAssignmentPreview[]): Promise<void> {
  const res = await fetch("/api/team/assignments/bulk-confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previews }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo confirmar la asignación masiva (${res.status})`));
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function loadTemplate(assignmentId: string): Promise<Template | null> {
  const res = await fetch(`/api/team/templates/${assignmentId}`);
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo cargar la plantilla (${res.status})`));
  return res.json();
}

export async function saveTemplate(template: Template): Promise<void> {
  const res = await fetch(`/api/team/templates/${template.assignmentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `No se pudo guardar la plantilla (${res.status})`));
}
