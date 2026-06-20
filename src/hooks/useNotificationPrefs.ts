import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Per-user notification preferences stored in localStorage.
 * Each user (by user.id) has an isolated configuration.
 */

export type NotifTypeKey =
  | "email_tracking"
  | "activity_reminders"
  | "following_updates"
  | "insights"
  | "comments"
  | "mentions"
  | "assigned_to_you"
  | "whatsapp_messages"
  | "product_updates"
  | "leads_won"
  | "leads_lost"
  | "financial"
  | "internal_chat";

export interface NotifPrefs {
  /** Master toggle for in-app alert popups (toasts). */
  alertsEnabled: boolean;
  /** Progress tracking widget. */
  progressTracking: boolean;
  /** E-mail digest enabled + time HH:MM. */
  emailDigestEnabled: boolean;
  emailDigestTime: string;
  /** Pause-until timestamp (ms). When > now, alerts are silenced. */
  pausedUntil: number | null;
  /** Granular per-type toggles. */
  types: Record<NotifTypeKey, boolean>;
}

const DEFAULTS: NotifPrefs = {
  alertsEnabled: true,
  progressTracking: true,
  emailDigestEnabled: true,
  emailDigestTime: "07:00",
  pausedUntil: null,
  types: {
    email_tracking: true,
    activity_reminders: true,
    following_updates: true,
    insights: true,
    comments: true,
    mentions: true,
    assigned_to_you: true,
    whatsapp_messages: true,
    product_updates: true,
    leads_won: true,
    leads_lost: true,
    financial: true,
    internal_chat: true,
  },
};

const KEY = (userId: string) => `accord-notif-prefs:${userId}`;

function load(userId: string): NotifPrefs {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      types: { ...DEFAULTS.types, ...(parsed.types || {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

function save(userId: string, prefs: NotifPrefs) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(prefs));
    // Notify listeners in same tab
    window.dispatchEvent(new CustomEvent("accord-notif-prefs-changed", { detail: { userId } }));
  } catch {
    /* ignore */
  }
}

export function useNotificationPrefs() {
  const { user } = useAuth();
  const userId = user?.id;
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);

  useEffect(() => {
    if (!userId) {
      setPrefs(DEFAULTS);
      return;
    }
    setPrefs(load(userId));

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId === userId) setPrefs(load(userId));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(userId)) setPrefs(load(userId));
    };
    window.addEventListener("accord-notif-prefs-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("accord-notif-prefs-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  const update = useCallback(
    (patch: Partial<NotifPrefs>) => {
      if (!userId) return;
      const next = { ...load(userId), ...patch };
      save(userId, next);
      setPrefs(next);
    },
    [userId]
  );

  const setType = useCallback(
    (key: NotifTypeKey, value: boolean) => {
      if (!userId) return;
      const current = load(userId);
      const next = { ...current, types: { ...current.types, [key]: value } };
      save(userId, next);
      setPrefs(next);
    },
    [userId]
  );

  /** Pause until next local midnight (00:00 of next day). */
  const pauseUntilMidnight = useCallback(() => {
    if (!userId) return;
    const d = new Date();
    d.setHours(24, 0, 0, 0); // next 00:00 local
    update({ pausedUntil: d.getTime() });
  }, [userId, update]);

  const resumeNow = useCallback(() => {
    if (!userId) return;
    update({ pausedUntil: null });
  }, [userId, update]);

  const isPaused = !!(prefs.pausedUntil && prefs.pausedUntil > Date.now());

  return {
    prefs,
    update,
    setType,
    pauseUntilMidnight,
    resumeNow,
    isPaused,
  };
}

/** Pure helper for non-hook contexts. */
export function readPrefs(userId: string | undefined | null): NotifPrefs {
  if (!userId) return DEFAULTS;
  return load(userId);
}
