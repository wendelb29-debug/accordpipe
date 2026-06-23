import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsappCall {
  id: string;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string;
  call_type: "outgoing" | "incoming";
  status: string;
  rejection_reason: string | null;
  duration_seconds: number | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  workspace_id: string | null;
  initiated_by_user_id: string | null;
}

export function useWhatsappCalls(
  companyId: string | null,
  workspaceId?: string,
  isAdmin?: boolean,
) {
  const qc = useQueryClient();

  const calls = useQuery({
    queryKey: ["whatsapp_calls", companyId, workspaceId, isAdmin],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("whatsapp_calls" as any)
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (workspaceId && !isAdmin) q = q.eq("workspace_id", workspaceId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WhatsappCall[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["whatsapp_calls"] });

  const makeCall = useMutation({
    mutationFn: async (params: {
      contact_id: string;
      phone: string;
      contact_name: string;
      workspace_id?: string;
    }) => {
      if (!companyId) throw new Error("Tenant não identificado");
      const { data, error } = await supabase.functions.invoke("whatsapp-make-call", {
        body: {
          contact_id: params.contact_id,
          company_id: companyId,
          workspace_id: params.workspace_id ?? null,
          phone: params.phone,
          contact_name: params.contact_name,
        },
      });
      if (error) throw new Error(error.message || "Erro ao iniciar chamada");
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: invalidate,
  });

  const rejectCall = useMutation({
    mutationFn: async (params: {
      phone: string;
      call_record_id?: string;
      rejection_reason?: string;
    }) => {
      if (!companyId) throw new Error("Tenant não identificado");
      const { data, error } = await supabase.functions.invoke("whatsapp-reject-call", {
        body: {
          company_id: companyId,
          phone: params.phone,
          call_record_id: params.call_record_id,
          rejection_reason: params.rejection_reason,
        },
      });
      if (error) throw new Error(error.message || "Erro ao rejeitar chamada");
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    calls: calls.data ?? [],
    isLoading: calls.isLoading,
    isError: calls.isError,
    makeCall,
    rejectCall,
    refetch: calls.refetch,
  };
}
