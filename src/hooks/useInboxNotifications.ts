import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export interface InboxNotification {
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_avatar: string | null;
  last_message_id: string;
  last_message_preview: string;
  last_message_type: string;
  last_message_at: string;
  unread_count: number;
}

const PREVIEW_DURATION_MS = 10_000;

function previewForMessage(msg: any): string {
  const type = msg.message_type || "text";
  const text = (msg.message || "").trim();
  if (type === "image") return text ? `📷 ${text}` : "📷 Imagem";
  if (type === "audio" || type === "ptt") return "🎧 Áudio";
  if (type === "video") return text ? `🎬 ${text}` : "🎬 Vídeo";
  if (type === "document" || type === "pdf") return text ? `📄 ${text}` : "📄 Documento";
  if (type === "sticker") return "✨ Figurinha";
  if (type === "location") return "📍 Localização";
  if (type === "contact" || type === "vcard") return "👤 Contato";
  if (!text) return "📎 Arquivo";
  return text.length > 80 ? text.slice(0, 77) + "…" : text;
}

/**
 * Global listener for new inbound WhatsApp messages.
 * Surfaces a transient "preview" notification (~10s) and tracks unread pending messages.
 *
 * Notifications are suppressed while the user is already on /accord-stack
 * (they are reading the inbox there).
 */
export function useInboxNotifications() {
  const { activeCompanyId } = useAuth();
  const location = useLocation();
  const isOnInboxPage = location.pathname.startsWith("/accord-stack");

  const [preview, setPreview] = useState<InboxNotification | null>(null);
  const [pending, setPending] = useState<InboxNotification[]>([]);
  const previewTimerRef = useRef<number | null>(null);
  const isOnInboxPageRef = useRef(isOnInboxPage);
  useEffect(() => {
    isOnInboxPageRef.current = isOnInboxPage;
  }, [isOnInboxPage]);

  const clearPreview = useCallback(() => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setPreview(null);
  }, []);

  const dismissContact = useCallback((contactId: string) => {
    setPending((prev) => prev.filter((p) => p.contact_id !== contactId));
    setPreview((prev) => (prev?.contact_id === contactId ? null : prev));
  }, []);

  const dismissAll = useCallback(() => {
    setPending([]);
    clearPreview();
  }, [clearPreview]);

  useEffect(() => {
    if (!activeCompanyId) return;

    const channel = supabase
      .channel(`inbox-notifications-${activeCompanyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `company_id=eq.${activeCompanyId}`,
        },
        async (payload) => {
          const msg: any = payload.new;
          if (!msg || msg.direction !== "inbound") return;
          // Skip if user is already viewing the inbox
          if (isOnInboxPage) return;

          // Fetch contact info
          const { data: contact } = await supabase
            .from("whatsapp_contacts")
            .select("id, name, phone, avatar_url")
            .eq("id", msg.contact_id)
            .maybeSingle();

          const notif: InboxNotification = {
            contact_id: msg.contact_id,
            contact_name: contact?.name || msg.phone || "Desconhecido",
            contact_phone: contact?.phone || msg.phone || "",
            contact_avatar: contact?.avatar_url || null,
            last_message_id: msg.id,
            last_message_preview: previewForMessage(msg),
            last_message_type: msg.message_type || "text",
            last_message_at: msg.created_at,
            unread_count: 1,
          };

          setPending((prev) => {
            const existing = prev.find((p) => p.contact_id === notif.contact_id);
            if (existing) {
              return prev.map((p) =>
                p.contact_id === notif.contact_id
                  ? {
                      ...notif,
                      unread_count: existing.unread_count + 1,
                    }
                  : p
              );
            }
            return [...prev, notif];
          });

          // Show / refresh preview balloon
          setPreview((prev) => {
            const merged: InboxNotification = prev?.contact_id === notif.contact_id
              ? { ...notif, unread_count: prev.unread_count + 1 }
              : notif;
            return merged;
          });

          if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
          previewTimerRef.current = window.setTimeout(() => {
            setPreview(null);
            previewTimerRef.current = null;
          }, PREVIEW_DURATION_MS);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [activeCompanyId, isOnInboxPage]);

  // When user navigates to inbox, clear pending state
  useEffect(() => {
    if (isOnInboxPage) dismissAll();
  }, [isOnInboxPage, dismissAll]);

  return {
    preview,
    pending,
    totalUnread: pending.reduce((sum, p) => sum + p.unread_count, 0),
    clearPreview,
    dismissContact,
    dismissAll,
  };
}
