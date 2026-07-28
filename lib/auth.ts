import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret-change-me");
const COOKIE = "spinai_token";

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
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
