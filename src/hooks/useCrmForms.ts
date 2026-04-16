import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { slugify } from "@/lib/slugify";
import { toast } from "sonner";

export interface CrmForm {
  id: string;
  servidor_id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  fields: string[];
  tags: string[] | null;
  is_active: boolean;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  lead_count?: number;
  // Landing page fields
  slug?: string | null;
  landing_page_enabled?: boolean;
  headline?: string | null;
  subheadline?: string | null;
  cta_text?: string | null;
  thank_you_message?: string | null;
  redirect_url_after_submit?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

export const AVAILABLE_FIELDS = [
  { id: "nome", label: "Nome", required: true, removable: false },
  { id: "telefone", label: "Telefone (WhatsApp)", required: true, removable: false },
  { id: "email", label: "Email", required: false, removable: true },
  { id: "empresa", label: "Empresa", required: false, removable: true },
  { id: "cidade", label: "Cidade", required: false, removable: true },
  { id: "colaboradores", label: "Qtd. de Colaboradores", required: false, removable: true },
  { id: "mensagem", label: "Mensagem / Necessidade", required: false, removable: true },
] as const;

export function useCrmForms() {
  const [forms, setForms] = useState<CrmForm[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();

  const fetchForms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching forms:", error);
      toast.error("Erro ao carregar formulários");
      setLoading(false);
      return;
    }

    const formsList = (data || []) as unknown as CrmForm[];

    // Get lead counts per form
    if (formsList.length > 0) {
      const formIds = formsList.map((f) => f.id);
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("form_id")
        .in("form_id", formIds);

      const counts: Record<string, number> = {};
      (leads || []).forEach((l: any) => {
        if (l.form_id) counts[l.form_id] = (counts[l.form_id] || 0) + 1;
      });

      formsList.forEach((f) => {
        f.lead_count = counts[f.id] || 0;
      });
    }

    setForms(formsList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const getServidorId = async () => {
    if (companyId) return companyId;
    const { data } = await supabase
      .from("companies")
      .select("id")
      .is("servidor_id", null)
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  };

  const ensureUniqueSlug = async (servidorId: string, baseSlug: string, excludeId?: string): Promise<string> => {
    let candidate = baseSlug || "form";
    let suffix = 0;
    // Try up to 50 variations
    for (let i = 0; i < 50; i++) {
      const trySlug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
      let q = supabase.from("crm_forms").select("id").eq("servidor_id", servidorId).eq("slug", trySlug);
      if (excludeId) q = q.neq("id", excludeId);
      const { data } = await q.maybeSingle();
      if (!data) return trySlug;
      suffix++;
    }
    return `${candidate}-${Date.now()}`;
  };

  const createForm = async (form: Partial<CrmForm>) => {
    const servidorId = await getServidorId();
    if (!servidorId) {
      toast.error("Erro - empresa não encontrada");
      return null;
    }
    const baseSlug = form.slug ? slugify(form.slug) : slugify(form.name || "");
    const finalSlug = baseSlug ? await ensureUniqueSlug(servidorId, baseSlug) : null;
    const payload = {
      name: form.name,
      description: form.description || null,
      fields: form.fields || ["nome", "telefone"],
      workspace_id: form.workspace_id || null,
      tags: form.tags || null,
      is_active: true,
      servidor_id: servidorId,
      created_by_user_id: profile?.user_id || null,
      created_by_name: profile?.name || null,
      slug: finalSlug,
      landing_page_enabled: form.landing_page_enabled ?? true,
      headline: form.headline || null,
      subheadline: form.subheadline || null,
      cta_text: form.cta_text || null,
      thank_you_message: form.thank_you_message || null,
      redirect_url_after_submit: form.redirect_url_after_submit || null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
    };
    const { data, error } = await supabase
      .from("crm_forms")
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error("Error creating form:", error);
      toast.error(`Erro ao criar formulário: ${error.message}`);
      return null;
    }
    const newForm = { ...(data as unknown as CrmForm), lead_count: 0 };
    setForms((prev) => [newForm, ...prev]);
    toast.success("Formulário criado!");
    return newForm;
  };

  const updateForm = async (id: string, updates: Partial<CrmForm>) => {
    // If slug is being changed, normalize and ensure uniqueness
    const finalUpdates: any = { ...updates };
    if (updates.slug !== undefined && updates.slug !== null) {
      const normalized = slugify(updates.slug);
      if (normalized) {
        const current = forms.find((f) => f.id === id);
        if (current) {
          finalUpdates.slug = await ensureUniqueSlug(current.servidor_id, normalized, id);
        } else {
          finalUpdates.slug = normalized;
        }
      } else {
        finalUpdates.slug = null;
      }
    }
    const { error } = await supabase.from("crm_forms").update(finalUpdates).eq("id", id);
    if (error) {
      console.error("Error updating form:", error);
      toast.error(`Erro ao atualizar formulário: ${error.message}`);
      return false;
    }
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    toast.success("Formulário atualizado!");
    return true;
  };

  const deleteForm = async (id: string) => {
    const { error } = await supabase.from("crm_forms").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir formulário");
      return false;
    }
    setForms((prev) => prev.filter((f) => f.id !== id));
    toast.success("Formulário excluído!");
    return true;
  };

  return { forms, loading, createForm, updateForm, deleteForm, refetch: fetchForms };
}
