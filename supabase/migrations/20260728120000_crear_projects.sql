-- Tabla para la sección de Status de Proyectos: listado + detalle de
-- proyectos internos con KPIs y avances semanales. A diferencia de
-- `news_items` y el resto de tablas del repo, esta data es confidencial de
-- negocio, así que NO se otorga ningún acceso al rol `anon` (RLS habilitado,
-- sin `create policy` para anon/authenticated -> deny por defecto). Solo el
-- `service_role` key (siempre bypassea RLS, server-side únicamente dentro
-- de las rutas API de esta feature) puede leer o escribir estas tablas.
-- Ver specs/project-status-tracking/design.md, sección "Esquema Supabase" y
-- "Seguridad y acceso a datos", para la justificación completa.

create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  summary       text not null,
  country       text not null,
  business_unit text not null,
  created_at    timestamptz not null default now()
);

create table if not exists project_kpis (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label      text not null,
  value      text not null,
  position   integer not null default 0
);

create table if not exists project_weekly_updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  week_of    date not null,
  status     text not null check (status in ('on_track', 'at_risk', 'delayed')),
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_kpis_project_id_idx on project_kpis (project_id);
create index if not exists project_weekly_updates_project_id_idx on project_weekly_updates (project_id);

alter table projects enable row level security;
alter table project_kpis enable row level security;
alter table project_weekly_updates enable row level security;

-- Sin `create policy` para anon/authenticated a propósito (R17): esta
-- data es confidencial. Solo service_role (server-side) puede leer/escribir.

-- Seed: 4 proyectos dummy, todos país "Chile", negocio "Paris" o "Easy"
-- distribuidos entre los 4 (R11), cada uno con >= 2 KPIs y >= 3 avances
-- semanales con distintos status.

with proyecto_1 as (
  insert into projects (name, summary, country, business_unit)
  values (
    'Renovación de checkout online',
    'Rediseño del flujo de pago para reducir el abandono de carrito en la tienda online.',
    'Chile',
    'Paris'
  )
  returning id
),
proyecto_2 as (
  insert into projects (name, summary, country, business_unit)
  values (
    'Automatización de reposición de stock',
    'Sistema de reposición automática entre bodegas y tiendas basado en demanda proyectada.',
    'Chile',
    'Easy'
  )
  returning id
),
proyecto_3 as (
  insert into projects (name, summary, country, business_unit)
  values (
    'App de fidelización de clientes',
    'Nueva app móvil de puntos y beneficios para clientes frecuentes.',
    'Chile',
    'Paris'
  )
  returning id
),
proyecto_4 as (
  insert into projects (name, summary, country, business_unit)
  values (
    'Optimización de bodegas regionales',
    'Reorganización logística de bodegas fuera de Santiago para acortar tiempos de despacho.',
    'Chile',
    'Easy'
  )
  returning id
),
kpis as (
  insert into project_kpis (project_id, label, value, position)
  select id, label, value, position from proyecto_1, (values
    ('Conversión de checkout', '3.8%', 0),
    ('Tiempo promedio de pago', '52s', 1)
  ) as k(label, value, position)
  union all
  select id, label, value, position from proyecto_2, (values
    ('Quiebres de stock', '6.1%', 0),
    ('Tiendas integradas', '18 de 42', 1)
  ) as k(label, value, position)
  union all
  select id, label, value, position from proyecto_3, (values
    ('Usuarios activos', '12.400', 0),
    ('Tasa de canje de puntos', '21%', 1)
  ) as k(label, value, position)
  union all
  select id, label, value, position from proyecto_4, (values
    ('Lead time de despacho', '2.3 días', 0),
    ('Bodegas optimizadas', '5 de 9', 1)
  ) as k(label, value, position)
  returning 1
),
updates as (
  insert into project_weekly_updates (project_id, week_of, status, note)
  select id, week_of, status, note from proyecto_1, (values
    (date '2026-07-06', 'on_track', 'Definición de flujo de pago aprobada por UX y negocio.'),
    (date '2026-07-13', 'on_track', 'Integración con pasarela de pago completada en ambiente de pruebas.'),
    (date '2026-07-20', 'at_risk', 'Se detectaron incompatibilidades con el sistema de facturación; se evalúa retraso de una semana.')
  ) as u(week_of, status, note)
  union all
  select id, week_of, status, note from proyecto_2, (values
    (date '2026-07-06', 'on_track', 'Modelo de proyección de demanda validado con datos históricos.'),
    (date '2026-07-13', 'on_track', 'Piloto lanzado en 6 tiendas de la Región Metropolitana.'),
    (date '2026-07-20', 'on_track', 'Resultados del piloto superan la meta de reducción de quiebres.')
  ) as u(week_of, status, note)
  union all
  select id, week_of, status, note from proyecto_3, (values
    (date '2026-07-06', 'delayed', 'Retraso en la aprobación de diseño por parte de marketing.'),
    (date '2026-07-13', 'at_risk', 'Diseño aprobado, pero el desarrollo de la app va una semana atrás del plan.'),
    (date '2026-07-20', 'at_risk', 'Se refuerza el equipo de desarrollo para recuperar el atraso.')
  ) as u(week_of, status, note)
  union all
  select id, week_of, status, note from proyecto_4, (values
    (date '2026-07-06', 'on_track', 'Diagnóstico logístico completado en las 9 bodegas regionales.'),
    (date '2026-07-13', 'on_track', 'Plan de reorganización aprobado para las primeras 5 bodegas.'),
    (date '2026-07-20', 'on_track', 'Reorganización completada en 3 de las 5 bodegas priorizadas.')
  ) as u(week_of, status, note)
  returning 1
)
-- Un CTE de escritura (insert/update/delete con WITH) se ejecuta siempre
-- que la query lo referencie, pero solo puede referenciarse si tiene
-- RETURNING (si no, no forma tabla temporal y Postgres lanza error). Este
-- SELECT final solo existe para dar ese RETURNING un destino y así forzar
-- la ejecución de ambos inserts.
select (select count(*) from kpis) + (select count(*) from updates);
