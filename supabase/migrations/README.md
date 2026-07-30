# Migraciones

Cada cambio de esquema va en un archivo nuevo, nunca se edita uno ya aplicado.

## Convenio de nombre

```
YYYYMMDDHHMMSS_descripcion_corta.sql
```

El timestamp determina el orden de aplicación.

## Flujo para un cambio de BD

1. Crea el archivo de migración con el `ALTER TABLE` / `CREATE TABLE` necesario.
2. Aplícalo en el SQL Editor del proyecto Supabase de **dev** y prueba la feature ahí.
3. Al mergear a `main`, aplica el mismo archivo (sin modificar) en el proyecto de **producción**.

Para levantar un proyecto Supabase desde cero, corre todos los archivos de esta carpeta en orden.

## El editor SQL de Supabase no es una transacción única

Al pegar varias sentencias y correrlas juntas, cada una hace autocommit
por separado — si una sentencia falla, **las anteriores en el mismo envío
quedan aplicadas igual**, no se revierten. Antes de asumir que un bloque
falló "todo o nada", verificá el estado real con una consulta a
`information_schema.columns` / `pg_constraint` / `pg_policies` (o lo que
corresponda) en vez de re-correr el mismo bloque completo a ciegas —
puede fallar por sentencias que ya se aplicaron en un intento anterior
(objetos que ya existen, columnas que ya se borraron, etc.), no porque el
cambio en sí esté mal. Caso real: 2026-07-30, cutover a prod de
`supabase-rls-lockdown` — ver `docs/prod-promotion-checklist.md` sección 4.
