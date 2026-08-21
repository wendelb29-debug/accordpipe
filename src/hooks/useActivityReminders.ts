import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Hook that listens for activity reminders via Realtime notifications.
 * It shows browser notifications and plays sound when a reminder arrives.
 */
export function useActivityReminders() {
  const { user } = useAuth();

  // Request notification permission
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const playNotificationSound = () => {
      try {
        const audio = new Audio("/notification-sound.mp3");
        audio.play().catch(e => console.error("Error playing notification sound:", e));
      } catch (e) {
        console.error("Audio system error:", e);
      }
    };

    const handleReminder = (payload: any) => {
      const notification = payload.new;
      if (notification.type !== "reminder") return;

      // Show toast
      toast.info(notification.title, {
        description: notification.message,
        duration: 10000,
        action: notification.link ? {
          label: "Ver",
          onClick: () => window.location.href = notification.link
        } : undefined,
      });

      // Play sound
      playNotificationSound();

      // Show browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
          tag: `reminder-${notification.id}`,
        });
        n.onclick = () => {
          window.focus();
          if (notification.link) window.location.href = notification.link;
          n.close();
        };
      }
    };

    // Subscribe to new notifications for the current user
    const channel = supabase
      .channel(`user-reminders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        handleReminder
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
