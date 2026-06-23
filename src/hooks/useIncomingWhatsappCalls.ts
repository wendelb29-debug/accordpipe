import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface IncomingCall {
  call_id: string;
  contact_id: string;
  phone: string;
  caller_name?: string | null;
  caller_avatar?: string | null;
  workspace_id?: string | null;
  timestamp: string;
}

let ringtoneStop: (() => void) | null = null;

function playRingtone(): () => void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let stopped = false;
    const ids: number[] = [];

    const beep = (offset: number) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    };

    const cycle = () => {
      if (stopped) return;
      for (let i = 0; i < 3; i++) beep(i * 0.5);
      ids.push(window.setTimeout(cycle, 2500));
    };
    cycle();

    return () => {
      stopped = true;
      ids.forEach((id) => clearTimeout(id));
      try { ctx.close(); } catch { /* noop */ }
    };
  } catch {
    return () => {};
  }
}

export function useIncomingWhatsappCalls() {
  const { profile } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const stopRinging = useCallback(() => {
    setIsRinging(false);
    if (ringtoneStop) { ringtoneStop(); ringtoneStop = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (navigator.vibrate) navigator.vibrate(0);
  }, []);

  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId) return;

    const channel = supabase.channel(`incoming_calls_${userId}`);
    channel
      .on("broadcast", { event: "incoming_call" }, ({ payload }) => {
        const call = payload as IncomingCall;
        console.log("[IncomingCall]", call);
        setIncomingCall(call);
        setIsRinging(true);
        if (ringtoneStop) ringtoneStop();
        ringtoneStop = playRingtone();
        if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          stopRinging();
          setIncomingCall(null);
        }, 45000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRinging();
    };
  }, [profile?.user_id, stopRinging]);

  const acceptCall = useCallback(async (callId: string) => {
    stopRinging();
    try {
      await supabase
        .from("whatsapp_calls" as any)
        .update({
          status: "active",
          answered_by_user_id: profile?.user_id,
          answered_at: new Date().toISOString(),
        })
        .eq("id", callId);
    } catch (err) {
      console.error("acceptCall error:", err);
    }
    setIncomingCall(null);
  }, [profile?.user_id, stopRinging]);

  const rejectCall = useCallback(async (callId: string, phone: string) => {
    stopRinging();
    setIncomingCall(null);
    try {
      await supabase.functions.invoke("whatsapp-reject-call", {
        body: {
          company_id: profile?.company_id,
          phone,
          call_record_id: callId,
          rejection_reason: "Rejeitada pelo receptor",
        },
      });
    } catch (err) {
      console.error("rejectCall error:", err);
    }
  }, [profile?.company_id, stopRinging]);

  return { incomingCall, isRinging, acceptCall, rejectCall };
}
