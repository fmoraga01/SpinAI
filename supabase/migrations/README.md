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
