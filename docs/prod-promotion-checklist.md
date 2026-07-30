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
4. `20260729180000_cambiar_valores_status_projects.sql`
5. `20260730120000_bloquear_acceso_anon.sql` — RLS lockdown (hallazgo de
   auditoría de seguridad, ver `specs/supabase-rls-lockdown/`).

Corridas en orden, prod queda con **un solo proyecto real** ("Probador
Virtual"). Los proyectos que existan en dev más allá de ese (a la fecha de
este checklist: "Asistente de ventas Easy 2.0", "Asesor de proyectos") se
cargaron a mano desde la UI de `/proyectos`, **no vía migración** — no van
a aparecer solos en prod. Si se quieren ahí, hay que volver a cargarlos
manualmente desde la UI de prod después del deploy (o decidir explícitamente
que prod arranca solo con "Probador Virtual").

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
  - **PENDIENTE, a ejecutar por el usuario ahora que el código está
    desplegado**: correr en Supabase **prod** las 5 migraciones de la
    sección 1 de este archivo, en orden — el código ya está afuera, así
    que el orden código-antes-que-SQL ya se cumple en cuanto se corran.
  - **PENDIENTE**: QA end-to-end en prod (equivalente al que se hizo en
    dev) una vez aplicadas las migraciones.
