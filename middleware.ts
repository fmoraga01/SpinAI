import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret-change-me");
const COOKIE = "spinai_token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the auth API through
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
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
