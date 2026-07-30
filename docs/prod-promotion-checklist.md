# Checklist: pasar de `dev` a `main` (producción)

Se creó el 2026-07-30, cuando `dev` estaba 83 commits adelante de `main`
(toda la sección Status de Proyectos + la auditoría de seguridad de esa
fecha nunca habían salido a producción). Repasar este archivo completo
antes de mergear `dev` → `main` — no asumir que es un merge trivial.

Este archivo se actualiza cada vez que se prepara/ejecuta una promoción a
`main`; no es append-only como `progress/history.md`.

## 1. Migraciones SQL pendientes de aplicar en Supabase **prod**

Todas las migraciones de `supabase/migrations/` posteriores a
`20260717220248_crear_hf_trending.sql` fueron aplicadas solo en Supabase
**dev**, nunca en prod (porque `/proyectos` nunca se desplegó a
producción). Al promover, correrlas en Supabase prod **en este orden**:

1. `20260728120000_crear_projects.sql` — ⚠️ inserta un seed de 4 proyectos
   dummy (Renovación de checkout online, Automatización de reposición de
   stock, App de fidelización de clientes, Optimización de bodegas
   regionales).
2. `20260728140000_reemplazar_seed_projects.sql` — borra esos 4 dummy y
   deja solo 1 proyecto real: "Probador Virtual".
3. `20260729120000_mover_status_a_projects.sql`
4. `20260729180000_cambiar_valores_status_projects.sql` — ⚠️ tiene 3
   `UPDATE ... WHERE id = <uuid hardcodeado>` que solo existen en el
   Supabase de dev donde se escribió. En prod (o cualquier bootstrap desde
   cero) esos UPDATE no matchean ninguna fila, y el
   `ALTER TABLE ADD CONSTRAINT` del final de esta misma migración **falla**
   (la fila del seed queda en `'on_track'`, valor inválido del check
   nuevo). Corregido por la migración siguiente — no se edita este archivo
   porque ya está aplicado en dev (convención de
   `supabase/migrations/README.md`).
5. `20260730120000_bloquear_acceso_anon.sql` — RLS lockdown (hallazgo de
   auditoría de seguridad, ver `specs/supabase-rls-lockdown/`).
6. `20260730160000_corregir_seed_status_por_nombre.sql` — corrige el
   problema del punto 4: hace el mismo `update ... set status = 'piloto'`
   pero filtrando por `name = 'Probador Virtual'` en vez de por id.
   Idempotente (en dev, donde el valor ya es `'piloto'`, no cambia nada) —
   segura de correr en cualquier entorno, incluido un bootstrap desde cero.

Corridas en orden, prod queda con **un solo proyecto real** ("Probador
Virtual", status `piloto`). Los proyectos que existan en dev más allá de
ese (a la fecha de este checklist: "Asistente de ventas Easy 2.0", "Asesor
de proyectos") se cargaron a mano desde la UI de `/proyectos`, **no vía
migración** — no van a aparecer solos en prod. Si se quieren ahí, hay que
volver a cargarlos manualmente desde la UI de prod después del deploy (o
decidir explícitamente que prod arranca solo con "Probador Virtual").

Antes de promover, revisar `ls supabase/migrations/` por si aparecieron
migraciones nuevas después de esta fecha y agregarlas a la lista de arriba.

**Orden código-antes-que-SQL, sin excepción**: desplegar el código de
`main` a producción primero, recién después correr el bloque de
migraciones — si se corre el SQL antes que el código, el CRUD de
equipo/asignaciones/plantillas/logs (y, en el caso de las migraciones 1-4,
todo `/proyectos`) se rompe para quien siga sirviendo el código viejo.

## 2. Variables de entorno a confirmar/crear en el hosting de prod (Vercel u otro)

- **`SUPABASE_SERVICE_ROLE_KEY`** — nueva. La necesita toda ruta
  server-side de `/proyectos` (`app/api/proyectos/**`) y de equipo/
  asignaciones (`app/api/team/**`, `app/api/public/**`, los 5 cron routes,
  `app/api/notify`). Antes de la feature `supabase-rls-lockdown` no hacía
  falta en prod porque `/proyectos` nunca se había desplegado ahí.
- Confirmar que `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  en prod apuntan al proyecto Supabase de **producción**, no al de dev.
- Confirmar que siguen presentes (ya deberían estarlo, pero vale
  reconfirmar en un cutover grande): `PIN`, `JWT_SECRET`, `GMAIL_USER`,
  `GMAIL_PASS`, `CRON_SECRET`, `AA_API_KEY`.

## 3. Pendiente de otra sesión — resolver antes o en el mismo cutover

- ~~`JWT_SECRET` con fallback hardcodeado~~ — resuelto el 2026-07-30, ver
  registro de promociones abajo.

## 4. Registro de promociones

- 2026-07-30: checklist creado, `dev` 83 commits adelante de `main`.
  Ninguna promoción ejecutada todavía.
- 2026-07-30: **promoción ejecutada.** Confirmado por el usuario antes del
  merge: `JWT_SECRET` seteado en Vercel Production, `SUPABASE_SERVICE_ROLE_KEY`
  creada/confirmada en Production, `NEXT_PUBLIC_SUPABASE_URL`/
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` apuntando al proyecto Supabase de prod.
  Se quitó el fallback hardcodeado de `JWT_SECRET` en `lib/auth.ts`,
  `app/api/auth/route.ts`, `app/api/notify/route.ts`, `proxy.ts` (chequeo
  lazy dentro de cada función, no a nivel de módulo, para no romper `next
  build` en entornos sin la env var en build-time) — commit `4327e20` en
  `dev`. `main` avanzó por fast-forward de `90c7143` a `4327e20` (sin
  conflictos, 101 archivos) y se pusheó a `origin/main`.
- 2026-07-30: **migraciones SQL aplicadas en Supabase prod.** No fue un
  solo bloque limpio — dos hallazgos importantes durante la ejecución:
  - **El editor SQL de Supabase no es una transacción única**: ejecuta
    cada sentencia con autocommit (no revierte las anteriores si una
    posterior falla dentro del mismo envío). El primer intento de correr
    el bloque completo de las 6 migraciones falló en el paso 2
    (`column "status" of relation "project_weekly_updates" does not
    exist`) porque un intento previo, no documentado en esta sesión, ya
    había dejado las migraciones 1–3 aplicadas parcialmente en prod.
    Se diagnosticó el estado real con consultas a
    `information_schema.columns`, `pg_constraint`, `pg_policies` y los
    datos de `projects`/`project_kpis`/`project_weekly_updates` antes de
    seguir, en vez de re-correr el bloque completo a ciegas.
  - **Prod tenía una policy extra que dev no tiene**: `members`,
    `assignments`, `templates`, `assignment_logs` tenían tanto
    `"anon full access"` (la que sí está en el historial de migraciones)
    como `"anon_all"` (mismo efecto — `ALL` para `anon` — pero de origen
    desconocido, no viene de ningún archivo en `supabase/migrations/`,
    probablemente de una configuración manual anterior a la convención de
    migraciones de este repo). El script de la migración 5 solo borraba
    `"anon full access"` por nombre — de haberlo corrido tal cual, la
    migración habría "tenido éxito" sin errores pero **`anon_all` habría
    seguido dando CRUD completo**, dejando el hallazgo crítico de la
    auditoría sin resolver en prod pese a que todo parecía estar bien.
    Se agregó `drop policy if exists "anon_all"` a las 4 tablas
    confidenciales antes de correr.
  - Estado final verificado con las mismas consultas de diagnóstico:
    `projects` tiene 1 fila real ("Probador Virtual", `status = 'piloto'`,
    con sus 3 KPIs y 1 avance semanal intactos); `members`/`assignments`/
    `templates`/`assignment_logs` sin ninguna policy para `anon` (deny
    total); `news_items`/`ai_models`/`research_papers`/`hf_trending` con
    únicamente `"anon read access"` (`SELECT`).
  - QA end-to-end en prod con el PIN de producción: ✅ confirmado por el
    usuario tras el incidente y fix descritos abajo.

- 2026-07-30: **incidente post-cutover — "no muestra nada" en prod.**
  Justo después de las migraciones SQL, el usuario reportó que ninguna
  sección cargaba datos: noticias, State of AI, calendario de asignados,
  equipo, log de cambios, todo vacío. Diagnóstico (con las herramientas
  MCP de Vercel, no solo curl — este sandbox no llega directo a
  `*.vercel.app`, hace falta `web_fetch_vercel_url`/`get_access_to_vercel_url`):
  - Primera hipótesis descartada: Deployment Protection de Vercel. El
    usuario confirmó con captura que "Vercel Authentication" y "Password
    Protection" estaban ambas apagadas — no era esto (el 403 inicial que
    vi era de la red del propio sandbox, no de Vercel).
  - Causa real: `GET /api/public/news` y `/api/public/ai-models`
    devolvían `500 {"error":"Invalid API key"}` — el error textual de
    Supabase cuando la key no corresponde al proyecto de la URL dada.
    `SUPABASE_SERVICE_ROLE_KEY` y/o `NEXT_PUBLIC_SUPABASE_URL` en Vercel
    **Production** no eran del mismo proyecto de Supabase (pese a que el
    usuario los había confirmado/creado antes del cutover). Como tras
    `supabase-rls-lockdown` **todas** las rutas (públicas y protegidas)
    pasan por `getSupabaseAdmin()`, un solo par de env vars mal
    emparejado rompía absolutamente todo a la vez — de ahí que pareciera
    "se perdieron todos los datos" cuando en realidad ninguna tabla se
    tocó.
  - Hallazgo colateral, no arreglado todavía: `app/api/team/logs/route.ts`
    devuelve `tableError: true` ante **cualquier** error de Supabase (no
    solo "tabla no existe"), y `ChangeLog.tsx` lo renderiza siempre como
    "Tabla no encontrada" con un `CREATE TABLE` sugerido — con este
    incidente, ese mensaje confundió más de lo que ayudó (la tabla sí
    existía). Candidato a mejora futura: distinguir el código de error de
    Postgres (`42P01`) del resto en vez de un catch-all genérico.
  - Fix: el usuario corrigió `SUPABASE_SERVICE_ROLE_KEY`/
    `NEXT_PUBLIC_SUPABASE_URL` en Vercel Production contra el dashboard
    real de Supabase prod y redesplegó. Confirmado funcionando de nuevo
    end-to-end.
