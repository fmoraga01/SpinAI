-- Tabla para la sección "Trending en Hugging Face" de State of AI: snapshot
-- diario de modelos y papers trending según los endpoints públicos (no
-- documentados oficialmente, pero sin key) de huggingface.co. A diferencia
-- de research_papers/news_items (que acumulan historial), esta tabla es un
-- snapshot puro del "hoy" — el cron borra por kind y reinserta en cada
-- corrida, así que un ítem que deja de estar trending desaparece.

create table if not exists hf_trending (
  id           text not null,
  kind         text not null check (kind in ('model', 'paper')),
  title        text not null,
  url          text not null,
  author       text,
  summary      text,
  likes        integer,
  pipeline_tag text,
  fetched_at   timestamptz not null default now(),
  primary key (kind, id)
);

create index if not exists hf_trending_kind_idx on hf_trending (kind, likes desc);

alter table hf_trending enable row level security;

create policy "anon full access" on hf_trending
  for all to anon using (true) with check (true);
