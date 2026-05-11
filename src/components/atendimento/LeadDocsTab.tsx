import { useState, useEffect, useRef, useCallback } from "react";
import { Paperclip, Upload, Trash2, Eye, Download, Loader2, FileText, CreditCard, MapPin, Building2, FileSignature, CheckCircle2, Shield, User, Plus, ChevronDown, FolderOpen, ImageIcon, Link2, Clock, XCircle, MoreHorizontal, PenTool, Send, Copy, Mail, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSignedContractPdf } from "@/lib/generateSignedContractPdf";
import { generateContractPdf } from "@/lib/generateContractPdf";
import { addAnnexPage } from "@/lib/generateContractAnnex";
import type { AnnexData, AnnexLineItem } from "@/lib/generateContractAnnex";
import type { CrmLead } from "@/hooks/useCrmLeads";

const ACCEPTED_STATUSES = new Set(["aceita", "accepted", "aprovada", "approved"]);

function activityToProposal(activity: any) {
  if (!activity) return null;
  const meta = activity.metadata || {};
  return {
    id: activity.id,
    titulo: (activity.title || "").replace(/^Proposta:\s*/i, ""),
    descricao: meta.introduction || meta.description || "",
    valor: meta.value_mrr || meta.value_ps || 0,
    created_by_user_id: activity.created_by_user_id,
    proposal_items: (meta.line_items || []).map((item: any) => ({
      nome: item.name || "",
      descricao: item.description || item.descricao || "",
      quantidade: Number(item.quantity) || 1,
      valor: Number(item.total ?? item.unitValue) || 0,
    })),
    installments: meta.installments || [],
    payment_frequency: meta.payment_frequency || "",
    number_of_installments: meta.number_of_installments || 1,
    sigla: meta.sigla || "",
    first_payment_date: meta.first_payment_date || "",
    payment_method: meta.payment_method || "",
  };
}

function buildRenderedContractContent(templateContent: string, lead: CrmLead, tenant?: any, proposal?: any, vendor?: any, registration?: any, contractCode?: string) {
  const fmtCurrency = (v: number) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

  let servicosContratados = "";
  let valorTotal = "";
  let nomeItem = proposal?.titulo || "";
  let descricaoItem = proposal?.descricao || "";

  if (proposal?.proposal_items?.length) {
    servicosContratados = proposal.proposal_items
      .map((item: any) => {
        const parts = [`Serviço: ${item.nome || ""}`];
        if (item.descricao) parts.push(`Descrição: ${item.descricao}`);
        if ((item.quantidade || 1) > 1) parts.push(`Quantidade: ${item.quantidade}`);
        if (item.valor) parts.push(`Valor Total: ${fmtCurrency(Number(item.valor) || 0)}`);
        return parts.join("\n");
      })
      .join("\n\n");

    const total = proposal.proposal_items.reduce((sum: number, item: any) => sum + (Number(item.valor) || 0), 0);
    valorTotal = total > 0 ? fmtCurrency(total) : "";

    if (proposal.proposal_items.length === 1) {
      nomeItem = nomeItem || proposal.proposal_items[0]?.nome || "";
      descricaoItem = descricaoItem || proposal.proposal_items[0]?.descricao || "";
    }
  }

  const vars: Record<string, string> = {
    "{{Codigo_Contrato}}": contractCode || "",
    "{{nome_completo}}": registration?.nome_completo || lead.contact_name || lead.company_name || "",
    "{{documento_contratante}}": registration?.cpf || lead.documento || "",
    "{{razao_social}}": lead.company_name || "",
    "{{email}}": lead.email || registration?.email || "",
    "{{telefone}}": lead.phone || "",
    "{{tenant_nome}}": tenant?.nome_fantasia || tenant?.razao_social || "",
    "{{tenant_cnpj}}": tenant?.cnpj || "",
    "{{tenant_endereco}}": [tenant?.endereco, tenant?.numero].filter(Boolean).join(", "),
    "{{tenant_cidade}}": tenant?.cidade || "",
    "{{tenant_estado}}": tenant?.estado || "",
    "{{servicos_contratados}}": servicosContratados,
    "{{valor_total}}": valorTotal,
    "{{nome_item}}": nomeItem,
    "{{descricao_item}}": descricaoItem,
    "{{nome_vendedor}}": vendor?.name || "",
    "{{email_vendedor}}": vendor?.email || "",
  };

  let rendered = templateContent || "";
  Object.entries(vars).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value || "");
  });
  return rendered;
}

interface LeadDocsTabProps {
  lead: CrmLead;
}

interface LeadDoc {
  id: string;
  lead_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_path: string;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface SignedContract {
  id: string;
  code: string;
  signature_status: string;
  signed_at: string | null;
  validation_code: string | null;
  document_hash: string | null;
  pdf_url: string | null;
  pdf_assinado_url: string | null;
  created_at: string;
  contract_content: string | null;
  company_id: string;
  signer_name: string | null;
  signer_document: string | null;
  signature_photo_url: string | null;
  matriz_nome: string | null;
  signers: ContractSigner[];
}

interface ContractSigner {
  signer_name: string | null;
  signer_role: string;
  signer_document: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  signature_photo_url: string | null;
}

interface SignedPdfContract {
  id: string;
  name: string;
  status: string;
  pdf_assinado_url: string | null;
  pdf_url: string;
  validation_code: string | null;
  document_hash: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { key: "cnh", label: "CNH", icon: CreditCard, description: "Carteira Nacional de Habilitação" },
  { key: "cnpj", label: "CNPJ", icon: Building2, description: "Cartão CNPJ ou Contrato Social" },
  { key: "comprovante_endereco", label: "Comprovante de Endereço", icon: MapPin, description: "Conta de luz, água ou telefone" },
  { key: "rg", label: "RG", icon: FileText, description: "Registro Geral" },
  { key: "outro", label: "Outro", icon: Paperclip, description: "Outros documentos" },
];

export function LeadDocsTab({ lead }: LeadDocsTabProps) {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([]);
  const [signedPdfContracts, setSignedPdfContracts] = useState<SignedPdfContract[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [contractTemplates, setContractTemplates] = useState<{ id: string; name: string; pdf_url: string; pdf_path: string; contract_content: string | null }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "contract" | "pdf"; id: string } | null>(null);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  // Signature drawer state
  const [signDrawerContract, setSignDrawerContract] = useState<SignedContract | null>(null);
  const [signDrawerSigners, setSignDrawerSigners] = useState<ContractSigner[]>([]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lead_documents")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setDocs((data as LeadDoc[]) || []);
    }
    setLoading(false);
  };

  const fetchSignedContracts = async () => {
    // Fetch ALL contracts for this lead (not just signed)
    const { data: allContractsData } = await supabase
      .from("contracts")
      .select("id, code, signature_status, signed_at, validation_code, document_hash, pdf_url, pdf_assinado_url, created_at, contract_content, company_id, signer_name, signer_document, signature_photo_url, matriz_nome")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });

    const contractsWithSigners: SignedContract[] = [];
    for (const contract of (allContractsData || [])) {
      const { data: sigs } = await supabase
        .from("contract_signatures")
        .select("signer_name, signer_role, signer_document, signed_at, signer_ip, signature_photo_url")
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: true });

      const roleMap = new Map<string, ContractSigner>();
      for (const s of (sigs || []) as any[]) {
        const role = s.signer_role || "signatário";
        const existing = roleMap.get(role);
        if (!existing || (s.signed_at && !existing.signed_at)) {
          roleMap.set(role, {
            signer_name: s.signer_name,
            signer_role: role,
            signer_document: s.signer_document,
            signed_at: s.signed_at,
            signer_ip: s.signer_ip,
            signature_photo_url: s.signature_photo_url,
          });
        }
      }

      contractsWithSigners.push({
        ...(contract as unknown as SignedContract),
        signers: Array.from(roleMap.values()),
      });
    }
    setSignedContracts(contractsWithSigners);

    // Fetch ALL pdf_contracts for this server (linked by lead context)
    const { data: pdfContracts } = await supabase
      .from("pdf_contracts")
      .select("id, name, status, pdf_assinado_url, pdf_url, validation_code, document_hash, created_at")
      .eq("servidor_id", lead.servidor_id)
      .order("created_at", { ascending: false });
    setSignedPdfContracts((pdfContracts as SignedPdfContract[]) || []);
  };

  const fetchContractTemplates = async () => {
    const { data } = await supabase
      .from("company_contract_templates")
      .select("id, name, pdf_url, pdf_path, contract_content")
      .eq("company_id", lead.servidor_id);
    setContractTemplates((data as any[]) || []);
  };

  const handleGenerateFromTemplate = async (template: { id: string; name: string; pdf_url: string; pdf_path: string; contract_content: string | null }) => {
    if (generatingDoc) return;
    setGeneratingDoc(true);
    try {
      const docName = template.name;

      const hashData = `${lead.id}-${template.id}-${Date.now()}`;
      const encoded = new TextEncoder().encode(hashData);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      const documentHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      const validationCode = documentHash.substring(0, 12).toUpperCase();

      const [proposalActivitiesRes, tenantRes, registrationRes] = await Promise.all([
        supabase
          .from("crm_lead_activities")
          .select("*")
          .eq("lead_id", lead.id)
          .eq("type", "proposal")
          .order("created_at", { ascending: false }),
        supabase.from("companies").select("*").eq("id", lead.servidor_id).maybeSingle(),
        supabase.from("crm_client_registrations").select("*").eq("lead_id", lead.id).maybeSingle(),
      ]);

      const activities = proposalActivitiesRes.data || [];
      const selectedActivity = activities.find(
        (p: any) => ACCEPTED_STATUSES.has(String((p.metadata as any)?.status || "").toLowerCase())
      ) || activities[0] || null;

      const proposal = activityToProposal(selectedActivity);
      const tenant = tenantRes.data;
      const registration = registrationRes.data;

      let vendor: any = null;
      if (proposal?.created_by_user_id) {
        const { data } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("user_id", proposal.created_by_user_id)
          .maybeSingle();
        vendor = data;
      }

      let renderedContent = buildRenderedContractContent(
        template.contract_content || "",
        lead,
        tenant,
        proposal,
        vendor,
        registration,
        validationCode,
      );

      

      let finalPdfUrl = template.pdf_url;
      if (renderedContent) {
        let annexData: AnnexData | undefined;

        if (proposal?.proposal_items?.length) {
          const annexItems: AnnexLineItem[] = proposal.proposal_items.map((item: any) => ({
            name: item.nome || "---",
            unitValue: Number(item.valor) || 0,
            quantity: Number(item.quantidade) || 1,
            discountType: "percent",
            discountValue: 0,
            total: Number(item.valor) || 0,
          }));

          const installments: any[] = proposal.installments || [];
          const firstInstallment = installments[0];
          const payMethod = firstInstallment?.paymentMethod || proposal.payment_method || "";
          const freqMap: Record<string, string> = { mensal: "mensal", trimestral: "trimestral", semestral: "semestral", anual: "anual", unica: "avista" };
          const payMethodMap: Record<string, string> = { Boleto: "boleto", boleto: "boleto", PIX: "pix", pix: "pix", Cartao: "cartao", cartao: "cartao", Transferencia: "transferencia", transferencia: "transferencia" };

          annexData = {
            clientName: registration?.nome_completo || lead.contact_name || lead.company_name || "---",
            clientCnpj: registration?.cpf || lead.documento || "",
            items: annexItems,
            paymentMethod: payMethodMap[payMethod] || payMethod || "---",
            paymentFrequency: freqMap[proposal.payment_frequency] || proposal.payment_frequency || "---",
            numberOfInstallments: Number(proposal.number_of_installments) || installments.length || 1,
            sigla: proposal.sigla || "",
            firstPaymentDate: firstInstallment?.dueDate || proposal.first_payment_date || "",
            totalContract: annexItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
          };
        }

        const pdfBlob = generateContractPdf({
          content: renderedContent,
          code: validationCode,
          companyName: lead.company_name,
          annexData,
        });

        const filePath = `generated/${lead.servidor_id}/${Date.now()}_${template.name.replace(/\s+/g, "_")}.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from("contract-pdfs")
          .upload(filePath, pdfBlob, { contentType: "application/pdf" });
        if (uploadErr) throw uploadErr;

        const { data: signedData } = await supabase.storage.from("contract-pdfs").createSignedUrl(filePath, 86400);
        finalPdfUrl = signedData?.signedUrl || "";
      }

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          company_id: lead.servidor_id,
          lead_id: lead.id,
          contract_type: "new",
          signature_status: "pending",
          pdf_url: finalPdfUrl,
          contract_content: renderedContent || null,
          document_hash: documentHash,
          validation_code: validationCode,
          signer_name: registration?.nome_completo || lead.contact_name || lead.company_name,
          signer_document: registration?.cpf || lead.documento || null,
          matriz_nome: docName,
        } as any)
        .select("id, code")
        .single();

      if (error) throw error;

      if (contract?.code && renderedContent.includes(validationCode)) {
        renderedContent = renderedContent.replace(new RegExp(validationCode, "g"), contract.code);
        await supabase.from("contracts").update({ contract_content: renderedContent } as any).eq("id", contract.id);
      }

      toast.success(`Documento "${contract?.code} — ${template.name}" gerado com sucesso!`);
      await fetchSignedContracts();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar documento: " + (err.message || ""));
    }
    setGeneratingDoc(false);
  };

  useEffect(() => {
    fetchDocs();
    fetchSignedContracts();
    fetchContractTemplates();

    // Realtime subscription for contracts
    const channel = supabase
      .channel(`docs-contracts-${lead.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `lead_id=eq.${lead.id}` }, () => {
        fetchSignedContracts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_signatures' }, () => {
        fetchSignedContracts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdf_contracts', filter: `servidor_id=eq.${lead.servidor_id}` }, () => {
        fetchSignedContracts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead.id]);

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `lead-docs/${lead.id}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(filePath, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: signedData } = await supabase.storage.from("contract-pdfs").createSignedUrl(filePath, 86400);

      const { error: insertErr } = await (supabase as any).from("lead_documents").insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        doc_type: docType,
        file_name: file.name,
        file_url: signedData?.signedUrl || "",
        file_path: filePath,
        file_size: file.size,
        uploaded_by_name: profile?.name || null,
        uploaded_by_user_id: profile?.user_id || null,
      } as any);
      if (insertErr) throw insertErr;

      toast.success("Documento enviado!");
      await fetchDocs();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    }
    setUploading(null);
  };

  const handleDelete = async (doc: LeadDoc) => {
    await supabase.storage.from("contract-pdfs").remove([doc.file_path]);
    await (supabase as any).from("lead_documents").delete().eq("id", doc.id);
    toast.success("Documento removido!");
    await fetchDocs();
  };

  const getDocsForType = (type: string) => docs.filter((d) => d.doc_type === type);

  const handleViewSignedPdf = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSignedPdf = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const buildSignedPdfBlob = async (contract: SignedContract): Promise<Blob> => {
    const baseSigner = contract.signers.length > 0
      ? contract.signers.map((s) => ({
          name: s.signer_name || "---",
          role: s.signer_role || "signatario",
          email: null as string | null,
          document: s.signer_document,
          birth_date: null as string | null,
          signed_at: s.signed_at,
          ip: s.signer_ip,
          signature_photo_url: s.signature_photo_url,
        }))
      : [{
          name: contract.signer_name || "---",
          role: "signatario",
          email: null as string | null,
          document: contract.signer_document,
          birth_date: null as string | null,
          signed_at: contract.signed_at,
          ip: null as string | null,
          signature_photo_url: contract.signature_photo_url,
        }];

    // Enrich signers with profile/lead data
    const signers = await Promise.all(
      baseSigner.map(async (s) => {
        const isClient = s.role === "cliente" || s.role === "signatario";
        const isVendor = s.role === "vendedor";

        // For clients, enrich from lead data
        if (isClient && lead) {
          return {
            ...s,
            name: lead.contact_name || s.name,
            email: s.email || lead.email || null,
            document: s.document || lead.documento || null,
            birth_date: s.birth_date,
            company_name: lead.company_name || null,
          };
        }

        // For vendors, enrich from profiles table
        if (isVendor && s.name && s.name !== "---") {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, cpf, birth_date")
            .eq("name", s.name)
            .maybeSingle();
          if (profileData) {
            return {
              ...s,
              email: s.email || (profileData as any).email || null,
              document: s.document || (profileData as any).cpf || null,
              birth_date: (profileData as any).birth_date || null,
            };
          }
        }

        // Fallback: try profile lookup by name
        if (s.name && s.name !== "---") {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, cpf, birth_date")
            .eq("name", s.name)
            .maybeSingle();
          if (profileData) {
            return {
              ...s,
              email: s.email || (profileData as any).email || null,
              document: s.document || (profileData as any).cpf || null,
              birth_date: (profileData as any).birth_date || null,
            };
          }
        }

        return s;
      })
    );

    let pdfUrl = contract.pdf_url || "";
    let tempUrl: string | null = null;

    if (!pdfUrl && contract.contract_content) {
      const basePdfBlob = generateContractPdf({
        content: contract.contract_content,
        code: contract.code,
        companyName: lead.company_name,
      });
      tempUrl = URL.createObjectURL(basePdfBlob);
      pdfUrl = tempUrl;
    }

    if (!pdfUrl) throw new Error("PDF do contrato não disponível");

    try {
      return await generateSignedContractPdf({
        pdfUrl,
        code: contract.code,
        companyName: lead.company_name,
        documentHash: contract.document_hash || "",
        validationCode: contract.validation_code || "",
        signedAt: contract.signed_at || new Date().toISOString(),
        signers,
        validationUrl: `${window.location.origin}/validar-documento/${contract.validation_code || ""}`,
      });
    } finally {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    }
  };

  const handleViewClientContract = async (contract: SignedContract) => {
    setGeneratingPdf(contract.id);
    try {
      const blob = await buildSignedPdfBlob(contract);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PDF");
    }
    setGeneratingPdf(null);
  };

  const handleDownloadClientContract = async (contract: SignedContract) => {
    setGeneratingPdf(contract.id);
    try {
      const blob = await buildSignedPdfBlob(contract);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contract.code}_assinado.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Contrato assinado baixado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao baixar contrato");
    }
    setGeneratingPdf(null);
  };

  // General file upload
  const generalFileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleGeneralUpload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      await handleUpload("outro", file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleGeneralUpload(e.dataTransfer.files);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) handleGeneralUpload(files);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSignedContracts = signedContracts.length > 0 || signedPdfContracts.length > 0;
  const allDocs = docs;

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-0.5" />Assinado</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-0.5" />Aguardando Assinatura</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/50 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 mr-0.5" />Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/50 text-muted-foreground"><Clock className="h-3 w-3 mr-0.5" />{status}</Badge>;
    }
  };

  const getPdfContractStatusBadge = (status: string) => {
    switch (status) {
      case "assinado":
      case "concluido":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-0.5" />Assinado</Badge>;
      case "pendente":
      case "enviado":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-0.5" />Aguardando Assinatura</Badge>;
      case "cancelado":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/50 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 mr-0.5" />Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/50 text-muted-foreground">{status}</Badge>;
    }
  };

  const handleCopyLink = (contract: SignedContract) => {
    const url = contract.validation_code
      ? `${window.location.origin}/validar-documento/${contract.validation_code}`
      : contract.pdf_url || "";
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } else {
      toast.error("Link não disponível");
    }
  };

  const handleCopyPdfLink = (contract: SignedPdfContract) => {
    const url = contract.validation_code
      ? `${window.location.origin}/validar-documento/${contract.validation_code}`
      : contract.pdf_assinado_url || contract.pdf_url;
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } else {
      toast.error("Link não disponível");
    }
  };

  const handleCancelContractSignatures = async (contractId: string) => {
    try {
      await supabase.from("contracts").update({ signature_status: "cancelled" } as any).eq("id", contractId);
      toast.success("Assinaturas canceladas!");
      await fetchSignedContracts();
    } catch {
      toast.error("Erro ao cancelar assinaturas");
    }
  };

  const handleCancelPdfContractSignatures = async (contractId: string) => {
    try {
      await supabase.from("pdf_contracts").update({ status: "cancelado" } as any).eq("id", contractId);
      toast.success("Assinaturas canceladas!");
      await fetchSignedContracts();
    } catch {
      toast.error("Erro ao cancelar assinaturas");
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      await supabase.from("contract_signatures").delete().eq("contract_id", contractId);
      const { data: c } = await supabase.from("contracts").select("pdf_url, pdf_assinado_path").eq("id", contractId).maybeSingle();
      if ((c as any)?.pdf_assinado_path) {
        await supabase.storage.from("contract-pdfs").remove([(c as any).pdf_assinado_path]);
      }
      await supabase.from("contracts").delete().eq("id", contractId);
      toast.success("Documento excluído!");
      await fetchSignedContracts();
    } catch {
      toast.error("Erro ao excluir documento");
    }
  };

  const handleDeletePdfContract = async (contractId: string) => {
    try {
      const { data: c } = await supabase.from("pdf_contracts").select("pdf_path, pdf_assinado_path").eq("id", contractId).maybeSingle();
      const toRemove = [c?.pdf_path, c?.pdf_assinado_path].filter(Boolean) as string[];
      if (toRemove.length) await supabase.storage.from("contract-pdfs").remove(toRemove);
      await (supabase as any).from("pdf_contract_signers").delete().eq("contract_id", contractId);
      await (supabase as any).from("pdf_contract_history").delete().eq("contract_id", contractId);
      await supabase.from("pdf_contracts").delete().eq("id", contractId);
      toast.success("Documento excluído!");
      await fetchSignedContracts();
    } catch {
      toast.error("Erro ao excluir documento");
    }
  };

  const handleViewSignature = (contract: SignedContract) => {
    if (contract.validation_code) {
      window.open(`${window.location.origin}/validar-documento/${contract.validation_code}`, "_blank");
    } else {
      toast.info("Código de validação não disponível");
    }
  };

  const openSignatureDrawer = (contract: SignedContract) => {
    setSignDrawerContract(contract);
    setSignDrawerSigners(contract.signers || []);
  };

  const handleViewPdfSignature = (contract: SignedPdfContract) => {
    if (contract.validation_code) {
      window.open(`${window.location.origin}/validar-documento/${contract.validation_code}`, "_blank");
    } else {
      toast.info("Código de validação não disponível");
    }
  };

  return (
    <div className="space-y-6" onPaste={handlePaste}>
      {/* General Upload Area */}
      <div>
        <input
          ref={generalFileRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            if (e.target.files) handleGeneralUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onClick={() => generalFileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5">
            <Upload className="h-4 w-4" /> Enviar arquivos
          </p>
          <p className="text-xs text-muted-foreground mt-1">Arraste arquivos ou clique para selecionar</p>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Dica: Cole imagens diretamente com Ctrl+V</p>
      </div>

      {/* Uploaded Files List */}
      {allDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4" /> Arquivos Enviados ({allDocs.length})
          </h3>
          <div className="space-y-2">
            {allDocs.map((doc) => {
              const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_name);
              return (
                <Card key={doc.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {isImage ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.uploaded_by_name || "—"} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                            {doc.doc_type !== "outro" && (
                              <> • <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">{DOC_TYPES.find(d => d.key === doc.doc_type)?.label || doc.doc_type}</Badge></>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.file_url} download={doc.file_name}><Download className="h-3.5 w-3.5" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for files */}
      {allDocs.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum arquivo enviado</p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita e removerá o arquivo do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete?.type === "contract") {
                  handleDeleteContract(confirmDelete.id);
                } else if (confirmDelete?.type === "pdf") {
                  handleDeletePdfContract(confirmDelete.id);
                }
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
