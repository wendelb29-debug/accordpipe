import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { readPrefs } from "@/hooks/useNotificationPrefs";

/**
 * Mounts native PWA notifications for incoming emails and WhatsApp messages.
 * Complements (does NOT replace) the in-app toasts in:
 *   - useEmailNotifications  (visual toast + ding)
 *   - useInboxNotifications  (WhatsApp preview card)
 *
 * Native notifications are only shown when:
 *   - the user granted Notification permission
 *   - the document is hidden OR the user isn't on the related route
 *   - per-user prefs allow the type (email_tracking / whatsapp_messages)
 *   - the user isn't on Do-Not-Disturb (pausedUntil)
 *
 * Push (FCM/VAPID) is out of scope — this delivers notifications only while
 * the browser keeps the page alive. True background push requires a separate
 * push subscription setup.
 */
export function useMultiEventNotifications(enabled: boolean = true) {
  const { user } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const accountIdsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;
    if (!user?.id || !activeCompanyId) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    let cancelled = false;
    let emailChannel: ReturnType<typeof supabase.channel> | null = null;
    let waChannel: ReturnType<typeof supabase.channel> | null = null;

    async function show(payload: {
      title: string;
      body: string;
      tag: string;
      url: string;
    }) {
      try {
        if (Notification.permission !== "granted") return;
        const prefs = readPrefs(user!.id);
        if (!prefs.alertsEnabled) return;
        if (prefs.pausedUntil && prefs.pausedUntil > Date.now()) return;

        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg && reg.active) {
          reg.active.postMessage({ type: "show-notification", payload });
        } else if (document.hidden) {
          // Fallback when no SW (tab still alive)
          new Notification(payload.title, {
            body: payload.body,
            tag: payload.tag,
            icon: "/accord-icon-192.png",
          });
        }
      } catch {
        /* silent */
      }
    }

    (async () => {
      // Email account ids for this user in the active tenant
      const { data: accounts } = await supabase
        .from("email_accounts")
        .select("id")
        .eq("user_id", user!.id)
        .eq("servidor_id", activeCompanyId);
      if (cancelled) return;
      accountIdsRef.current = new Set((accounts || []).map((a: any) => a.id));

      emailChannel = supabase
        .channel(`pwa-email-notif:${user!.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "email_messages" },
          (payload) => {
            const msg = payload.new as any;
            if (!accountIdsRef.current.has(msg.account_id)) return;
            if (msg.is_read === true) return;
            if (msg.folder && msg.folder.toLowerCase() !== "inbox") return;
            const receivedAt = new Date(msg.received_at || msg.created_at).getTime();
            if (receivedAt < startedAtRef.current - 60 * 60 * 1000) return;

            const prefs = readPrefs(user!.id);
            if (prefs.types.email_tracking === false) return;

            const isOnEmail = window.location.pathname.startsWith("/email");
            if (isOnEmail && !document.hidden) return;

            const sender = msg.from_name || msg.from_email || "Desconhecido";
            const subject = msg.subject || "(sem assunto)";
            show({
              title: "📧 Novo e-mail",
              body: `${sender}: ${subject}`,
              tag: `email-${msg.id}`,
              url: `/email/${msg.account_id}`,
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "email_accounts",
            filter: `user_id=eq.${user!.id}`,
          },
          (p) => {
            const acc = p.new as any;
            if (acc.servidor_id === activeCompanyId) accountIdsRef.current.add(acc.id);
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "email_accounts" },
          (p) => {
            const acc = p.old as any;
            accountIdsRef.current.delete(acc.id);
          }
        )
        .subscribe();

      waChannel = supabase
        .channel(`pwa-wa-notif:${activeCompanyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "whatsapp_messages",
            filter: `company_id=eq.${activeCompanyId}`,
          },
          async (payload) => {
            const msg = payload.new as any;
            if (!msg || msg.direction !== "inbound") return;

            const prefs = readPrefs(user!.id);
            if (prefs.types.whatsapp_messages === false) return;

            const isOnInbox = window.location.pathname.startsWith("/accord-stack");
            if (isOnInbox && !document.hidden) return;

            // Resolve contact name (best-effort)
            let name = msg.phone || "Desconhecido";
            try {
              const { data: contact } = await supabase
                .from("whatsapp_contacts")
                .select("name, phone")
                .eq("id", msg.contact_id)
                .maybeSingle();
              if (contact?.name) name = contact.name;
              else if (contact?.phone) name = contact.phone;
            } catch {
              /* ignore */
            }

            const type = msg.message_type || "text";
            let preview = (msg.message || "").trim();
            if (!preview) {
              if (type === "image") preview = "📷 Imagem";
              else if (type === "audio" || type === "ptt") preview = "🎧 Áudio";
              else if (type === "video") preview = "🎬 Vídeo";
              else if (type === "document" || type === "pdf") preview = "📄 Documento";
              else preview = "Nova mensagem";
            }
            if (preview.length > 120) preview = preview.slice(0, 117) + "…";

            show({
              title: "💬 Nova mensagem",
              body: `${name}: ${preview}`,
              tag: `wa-${msg.contact_id}`,
              url: `/accord-stack`,
            });
          }
        )
        .subscribe();
    })();

    // Ask permission lazily on first user gesture if still in default state
    const askOnce = async () => {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch { /* ignore */ }
      window.removeEventListener("pointerdown", askOnce);
    };
    if (Notification.permission === "default") {
      window.addEventListener("pointerdown", askOnce, { once: true });
    }

    return () => {
      cancelled = true;
      if (emailChannel) supabase.removeChannel(emailChannel);
      if (waChannel) supabase.removeChannel(waChannel);
      window.removeEventListener("pointerdown", askOnce);
    };
  }, [enabled, user?.id, activeCompanyId]);
}
