-- Reemplaza el seed dummy de 4 proyectos (Status de Proyectos) por el
-- primer proyecto real: Probador Virtual (VTO) de Paris.cl. Se deja un
-- solo proyecto por ahora, a pedido explícito — más proyectos reales se
-- agregarán en migraciones futuras del mismo estilo.

delete from projects where name in (
  'Renovación de checkout online',
  'Automatización de reposición de stock',
  'App de fidelización de clientes',
  'Optimización de bodegas regionales'
);
-- ON DELETE CASCADE en project_kpis/project_weekly_updates limpia sus
-- filas asociadas automáticamente.

with proyecto as (
  insert into projects (name, summary, country, business_unit)
  values (
    'Probador Virtual',
    'Probador Virtual (VTO) para los canales digitales de Paris.cl | Tu experiencia de compra más confiable y segura: permite al usuario subir una foto, tomarse una con la cámara o usar un avatar, y visualizar cómo se vería una prenda antes de comprarla. No es una feature aislada, sino un habilitador que acompaña y valida la decisión de compra, reduciendo la incertidumbre asociada a la compra online.',
    'Chile',
    'Easy'
  )
  returning id
),
kpis as (
  insert into project_kpis (project_id, label, value, position)
  select id, label, value, position from proyecto, (values
    ('Adopción', 'Sesiones por día, sesiones por dispositivo, % por método de entrada (upload/cámara/avatar)', 0),
    ('Generación', 'Generaciones totales, tasa de éxito vs. error', 1),
    ('Interacción/Conversión', 'Tasa de conversión a PDP, potencial de venta', 2)
  ) as k(label, value, position)
  returning 1
),
updates as (
  insert into project_weekly_updates (project_id, week_of, status, note)
  select id, week_of, status, note from proyecto, (values
    (
      date '2026-07-27',
      'on_track',
      'Continuidad del piloto: se trabajó en mejorar y corregir la visualización de algunos gráficos del dashboard de MongoDB. Se continuó desarrollando los emails de notificación para los umbrales de consumo. El día miércoles es la reunión de status, donde se revisarán las métricas del producto post lanzamiento junto al equipo comercial de Paris, cruzándolas con la venta.'
    )
  ) as u(week_of, status, note)
  returning 1
)
select (select count(*) from kpis) + (select count(*) from updates);
