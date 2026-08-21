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

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://accordpipe.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();

    // Fetch due reminders where at least one requested channel is pending
    // Conditions:
    // (notify_system = true AND system_sent_at IS NULL)
    // OR
    // (notify_email = true AND email_sent_at IS NULL)
    const { data: reminders, error } = await admin
      .from("activity_reminders")
      .select("*")
      .lte("reminder_scheduled_at", nowIso)
      .or("and(notify_system.eq.true,system_sent_at.is.null),and(notify_email.eq.true,email_sent_at.is.null)")
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
        // Fetch activity, lead and profile
        const [{ data: activity }, { data: lead }, { data: profile }] =
          await Promise.all([
            admin.from("crm_lead_activities").select("id,type,title,description,metadata,status,servidor_id").eq("id", r.activity_id).maybeSingle(),
            admin.from("crm_leads").select("id,company_name,workspace_id").eq("id", r.lead_id).maybeSingle(),
            admin.from("profiles").select("user_id,name,email").eq("user_id", r.user_id).maybeSingle(),
          ]);

        if (!activity || !lead || !profile) {
          // If refs are missing, mark as sent to stop retrying
          await admin.from("activity_reminders").update({
            system_sent_at: r.notify_system ? nowIso : null,
            email_sent_at: r.notify_email ? nowIso : null,
            email_error: "missing_refs",
            attempts: (r.attempts || 0) + 1,
          }).eq("id", r.id);
          results.push({ id: r.id, status: "skipped_missing_refs" });
          continue;
        }

        // Skip if activity already completed / no-show / canceled
        if (activity.status && activity.status !== "planned") {
          await admin.from("activity_reminders").update({
            system_sent_at: r.notify_system ? nowIso : null,
            email_sent_at: r.notify_email ? nowIso : null,
            attempts: (r.attempts || 0) + 1,
          }).eq("id", r.id);
          results.push({ id: r.id, status: "skipped_not_planned" });
          continue;
        }

        const meta = (activity.metadata as any) || {};
        const scheduledAt = meta.scheduled_at ? new Date(meta.scheduled_at) : null;
        
        // Time Formatting (BRT)
        const activityTime = scheduledAt
          ? scheduledAt.toLocaleString("pt-BR", { 
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" 
            })
          : "—";
          
        const typeLabel = TYPE_LABELS[activity.type] || activity.type;
        const companyName = lead.company_name || "Lead";
        
        // Correct link with workspace_id
        const activityLink = `${APP_BASE_URL}/atendimento?workspace=${lead.workspace_id}&lead=${lead.id}&tab=agenda`;

        const updates: Record<string, any> = { attempts: (r.attempts || 0) + 1, updated_at: nowIso };

        // 1) System notification
        if (r.notify_system && !r.system_sent_at) {
          // Check for existing notification to prevent duplicates (Idempotency)
          const { data: existingN } = await admin
            .from("notifications")
            .select("id")
            .eq("user_id", r.user_id)
            .eq("type", "reminder")
            .eq("metadata->>activity_id", activity.id)
            .maybeSingle();

          if (!existingN) {
            const { error: nErr } = await admin.from("notifications").insert({
              user_id: r.user_id,
              servidor_id: r.servidor_id || activity.servidor_id,
              title: `🔔 Lembrete: ${activity.title}`,
              message: `${typeLabel} com ${companyName} às ${activityTime}.`,
              type: "reminder",
              link: activityLink,
              metadata: {
                lead_id: lead.id,
                activity_id: activity.id,
                activity_time: activityTime,
                workspace_id: lead.workspace_id,
              },
            });
            if (!nErr) {
              updates.system_sent_at = nowIso;
            } else {
              console.error("System notification error", nErr);
            }
          } else {
            // Already sent
            updates.system_sent_at = nowIso;
          }
        }

        // 2) Email
        if (r.notify_email && !r.email_sent_at) {
          if (profile.email) {
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
          } else {
            // No email configured for user
            updates.email_sent_at = nowIso;
            updates.email_error = "no_recipient_email";
          }
        }

        await admin.from("activity_reminders").update(updates).eq("id", r.id);
        results.push({ id: r.id, status: "ok", updates });
      } catch (err) {
        console.error("reminder error", r.id, err);
        await admin.from("activity_reminders").update({
          attempts: (r.attempts || 0) + 1,
          updated_at: nowIso,
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
