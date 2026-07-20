import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

const DENIED_SNOOZE_KEY = (uid: string) => `accord-push-denied-until-${uid}`;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toB64Url(buf: ArrayBuffer | null | undefined): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    try {
      return await navigator.serviceWorker.register("/service-worker.js");
    } catch {
      return null;
    }
  }
}

export type PushStatus = "unsupported" | "default" | "granted" | "denied";

/**
 * Real Web Push subscription hook. Handles VAPID subscription and
 * server-side persistence in push_subscriptions.
 */
export function usePushSubscription() {
  const { user } = useAuth();
  const tenantId = useActiveCompanyId();
  const [status, setStatus] = useState<PushStatus>("default");
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  const supported = typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;

  useEffect(() => {
    if (!supported) { setStatus("unsupported"); return; }
    setStatus(Notification.permission as PushStatus);
    (async () => {
      const reg = await ensureRegistration();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setHasActiveSub(!!sub);
    })();
  }, [supported]);

  const isSnoozed = useCallback((): boolean => {
    if (!user) return false;
    const raw = localStorage.getItem(DENIED_SNOOZE_KEY(user.id));
    if (!raw) return false;
    const until = parseInt(raw, 10);
    return Number.isFinite(until) && Date.now() < until;
  }, [user]);

  const shouldShowBanner = useCallback((): boolean => {
    if (!supported || !user) return false;
    if (status === "granted" && hasActiveSub) return false;
    if (status === "denied") return false;
    if (isSnoozed()) return false;
    return true;
  }, [supported, user, status, hasActiveSub, isSnoozed]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!supported || !user || !tenantId) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushStatus);
      if (perm !== "granted") {
        if (perm === "denied") {
          localStorage.setItem(DENIED_SNOOZE_KEY(user.id), String(Date.now() + SNOOZE_MS));
        }
        return false;
      }

      // Fetch VAPID public key
      const { data: keyData, error: keyErr } = await supabase.functions.invoke("push-public-key");
      if (keyErr || !keyData?.publicKey) throw new Error("Chave VAPID indisponível");

      const reg = await ensureRegistration();
      if (!reg) throw new Error("Service Worker indisponível");

      // Remove any stale sub tied to a different key
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        try { await existing.unsubscribe(); } catch {}
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey).buffer as ArrayBuffer,
      });

      const p256dh = toB64Url(sub.getKey("p256dh"));
      const auth = toB64Url(sub.getKey("auth"));

      const { error: saveErr } = await supabase.functions.invoke("push-subscribe", {
        body: {
          tenant_id: tenantId,
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh, auth },
          },
        },
      });
      if (saveErr) throw saveErr;

      setHasActiveSub(true);
      return true;
    } catch (e) {
      console.error("[push] enable failed", e);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, user, tenantId]);

  const disable = useCallback(async () => {
    if (!supported) return;
    const reg = await ensureRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      try {
        await supabase.functions.invoke("push-subscribe", {
          body: { action: "unsubscribe", endpoint: sub.endpoint },
        });
      } catch {}
      try { await sub.unsubscribe(); } catch {}
    }
    setHasActiveSub(false);
  }, [supported]);

  const sendTest = useCallback(async () => {
    if (!user) return;
    await supabase.functions.invoke("push-send", {
      body: {
        user_id: user.id,
        tenant_id: tenantId,
        title: "Teste de notificação ✅",
        body: "Notificações push do Accord estão funcionando!",
        url: "/home",
      },
    });
  }, [user, tenantId]);

  return { supported, status, hasActiveSub, busy, enable, disable, sendTest, shouldShowBanner };
}
