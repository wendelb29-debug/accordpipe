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
  const { user, profile } = useAuth();

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

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
  }, [user]);

  const addCompany = async (company: CompanyInsert) => {
    const { error } = await supabase.from("companies").insert({
      ...company,
      created_by: user?.id,
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
