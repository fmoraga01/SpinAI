-- Tabla para State of AI: snapshot de modelos desde la API de
-- Artificial Analysis. Se refresca vía cron (app/api/cron/refresh-state-of-ai)
-- con upsert por id (UUID estable de la API). El campo evaluations guarda el
-- objeto completo de benchmarks porque su set evoluciona con el tiempo;
-- las columnas extraídas son las que la UI consulta/ordena directamente.

create table if not exists ai_models (
  id                 uuid primary key,
  name               text not null,
  slug               text not null,
  creator_name       text,
  creator_slug       text,
  release_date       date,
  intelligence_index numeric,
  coding_index       numeric,
  math_index         numeric,
  evaluations        jsonb not null default '{}'::jsonb,
  price_input_1m     numeric,
  price_output_1m    numeric,
  price_blended_1m   numeric,
  tokens_per_second  numeric,
  ttft_seconds       numeric,
  fetched_at         timestamptz not null default now()
);

create index if not exists ai_models_intelligence_idx on ai_models (intelligence_index desc);
create index if not exists ai_models_release_date_idx on ai_models (release_date desc);

alter table ai_models enable row level security;

create policy "anon full access" on ai_models
  for all to anon using (true) with check (true);
