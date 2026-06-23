import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABELS: Record<string, string> = {
  call: "Ligação",
  email: "E-mail",
  meeting: "Reunião",
  activity: "Atividade",
  internal: "Atividade Interna",
  whatsapp: "WhatsApp",
};

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://accordpipe.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();

    // Fetch due reminders (system or email still pending)
    const { data: reminders, error } = await admin
      .from("activity_reminders")
      .select("*")
      .lte("reminder_scheduled_at", nowIso)
      .or("system_sent_at.is.null,email_sent_at.is.null")
      .order("reminder_scheduled_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const r of reminders) {
      try {
        // Fetch related rows (avoid embedded select to dodge FK config issues)
        const [{ data: activity }, { data: lead }, { data: profile }] =
          await Promise.all([
            admin.from("crm_lead_activities").select("id,type,title,description,metadata,status").eq("id", r.activity_id).maybeSingle(),
            admin.from("crm_leads").select("id,company_name,workspace_id").eq("id", r.lead_id).maybeSingle(),
            admin.from("profiles").select("user_id,name,email,whatsapp").eq("user_id", r.user_id).maybeSingle(),
          ]);

        if (!activity || !lead || !profile) {
          await admin.from("activity_reminders").update({
            system_sent_at: nowIso,
            email_sent_at: nowIso,
            email_error: "missing_activity_or_lead_or_profile",
            attempts: (r.attempts || 0) + 1,
          }).eq("id", r.id);
          results.push({ id: r.id, status: "skipped_missing_refs" });
          continue;
        }

        // Skip if activity already completed / no-show / canceled
        if (activity.status && activity.status !== "planned") {
          await admin.from("activity_reminders").update({
            system_sent_at: nowIso,
            email_sent_at: nowIso,
            attempts: (r.attempts || 0) + 1,
          }).eq("id", r.id);
          results.push({ id: r.id, status: "skipped_not_planned" });
          continue;
        }

        const meta = (activity.metadata as any) || {};
        const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : null;
        const activityTime = scheduledAt
          ? scheduledAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
          : "—";
        const typeLabel = TYPE_LABELS[activity.type] || activity.type;
        const companyName = lead.company_name || "Lead";
        const activityLink = `${APP_BASE_URL}/atendimento?lead=${lead.id}&tab=agenda`;

        const updates: Record<string, any> = { attempts: (r.attempts || 0) + 1 };

        // 1) System notification (notifications table)
        if (r.notify_system && !r.system_sent_at) {
          const { error: nErr } = await admin.from("notifications").insert({
            user_id: r.user_id,
            servidor_id: r.servidor_id,
            title: `🔔 Lembrete: ${activity.title}`,
            message: `${typeLabel} com ${companyName} às ${activityTime}.`,
            type: "reminder",
            link: activityLink,
            metadata: {
              lead_id: lead.id,
              activity_id: activity.id,
              activity_time: activityTime,
            },
          });
          if (!nErr) updates.system_sent_at = nowIso;
        }

        // 2) Email via send-transactional-email
        if (r.notify_email && !r.email_sent_at && profile.email) {
          try {
            const resp = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  templateName: "activity-reminder",
                  recipientEmail: profile.email,
                  idempotencyKey: `activity-reminder-${r.id}`,
                  templateData: {
                    activityTitle: activity.title,
                    activityType: typeLabel,
                    companyName,
                    activityTime,
                    duration: meta.duration || undefined,
                    description: activity.description || undefined,
                    activityLink,
                    userName: profile.name || undefined,
                  },
                }),
              },
            );
            if (resp.ok) {
              updates.email_sent_at = nowIso;
              updates.email_error = null;
            } else {
              const txt = await resp.text();
              updates.email_error = `http_${resp.status}: ${txt.slice(0, 300)}`;
            }
          } catch (err) {
            updates.email_error = String(err).slice(0, 500);
          }
        } else if (r.notify_email && !r.email_sent_at && !profile.email) {
          updates.email_sent_at = nowIso;
          updates.email_error = "no_recipient_email";
        }

        await admin.from("activity_reminders").update(updates).eq("id", r.id);
        results.push({ id: r.id, status: "ok", updates });
      } catch (err) {
        console.error("reminder error", r.id, err);
        await admin.from("activity_reminders").update({
          attempts: (r.attempts || 0) + 1,
          email_error: String(err).slice(0, 500),
        }).eq("id", r.id);
        results.push({ id: r.id, status: "error", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-activity-reminders fatal", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
