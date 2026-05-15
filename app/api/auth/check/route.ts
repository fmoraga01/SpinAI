import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret-change-me");
const COOKIE = "spinai_token";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ authed: false }, { status: 401 });

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ authed: true });
  } catch {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
}
