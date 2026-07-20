import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  contact_group_id: string | null;
  source: string;
  status: "active" | "blocked";
  name_manually_edited: boolean;
  wa_chatid: string | null;
  lead_id: string | null;
  last_interaction_at: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactGroup {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function normalizePhone(v: string): string {
  return String(v || "").replace(/\D+/g, "");
}

export function useContacts(filters: {
  search?: string;
  groupId?: string | null;
  status?: "active" | "blocked" | "all";
} = {}) {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: ["contacts", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("whatsapp_contacts")
        .select("*")
        .eq("company_id", companyId!)
        .order("last_interaction_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.groupId) q = q.eq("contact_group_id", filters.groupId);
      if (filters.search && filters.search.trim().length > 1) {
        const term = filters.search.trim();
        const digits = term.replace(/\D/g, "");
        q = q.or(`name.ilike.%${term}%,phone.ilike.%${digits || term}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });
}

export function useContactGroups() {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: ["contact-groups", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_groups")
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ContactGroup[];
    },
  });
}

export function useContactMutations() {
  const qc = useQueryClient();
  const companyId = useActiveCompanyId();

  const create = useMutation({
    mutationFn: async (input: {
      name: string; phone: string; group_id?: string | null; alsoAddToWhatsApp?: boolean;
    }) => {
      const phone = normalizePhone(input.phone);
      if (!companyId) throw new Error("no_tenant");
      if (!input.name.trim() || !phone) throw new Error("invalid_input");
      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .insert({
          company_id: companyId,
          name: input.name.trim(),
          phone,
          source: "manual",
          status: "active",
          contact_group_id: input.group_id ?? null,
          name_manually_edited: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (input.alsoAddToWhatsApp) {
        try {
          await supabase.functions.invoke("uazapi-contact-add", {
            body: { tenant_id: companyId, number: phone, name: input.name.trim() },
          });
        } catch (e) { console.warn("uazapi-contact-add failed", e); }
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); toast.success("Contato criado"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar contato"),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Contact> & { markEdited?: boolean } }) => {
      const p: any = { ...input.patch };
      if (p.markEdited || p.name) p.name_manually_edited = true;
      delete p.markEdited;
      const { error } = await supabase.from("whatsapp_contacts").update(p).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); toast.success("Contato atualizado"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });

  const toggleBlock = useMutation({
    mutationFn: async (input: { phone: string; block: boolean }) => {
      if (!companyId) throw new Error("no_tenant");
      const { error } = await supabase.functions.invoke("uazapi-contact-block", {
        body: { tenant_id: companyId, number: input.phone, block: input.block },
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(v.block ? "Contato bloqueado" : "Contato desbloqueado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao bloquear"),
  });

  const bulkGroup = useMutation({
    mutationFn: async (input: { ids: string[]; groupId: string | null }) => {
      if (!input.ids.length) return;
      const { error } = await supabase
        .from("whatsapp_contacts")
        .update({ contact_group_id: input.groupId })
        .in("id", input.ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); toast.success("Grupo aplicado"); },
  });

  return { create, update, toggleBlock, bulkGroup };
}

export function useContactGroupMutations() {
  const qc = useQueryClient();
  const companyId = useActiveCompanyId();

  const create = useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      if (!companyId) throw new Error("no_tenant");
      const { error } = await supabase.from("contact_groups").insert({
        company_id: companyId, name: input.name.trim(), color: input.color,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contact-groups"] }); toast.success("Grupo criado"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contact-groups"] }); qc.invalidateQueries({ queryKey: ["contacts"] }); toast.success("Grupo removido"); },
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; name: string; color: string }) => {
      const { error } = await supabase.from("contact_groups")
        .update({ name: input.name.trim(), color: input.color })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contact-groups"] }); toast.success("Grupo atualizado"); },
  });

  return { create, remove, update };
}
