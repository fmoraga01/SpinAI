-- Corrige el tipo de agenda/key_points en templates: en producción son
-- jsonb, no text[] como se asumió en la migración inicial. El bloque
-- condicional hace esto seguro de correr tanto en dev (columnas text[])
-- como en producción (columnas que ya son jsonb).

do $$
begin
  if (select data_type from information_schema.columns
      where table_name = 'templates' and column_name = 'agenda') = 'ARRAY' then
    alter table templates alter column agenda drop default;
    alter table templates
      alter column agenda type jsonb using coalesce(array_to_json(agenda)::jsonb, '[]'::jsonb);
  end if;
  alter table templates alter column agenda set default '[]'::jsonb;

  if (select data_type from information_schema.columns
      where table_name = 'templates' and column_name = 'key_points') = 'ARRAY' then
    alter table templates alter column key_points drop default;
    alter table templates
      alter column key_points type jsonb using coalesce(array_to_json(key_points)::jsonb, '[]'::jsonb);
  end if;
  alter table templates alter column key_points set default '[]'::jsonb;
end $$;
