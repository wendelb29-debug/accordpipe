import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuickReply {
  id: string;
  company_id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type QuickReplyInput = {
  title: string;
  content: string;
  shortcut?: string | null;
  category?: string | null;
};

export function useQuickReplies(companyId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ["whatsapp_quick_replies", companyId];

  const list = useQuery({
    queryKey: key,
    enabled: !!companyId,
    queryFn: async (): Promise<QuickReply[]> => {
      const { data, error } = await supabase
        .from("whatsapp_quick_replies" as any)
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("category", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });
      if (error) {
        console.error("[useQuickReplies] load error:", error.message);
        return [];
      }
      return (data as any) || [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async (input: QuickReplyInput) => {
      if (!companyId) throw new Error("Tenant não identificado");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("whatsapp_quick_replies" as any).insert({
        company_id: companyId,
        created_by_user_id: u.user?.id ?? null,
        title: input.title.trim(),
        content: input.content,
        shortcut: input.shortcut?.trim() || null,
        category: input.category?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Resposta rápida criada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar resposta rápida"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & QuickReplyInput) => {
      const { error } = await supabase
        .from("whatsapp_quick_replies" as any)
        .update({
          title: input.title.trim(),
          content: input.content,
          shortcut: input.shortcut?.trim() || null,
          category: input.category?.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Resposta atualizada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar resposta"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_quick_replies" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Resposta removida");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover resposta"),
  });

  return {
    replies: list.data ?? [],
    isLoading: list.isLoading,
    refetch: list.refetch,
    create,
    update,
    remove,
  };
}
