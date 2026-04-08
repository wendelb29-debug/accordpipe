import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PREF_KEY = (userId: string) => `accord-notif-enabled-${userId}`;
const BANNER_DISMISSED_KEY = (userId: string) => `accord-notif-banner-dismissed-${userId}`;

/** Generate a short beep sound using the Web Audio API */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Two-tone beep
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);
    playTone(1100, now + 0.18, 0.15);
  } catch {
    // Audio not supported – silent fallback
  }
}

/** Flash the browser tab title until focused */
function startTabFlash(message: string): () => void {
  const originalTitle = document.title;
  let on = true;
  const interval = setInterval(() => {
    document.title = on ? `🔔 ${message}` : originalTitle;
    on = !on;
  }, 1000);

  const stop = () => {
    clearInterval(interval);
    document.title = originalTitle;
  };

  const focusHandler = () => {
    stop();
    window.removeEventListener("focus", focusHandler);
  };
  window.addEventListener("focus", focusHandler);

  return stop;
}

export function useNotificationManager() {
  const { user, profile, isMaster, activeCompanyId } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [enabled, setEnabled] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const lastNotifId = useRef<string | null>(null);
  const tabFlashStop = useRef<(() => void) | null>(null);

  // Sync enabled state from localStorage
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(PREF_KEY(user.id));
    if (stored === null) {
      // New user – never set preference
      setEnabled(false);
    } else {
      setEnabled(stored === "true");
    }
  }, [user]);

  // Show banner only when notifications are not enabled — no dismiss option
  useEffect(() => {
    if (!user) return;
    setBannerVisible(!enabled);
  }, [user, enabled]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermissionState(result);
    return result === "granted";
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!user) return;
    const granted = await requestPermission();
    if (granted) {
      localStorage.setItem(PREF_KEY(user.id), "true");
      setEnabled(true);
      setBannerVisible(false);
    }
  }, [user, requestPermission]);

  const disableNotifications = useCallback(() => {
    if (!user) return;
    localStorage.setItem(PREF_KEY(user.id), "false");
    setEnabled(false);
  }, [user]);

  const dismissBanner = useCallback(() => {
    if (!user) return;
    localStorage.setItem(BANNER_DISMISSED_KEY(user.id), "true");
    setBannerVisible(false);
  }, [user]);

  const sendTestNotification = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    playNotificationSound();
    const stopFlash = startTabFlash("Notificação de Teste");
    const n = new Notification("Teste de Notificação ✅", {
      body: "As notificações estão funcionando corretamente!",
      icon: "/favicon.ico",
      tag: "test-notification",
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      stopFlash();
    };
  }, []);

  // Fire browser notification for new DB notifications
  const fireNotification = useCallback((title: string, body: string, link?: string | null) => {
    if (!enabled || permissionState !== "granted") return;
    if (!("Notification" in window)) return;

    playNotificationSound();
    const stopFlash = startTabFlash(title);

    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: `accord-${Date.now()}`,
      requireInteraction: true,
    });

    n.onclick = () => {
      window.focus();
      n.close();
      stopFlash();
      if (link) {
        window.location.href = link;
      }
    };
  }, [enabled, permissionState]);

  // Listen for new notifications via realtime
  useEffect(() => {
    if (!user || !enabled) return;

    const channel = supabase
      .channel("notif-push")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.id === lastNotifId.current) return;
          lastNotifId.current = row.id;

          // Check if it's a scheduled reminder not yet due
          if (row.type === "reminder" && row.metadata?.reminder_at) {
            if (new Date(row.metadata.reminder_at) > new Date()) return;
          }

          fireNotification(row.title, row.message, row.link);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enabled, fireNotification]);

  return {
    enabled,
    permissionState,
    bannerVisible,
    enableNotifications,
    disableNotifications,
    dismissBanner,
    sendTestNotification,
    fireNotification,
  };
}
