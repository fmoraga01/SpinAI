-- Tabla para la sección de Investigación de State of AI: snapshot de
-- papers recientes de arXiv (categoría cs.AI), vía cron
-- (app/api/cron/refresh-research). Mismo patrón de RLS que el resto.

create table if not exists research_papers (
  id           uuid primary key default gen_random_uuid(),
  arxiv_id     text not null unique,
  title        text not null,
  authors      text[] not null default '{}',
  summary      text,
  url          text not null,
  published_at timestamptz not null,
  fetched_at   timestamptz not null default now()
);

create index if not exists research_papers_published_at_idx on research_papers (published_at desc);

alter table research_papers enable row level security;

create policy "anon full access" on research_papers
  for all to anon using (true) with check (true);
