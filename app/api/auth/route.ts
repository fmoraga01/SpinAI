import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const PIN = process.env.PIN ?? "";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret-change-me");
const COOKIE = "spinai_token";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin || pin.trim().toUpperCase() !== PIN.toUpperCase()) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const token = await new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
