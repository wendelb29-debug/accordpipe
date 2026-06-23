import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { readPrefs } from "@/hooks/useNotificationPrefs";

interface NewLeadPayload {
  id: string;
  company_name: string;
  contact_name: string | null;
  servidor_id: string;
  workspace_id?: string | null;
  created_by_user_id?: string | null;
}

function playNotificationSound() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* noop */
  }
}

function showNewLeadToast(lead: NewLeadPayload) {
  const leadLink = `/atendimento?lead=${lead.id}`;
  const summary = `${lead.contact_name || "Sem contato"} · ${lead.company_name}`;

  playNotificationSound();
  if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
    try { (navigator as any).vibrate([180, 80, 180]); } catch { /* noop */ }
  }

  toast.custom(
    (id) => (
      <div
        onClick={() => {
          window.location.href = leadLink;
          toast.dismiss(id);
        }}
        className="cursor-pointer pointer-events-auto flex items-start gap-3 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white shadow-2xl animate-in slide-in-from-top-5 duration-300 min-w-[320px] max-w-[420px]"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 animate-bounce">
          <span className="text-lg">✨</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Novo Lead recebido!</p>
          <p className="mt-0.5 truncate text-xs text-emerald-50">{summary}</p>
          <p className="mt-1 text-[11px] text-emerald-100/90">Clique para abrir no pipeline</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toast.dismiss(id); }}
          className="flex-shrink-0 text-emerald-100 hover:text-white"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    ),
    { duration: 8000, position: "top-center" }
  );
}

/**
 * Subscribes to Supabase Realtime INSERTs on crm_leads and shows a visual
 * notification with sound when a new lead arrives.
 *
 * - Scoped by servidor_id (tenant isolation).
 * - Optionally scoped by workspace_id.
 * - Skips notifications for leads created by the current user.
 * - Respects the per-user notification prefs (alertsEnabled, pausedUntil).
 */
export function useNewLeadNotifications(
  servidorId?: string | null,
  workspaceId?: string | null,
  enabled: boolean = true
) {
  const { profile, user } = useAuth();

  useEffect(() => {
    if (!enabled || !servidorId || !profile?.user_id) return;

    const channel = supabase
      .channel(`new-leads-${servidorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_leads",
          filter: `servidor_id=eq.${servidorId}`,
        },
        (payload: any) => {
          const lead = payload.new as NewLeadPayload;
          if (!lead) return;

          // Workspace scope
          if (workspaceId && lead.workspace_id !== workspaceId) return;

          // Don't alert the creator
          if (lead.created_by_user_id && lead.created_by_user_id === profile.user_id) return;

          // Respect prefs (paused / alerts off / lead type off)
          const prefs = readPrefs(user?.id);
          if (!prefs.alertsEnabled) return;
          if (prefs.pausedUntil && prefs.pausedUntil > Date.now()) return;
          if (prefs.types.leads_won === false && false) return; // placeholder

          showNewLeadToast(lead);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, servidorId, workspaceId, profile?.user_id, user?.id]);
}
