import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useContactStatus(contactId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: status, refetch } = useQuery({
    queryKey: ["contact-status", contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const { data } = await supabase
        .from("contact_assignment_status")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();
      return data;
    },
    enabled: !!contactId,
  });

  const assumeMutation = useMutation({
    mutationFn: async () => {
      if (!contactId || !user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.rpc("assume_attendance", {
        p_contact_id: contactId,
        p_user_id: user.id,
        p_timeout_minutes: 30,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["contact-status", contactId] });
      toast.success("Você assumiu este atendimento!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao assumir"),
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error("Sem contato");
      const { error } = await supabase.rpc("release_attendance", {
        p_contact_id: contactId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["contact-status", contactId] });
      toast.success("Atendimento liberado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao liberar"),
  });

  const isPending = status?.status === "pending";
  const isInProgress = status?.status === "in_progress";
  const isAssignedToMe = !!status?.assigned_to_user_id && status.assigned_to_user_id === user?.id;

  return { status, isPending, isInProgress, isAssignedToMe, assumeMutation, releaseMutation };
}
