import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WHATSAPP_INTEGRATION_SAFE_COLUMNS } from "@/lib/safeColumns";

export type WhatsAppProvider = "zapi" | "uazapi";

export interface TenantWhatsAppIntegration {
  id: string;
  tenant_id: string;
  provider_type: WhatsAppProvider;
  server_url: string | null;
  instance_token: string | null;
  instance_name: string | null;
  instance_id: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  connected_phone: string | null;
  connection_status: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
  provider_metadata: Record<string, any>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantWhatsAppIntegration(tenantId: string | null | undefined) {
  const [integrations, setIntegrations] = useState<TenantWhatsAppIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) {
      setIntegrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_whatsapp_integrations" as any)
      .select(WHATSAPP_INTEGRATION_SAFE_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Erro ao carregar integrações WhatsApp:", error);
      toast.error("Erro ao carregar credenciais");
    } else {
      setIntegrations((data as any) || []);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const getByProvider = useCallback(
    (provider: WhatsAppProvider) => integrations.find((i) => i.provider_type === provider) || null,
    [integrations]
  );

  const save = useCallback(
    async (provider: WhatsAppProvider, payload: Partial<TenantWhatsAppIntegration>) => {
      if (!tenantId) return null;
      setSaving(true);
      const existing = getByProvider(provider);
      const { data: userData } = await supabase.auth.getUser();
      const updated_by = userData.user?.id ?? null;

      const cleanPayload = {
        ...payload,
        server_url: payload.server_url?.trim().replace(/\/$/, "") || null,
        instance_token: payload.instance_token?.trim() || null,
        instance_name: payload.instance_name?.trim() || null,
        instance_id: payload.instance_id?.trim() || null,
      };

      let result;
      if (existing) {
        result = await supabase
          .from("tenant_whatsapp_integrations" as any)
          .update({ ...cleanPayload, updated_by })
          .eq("id", existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("tenant_whatsapp_integrations" as any)
          .insert({
            tenant_id: tenantId,
            provider_type: provider,
            updated_by,
            ...cleanPayload,
          })
          .select()
          .single();
      }
      setSaving(false);

      if (result.error) {
        toast.error("Erro ao salvar: " + result.error.message);
        return null;
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: updated_by!,
        action: existing ? "whatsapp_credentials_updated" : "whatsapp_credentials_created",
        target_type: "tenant_whatsapp_integration",
        target_id: (result.data as any).id,
        servidor_id: tenantId,
        details: { provider_type: provider } as any,
      });

      toast.success("Credenciais salvas com sucesso!");
      await load();
      return result.data as any;
    },
    [tenantId, getByProvider, load]
  );

  const setActive = useCallback(
    async (provider: WhatsAppProvider) => {
      if (!tenantId) return;
      // desativa todas e ativa o escolhido
      await supabase
        .from("tenant_whatsapp_integrations" as any)
        .update({ is_active: false })
        .eq("tenant_id", tenantId);
      const integ = getByProvider(provider);
      if (integ) {
        await supabase
          .from("tenant_whatsapp_integrations" as any)
          .update({ is_active: true })
          .eq("id", integ.id);

        const { data: userData } = await supabase.auth.getUser();
        await supabase.from("audit_logs").insert({
          user_id: userData.user?.id!,
          action: "whatsapp_provider_changed",
          target_type: "tenant_whatsapp_integration",
          target_id: integ.id,
          servidor_id: tenantId,
          details: { provider_type: provider } as any,
        });
      }
      await load();
    },
    [tenantId, getByProvider, load]
  );

  const testConnection = useCallback(
    async (provider: WhatsAppProvider) => {
      if (!tenantId) return null;
      setTesting(true);
      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-test-connection", {
          body: { tenant_id: tenantId, provider_type: provider },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Conexão estabelecida com sucesso!");
        } else {
          toast.error(data?.message || "Falha na conexão");
        }
        await load();
        return data;
      } catch (err: any) {
        toast.error("Erro no teste: " + (err.message || "desconhecido"));
        return null;
      } finally {
        setTesting(false);
      }
    },
    [tenantId, load]
  );

  const clearCredentials = useCallback(
    async (provider: WhatsAppProvider) => {
      const existing = getByProvider(provider);
      if (!existing) return;
      const { error } = await supabase
        .from("tenant_whatsapp_integrations" as any)
        .delete()
        .eq("id", existing.id);
      if (error) {
        toast.error("Erro ao limpar: " + error.message);
        return;
      }
      toast.success("Credenciais removidas");
      await load();
    },
    [getByProvider, load]
  );

  return {
    integrations,
    loading,
    saving,
    testing,
    getByProvider,
    save,
    setActive,
    testConnection,
    clearCredentials,
    reload: load,
  };
}
