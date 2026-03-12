import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that polls for upcoming activity reminders and fires browser notifications.
 * Uses the Web Notifications API (works in all modern browsers).
 */
export function useActivityReminders() {
  const { user, profile, isMaster, activeCompanyId } = useAuth();
  const scheduledTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const permissionGranted = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      permissionGranted.current = true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        permissionGranted.current = perm === "granted";
      });
    }
  }, []);

  // Poll for upcoming activities and schedule browser notifications
  useEffect(() => {
    if (!user) return;

    const checkAndSchedule = async () => {
      const servidorId = isMaster ? activeCompanyId : profile?.company_id;
      if (!servidorId) return;

      // Fetch planned activities with reminders in the next 24 hours
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("crm_lead_activities")
        .select("id, title, type, metadata, created_by_name")
        .eq("servidor_id", servidorId)
        .in("type", ["activity", "meeting", "call", "email", "internal", "whatsapp"])
        .order("created_at", { ascending: false })
        .limit(200);

      if (error || !data) return;

      for (const activity of data) {
        const meta = activity.metadata as any;
        if (!meta?.scheduled_at || !meta?.reminder || meta.reminder === "none") continue;
        if (meta.activity_status !== "planejada") continue;

        // Already scheduled?
        if (scheduledTimers.current.has(activity.id)) continue;

        const scheduledAt = new Date(meta.scheduled_at);
        const reminderMinutes = parseInt(meta.reminder, 10);
        if (isNaN(reminderMinutes)) continue;

        const reminderTime = new Date(scheduledAt.getTime() - reminderMinutes * 60 * 1000);
        const msUntilReminder = reminderTime.getTime() - now.getTime();

        // Only schedule if reminder is in the future and within 24h
        if (msUntilReminder <= 0 || msUntilReminder > 24 * 60 * 60 * 1000) continue;

        const typeLabels: Record<string, string> = {
          call: "Ligação",
          email: "E-mail",
          meeting: "Reunião",
          activity: "Atividade",
          internal: "Atividade Interna",
          whatsapp: "WhatsApp",
        };

        const typeLabel = typeLabels[activity.type] || activity.type;
        const timeStr = scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const dateStr = scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

        const timer = setTimeout(() => {
          scheduledTimers.current.delete(activity.id);

          if (!("Notification" in window) || Notification.permission !== "granted") return;

          const notification = new Notification("Lembrete de Atividade ⏰", {
            body: `${typeLabel} (${timeStr} ${dateStr}).\n${activity.title}`,
            icon: "/favicon.ico",
            tag: `activity-reminder-${activity.id}`,
            requireInteraction: true,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }, msUntilReminder);

        scheduledTimers.current.set(activity.id, timer);
      }
    };

    // Check immediately, then every 2 minutes
    checkAndSchedule();
    const interval = setInterval(checkAndSchedule, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      scheduledTimers.current.forEach((timer) => clearTimeout(timer));
      scheduledTimers.current.clear();
    };
  }, [user, profile?.company_id, isMaster, activeCompanyId]);
}
