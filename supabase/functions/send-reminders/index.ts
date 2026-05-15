import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fecha objetivo: hoy + 2 días
  const target = new Date();
  target.setDate(target.getDate() + 2);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  const targetDate = `${y}-${m}-${d}`;

  // Buscar asignaciones para esa fecha
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("date", targetDate);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!assignments || assignments.length === 0) {
    return new Response(JSON.stringify({ message: "Sin asignaciones para esa fecha" }), { status: 200 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY")!;
  const results = [];

  for (const assignment of assignments) {
    // Obtener email del integrante
    const { data: member } = await supabase
      .from("members")
      .select("email")
      .eq("id", assignment.member_id)
      .single();

    const email = member?.email;
    if (!email) continue;

    // Formatear fecha en español
    const meetingDate = new Date(assignment.date + "T12:00:00");
    const formattedDate = meetingDate.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    // Enviar email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SpinAI <onboarding@resend.dev>",
        to: email,
        subject: `Recordatorio: Tú lideras la reunión del ${formattedDate}`,
        html: `
          <div style="font-family: Inter, sans-serif; background: #08090f; color: #fff; padding: 40px; max-width: 480px; margin: 0 auto; border-radius: 8px;">
            <div style="margin-bottom: 24px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #2C40FF22; border: 1px solid #2C40FF44; border-radius: 6px; font-size: 20px; margin-bottom: 16px;">◎</div>
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #fff;">Te toca liderar la reunión</h1>
              <p style="margin: 0; color: #9CA3AF; font-size: 15px;">Hola <strong style="color: #fff;">${assignment.member_name}</strong>, este es un recordatorio de SpinAI.</p>
            </div>

            <div style="background: #2C40FF0f; border: 1px solid #2C40FF33; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Tu próxima reunión</p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: #2C40FF; text-transform: capitalize;">${formattedDate}</p>
              <p style="margin: 6px 0 0; font-size: 13px; color: #6B7280;">Faltan 2 días · Reunión de equipo · Viernes</p>
            </div>

            <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 1.6;">
              Recuerda preparar la agenda y coordinar con el equipo con anticipación. ¡Éxito!
            </p>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1f2333;">
              <p style="margin: 0; font-size: 12px; color: #374151;">SpinAI · Asignación automática de turnos de reunión</p>
            </div>
          </div>
        `,
      }),
    });

    const resData = await res.json();
    results.push({ email, status: res.status, data: resData });
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
