import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

/**
 * Cliente Supabase server-only con el service role key, que bypassea RLS
 * por diseño de Supabase. Usado exclusivamente dentro de rutas API
 * (app/api/**) para leer/escribir tablas confidenciales que no otorgan
 * acceso a `anon` (ver supabase/migrations/20260728120000_crear_projects.sql).
 * NUNCA importar este módulo desde código que corre en el cliente:
 * SUPABASE_SERVICE_ROLE_KEY no tiene el prefijo NEXT_PUBLIC_, así que
 * Next.js no la incluye en el bundle del navegador, pero igual no debe
 * referenciarse fuera de contexto server-side.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
          "SUPABASE_SERVICE_ROLE_KEY es una env var server-only nueva " +
          "(dashboard de Supabase > Project Settings > API) — agregarla a " +
          ".env.local y a las env vars del proyecto en Vercel."
      );
    }
    _adminClient = createClient(url, serviceRoleKey);
  }
  return _adminClient;
}
