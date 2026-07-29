-- Mueve el campo de estado (on_track/at_risk/delayed) del avance semanal
-- (`project_weekly_updates.status`) al proyecto (`projects.status`) — "el
-- estado es propio del proyecto, el avance no debe tener estados" (decisión
-- explícita del usuario, 2026-07-29). Ver
-- specs/project-status-field/requirements.md (R1-R6) y design.md.
--
-- Secuencia obligatoria: `projects` ya tiene datos reales en el Supabase de
-- dev del usuario (ver 20260728140000_reemplazar_seed_projects.sql), así
-- que un `add column ... not null` directo, sin backfill, falla contra
-- filas existentes. Se agrega la columna nullable primero, se puebla, y
-- solo entonces se aplica NOT NULL + el check.

-- 1. Agregar la columna, nullable por ahora (se cierra en el paso 3).
alter table projects add column status text;

-- 2. Backfill: para cada proyecto, tomar el status del avance semanal más
-- reciente (mayor week_of) vía subquery correlacionada — funciona para
-- cualquier número de proyectos existentes, no asume que solo existe
-- "Probador Virtual" ni hardcodea su id. Si un proyecto no tiene ningún
-- avance semanal, no hay de dónde derivar su estado; se usa 'on_track'
-- como único valor por defecto explícito para ese caso (no hay otro dato
-- disponible en ese escenario).
update projects p
set status = coalesce(
  (
    select u.status
    from project_weekly_updates u
    where u.project_id = p.id
    order by u.week_of desc
    limit 1
  ),
  'on_track'
)
where p.status is null;

-- 3. Toda fila tiene ya un valor: aplicar NOT NULL + el mismo check de 3
-- valores que ya tenía project_weekly_updates.status.
alter table projects
  alter column status set not null,
  add constraint projects_status_check check (status in ('on_track', 'at_risk', 'delayed'));

-- 4. Quitar el status del avance semanal — irreversible una vez aplicado
-- (se pierde el historial de estado por semana). Decisión consciente,
-- confirmada por el usuario antes de escribir esta spec: un avance semanal
-- pasa a tener solo week_of + note.
alter table project_weekly_updates drop column status;

-- No se toca RLS: projects y project_weekly_updates siguen sin policy para
-- anon/authenticated (deny-by-default), solo service_role server-side —
-- este cambio es de columnas, no de acceso.
