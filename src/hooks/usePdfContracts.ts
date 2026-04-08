import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";

export interface PdfContract {
  id: string;
  servidor_id: string;
  name: string;
  description: string | null;
  pdf_url: string;
  pdf_path: string;
  pdf_assinado_url?: string | null;
  pdf_assinado_path?: string | null;
  status: string;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  document_hash?: string | null;
  validation_code?: string | null;
  signers?: PdfContractSigner[];
}

export interface PdfContractSigner {
  id: string;
  contract_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  signing_token: string;
  status: string;
  sign_order: number;
  signed_at: string | null;
  signature_photo_url: string | null;
  signature_latitude: number | null;
  signature_longitude: number | null;
  signature_address: string | null;
  signer_ip: string | null;
  created_at: string;
}

export interface PdfContractHistory {
  id: string;
  contract_id: string;
  action: string;
  description: string | null;
  created_by_name: string | null;
  created_at: string;
}

export function usePdfContracts() {
  const { profile, isMaster, isCeo } = useAuth();
  const companyId = useActiveCompanyId();
  const [contracts, setContracts] = useState<PdfContract[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = isMaster || isCeo || profile?.is_master;

  const fetchContracts = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pdf_contracts")
      .select("*")
      .eq("servidor_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("PDF contracts fetch error:", error.message, error.code, error.details, error.hint);
      toast.error("Erro ao carregar contratos PDF: " + error.message);
    }
    setContracts((data as PdfContract[]) || []);
    setLoading(false);
  };

  const fetchSigners = async (contractId: string): Promise<PdfContractSigner[]> => {
    const { data, error } = await supabase
      .from("pdf_contract_signers")
      .select("*")
      .eq("contract_id", contractId)
      .order("sign_order", { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return (data as PdfContractSigner[]) || [];
  };

  const fetchHistory = async (contractId: string): Promise<PdfContractHistory[]> => {
    const { data, error } = await supabase
      .from("pdf_contract_history")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return (data as PdfContractHistory[]) || [];
  };

  const createContract = async (
    name: string,
    description: string,
    pdfFile: File,
    signers: { name: string; email: string; phone: string; cpf_cnpj: string; address: string }[]
  ) => {
    if (!companyId || !canManage) {
      toast.error("Sem permissão para criar contratos");
      return null;
    }

    try {
      const filePath = `${companyId}/${Date.now()}_${pdfFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(filePath, pdfFile, { contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);

      const { data: contract, error: contractErr } = await supabase
        .from("pdf_contracts")
        .insert({
          servidor_id: companyId,
          name,
          description: description || null,
          pdf_url: urlData.publicUrl,
          pdf_path: filePath,
          created_by_user_id: profile.user_id,
          created_by_name: profile.name,
        } as any)
        .select("id")
        .single();

      if (contractErr || !contract) throw contractErr;

      const signerRecords = signers.map((s, i) => ({
        contract_id: contract.id,
        name: s.name,
        email: s.email || null,
        phone: s.phone || null,
        cpf_cnpj: s.cpf_cnpj || null,
        address: s.address || null,
        sign_order: i,
      }));

      const { error: signerErr } = await supabase
        .from("pdf_contract_signers")
        .insert(signerRecords as any);
      if (signerErr) throw signerErr;

      await supabase.from("pdf_contract_history").insert({
        contract_id: contract.id,
        action: "criado",
        description: `Contrato "${name}" criado com ${signers.length} contratante(s)`,
        created_by_name: profile.name,
      } as any);

      toast.success("Contrato criado com sucesso!");
      await fetchContracts();
      return contract.id;
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao criar contrato: " + (err.message || ""));
      return null;
    }
  };

  const cancelContract = async (contractId: string) => {
    if (!canManage) return;
    const { error } = await supabase
      .from("pdf_contracts")
      .update({ status: "cancelado" } as any)
      .eq("id", contractId);
    if (error) {
      toast.error("Erro ao cancelar contrato");
    } else {
      await supabase.from("pdf_contract_history").insert({
        contract_id: contractId,
        action: "cancelado",
        description: "Contrato cancelado",
        created_by_name: profile?.name,
      } as any);
      toast.success("Contrato cancelado");
      await fetchContracts();
    }
  };

  useEffect(() => {
    if (profile?.company_id) fetchContracts();
  }, [profile]);

  return {
    contracts,
    loading,
    canManage,
    fetchContracts,
    fetchSigners,
    fetchHistory,
    createContract,
    cancelContract,
  };
}
