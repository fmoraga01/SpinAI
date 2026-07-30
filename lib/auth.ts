import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "spinai_token";

// Lazy a propósito: leer process.env.JWT_SECRET recién al verificar un
// token (request-time), no al importar el módulo — Next.js evalúa los
// módulos de cada ruta durante "next build" (page data collection) para
// generar el bundle, y ese paso no tiene las env vars de runtime
// disponibles. Un throw a nivel de módulo rompería el build en cualquier
// entorno sin JWT_SECRET seteado en build-time (CI, este mismo sandbox).
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Falta la env var JWT_SECRET");
  return new TextEncoder().encode(secret);
}

/**
 * Verifica la cookie spinai_token (mismo JWT que emite POST /api/auth al
 * validar el PIN). Compartida por /api/auth/check y cualquier ruta API que
 * necesite exigir sesión, como /api/proyectos, para no duplicar la lógica
 * de verificación de jose en varios archivos.
 */
export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}
