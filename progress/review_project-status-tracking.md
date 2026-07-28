# Review — project-status-tracking

**Verdict: APPROVED** (ronda 3, re-revisión del 2026-07-28 — ver
["Re-revisión"](#re-revisión-ronda-3--2026-07-28) al final del archivo).

El cuerpo que sigue es la **ronda 2**, que dio `REJECTED`. Se conserva
íntegro a propósito: documenta el defecto encontrado y cómo se demostró.
El veredicto vigente es el de la re-revisión al final.

---

## Ronda 2 — Verdict: REJECTED (superado)

> **Este archivo reemplaza la revisión anterior.** La revisión previa
> (2026-07-28) la escribió el mismo agente/sesión que implementó la feature,
> actuando como `leader` + `implementer` + `reviewer` a la vez, y ella misma
> lo dejó anotado como caveat. Esta revisión la hace un `reviewer`
> independiente que no escribió nada de este código. Su veredicto era
> **APPROVED**; el de esta es **REJECTED**, por un defecto que la revisión
> anterior no podía detectar porque se limitó a leer el `.sql` en vez de
> ejecutarlo. El texto anterior se resume en la sección "Qué se le pasó a la
> revisión anterior" y no se conserva completo — el histórico está en git.

## Motivo del rechazo (bloqueante)

**R11 no se cumple: la migración falla al ejecutarse y no siembra nada.**

`supabase/migrations/20260728120000_crear_projects.sql` termina con:

```sql
select (select count(*) from kpis) + (select count(*) from updates);
```

pero ni el CTE `kpis` ni el CTE `updates` tienen cláusula `returning`. En
Postgres, un CTE de escritura **sin `RETURNING` no forma tabla temporal y no
puede referenciarse** en el resto de la query. Ejecutado contra Postgres 16
real (no lectura de código), el archivo falla:

```
psql:.../20260728120000_crear_projects.sql:142: ERROR:  WITH query "kpis" does not have a RETURNING clause
LINE 92: select (select count(*) from kpis) + (select count(*) from u...
```

Consecuencias:

- Los `create table` / `create index` / `alter table ... enable row level
  security` sí se aplican (son statements independientes anteriores), pero
  **el statement de seed completo aborta**: 0 proyectos, 0 KPIs, 0 avances.
- Quien aplique esto en el SQL Editor de Supabase queda con las 3 tablas
  vacías y un error rojo, y `/proyectos` muestra el empty state para siempre.
  No hay forma de que R11 ("sembrar exactamente 4 proyectos dummy...") se
  cumpla con el archivo tal como está.

El comentario que precede a ese `select` invierte la regla real de Postgres:

```sql
-- El SELECT final debe referenciar todos los CTEs de escritura (kpis,
-- updates) para que Postgres los ejecute: un WITH con INSERT que no es
-- referenciado por la query principal no se ejecuta.
```

Es falso en las dos direcciones: (a) los CTEs de escritura se ejecutan
siempre y hasta completarse, se referencien o no; y (b) referenciarlos sin
`RETURNING` es precisamente lo que rompe la query. La misma afirmación
errónea es la "verificación" que `impl_project-status-tracking.md` declara
para R11.

**Corrección verificada**: agregando `returning 1` a los CTEs `kpis` y
`updates`, el archivo corre limpio y produce el seed correcto. Verificado en
Postgres 16 local:

| proyecto | país | negocio | kpis | avances |
|---|---|---|---|---|
| Renovación de checkout online | Chile | Paris | 2 | 3 |
| Automatización de reposición de stock | Chile | Easy | 2 | 3 |
| App de fidelización de clientes | Chile | Paris | 2 | 3 |
| Optimización de bodegas regionales | Chile | Easy | 2 | 3 |

Es decir: **el contenido del seed sí cumple R11** (4 proyectos, los 4
"Chile", 2 "Paris" + 2 "Easy", ≥2 KPIs y ≥3 avances cada uno con distintos
`status`). Lo único roto es el mecanismo de ejecución. El arreglo es de dos
líneas.

## Checkpoints (`CHECKPOINTS.md` — "Before `in_review`")

1. **Toda tarea de `tasks.md` marcada `[x]`** — PASS formal / FAIL sustantivo.
   T1–T9 están todas en `[x]`, pero T1 ("Migración Supabase con seed") está
   marcada completa y su entregable no se ejecuta.
2. **`npm run lint`** — PASS. Corrido de forma independiente, sin salida ni
   errores.
3. **`npm run build`** — PASS. Corrido de forma independiente; compila, TS
   check limpio, el route map incluye `/proyectos`, `/proyectos/[id]`,
   `/api/proyectos`, `/api/proyectos/[id]`.
4. **`npm run test`** — PASS. 9/9 en 2 archivos, incluidos los 4 de
   `lib/projects.test.ts` sobre `healthFromTimeline`.
5. **`npm run check-sdd-state`** — PASS.
6. **Lógica nueva en `lib/` tiene test Vitest real** — PASS.
   `lib/projects.test.ts` cubre `healthFromTimeline`: vacío → `null`, una
   entrada, más reciente por `weekOf` (no la última del array), y array
   desordenado. Los mappers `rowToProject`/`rowToKpi`/`rowToUpdate` no tienen
   test, pero son mapeo puro sin ramas — aceptable.
7. **`impl_<feature>.md` con entrada de verificación para cada `R<n>`** —
   PASS en presencia / FAIL en calidad. Están R1–R17 sin huecos y sin "N/A"
   sin justificar. Pero la entrada de R11 declara como verificación un
   razonamiento sobre Postgres que es incorrecto (ver arriba), y el archivo
   afirma "el `.sql` de la migración contiene exactamente ese seed" cuando el
   seed no es ejecutable. Una verificación que afirma algo falso es peor que
   un hueco declarado.
8. **`design-check` si cambió `app/components/*.tsx`** — PASS. `Nav.tsx` es
   el único archivo tocado bajo `app/components/`. Verifiqué el diff de
   `28512f2`: agrega solo `proyectosActive` y un `<NavLink>` reutilizando el
   componente `NavLink` existente, sin colores, radios ni sombras nuevos. El
   reporte de "sin findings" es creíble y consistente con el diff.
9. **`feature_list.json` con una sola feature `in_progress`/`in_review`** —
   PASS. Cero features en esos estados (todas `done`).

## Checkpoints ("Before `done`")

- **`progress/review_<feature>.md` con pass/fail y veredicto** — este archivo.
- **Ningún `R<n>` sin entrada de verificación** — PASS en presencia, con la
  salvedad de R11 arriba.
- **Una sola feature `in_progress`/`in_review`** — PASS.
- **`progress/history.md` con entrada de la feature** — PASS (línea 93,
  "project-status-tracking — done 2026-07-28").

## Revisión de seguridad (R15, R16, R17)

El usuario pidió explícitamente revisión de seguridad por confidencialidad
de la data. Verificado **en el código y contra un servidor corriendo**, no
por reporte:

- **R16 — gate de sesión antes de tocar Supabase**: PASS, verificado en
  vivo. `app/api/proyectos/route.ts:7-8` y
  `app/api/proyectos/[id]/route.ts:7-8` llaman `await isAuthenticated(req)`
  como primera sentencia y devuelven `401 {"error":"No autorizado"}` antes de
  construir el cliente Supabase. Probado con `npm run dev` + `curl`:
  - sin cookie, `/api/proyectos` → `401`, cuerpo sin datos de proyectos;
  - sin cookie, `/api/proyectos/<uuid>` → `401`;
  - cookie con firma inválida → `401`;
  - JWT forjado con `alg: none` → `401` (jose rechaza correctamente el
    downgrade de algoritmo).
- **R17 — sin policy para `anon`/`authenticated`**: PASS, verificado
  ejecutando la migración. El `.sql` no contiene ningún `create policy`, y
  tras aplicarlo contra Postgres real, `pg_policy` devuelve **0 policies**
  para `projects`, `project_kpis` y `project_weekly_updates`, con RLS
  habilitado en las tres → deny por defecto para cualquier rol que no
  bypassee RLS. Esto resuelve el punto que la revisión anterior dejó como
  "bloqueado, no confirmable sin acceso al dashboard": sí era confirmable
  localmente.
- **R17 — env var server-only**: PASS. `lib/supabaseAdmin.ts:18` usa
  `process.env.SUPABASE_SERVICE_ROLE_KEY`, sin prefijo `NEXT_PUBLIC_`, así
  que Next.js no la inlinea en el bundle del cliente. Si falta, lanza un
  error descriptivo en vez de degradar a la anon key — comportamiento
  correcto (fail closed).
- **R15 — el cliente nunca habla con Supabase directo**: PASS. `getSupabaseAdmin`
  tiene exactamente dos importadores en todo el repo, ambos rutas API
  (`app/api/proyectos/route.ts:3`, `app/api/proyectos/[id]/route.ts:3`).
  `lib/projects.ts` importa solo `./types` y accede vía
  `fetch("/api/proyectos")` / `fetch("/api/proyectos/${id}")`; no importa ni
  `getSupabase` ni `getSupabaseAdmin`.

Ningún hallazgo bloqueante de seguridad. Observaciones abajo.

## Observaciones no bloqueantes

1. **Fallback del `JWT_SECRET` (heredado, pero ahora más relevante)** —
   `lib/auth.ts:4`:
   ```ts
   const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret-change-me");
   ```
   Verificado en vivo: un token firmado con esa constante pública pasa
   `isAuthenticated()`. El fallback viene tal cual del
   `app/api/auth/check/route.ts` previo (commit `695430c`), o sea **no lo
   introduce esta feature** — pero esta feature es la primera que pone data
   *confidencial* detrás de ese JWT, así que el impacto de un deploy sin
   `JWT_SECRET` seteada pasa de "cualquiera entra a ver noticias públicas" a
   "cualquiera lee los proyectos". Contrasta con `getSupabaseAdmin()`, que sí
   falla cerrado cuando le falta su env var. Recomendación (fuera del alcance
   de esta feature, merece su propia entrada en `feature_list.json`): que
   `lib/auth.ts` lance si `JWT_SECRET` no está definida, igual que
   `supabaseAdmin.ts`.
2. **`id` no-UUID devuelve 500, no 404** — por lectura de código: en
   `app/api/proyectos/[id]/route.ts:15`, `.eq("id", id)` con un `id` que no
   parsea como uuid hace que Postgres devuelva error `22P02`, así que la ruta
   cae en `if (error) → 500` en vez del `404` de la línea 19. En la UI el
   usuario ve "No se pudo cargar el proyecto" en vez de "Proyecto no
   encontrado". No viola R7 en sentido literal (es un estado manejado, no un
   crash ni una página en blanco), pero es el mensaje equivocado para el
   caso. No pude probarlo en vivo por falta de credenciales de Supabase.
3. **`error.message` crudo de Supabase se reenvía al cliente** — rutas
   `/api/proyectos` (línea 16) y `/api/proyectos/[id]` (línea 18). Solo
   alcanzable ya autenticado, así que el riesgo es bajo, pero filtra
   internals de la base. Preferible loggear el detalle y devolver un mensaje
   genérico.
4. **La migración no es idempotente** — usa `create table if not exists` pero
   el `insert` del seed es incondicional. Correr el archivo dos veces (una
   vez arreglado el bug) duplica los 4 proyectos. Dado que el primer intento
   ya habrá creado las tablas vacías, el humano correrá el archivo corregido
   una segunda vez y quedará bien; pero conviene que quien lo aplique sepa
   que una tercera corrida duplica.
5. **`ProjectTimeline` no agrupa realmente por semana** — el `useMemo` de
   `app/proyectos/[id]/ProjectTimeline.tsx:17-21` mapea 1:1 con
   `key: update.id`, así que dos avances con el mismo `weekOf` renderizarían
   dos encabezados "Semana del X" separados. **No es un gap**: `design.md`
   ("Timeline semanal") lo acepta de forma explícita — "el agrupamiento es
   1:1 pero se deja la estructura de `Group` por si en el futuro hay más de
   una actualización por semana". Se anota solo para que quede registrado
   como deuda conocida, no como incumplimiento de R9.

## Requisitos verificados individualmente

- **R1, R4** — PASS. `ProjectCard.tsx` renderiza nombre, país, negocio,
  `HealthBadge` y "Última actualización: <fecha>", envuelto en
  `<Link href={`/proyectos/${project.id}`}>`.
- **R2, R3** — PASS, con test automatizado (`lib/projects.test.ts`).
  `healthFromTimeline` ordena por `weekOf` descendente y devuelve `null` en
  vacío; `HealthBadge` renderiza "Sin datos" para `null`.
- **R5** — PASS. `app/proyectos/page.tsx:64-83`, bloque icono + título +
  subtítulo, mismo patrón que `noticias/page.tsx`.
- **R6** — PASS. `[id]/page.tsx` compone nombre, país, negocio, badge,
  resumen, `KpiList` y `ProjectTimeline`.
- **R7** — PASS con matiz (ver observación 2). Ruta API devuelve `404` con
  `maybeSingle()` + `!data`; `loadProject` mapea `404 → null`; la página
  renderiza "Proyecto no encontrado".
- **R8** — PASS. `KpiList.tsx:11-19`, estado vacío explícito.
- **R9** — PASS. Orden descendente por `weekOf`, cada fila con fecha
  formateada `es-CL`, `HealthBadge` y nota; fila `div`, no link.
- **R10** — PASS. `ProjectTimeline.tsx:23-39`, estado vacío explícito.
- **R11** — **FAIL** (bloqueante, ver arriba). Contenido correcto, ejecución
  rota.
- **R12** — PASS. `country text not null` en el DDL, `country: string` en
  `lib/types.ts`. Sin enum ni check constraint.
- **R13** — PASS. Tabla `project_kpis` con `project_id`/`label`/`value`/
  `position` y FK `on delete cascade`; sin columnas de KPI fijas en
  `projects`.
- **R14** — PASS. `Nav.tsx:55` y `:113`, entre "Noticias de IA" y "State of
  AI", con `proyectosActive` siguiendo el mismo patrón `startsWith` que los
  demás.
- **R15, R16, R17** — PASS (ver sección de seguridad).

## Qué se le pasó a la revisión anterior

La revisión previa dio **APPROVED** y falló en dos puntos:

1. **No ejecutó la migración.** Aceptó como verificación de R11 el
   razonamiento del `implementer` sobre semántica de CTEs de Postgres, que
   era incorrecto, y lo dio por bueno leyendo el `.sql`. Hay `psql` disponible
   en el entorno: bastaba `createdb` + `psql -f` para que el error saltara en
   segundos. La lección concreta: para una migración, "leí el SQL" no es
   verificación — ejecutarlo sí.
2. **Trató como "bloqueado, no verificable" algo que sí era verificable.**
   Dio por imposible confirmar la ausencia de policies de RLS "sin acceso al
   dashboard de Supabase". Aplicando la migración a un Postgres local y
   consultando `pg_policy` se confirma exactamente lo mismo, sin credenciales.
   R17 queda ahora verificado de verdad, no pendiente.

Lo que la revisión anterior sí hizo bien y esta confirma: lint/build/test
corridos de verdad, el gate de auth de R16 probado con `curl` real, y la
separación cliente/servidor de R15 leída correctamente en el código.

## Qué tiene que hacer `implementer` para volver a `in_review`

1. Agregar `returning 1` (o equivalente) a los CTEs `kpis` y `updates` de
   `supabase/migrations/20260728120000_crear_projects.sql`, o reescribir el
   cierre para no referenciar CTEs sin `RETURNING`. Corregir además el
   comentario de las líneas 139-141, que afirma lo contrario de la semántica
   real de Postgres.
2. **Ejecutar** la migración corregida contra un Postgres real (hay `psql` en
   el entorno: `pg_ctlcluster 16 main start` + `createdb` + `psql -f`) y
   pegar en `impl_project-status-tracking.md` el conteo de filas resultante
   como verificación de R11, en vez de un argumento de lectura.
3. Corregir la entrada de R11 en `impl_project-status-tracking.md`: hoy
   declara verificado algo que no lo estaba y por un motivo falso.
4. Avisar a quien aplique la migración en Supabase de dev que el archivo
   anterior pudo haber dejado las 3 tablas ya creadas y vacías, y que el
   `insert` del seed no es idempotente.

Nada de lo anterior toca la parte de seguridad, que está sólida.

---

# Re-revisión (ronda 3) — 2026-07-28

**Verdict: APPROVED**

Re-revisión del fix aplicado tras el `REJECTED` de la ronda 2. Los dos
arreglos los aplicó directamente la sesión `leader`, no un `implementer`
separado, así que se verificó **todo por ejecución propia**, sin confiar en
el reporte del commit ni en lo que declara `impl_project-status-tracking.md`
— mismo criterio que hizo caer la ronda 2.

Commit revisado: `5fb30e4` ("fix: corregir seed de migración de proyectos y
404 de id inválido"), sobre `28512f2`. Rama `dev`. Árbol limpio.

## 1. Bloqueante de la ronda 2 (R11) — RESUELTO

`supabase/migrations/20260728120000_crear_projects.sql` ahora lleva
`returning 1` en los CTEs `kpis` (línea 112) y `updates` (línea 139).

Verificado **ejecutando el archivo**, no leyéndolo: `createdb rev2_check` +
`psql -v ON_ERROR_STOP=1 -f` contra el cluster Postgres 16 local.

- Salida: `CREATE TABLE` ×3, `CREATE INDEX` ×2, `ALTER TABLE` ×3 y el
  `select` final devolviendo `20`. **Exit code 0**, sin el
  `ERROR: WITH query "kpis" does not have a RETURNING clause` de la ronda 2.
- Conteos reales post-inserción:

  | tabla | filas |
  |---|---|
  | `projects` | 4 |
  | `project_kpis` | 8 |
  | `project_weekly_updates` | 12 |

- Por proyecto (query a `pg_`/tablas, no lectura del `.sql`):

  | proyecto | país | negocio | kpis | avances |
  |---|---|---|---|---|
  | App de fidelización de clientes | Chile | Paris | 2 | 3 |
  | Automatización de reposición de stock | Chile | Easy | 2 | 3 |
  | Optimización de bodegas regionales | Chile | Easy | 2 | 3 |
  | Renovación de checkout online | Chile | Paris | 2 | 3 |

- Distribución: `Chile/Paris` = 2, `Chile/Easy` = 2. Cumple "distribuidos
  entre ambos, no los 4 en el mismo negocio".

R11 pide literalmente "exactamente 4 proyectos dummy, todos con país
`Chile`, con negocio `Paris` o `Easy` (distribuidos entre ambos), cada uno
con al menos 2 KPIs y al menos 3 avances semanales". Se cumple al pie de la
letra. **PASS.**

(Nota: dos de los cuatro proyectos tienen los 3 avances con el mismo
`status`. R11 no exige status distintos — eso era fraseo mío de la ronda 2,
no del requisito. No es un gap.)

## 2. R17 revalidado sobre la migración que sí corre — PASS

Sobre la misma base ya sembrada:

- `pg_class`: `relrowsecurity = t` en `projects`, `project_kpis` y
  `project_weekly_updates`.
- `pg_policies` filtrado por esas 3 tablas: **0 filas**.
- `information_schema.role_table_grants` para esas 3 tablas, excluyendo
  `postgres`: **0 filas** — ni siquiera hay `GRANT` a `PUBLIC`.
- El `.sql` no contiene ningún `create policy` ni `grant` (las únicas
  apariciones de "anon"/"authenticated" son comentarios).

Deny por defecto para todo rol que no bypassee RLS. **PASS.**

## 3. Hallazgo no bloqueante de la ronda 2 (404 vs 500) — RESUELTO

`app/api/proyectos/[id]/route.ts:18-23`. El fix está bien colocado:

- El gate `isAuthenticated` (líneas 7-8) sigue siendo la primera sentencia;
  el branch nuevo vive **dentro** de `if (error)`, después del `await`, así
  que no adelanta nada por delante del `401`.
- El `22P02` se chequea **antes** del `return 500` genérico y **antes** de
  `if (!data)` (línea 24), que queda intacto para el caso "uuid válido pero
  inexistente".
- El camino de éxito (`return NextResponse.json(rowToProject(data))`) no se
  toca.

Verificado que el supuesto del fix es real, no asumido:

- SQLSTATE confirmado contra Postgres: `select ... where id = 'no-soy-un-uuid'`
  sobre una columna `uuid` levanta `SQLSTATE=22P02` (capturado con un bloque
  `DO ... exception when others then raise notice`).
- `error.code` existe y es el código propagado por PostgREST:
  `node_modules/@supabase/postgrest-js/src/PostgrestError.ts:9` declara
  `code: string`.
- Live, con `npm run dev` + `curl`: `/api/proyectos/no-soy-un-uuid` sin
  cookie → `401 {"error":"No autorizado"}`, igual que con cookie basura.
  El branch nuevo **no** es alcanzable sin sesión, o sea no abre un canal
  para sondear la existencia de ids sin autenticarse.

No se pudo ejercitar el `404` de punta a punta (requiere credenciales
Supabase reales, que siguen sin estar en el entorno), pero la premisa del
fix quedó verificada contra Postgres y contra el tipo de `postgrest-js`, no
por lectura optimista. **PASS.**

## 4. Checkpoints re-corridos de forma independiente

| Checkpoint | Resultado |
|---|---|
| Toda tarea de `tasks.md` en `[x]` | **PASS** — T1–T9 (12 checkboxes), 0 sin marcar. T1 ahora sí tiene un entregable ejecutable. |
| `npm run lint` | **PASS** — exit 0, sin salida. |
| `npm run build` | **PASS** — exit 0; compila, TS OK, route map con `/proyectos`, `/proyectos/[id]`, `/api/proyectos`, `/api/proyectos/[id]`. |
| `npm run test` | **PASS** — 9/9 en 2 archivos. |
| `npm run check-sdd-state` | **PASS** — "single active feature: project-status-tracking (in_progress)". |
| `npm run verify` (los 4 juntos) | **PASS** — exit 0. |
| Lógica nueva en `lib/` con test Vitest real | **PASS** — `lib/projects.test.ts` cubre `healthFromTimeline` (vacío, una entrada, más reciente por `weekOf`, array desordenado). Sin cambios en esta ronda. |
| `impl_<feature>.md` con verificación por cada `R<n>` | **PASS** — R1–R17, sin huecos ni "N/A". Ver punto 5. |
| `design-check` si cambió `app/components/*.tsx` | **PASS** — `git diff 28512f2 HEAD -- app/components/Nav.tsx` está vacío: esta ronda no tocó componentes. Vale el PASS de la ronda 2. |
| `feature_list.json` con una sola feature activa | **PASS** — `project-status-tracking` en `in_progress`, las otras 4 en `done`. |

## 5. Calidad de `impl_project-status-tracking.md` — corregido

La entrada de **R11** ya no declara verificado por un razonamiento falso
sobre CTEs. Ahora dice explícitamente que la versión anterior estaba mal,
describe el bug, y reporta el resultado de la ejecución real. Los números
que declara (`projects=4`, `project_kpis=8`, `project_weekly_updates=12`,
4× Chile, 2× Paris / 2× Easy) **coinciden exactamente** con los que obtuve
yo por mi cuenta. Además documenta las dos advertencias operativas para
quien aplique la migración (tablas posiblemente ya creadas y vacías por el
intento fallido; seed no idempotente).

La entrada de **R7** documenta el fix del `22P02`. Correcta.

## 6. Seguridad (R15/R16/R17) — intacta

`git diff 28512f2 HEAD -- lib/auth.ts lib/supabaseAdmin.ts lib/projects.ts app/api/proyectos/route.ts app/components/Nav.tsx`
sale **vacío**: ninguno de los archivos que sostienen la conclusión de
seguridad de la ronda 2 cambió. Los únicos archivos de código tocados entre
`28512f2` y `HEAD` son `app/api/proyectos/[id]/route.ts` y el `.sql`.

Revalidado en vivo de todas formas (`npm run dev` + `curl`), porque el
archivo de la ruta `[id]` sí cambió:

- sin cookie, `/api/proyectos` → `401`, cuerpo sin datos;
- sin cookie, `/api/proyectos/<uuid>` → `401`;
- sin cookie, `/api/proyectos/no-soy-un-uuid` → `401` (no `404`, no `500`);
- cookie con firma inválida → `401`.

R15/R16/R17 siguen en **PASS**.

## 7. Observaciones no bloqueantes — estado

Las 5 de la ronda 2 siguen vigentes salvo la #2, que se arregló:

1. **Fallback de `JWT_SECRET`** en `lib/auth.ts:4` — sigue igual. Heredado,
   fuera del alcance de esta feature; merece su propia entrada en
   `feature_list.json`.
2. ~~`id` no-UUID devuelve 500~~ — **RESUELTO** en esta ronda.
3. **`error.message` crudo de Supabase reenviado al cliente** — sigue, ahora
   solo en el `return 500` de la línea 22 y en `/api/proyectos:16`. Solo
   alcanzable ya autenticado. Sin cambios.
4. **Migración no idempotente** — sigue, y ahora está *confirmado por
   ejecución*: corriendo el `.sql` una segunda vez sobre la misma base los
   conteos pasan a `projects=8`, `kpis=16`, `updates=24`. Está documentado
   en `impl_...md`; quien lo aplique en Supabase debe correrlo **una sola
   vez** sobre datos ya sembrados.
5. **`ProjectTimeline` no agrupa realmente por semana** — sigue. Aceptado
   explícitamente en `design.md`; deuda conocida, no incumplimiento de R9.

Una nueva, menor:

6. **El comentario de las líneas 141-145 del `.sql` sigue parcialmente
   equivocado.** La parte que importaba se arregló (ahora dice bien que un
   CTE de escritura solo puede referenciarse si tiene `RETURNING`), pero
   afirma que el CTE "se ejecuta siempre *que la query lo referencie*" y que
   el `SELECT` final existe "para forzar la ejecución de ambos inserts". En
   Postgres los CTEs de escritura se ejecutan siempre, referenciados o no.
   Es un comentario, no afecta el comportamiento del archivo (que ya
   verifiqué corriéndolo). **No bloquea**; corregir cuando se toque el
   archivo.

## 8. Pendientes de cierre para `leader` (no bloquean la aprobación)

1. Mover `feature_list.json` a `done` (es del `leader`, no del `reviewer`).
2. **Actualizar la entrada de `progress/history.md` (línea 93).** Hoy dice
   "project-status-tracking — done 2026-07-28" y describe el estado de la
   ronda 1, incluyendo la nota de que el mismo agente hizo de reviewer. No
   menciona el `REJECTED` de la ronda 2, el bug del seed, ni el fix. Debería
   reflejar el ciclo real: implementación → rechazo por seed no ejecutable →
   fix (`5fb30e4`) → aprobación en re-revisión independiente.
3. Avisar al humano, al aplicar la migración en el Supabase de dev, de los
   dos puntos operativos: las 3 tablas pueden existir ya y vacías si se
   corrió la versión rota, y el seed **no** es idempotente.

## Veredicto

**APPROVED.** El bloqueante de la ronda 2 está realmente resuelto —
verificado ejecutando la migración corregida contra Postgres 16, no leyendo
el `.sql`. El hallazgo no bloqueante del `404` también se corrigió y su
premisa (`SQLSTATE 22P02` → `error.code`) quedó confirmada contra Postgres y
contra el tipo de `postgrest-js`. `lint`/`build`/`test`/`check-sdd-state`
pasan corridos por mí. La superficie de seguridad no cambió y se revalidó en
vivo. `impl_project-status-tracking.md` ya no declara verificado nada falso.
Queda listo para `done` una vez que `leader` haga el cierre del punto 8.
