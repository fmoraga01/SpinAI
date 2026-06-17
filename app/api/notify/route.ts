import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSupabase } from "@/lib/supabase";
import nodemailer from "nodemailer";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-me"
);
const COOKIE = "spinai_token";

export async function POST(req: NextRequest) {
  // Verify session
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await req.json();
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
  }

  const db = getSupabase();

  // Fetch assignment
  const { data: assignment, error: aErr } = await db
    .from("assignments")
    .select("member_id, member_name, date")
    .eq("id", assignmentId)
    .single();
  if (aErr || !assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Fetch member email
  const { data: member, error: mErr } = await db
    .from("members")
    .select("email")
    .eq("id", assignment.member_id)
    .single();
  if (mErr || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const email = member.email as string | null;
  if (!email) {
    return NextResponse.json({ error: "no_email" }, { status: 422 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: "GMAIL_USER / GMAIL_PASS not configured" }, { status: 500 });
  }

  // Format date
  const dateObj = new Date(assignment.date + "T12:00:00");
  const formatted = dateObj.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0d0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1f2333;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a2035 0%,#0d0f1a 100%);padding:32px 40px;border-bottom:1px solid #1f2333;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6B7280;">SpinAI</p>
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Te toca esta semana</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#D1D5DB;line-height:1.6;">
              Hola <strong style="color:#ffffff;">${assignment.member_name}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#D1D5DB;line-height:1.6;">
              Te recordamos que esta semana te corresponde <strong style="color:#ffffff;">liderar la reuni&#243;n de equipo del viernes</strong>.
            </p>
            <div style="background:#2C40FF0f;border:1px solid #2C40FF33;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2C40FF;">Fecha asignada</p>
              <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;text-transform:capitalize;">${formatted}</p>
            </div>
            <p style="margin:0 0 8px;font-size:14px;color:#9CA3AF;line-height:1.6;">
              Recuerda preparar la l&#225;mina de presentaci&#243;n con anticipaci&#243;n. Puedes usar SpinAI para organizar tu agenda.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #1f2333;">
            <p style="margin:0;font-size:12px;color:#4B5563;text-align:center;">
              Enviado desde SpinAI &middot; Gesti&#243;n de turnos de reuni&#243;n
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `SpinAI <${gmailUser}>`,
      to: email,
      subject: `⏰ Te toca el viernes — ${assignment.member_name}`,
      html,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Email send failed", detail: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
