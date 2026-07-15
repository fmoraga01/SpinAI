-- Agrega el campo opcional de timeboxing (tiempo total + tiempo/responsable
-- por ítem de agenda) a templates. null = feature desactivada para esa lámina.
alter table templates add column if not exists timing jsonb;
