import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "spinai_token";

// Lazy a propósito — ver comentario en lib/auth.ts.
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Falta la env var JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the auth API through
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;

  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      // Token invalid or expired — fall through to redirect
    }
  }

  // Not authenticated: rewrite to show the PIN gate via a header flag
  const res = NextResponse.next();
  res.headers.set("x-spinai-auth", "0");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
