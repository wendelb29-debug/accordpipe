import { useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePresenceIndicatorProps {
  userId: string;
  contactId: string;
  tenantId: string;
  serverUrl?: string | null;
  instanceToken?: string | null;
  isRecording: boolean;
  remoteJid?: string | null;
}

export function usePresenceIndicator({
  userId,
  contactId,
  tenantId,
  serverUrl,
  instanceToken,
  isRecording,
  remoteJid,
}: UsePresenceIndicatorProps) {
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingRef = useRef<number>(0);
  const currentPresenceRef = useRef<string | null>(null);

  const sendPresenceToUazapi = useCallback(
    async (presenceType: "typing" | "recording" | "paused") => {
      if (!serverUrl || !instanceToken) return;
      try {
        await fetch(`${serverUrl.replace(/\/$/, "")}/message/presence`, {
          method: "POST",
          headers: { token: instanceToken, "Content-Type": "application/json" },
          body: JSON.stringify({ presence: presenceType, number: remoteJid || undefined }),
        });
      } catch (err) {
        console.warn("[Presence] uazapi failed:", (err as Error).message);
      }
    },
    [serverUrl, instanceToken, remoteJid]
  );

  const updatePresenceInDB = useCallback(
    async (presenceType: string) => {
      if (!userId || !contactId || !tenantId) return;
      try {
        if (presenceType === "none") {
          await supabase.rpc("clear_presence" as any, {
            p_user_id: userId,
            p_contact_id: contactId,
          });
          currentPresenceRef.current = null;
        } else {
          await supabase.rpc("update_presence" as any, {
            p_user_id: userId,
            p_contact_id: contactId,
            p_tenant_id: tenantId,
            p_presence_type: presenceType,
          });
          currentPresenceRef.current = presenceType;
        }
      } catch (err) {
        console.warn("[Presence] db update failed:", (err as Error).message);
      }
    },
    [userId, contactId, tenantId]
  );

  const handleTextInput = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingRef.current < 1000 && currentPresenceRef.current === "typing") {
      // Reset auto-clear timer below even on dedupe
    } else {
      lastTypingRef.current = now;
      if (currentPresenceRef.current !== "typing") {
        updatePresenceInDB("typing");
        sendPresenceToUazapi("typing");
      }
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      updatePresenceInDB("none");
      sendPresenceToUazapi("paused");
    }, 3000);
  }, [updatePresenceInDB, sendPresenceToUazapi]);

  const clearPresence = useCallback(async () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await updatePresenceInDB("none");
  }, [updatePresenceInDB]);

  useEffect(() => {
    if (isRecording && currentPresenceRef.current !== "recording") {
      updatePresenceInDB("recording");
      sendPresenceToUazapi("recording");
    } else if (!isRecording && currentPresenceRef.current === "recording") {
      updatePresenceInDB("none");
      sendPresenceToUazapi("paused");
    }
  }, [isRecording, updatePresenceInDB, sendPresenceToUazapi]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Best-effort cleanup
      if (userId && contactId) {
        supabase
          .rpc("clear_presence" as any, { p_user_id: userId, p_contact_id: contactId })
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  return { handleTextInput, clearPresence };
}
