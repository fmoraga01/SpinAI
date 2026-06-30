import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import nodemailer from "nodemailer";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabase();

  // Find next upcoming assignment
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const { data: assignments, error: aErr } = await db
    .from("assignments")
    .select("id, member_id, member_name, date")
    .gte("date", todayStr)
    .order("date")
    .limit(1);

  if (aErr || !assignments || assignments.length === 0) {
    return NextResponse.json({ skipped: "no upcoming assignment" });
  }

  const assignment = assignments[0];

  // Skip unassigned slots
  if (!assignment.member_id || !assignment.member_name) {
    return NextResponse.json({ skipped: "next assignment has no member assigned" });
  }

  // Fetch all active members with email
  const { data: members, error: mErr } = await db
    .from("members")
    .select("id, email")
    .eq("active", true);

  if (mErr) {
    return NextResponse.json({ error: "Could not fetch members" }, { status: 500 });
  }

  const assignedMember = (members ?? []).find((m) => m.id === assignment.member_id);
  const toEmail = (assignedMember?.email as string | null) ?? null;
  if (!toEmail) {
    return NextResponse.json({ skipped: "assigned member has no email" });
  }

  const ccEmails = (members ?? [])
    .filter((m) => m.id !== assignment.member_id && m.email)
    .map((m) => m.email as string);

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
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6B7280;">SpinAI · Reuni&#243;n de equipo</p>
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Recordatorio del viernes</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#D1D5DB;line-height:1.6;">
              Hola equipo,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#D1D5DB;line-height:1.6;">
              Este viernes le toca a <strong style="color:#ffffff;">${assignment.member_name}</strong> liderar la reuni&#243;n de equipo. &#161;No olviden estar presentes!
            </p>
            <div style="background:#2C40FF0f;border:1px solid #2C40FF33;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2C40FF;">Fecha</p>
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#ffffff;text-transform:capitalize;">${formatted}</p>
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2C40FF;">Responsable</p>
              <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;">${assignment.member_name}</p>
            </div>
            <p style="margin:0 0 8px;font-size:14px;color:#9CA3AF;line-height:1.6;">
              <strong style="color:#D1D5DB;">${assignment.member_name}</strong>, recuerda preparar la l&#225;mina de presentaci&#243;n con anticipaci&#243;n.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #1f2333;">
            <p style="margin:0;font-size:12px;color:#4B5563;text-align:center;">
              Enviado autom&#225;ticamente por SpinAI &middot; Gesti&#243;n de turnos de reuni&#243;n
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
      to: toEmail,
      cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined,
      subject: `⏰ Reunión del viernes — ${assignment.member_name} presenta`,
      html,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Email send failed", detail: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: toEmail, cc: ccEmails });
}
