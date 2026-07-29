-- Cambia el significado de los 3 valores de projects.status: de
-- "salud/riesgo" (on_track/at_risk/delayed, semáforo verde/ámbar/rojo) a
-- "etapa del ciclo de vida del proyecto" (desarrollo/piloto/produccion).
-- Decisión explícita del usuario, 2026-07-29 — ver
-- specs/project-status-values-rename/requirements.md (R1-R4).
--
-- No se toca la estructura de la columna (sigue siendo `text not null`);
-- solo cambia qué valores acepta la constraint, más los datos de las 3
-- filas reales que existen hoy en este entorno.
--
-- Secuencia obligatoria: la constraint vieja (projects_status_check)
-- rechaza cualquier valor fuera de ('on_track','at_risk','delayed'), así
-- que hay que eliminarla ANTES de actualizar las filas a los valores
-- nuevos. Si se intentara agregar la constraint nueva antes del update,
-- Postgres la validaría contra los datos existentes y fallaría mientras
-- alguna fila todavía diga 'on_track'.

-- 1. Eliminar la constraint vieja.
alter table projects drop constraint projects_status_check;

-- 2. Actualizar las 3 filas reales existentes en este entorno, por id
-- exacto (no por name, para ser robusto ante un rename futuro del
-- proyecto). Mapeo confirmado explícitamente por el usuario — ver
-- requirements.md.
update projects set status = 'desarrollo'
where id = 'b19cbec7-1786-47e9-a51a-bd3fa376b5fb'; -- Asistente de ventas Easy 2.0

update projects set status = 'piloto'
where id = 'fcc466f1-c6e3-4f53-bf44-4797aa48816f'; -- Probador Virtual

update projects set status = 'desarrollo'
where id = '887b9ea4-c746-4f93-9773-ef26c007d490'; -- Asesor de proyectos

-- 3. Agregar la constraint nueva — recién ahora que las 3 filas existentes
-- ya cumplen el dominio nuevo.
alter table projects
  add constraint projects_status_check check (status in ('desarrollo', 'piloto', 'produccion'));

-- No se toca RLS: sin cambios de policy, este cambio es de valores de
-- datos y de constraint, no de acceso.
