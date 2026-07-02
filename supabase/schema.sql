-- SpinAI · esquema de base de datos
-- Ejecutar en el SQL editor de un proyecto Supabase nuevo (ej. spinai-dev)
-- para dejarlo con la misma estructura que producción.

create extension if not exists pgcrypto;

-- ─── members ────────────────────────────────────────────────────────────────

create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── assignments ────────────────────────────────────────────────────────────

create table if not exists assignments (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references members(id) on delete set null,
  member_name text,
  date        date not null,
  created_at  timestamptz not null default now()
);

create index if not exists assignments_date_idx on assignments (date);
create index if not exists assignments_member_id_idx on assignments (member_id);

-- ─── templates ──────────────────────────────────────────────────────────────

create table if not exists templates (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references assignments(id) on delete cascade,
  member_id     uuid references members(id) on delete set null,
  member_name   text,
  title         text,
  agenda        text[] default '{}',
  key_points    text[] default '{}',
  notes         text,
  theme         text default 'default',
  font          text default 'sans',
  size          text default 'md',
  updated_at    timestamptz not null default now()
);

-- ─── assignment_logs ────────────────────────────────────────────────────────

create table if not exists assignment_logs (
  id             uuid primary key default gen_random_uuid(),
  member_a_name  text,
  member_b_name  text,
  date_a         date,
  date_b         date,
  created_at     timestamptz not null default now()
);

create index if not exists assignment_logs_created_at_idx on assignment_logs (created_at desc);
