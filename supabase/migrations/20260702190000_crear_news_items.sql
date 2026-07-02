-- Tabla para la sección de Noticias: guarda items agregados desde feeds RSS
-- de fuentes de IA. Se llena vía un cron (app/api/cron/refresh-news) y se
-- lee directamente desde el cliente con la anon key, igual que el resto
-- de las tablas de la app.

create table if not exists news_items (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,
  title        text not null,
  url          text not null unique,
  summary      text,
  image_url    text,
  published_at timestamptz not null,
  fetched_at   timestamptz not null default now()
);

create index if not exists news_items_published_at_idx on news_items (published_at desc);

alter table news_items enable row level security;

create policy "anon full access" on news_items
  for all to anon using (true) with check (true);
