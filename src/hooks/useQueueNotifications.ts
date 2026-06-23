import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface QueueItem {
  id: string;
  contact_id: string;
  tenant_id: string;
  department_id: string | null;
  status: "pending" | "in_progress" | "closed";
  assigned_to_user_id: string | null;
  created_at: string;
  assumed_at: string | null;
}

export function useQueueNotifications(departmentIds: string[]) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedRef = useRef<Set<string>>(new Set());

  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs-self"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) return null;
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    async function fetchInitial() {
      if (!departmentIds.length) {
        setQueueItems([]);
        return;
      }
      const { data, error } = await supabase
        .from("contact_assignment_status")
        .select("*")
        .in("department_id", departmentIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) {
        console.warn("[useQueueNotifications] initial fetch error", error.message);
        return;
      }
      if (!cancelled) {
        setQueueItems((data || []) as QueueItem[]);
        setUnreadCount((data || []).length);
        (data || []).forEach((i: any) => notifiedRef.current.add(i.contact_id));
      }
    }
    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [departmentIds.join(",")]);

  // Realtime
  useEffect(() => {
    if (!departmentIds.length) return;

    const channel = supabase
      .channel("queue-updates-" + departmentIds.join("-"))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_assignment_status",
        },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (!row?.department_id || !departmentIds.includes(row.department_id)) return;

          if (payload.eventType === "INSERT") {
            const item = payload.new as QueueItem;
            if (item.status !== "pending") return;
            setQueueItems((prev) =>
              prev.some((p) => p.contact_id === item.contact_id) ? prev : [...prev, item]
            );
            if (!notifiedRef.current.has(item.contact_id)) {
              notifiedRef.current.add(item.contact_id);
              setUnreadCount((c) => c + 1);
              if (prefs?.sound_enabled) playSound(prefs.sound_file, prefs.sound_volume);
              if (prefs?.browser_notification_enabled)
                sendBrowserNotification("Novo atendimento", "Há um novo cliente aguardando na fila.");
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as QueueItem;
            if (updated.status !== "pending") {
              setQueueItems((prev) => prev.filter((p) => p.contact_id !== updated.contact_id));
            } else {
              setQueueItems((prev) => {
                const exists = prev.some((p) => p.contact_id === updated.contact_id);
                return exists
                  ? prev.map((p) => (p.contact_id === updated.contact_id ? updated : p))
                  : [...prev, updated];
              });
            }
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as QueueItem;
            setQueueItems((prev) => prev.filter((p) => p.contact_id !== old.contact_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [departmentIds.join(","), prefs?.sound_enabled, prefs?.browser_notification_enabled, prefs?.sound_file, prefs?.sound_volume]);

  return {
    queueItems,
    unreadCount,
    hasQueue: queueItems.length > 0,
    resetUnread: () => setUnreadCount(0),
  };
}

function playSound(file: string, volume = 80) {
  try {
    const audio = new Audio(`/sounds/${file}`);
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.play().catch((e) => console.warn("[queue] audio play failed", e));
  } catch (err) {
    console.warn("[queue] sound error", err);
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: "queue-notification" });
    } catch (e) {
      console.warn("[queue] notif error", e);
    }
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().catch(() => {});
  }
}
