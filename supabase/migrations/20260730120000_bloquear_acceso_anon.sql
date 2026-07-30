-- Hallazgo de auditoría de seguridad (specs/supabase-rls-lockdown): las
-- políticas "anon full access" sobre members/assignments/templates/
-- assignment_logs permitían CRUD completo (insert/update/delete) al rol
-- `anon` — cuya key (NEXT_PUBLIC_SUPABASE_ANON_KEY) es pública, va en el
-- bundle del navegador — sin pasar por ninguna ruta protegida por PIN.
-- Estas 4 tablas son datos confidenciales de equipo (nombres, emails,
-- asignaciones, notas de reunión), así que se les quita todo acceso a
-- `anon` sin política de reemplazo (deny total, RLS ya habilitado desde
-- 20260702000000_esquema_inicial.sql) — mismo patrón que `projects` en
-- 20260728120000_crear_projects.sql. El acceso pasa ahora exclusivamente
-- por app/api/team/** (isAuthenticated + getSupabaseAdmin, service role).
-- Ver specs/supabase-rls-lockdown/design.md para el detalle completo.

drop policy if exists "anon full access" on members;
drop policy if exists "anon full access" on assignments;
drop policy if exists "anon full access" on templates;
drop policy if exists "anon full access" on assignment_logs;

-- Las tablas de solo-lectura pública (news_items/ai_models/research_papers/
-- hf_trending) tenían el mismo sobre-privilegio: `anon` podía borrar o
-- corromper el contenido vía REST API aunque el dato en sí no sea
-- confidencial. Se reemplaza "for all" por "for select" — la lectura
-- pública se mantiene (R4), pero insert/update/delete quedan denegados a
-- `anon`; los crons que escriben estas tablas migran a getSupabaseAdmin()
-- (service role, bypassea RLS) como parte de esta misma feature.

drop policy if exists "anon full access" on news_items;
create policy "anon read access" on news_items
  for select to anon using (true);

drop policy if exists "anon full access" on ai_models;
create policy "anon read access" on ai_models
  for select to anon using (true);

drop policy if exists "anon full access" on research_papers;
create policy "anon read access" on research_papers
  for select to anon using (true);

drop policy if exists "anon full access" on hf_trending;
create policy "anon read access" on hf_trending
  for select to anon using (true);
