import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ServiceSettings {
  tenant_id: string;
  delivery_mode: "auto_accept" | "accept_or_reject";
  distribution_type: "round_robin" | "equal" | "availability";
  tickets_per_cycle: number;
  max_receptive_per_agent: number;
  max_active_per_agent: number;
  show_agent_name: boolean;
  allow_audio: boolean;
  allow_emoji: boolean;
  allow_stickers: boolean;
  allow_files: boolean;
  allow_export_pdf: boolean;
  keep_history_on_transfer: boolean;
  require_transfer_note: boolean;
  move_to_wait_on_transfer: boolean;
  block_transfer_to_offline: boolean;
  msg_greeting: string | null;
  msg_transfer: string | null;
  msg_wait: string | null;
  msg_closing: string | null;
  business_hours: Array<{ day: number; enabled: boolean; start: string; end: string; message?: string }>;
  off_hours_message: string | null;
}

const DEFAULTS: Omit<ServiceSettings, "tenant_id"> = {
  delivery_mode: "accept_or_reject",
  distribution_type: "round_robin",
  tickets_per_cycle: 5,
  max_receptive_per_agent: 20,
  max_active_per_agent: 20,
  show_agent_name: true,
  allow_audio: true, allow_emoji: true, allow_stickers: true,
  allow_files: true, allow_export_pdf: true,
  keep_history_on_transfer: true, require_transfer_note: false,
  move_to_wait_on_transfer: false, block_transfer_to_offline: true,
  msg_greeting: "", msg_transfer: "", msg_wait: "", msg_closing: "",
  business_hours: Array.from({ length: 7 }, (_, i) => ({ day: i, enabled: i >= 1 && i <= 5, start: "09:00", end: "18:00", message: "" })),
  off_hours_message: "",
};

export function useServiceSettings() {
  const { activeCompanyId } = useAuth();
  const [settings, setSettings] = useState<ServiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data } = await (supabase as any).from("service_settings").select("*").eq("tenant_id", activeCompanyId).maybeSingle();
    setSettings(data ? { ...DEFAULTS, ...(data as any) } : { tenant_id: activeCompanyId, ...DEFAULTS });
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<ServiceSettings>) => {
    if (!activeCompanyId || !settings) return;
    setSaving(true);
    const merged = { ...settings, ...patch, tenant_id: activeCompanyId };
    const { error } = await (supabase as any).from("service_settings").upsert(merged, { onConflict: "tenant_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    setSettings(merged);
    toast.success("Configurações salvas");
    return true;
  };

  const update = <K extends keyof ServiceSettings>(k: K, v: ServiceSettings[K]) =>
    setSettings(p => (p ? { ...p, [k]: v } : p));

  return { settings, loading, saving, save, update, reload: load };
}
