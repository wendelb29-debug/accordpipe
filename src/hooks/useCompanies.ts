import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyRow {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  status: string;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
}

export interface CompanyInsert {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  responsavel?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, isMaster, activeCompanyId } = useAuth();

  const fetchCompanies = async () => {
    setLoading(true);
    let query = supabase
      .from("companies")
      .select("*")
      .not("servidor_id", "is", null) // Only show child companies (not servidores)
      .order("created_at", { ascending: false });

    // If not master, filter by user's company (servidor)
    if (!isMaster && profile?.company_id) {
      query = query.eq("servidor_id", profile.company_id);
    } else if (isMaster && activeCompanyId) {
      // Master viewing specific servidor
      query = query.eq("servidor_id", activeCompanyId);
    }
    // If master with no activeCompanyId, show all child companies

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar empresas");
      console.error(error);
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user, activeCompanyId]);

  const addCompany = async (company: CompanyInsert) => {
    // Determine servidor_id: non-master uses their own company_id, master uses activeCompanyId
    const servidorId = isMaster ? activeCompanyId : profile?.company_id;
    
    const { error } = await supabase.from("companies").insert({
      ...company,
      created_by: user?.id,
      servidor_id: servidorId || undefined,
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("CNPJ já cadastrado!");
      } else {
        toast.error("Erro ao cadastrar empresa");
      }
      console.error(error);
      return false;
    }
    toast.success("Empresa cadastrada com sucesso!");
    await fetchCompanies();
    return true;
  };

  const updateCompany = async (id: string, company: Partial<CompanyInsert>) => {
    const { error } = await supabase
      .from("companies")
      .update({
        cnpj: company.cnpj,
        razao_social: company.razao_social,
        nome_fantasia: company.nome_fantasia,
        responsavel: company.responsavel,
        email: company.email,
        telefone: company.telefone,
        cep: company.cep,
        endereco: company.endereco,
        numero: company.numero,
        complemento: company.complemento,
        bairro: company.bairro,
        cidade: company.cidade,
        estado: company.estado,
      })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar empresa");
      console.error(error);
      return false;
    }
    toast.success("Empresa atualizada com sucesso!");
    await fetchCompanies();
    return true;
  };

  const deleteCompany = async (id: string) => {
    if (!profile?.is_master) {
      toast.error("Apenas o usuário master pode excluir empresas");
      return false;
    }
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir empresa");
      console.error(error);
      return false;
    }
    toast.success("Empresa excluída com sucesso!");
    await fetchCompanies();
    return true;
  };

  return { companies, loading, fetchCompanies, addCompany, updateCompany, deleteCompany };
}
