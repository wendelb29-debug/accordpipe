import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft, Building2, User, Mail, PhoneCall, MapPin, Calendar,
  DollarSign, FileSpreadsheet, Plus, Loader2, Send, Download,
  Edit, Trash2, MoreVertical, ThumbsUp, ThumbsDown, XCircle,
  Eye, CopyPlus, Link2, Briefcase, Hash, FileSignature, Copy, MessageSquare,
  ImageIcon, Settings2, Users, ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle2, Clock, Shield, UserPlus,
} from "lucide-react";
import { PdfRenderer } from "@/components/contratos/PdfRenderer";
import { ProposalTemplatePremium } from "./ProposalTemplatePremium";
import { ProposalItemsManager, ProposalLineItem } from "./ProposalItemsManager";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContracts } from "@/hooks/useContracts";
import { generateContractPdf, downloadContractPdf } from "@/lib/generateContractPdf";
import { addAnnexPage } from "@/lib/generateContractAnnex";
import type { AnnexLineItem } from "@/lib/generateContractAnnex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getLeadContractSignatureStats, normalizeLeadContractSigners } from "@/lib/contractSigners";
import { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";
import { BrandManagerDialog } from "./BrandManagerDialog";

interface ProposalBrand {
  id: string;
  name: string;
  logo_url: string | null;
  is_default: boolean;
}

const fmtCur = (v: number, cur = "BRL") => v.toLocaleString("pt-BR", { style: "currency", currency: cur });
interface CompanyData {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface ServidorData {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  complemento: string | null;
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_accent_color?: string | null;
  brand_bg_color?: string | null;
  brand_text_color?: string | null;
}

function ContractPdfViewer({ content, companyName }: { content: string; companyName: string }) {
  const pdfUrl = useMemo(() => {
    const blob = generateContractPdf({ content, code: "Contrato", companyName });
    return URL.createObjectURL(blob);
  }, [content, companyName]);

  useEffect(() => {
    return () => URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-muted/20" style={{ height: "600px" }}>
      <iframe
        src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
        className="w-full h-full"
        title="Visualização do contrato"
        style={{ border: "none" }}
      />
    </div>
  );
}

function TemplatePdfFullViewer({ pdfUrl, onClose }: { pdfUrl: string; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Pré-visualização do Contrato
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
            const w = window.open(pdfUrl, '_blank');
            if (w) setTimeout(() => w.print(), 800);
          }}>
            <Download className="h-3.5 w-3.5" /> Imprimir
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>
            Voltar
          </Button>
        </div>
      </div>
      <div className="rounded-lg border border-border overflow-hidden bg-muted/20" style={{ height: "650px" }}>
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-full"
          title="Visualização do contrato PDF"
          style={{ border: "none" }}
        />
      </div>
    </div>
  );
}

export function LeadPropostasTab({ lead, addActivity, signatureMode = false, onUpdateLead }: { lead: CrmLead; addActivity: (data: any) => Promise<any>; signatureMode?: boolean; onUpdateLead?: (id: string, updates: Partial<CrmLead>) => Promise<boolean> }) {

  const { profile, isCeo, isMaster, role } = useAuth();
  const canAddItem = isCeo || isMaster || role === "administrativo";
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewProposal, setViewProposal] = useState<any | null>(null);
  const [editingProposal, setEditingProposal] = useState<any | null>(null);
  const [sendingToSign, setSendingToSign] = useState(false);
  const [showSignatureSelect, setShowSignatureSelect] = useState(signatureMode);
  const [selectedSignProposal, setSelectedSignProposal] = useState<string | null>(null);

  // Contract preview state
  const [contractPreview, setContractPreview] = useState<string | null>(null);
  const [contractPreviewProposal, setContractPreviewProposal] = useState<any | null>(null);
  const [generatedContractLink, setGeneratedContractLink] = useState<string | null>(null);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Saved contract state (persisted contract for this lead)
  const [savedContract, setSavedContract] = useState<any | null>(null);
  const [loadingSavedContract, setLoadingSavedContract] = useState(false);

  // Contract signers state (from contract_signatures table)
  const [contractSigners, setContractSigners] = useState<any[]>([]);
  const [loadingSigners, setLoadingSigners] = useState(false);
  const [addSignerOpen, setAddSignerOpen] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerDoc, setNewSignerDoc] = useState("");
  const [newSignerRole, setNewSignerRole] = useState("testemunha");
  const [addingSigner, setAddingSigner] = useState(false);
  const signerInitRef = useRef<string | null>(null);

  // Template PDF state
  const [templatePdfUrl, setTemplatePdfUrl] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<any[]>([]);
  const [templateCurrentPage, setTemplateCurrentPage] = useState(1);
  const [templateTotalPages, setTemplateTotalPages] = useState(1);

  // Brand state
  const [brands, setBrands] = useState<ProposalBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [showBrandManager, setShowBrandManager] = useState(false);

  // Currency state
  const [currency, setCurrency] = useState("BRL");

  // Installments state
  const [installments, setInstallments] = useState<import("./ProposalItemsManager").Installment[]>([]);
  const [numberOfInstallments, setNumberOfInstallments] = useState(12);

  // In signature mode, always show the selection panel
  useEffect(() => {
    if (signatureMode) setShowSignatureSelect(true);
  }, [signatureMode]);

  // Auto-load template and check for existing contract in signature mode
  useEffect(() => {
    if (!signatureMode || !lead.servidor_id) {
      setSavedContract(null);
      setGeneratedContractLink(null);
      setGeneratedContractId(null);
      setContractSigners([]);
      return;
    }

    const loadTemplate = async () => {
      const { data: templates } = await supabase
        .from("company_contract_templates")
        .select("*")
        .eq("company_id", lead.servidor_id)
        .limit(1);
      if (templates && templates.length > 0) {
        const template = templates[0];
        const { data: fields } = await supabase
          .from("company_contract_template_fields")
          .select("*")
          .eq("template_id", template.id);
        setTemplatePdfUrl(template.pdf_url);
        setTemplateFields((fields || []).map((f: any) => ({ ...f, field_type: f.field_type === "servidor_empresa" ? "empresa" : f.field_type })));
      }
    };
    loadTemplate();
    fetchSavedContract();
  }, [signatureMode, lead.servidor_id, lead.id]);

  const fetchSavedContract = async () => {
    if (!lead.id) {
      setSavedContract(null);
      setGeneratedContractLink(null);
      setGeneratedContractId(null);
      return;
    }

    setLoadingSavedContract(true);
    setSavedContract(null);
    setGeneratedContractLink(null);
    setGeneratedContractId(null);

    try {
      const { data } = await supabase
        .from("contracts")
        .select("id, code, signature_link, signature_status, pdf_url, contract_content, signing_token, created_at, lead_id, companies(razao_social)")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSavedContract({ ...data, company: data.companies });
        setGeneratedContractLink(data.signature_link);
        setGeneratedContractId(data.id);
      }
    } catch (err) {
      console.error("Error fetching saved contract:", err);
    }
    setLoadingSavedContract(false);
  };

  const fetchContractSigners = useCallback(async (contractId: string) => {
    setLoadingSigners(true);
    setContractSigners([]);

    const { data, error } = await supabase
      .from("contract_signatures")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (error) {
      setLoadingSigners(false);
      return;
    }

    const { uniqueSigners, duplicateIds } = normalizeLeadContractSigners((data as any[]) || []);
    const { allSigned } = getLeadContractSignatureStats(uniqueSigners);

    setContractSigners(uniqueSigners);

    if (duplicateIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("contract_signatures")
        .delete()
        .in("id", duplicateIds);

      if (cleanupError) {
        console.error("Erro ao limpar assinantes duplicados:", cleanupError);
      }
    }

    if (allSigned) {
      setSavedContract((current) => current?.id === contractId
        ? { ...current, signature_status: "signed" }
        : current);

      await supabase
        .from("contracts")
        .update({ signature_status: "signed" } as any)
        .eq("id", contractId)
        .neq("signature_status", "signed");
    }

    setLoadingSigners(false);
  }, []);

  const ensureDefaultSigners = useCallback(async (contractId: string, signers: any[]) => {
    if (!profile?.name || signerInitRef.current === contractId) return;

    const { uniqueSigners } = normalizeLeadContractSigners(signers);
    const hasVendedor = uniqueSigners.some((s: any) => s.signer_role === "vendedor");
    const hasCliente = uniqueSigners.some((s: any) => s.signer_role === "cliente");
    const inserts: any[] = [];

    if (!hasVendedor) {
      inserts.push({
        contract_id: contractId,
        signer_role: "vendedor",
        signing_token: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        signer_name: profile.name,
        signer_document: null,
      });
    }

    if (!hasCliente) {
      inserts.push({
        contract_id: contractId,
        signer_role: "cliente",
        signing_token: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        signer_name: lead.contact_name || lead.company_name || "Cliente",
        signer_document: lead.documento || null,
      });
    }

    signerInitRef.current = contractId;

    if (inserts.length === 0) return;
    try {
      await supabase.from("contract_signatures").insert(inserts as any);
      await fetchContractSigners(contractId);
    } catch {
      signerInitRef.current = null;
    }
  }, [profile, lead, fetchContractSigners]);

  useEffect(() => {
    if (!savedContract?.id) {
      signerInitRef.current = null;
      setContractSigners([]);
      return;
    }

    signerInitRef.current = null;
    setContractSigners([]);
    fetchContractSigners(savedContract.id);

    const channel = supabase
      .channel(`contract-signers-${savedContract.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_signatures', filter: `contract_id=eq.${savedContract.id}` }, () => {
        fetchContractSigners(savedContract.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [savedContract?.id, fetchContractSigners]);

  useEffect(() => {
    if (savedContract?.id && !loadingSigners) {
      ensureDefaultSigners(savedContract.id, contractSigners);
    }
  }, [savedContract?.id, loadingSigners, contractSigners, ensureDefaultSigners]);

  const handleAddContractSigner = async () => {
    if (!savedContract?.id || !newSignerName.trim()) {
      toast.error("Preencha o nome do signatário");
      return;
    }
    setAddingSigner(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const { error } = await supabase.from("contract_signatures").insert({
        contract_id: savedContract.id,
        signer_role: newSignerRole,
        signing_token: token,
        signer_name: newSignerName.trim(),
        signer_document: newSignerDoc.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Signatário adicionado!");
      setNewSignerName(""); setNewSignerEmail(""); setNewSignerDoc(""); setNewSignerRole("testemunha");
      setAddSignerOpen(false);
      await fetchContractSigners(savedContract.id);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    }
    setAddingSigner(false);
  };

  const handleDeleteSigner = async (signerId: string) => {
    if (!savedContract?.id) return;
    const { error } = await supabase
      .from("contract_signatures")
      .delete()
      .eq("id", signerId)
      .eq("contract_id", savedContract.id);

    if (error) {
      toast.error("Erro ao excluir signatário");
      return;
    }

    toast.success("Signatário removido");
    await fetchContractSigners(savedContract.id);
  };

  const handleCopySignerLink = (token: string, name: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/assinar/${token}`);
    toast.success(`Link copiado para ${name}!`);
  };

  const handleSendSignerWhatsApp = (token: string, name: string) => {
    const link = `${window.location.origin}/assinar/${token}`;
    const message = `Olá ${name},\nsegue o link para assinatura do contrato:\n\n${link}`;
    const phone = (lead.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const { createContract } = useContracts();

  // Company & servidor data
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [servidorData, setServidorData] = useState<ServidorData | null>(null);

  const [lineItems, setLineItems] = useState<ProposalLineItem[]>([]);
  const [paymentFrequency, setPaymentFrequency] = useState("mensal");

  const [form, setForm] = useState({
    title: "",
    sigla: "",
    introduction: "",
    description: "",
    items: "",
    value_ps: lead.value_ps || 0,
    value_mrr: lead.value_mrr || 0,
    validity_days: 15,
    payment_method: "",
    first_payment_date: "",
    due_day: "",
    version: "1",
    oc_number: "",
  });

  useEffect(() => {
    fetchProposals();
    fetchCompanyAndServidor();
    fetchRegistrationData();
    fetchBrands();
  }, [lead.id]);

  const fetchRegistrationData = async () => {
    const { data } = await supabase
      .from("crm_client_registrations")
      .select("*")
      .eq("lead_id", lead.id)
      .maybeSingle();
    setRegistrationData(data || null);
  };

  const fetchCompanyAndServidor = async () => {
    // Fetch lead's company data if company_id exists
    if (lead.company_id) {
      const { data } = await supabase
        .from("companies")
        .select("id, razao_social, nome_fantasia, cnpj, responsavel, email, telefone, endereco, numero, bairro, cidade, estado, cep")
        .eq("id", lead.company_id)
        .maybeSingle();
      if (data) setCompanyData(data as CompanyData);
    }

    // Fetch servidor (the parent company / tenant)
    if (lead.servidor_id) {
      const { data } = await supabase
        .from("companies")
        .select("id, razao_social, nome_fantasia, cnpj, responsavel, email, telefone, endereco, numero, complemento, bairro, cidade, estado, cep, brand_logo_url, brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color, brand_text_color")
        .eq("id", lead.servidor_id)
        .maybeSingle();
      if (data) setServidorData(data as ServidorData);
    }
  };

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .eq("type", "proposal")
      .order("created_at", { ascending: false });
    if (!error) setProposals(data || []);
    setLoading(false);
  };

  const fetchBrands = async () => {
    if (!lead.servidor_id) return;
    const { data } = await supabase
      .from("proposal_brands")
      .select("id, name, logo_url, is_default")
      .eq("servidor_id", lead.servidor_id)
      .order("is_default", { ascending: false })
      .order("name");
    const brandList = (data as ProposalBrand[]) || [];
    setBrands(brandList);
    // Always pre-select the default brand
    const defaultBrand = brandList.find(b => b.is_default);
    if (defaultBrand) {
      setSelectedBrandId(defaultBrand.id);
    } else if (brandList.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brandList[0].id);
    }
  };

  const generateSigla = async () => {
    // Count existing proposals for this servidor to generate sequential ID
    const { count } = await supabase
      .from("crm_lead_activities")
      .select("*", { count: "exact", head: true })
      .eq("servidor_id", lead.servidor_id)
      .eq("type", "proposal");
    const nextNum = (count || 0) + 1;
    return `OP-${String(nextNum).padStart(5, "0")}`;
  };

  const resetForm = async () => {
    const sigla = await generateSigla();
    setForm({
      title: "", sigla, introduction: "", description: "", items: "",
      value_ps: lead.value_ps || 0, value_mrr: lead.value_mrr || 0,
      validity_days: 15, payment_method: "", first_payment_date: "",
      due_day: "", version: "1", oc_number: "",
    });
    setLineItems([]);
    setPaymentFrequency("mensal");
    setCurrency("BRL");
    setInstallments([]);
    setNumberOfInstallments(12);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + form.validity_days);

      // Build items text from lineItems for backward compatibility
      const totalMrr = lineItems.reduce((sum, it) => sum + it.total, 0);
      const itemsText = lineItems.map(it => {
        const discountStr = it.discountValue > 0
          ? ` (desconto: ${it.discountType === "percent" ? `${it.discountValue}%` : `R$ ${it.discountValue}`})`
          : "";
        return `${it.quantity}x ${it.name} - R$ ${it.unitValue.toFixed(2)}${discountStr} = R$ ${it.total.toFixed(2)}`;
      }).join("\n");

      const metadata = {
        sigla: form.sigla,
        introduction: form.introduction,
        items: itemsText || form.items,
        line_items: lineItems,
        value_ps: form.value_ps,
        value_mrr: totalMrr || form.value_mrr,
        validity_days: form.validity_days,
        valid_until: validUntil.toISOString(),
        status: editingProposal ? ((editingProposal.metadata as any)?.status || "enviada") : "enviada",
        total_items: lineItems.length || (form.items ? form.items.split("\n").filter(Boolean).length : 0),
        payment_method: form.payment_method,
        payment_frequency: paymentFrequency,
        first_payment_date: form.first_payment_date,
        due_day: form.due_day,
        version: form.version,
        oc_number: form.oc_number,
        company_snapshot: companyData,
        servidor_snapshot: servidorData,
        currency,
        installments,
        number_of_installments: numberOfInstallments,
        brand_id: selectedBrandId,
        brand_snapshot: brands.find(b => b.id === selectedBrandId) || null,
      };

      let result: any = null;

      if (editingProposal) {
        // Update existing proposal
        const { error } = await supabase
          .from("crm_lead_activities")
          .update({
            title: `Proposta: ${form.title}`,
            description: form.description || null,
            metadata: metadata as any,
          } as any)
          .eq("id", editingProposal.id);

        if (error) {
          toast.error("Erro ao atualizar proposta: " + error.message);
          return;
        }
        result = { ...editingProposal, title: `Proposta: ${form.title}`, description: form.description, metadata };
        toast.success("Proposta atualizada!");
      } else {
        // Create new proposal
        result = await addActivity({
          type: "proposal",
          title: `Proposta: ${form.title}`,
          description: form.description || undefined,
          servidor_id: lead.servidor_id,
          metadata,
        });

        if (!result) {
          toast.error("Erro ao salvar proposta. Verifique suas permissões.");
          return;
        }
        toast.success("Proposta criada e registrada no histórico!");
      }

      // Auto-update lead MRR with proposal total
      const finalMrr = totalMrr || form.value_mrr;
      if (onUpdateLead && finalMrr > 0) {
        await onUpdateLead(lead.id, { value_mrr: finalMrr });
      }

      resetForm();
      setShowForm(false);
      setEditingProposal(null);
      await fetchProposals();
    } catch (err) {
      console.error("Error creating proposal:", err);
      toast.error("Erro ao criar proposta");
    } finally {
      setCreating(false);
    }
  };

  const generateProposalPdf = async (proposal: any) => {
    const meta = (proposal.metadata as any) || {};
    const srv = meta.servidor_snapshot || servidorData;
    const comp = meta.company_snapshot || companyData;
    const brandInfo = meta.brand_snapshot || brands.find(b => b.id === meta.brand_id);
    const sigla = meta.sigla || "SEM-SIGLA";

    const lineItemsData = (meta.line_items || []).map((it: any) => ({
      name: it.name || "",
      quantity: it.quantity || 1,
      unitValue: it.unitValue || 0,
      total: it.total || 0,
      discountValue: it.discountValue || 0,
      discountType: it.discountType || "percent",
    }));

    const logoUrl = brandInfo?.logo_url || srv?.brand_logo_url || null;

    const templateData: import("./ProposalTemplatePremium").ProposalTemplateData = {
      status: meta.status || "enviada",
      logoUrl,
      companyName: srv?.nome_fantasia || srv?.razao_social || "Empresa",
      companyRazaoSocial: srv?.razao_social,
      companyCnpj: srv?.cnpj,
      companyEmail: srv?.email,
      companyPhone: srv?.telefone,
      reference: sigla,
      emissionDate: new Date(proposal.created_at).toLocaleDateString("pt-BR"),
      validityDays: meta.validity_days || 15,
      validUntil: meta.valid_until ? new Date(meta.valid_until).toLocaleDateString("pt-BR") : undefined,
      primaryColor: srv?.brand_primary_color || "#1E2952",
      secondaryColor: srv?.brand_secondary_color || "#4F46E5",
      accentColor: srv?.brand_accent_color || "#10B981",
      bgColor: srv?.brand_bg_color || "#F8F9FC",
      textColor: srv?.brand_text_color || "#1F2937",
      clientName: lead.contact_name || lead.company_name,
      clientDocument: lead.documento || comp?.cnpj,
      vendorName: srv?.responsavel || profile?.name || "Vendedor",
      vendorEmail: srv?.email,
      items: lineItemsData,
      totalMrr: meta.value_mrr || 0,
      currency: meta.currency || "BRL",
      conditions: [
        meta.payment_method ? `Forma de pagamento: ${meta.payment_method}` : "",
        meta.validity_days ? `Validade: ${meta.validity_days} dias` : "",
      ].filter(Boolean),
      introduction: meta.introduction,
      description: proposal.description,
      paymentFrequency: meta.payment_frequency,
    };

    try {
      toast.loading("Gerando PDF...", { id: "proposal-pdf" });

      const { generateProposalPdf: generateNativePdf } = await import("@/lib/generateProposalPdf");
      const pdfFilename = `${lead.company_name.replace(/\s+/g, "_")}_${sigla}.pdf`;
      await generateNativePdf(templateData, pdfFilename);

      toast.success("PDF baixado!", { id: "proposal-pdf" });
      
      await addActivity({
        type: "pdf_download",
        title: `PDF da proposta ${sigla} gerado`,
        description: `Download do PDF da proposta "${proposal.title}" para ${lead.company_name}.`,
        servidor_id: lead.servidor_id,
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Erro ao gerar PDF", { id: "proposal-pdf" });
    }
  };

  const handleDeleteProposal = async (proposal: any) => {
    const meta = (proposal.metadata as any) || {};
    const { error } = await supabase.from("crm_lead_activities").delete().eq("id", proposal.id);
    if (error) { toast.error("Erro ao excluir proposta"); return; }
    toast.success("Proposta excluída!");
    await addActivity({ type: "proposal_delete", title: `Proposta excluída: ${meta.sigla || proposal.title}`, servidor_id: lead.servidor_id });
    await fetchProposals();
  };

  const handleUpdateProposalStatus = async (proposal: any, newStatus: string) => {
    const meta = (proposal.metadata as any) || {};
    const { error } = await supabase
      .from("crm_lead_activities")
      .update({ metadata: { ...meta, status: newStatus } } as any)
      .eq("id", proposal.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    const labels: Record<string, string> = { aceita: "Aprovada", declinada: "Declinada", cancelada: "Cancelada" };
    toast.success(`Proposta ${labels[newStatus] || newStatus}!`);
    await addActivity({ type: "proposal_status", title: `Proposta ${labels[newStatus]}: ${meta.sigla || proposal.title}`, servidor_id: lead.servidor_id });

    // Sync MRR and P&S values to the lead when proposal is accepted
    if (newStatus === "aceita" && onUpdateLead) {
      const proposalMrr = Number(meta.value_mrr) || 0;
      const proposalPs = Number(meta.value_ps) || 0;
      const updates: Partial<CrmLead> = {};
      if (proposalMrr > 0) updates.value_mrr = proposalMrr;
      if (proposalPs > 0) updates.value_ps = proposalPs;
      if (Object.keys(updates).length > 0) {
        await onUpdateLead(lead.id, updates);
      }
    }

    await fetchProposals();
  };

  const handleDuplicateProposal = async (proposal: any) => {
    const meta = (proposal.metadata as any) || {};
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (meta.validity_days || 15));
    await addActivity({
      type: "proposal", title: `${proposal.title} (cópia)`, description: proposal.description || undefined,
      servidor_id: lead.servidor_id,
      metadata: { ...meta, sigla: meta.sigla ? `${meta.sigla}-COPY` : "", status: "enviada", valid_until: validUntil.toISOString() },
    });
    await addActivity({ type: "proposal_duplicate", title: `Proposta duplicada: ${meta.sigla || proposal.title}`, servidor_id: lead.servidor_id });
    toast.success("Proposta duplicada!");
    await fetchProposals();
  };

  const buildProposalClause = (proposal: any) => {
    const meta = (proposal.metadata as any) || {};
    const payLabels: Record<string, string> = { boleto: "Boleto", pix: "PIX", cartao: "Cartão", transferencia: "Transferência" };

    // Auto-fill from registration data if available
    const clientName = registrationData?.nome_completo || lead.contact_name || lead.company_name;
    const clientCpf = registrationData?.cpf || "";

    return `CLÁUSULA ADICIONAL – CONDIÇÕES COMERCIAIS DA PROPOSTA
Este contrato incorpora as condições comerciais aceitas na proposta ${meta.sigla || ""}, conforme detalhado abaixo:

• Cliente: ${clientName}
${clientCpf ? `• CPF: ${clientCpf}` : ""}
${meta.value_ps ? `• Valor de Prestação de Serviço (P&S): ${fmtCur(meta.value_ps)}` : ""}
${meta.value_mrr ? `• Valor de Mensalidade Recorrente (MRR): ${fmtCur(meta.value_mrr)}` : ""}
${meta.payment_method ? `• Forma de Pagamento: ${payLabels[meta.payment_method] || meta.payment_method}` : ""}
${meta.first_payment_date ? `• Data do 1º Pagamento: ${meta.first_payment_date}` : ""}
${meta.due_day ? `• Dia de Vencimento: ${meta.due_day}` : ""}
• Data da contratação: ${new Date().toLocaleDateString("pt-BR")}
${meta.items ? `\nItens contratados:\n${meta.items.split("\n").filter(Boolean).map((i: string) => `• ${i}`).join("\n")}` : ""}
`.trim();
  };

  const handlePreviewContract = async (proposal: any) => {
    // Fetch company data if available, otherwise use lead data
    let company: any = null;
    if (lead.company_id) {
      const { data } = await supabase.from("companies").select("*").eq("id", lead.company_id).maybeSingle();
      company = data;
    }

    // Try to load PDF template from server settings
    if (lead.servidor_id) {
      const { data: templates } = await supabase
        .from("company_contract_templates")
        .select("*")
        .eq("company_id", lead.servidor_id)
        .limit(1);

      if (templates && templates.length > 0) {
        const template = templates[0];
        // Load template fields
        const { data: fields } = await supabase
          .from("company_contract_template_fields")
          .select("*")
          .eq("template_id", template.id);

        setTemplatePdfUrl(template.pdf_url);
        setTemplateFields((fields || []).map((f: any) => ({ ...f, field_type: f.field_type === "servidor_empresa" ? "empresa" : f.field_type })));
        setTemplateCurrentPage(1);
        setContractPreviewProposal(proposal);
        setContractPreview("__template__"); // marker to use template mode
        setGeneratedContractLink(null);
        return;
      }
    }

    // Fallback: generate text-based contract
    const clause = buildProposalClause(proposal);
    const matrizNome = "Save Car Brasil Tecnologia e Serviços Ltda";
    const currentDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    let content: string;
    if (company) {
      const addressParts = [company.endereco, company.numero && `nº ${company.numero}`, company.complemento, company.bairro, company.cidade && company.estado && `${company.cidade}/${company.estado}`, company.cep && `CEP: ${company.cep}`].filter(Boolean).join(", ");
      content = `CONTRATO DE PARCERIA COMERCIAL – REVENDEDOR AUTORIZADO

Pelo presente instrumento particular, de um lado ${matrizNome}, doravante denominada MATRIZ; e, de outro lado, ${company.razao_social}${company.nome_fantasia ? `, nome fantasia ${company.nome_fantasia},` : ""} inscrito no CNPJ sob nº ${company.cnpj}, com endereço em ${addressParts || "[ENDEREÇO NÃO INFORMADO]"}, neste ato representada por ${company.responsavel || "[RESPONSÁVEL]"}, doravante denominado REVENDEDOR AUTORIZADO.

${clause}

${company.cidade || "[LOCAL]"}, ${currentDate}`;
    } else {
      const clientName = registrationData?.nome_completo || lead.contact_name || lead.company_name;
      content = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, de um lado ${matrizNome}, doravante denominada CONTRATADA; e, de outro lado, ${clientName}, doravante denominado(a) CONTRATANTE.

${clause}

${lead.cidade || "[LOCAL]"}, ${currentDate}`;
    }

    setTemplatePdfUrl(null);
    setTemplateFields([]);
    setContractPreview(content);
    setContractPreviewProposal(proposal);
    setGeneratedContractLink(null);
  };

  const generateTemplatePdfBlob = async (): Promise<Blob | null> => {
    if (!templatePdfUrl) return null;
    try {
      const pdfjsLib = await import("pdfjs-dist");
      const { default: jsPDF } = await import("jspdf");
      const pdfDoc = await pdfjsLib.getDocument(templatePdfUrl).promise;
      const totalPg = pdfDoc.numPages;
      const scale = 2;
      let pdf: any = null;

      for (let pg = 1; pg <= totalPg; pg++) {
        const page = await pdfDoc.getPage(pg);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const pageFields = templateFields.filter((f: any) => f.page === pg);
        for (const f of pageFields) {
          const value = resolveFieldValue(f.field_type);
          if (!value) continue;
          const isLogo = f.field_type === "servidor_logo";
          if (isLogo) {
            try {
              const img = new Image();
              img.crossOrigin = "anonymous";
              await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = value; });
              ctx.drawImage(img, f.pos_x * scale, f.pos_y * scale, f.width * scale, f.height * scale);
            } catch { /* skip */ }
          } else {
            ctx.fillStyle = "#000";
            const fontSize = (f.field_type === "campo_proposta" || f.field_type === "clausula") ? 8 * scale : 11 * scale;
            ctx.font = `${fontSize}px Arial, sans-serif`;
            const maxW = f.width * scale;
            const words = value.split(" ");
            let line = "";
            let ly = f.pos_y * scale + fontSize;
            const lineH = fontSize * 1.3;
            for (const word of words) {
              const test = line ? line + " " + word : word;
              if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, f.pos_x * scale, ly);
                line = word;
                ly += lineH;
              } else {
                line = test;
              }
            }
            if (line) ctx.fillText(line, f.pos_x * scale, ly);
          }
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pxToMm = (px: number) => px * 25.4 / 96 / (scale / 1);
        const wMm = pxToMm(viewport.width);
        const hMm = pxToMm(viewport.height);

        if (pg === 1) {
          pdf = new jsPDF({ orientation: wMm > hMm ? "landscape" : "portrait", unit: "mm", format: [wMm, hMm] });
        } else {
          pdf.addPage([wMm, hMm], wMm > hMm ? "landscape" : "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, wMm, hMm);
      }

      // Add ANEXO I page with proposal items
      if (contractPreviewProposal && pdf) {
        const meta = (contractPreviewProposal.metadata as any) || {};
        const lineItems: AnnexLineItem[] = (meta.line_items || []).map((it: any) => ({
          name: it.name || "",
          unitValue: it.unitValue || 0,
          quantity: it.quantity || 1,
          discountType: it.discountType || "percent",
          discountValue: it.discountValue || 0,
          total: it.total || 0,
        }));

        if (lineItems.length > 0) {
          addAnnexPage(pdf, {
            clientName: lead.contact_name || lead.company_name || "---",
            clientCnpj: lead.documento || "[CNPJ nao informado]",
            items: lineItems,
            paymentMethod: meta.payment_method || "",
            paymentFrequency: meta.payment_frequency || "avista",
            numberOfInstallments: meta.number_of_installments || 1,
            sigla: meta.sigla || "",
          });
        }
      }

      return pdf.output("blob");
    } catch (err) {
      console.error("Error generating template PDF blob:", err);
      return null;
    }
  };

  const handleConfirmAndGenerate = async () => {
    if (!contractPreviewProposal) return;
    const companyId = lead.company_id || lead.servidor_id;
    if (!companyId) { toast.error("Nenhuma empresa vinculada ao lead"); return; }
    setSendingToSign(true);
    try {
      const clause = buildProposalClause(contractPreviewProposal);
      const meta = (contractPreviewProposal.metadata as any) || {};

      const result = await createContract(
        companyId,
        "",
        "Save Car Brasil Tecnologia e Serviços Ltda",
        "manual",
        7,
        clause,
        lead.id,
        { autoCreateSigners: false }
      );

      if (result?.id) {
        const link = result.signatureLink || "";
        setGeneratedContractLink(link);
        setGeneratedContractId(result.id);

        // If using template PDF, generate the final rendered PDF and upload
        if (templatePdfUrl) {
          try {
            const pdfBlob = await generateTemplatePdfBlob();
            if (pdfBlob) {
              const pdfFileName = `contracts/${result.id}_${Date.now()}.pdf`;
              const { error: uploadErr } = await supabase.storage
                .from("contract-pdfs")
                .upload(pdfFileName, pdfBlob, { contentType: "application/pdf" });
              if (!uploadErr) {
                const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(pdfFileName);
                await supabase.from("contracts").update({ pdf_url: urlData.publicUrl } as any).eq("id", result.id);
              }
            }
          } catch (e) {
            console.error("Error uploading template PDF:", e);
          }
        }

        await addActivity({
          type: "signature",
          title: `Contrato gerado a partir da proposta ${meta.sigla || contractPreviewProposal.title}`,
          description: `Proposta aceita convertida em contrato para assinatura. Link: ${link}`,
          servidor_id: lead.servidor_id,
        });

        await addActivity({
          type: "signature_link",
          title: "Contrato enviado para assinatura",
          description: `Link de assinatura gerado e disponível para envio ao cliente.`,
          servidor_id: lead.servidor_id,
        });

        toast.success("Contrato gerado com sucesso!");
        setContractPreview(null);
        setContractPreviewProposal(null);
        await fetchSavedContract();
      }
    } catch (err) {
      console.error("Error creating contract from proposal:", err);
      toast.error("Erro ao gerar contrato");
    } finally {
      setSendingToSign(false);
    }
  };

  const handleCopySignatureLink = () => {
    if (!generatedContractLink) return;
    navigator.clipboard.writeText(generatedContractLink);
    toast.success("Link copiado!");
    addActivity({ type: "signature_link", title: "Link de assinatura copiado", description: `Link copiado para área de transferência.`, servidor_id: lead.servidor_id });
  };

  const handleSendWhatsApp = () => {
    if (!generatedContractLink) return;
    const clientName = registrationData?.nome_completo || lead.contact_name || lead.company_name;
    const message = `Olá ${clientName},\nsegue o link para assinatura do seu contrato.\n\n${generatedContractLink}\n\nApós a assinatura o sistema confirmará automaticamente.`;
    const phone = lead.phone?.replace(/\D/g, "") || "";
    const url = `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    addActivity({ type: "signature_link", title: "Contrato enviado via WhatsApp", description: `Link de assinatura enviado para ${clientName} via WhatsApp.`, servidor_id: lead.servidor_id });
  };

  const handleSendToSignature = async (proposal: any) => {
    // Now we show preview first instead of generating directly
    await handlePreviewContract(proposal);
  };

  const downloadContractWithOverlay = async () => {
    if (!templatePdfUrl) { toast.error("Nenhum template disponível"); return; }
    try {
      toast.loading("Gerando PDF...", { id: "contract-pdf" });
      const pdfjsLib = await import("pdfjs-dist");
      const { default: jsPDF } = await import("jspdf");
      const pdfDoc = await pdfjsLib.getDocument(templatePdfUrl).promise;
      const totalPg = pdfDoc.numPages;
      const scale = 2;
      let pdf: any = null;

      for (let pg = 1; pg <= totalPg; pg++) {
        const page = await pdfDoc.getPage(pg);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Draw overlay fields on this page
        const pageFields = templateFields.filter((f: any) => f.page === pg);
        for (const f of pageFields) {
          const value = resolveFieldValue(f.field_type);
          if (!value) continue;
          const isLogo = f.field_type === "servidor_logo";
          if (isLogo) {
            try {
              const img = new Image();
              img.crossOrigin = "anonymous";
              await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = value; });
              ctx.drawImage(img, f.pos_x * scale, f.pos_y * scale, f.width * scale, f.height * scale);
            } catch { /* skip */ }
          } else {
            ctx.fillStyle = "#000";
            const fontSize = (f.field_type === "campo_proposta" || f.field_type === "clausula") ? 8 * scale : 11 * scale;
            ctx.font = `${fontSize}px Arial, sans-serif`;
            const maxW = f.width * scale;
            const words = value.split(" ");
            let line = "";
            let ly = f.pos_y * scale + fontSize;
            const lineH = fontSize * 1.3;
            for (const word of words) {
              const test = line ? line + " " + word : word;
              if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, f.pos_x * scale, ly);
                line = word;
                ly += lineH;
              } else {
                line = test;
              }
            }
            if (line) ctx.fillText(line, f.pos_x * scale, ly);
          }
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pxToMm = (px: number) => px * 25.4 / 96 / (scale / 1);
        const wMm = pxToMm(viewport.width);
        const hMm = pxToMm(viewport.height);

        if (pg === 1) {
          pdf = new jsPDF({ orientation: wMm > hMm ? "landscape" : "portrait", unit: "mm", format: [wMm, hMm] });
        } else {
          pdf.addPage([wMm, hMm], wMm > hMm ? "landscape" : "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, wMm, hMm);
      }

      pdf.save(`Contrato_${lead.company_name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF baixado!", { id: "contract-pdf" });
    } catch (err) {
      console.error("Error generating contract PDF:", err);
      toast.error("Erro ao gerar PDF", { id: "contract-pdf" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Helper: resolve template field values from servidor + lead + proposal
  const resolveFieldValue = (fieldType: string, proposalOverride?: any) => {
    const srv = servidorData;
    const proposal = proposalOverride || contractPreviewProposal;
    const meta = proposal ? ((proposal.metadata as any) || {}) : {};
    const srvAddr = srv ? [srv.endereco, srv.numero && `nº ${srv.numero}`, srv.bairro, srv.cidade && srv.estado && `${srv.cidade}/${srv.estado}`, srv.cep && `CEP: ${srv.cep}`].filter(Boolean).join(", ") : "";
    const clientName = registrationData?.nome_completo || lead.contact_name || lead.company_name;
    const clientDoc = registrationData?.cpf || lead.documento || "";
    const clientEmail = registrationData?.email || lead.email || "";
    const clientPhone = registrationData?.telefone || lead.phone || "";
    const clientAddr = [
      registrationData?.endereco || lead.endereco,
      (registrationData?.numero || lead.numero) && `nº ${registrationData?.numero || lead.numero}`,
      registrationData?.bairro || lead.bairro,
      (registrationData?.cep || lead.cep) && `CEP: ${registrationData?.cep || lead.cep}`,
      (registrationData?.cidade || lead.cidade) && (registrationData?.estado || lead.estado)
        ? `${registrationData?.cidade || lead.cidade}-${registrationData?.estado || lead.estado}`
        : (registrationData?.cidade || lead.cidade || ""),
    ].filter(Boolean).join(", ");

    switch (fieldType) {
      // DADOS DO SERVIDOR (CONTRATADA)
      case "servidor_logo": return srv?.brand_logo_url || "";
      case "servidor_empresa": return srv?.razao_social || srv?.nome_fantasia || "";
      case "servidor_cnpj": {
        if (!srv) return "";
        const parts = [
          srv.razao_social || srv.nome_fantasia || "",
          srv.cnpj ? `inscrita no CNPJ/MF sob o nº ${srv.cnpj}` : "",
          [srv.endereco, srv.numero && `nº ${srv.numero}`, srv.complemento, srv.bairro, srv.cep && `CEP: ${srv.cep}`, srv.cidade && srv.estado && `${srv.cidade}-${srv.estado}`].filter(Boolean).join(", "),
          srv.email ? `e-mail ${srv.email}` : "",
          srv.telefone ? `telefone ${srv.telefone}` : "",
        ].filter(Boolean);
        return parts.length > 0 ? `${parts[0]}, ${parts.slice(1).join(", ")}.` : "";
      }
      case "servidor_endereco": return srvAddr;
      case "servidor_email": return srv?.email || "";

      // DETALHES DA PROPOSTA
      case "campo_proposta": return buildProposalClause(proposal || {});
      case "clausula": return buildProposalClause(proposal || {});
      case "valor_mrr": return meta.value_mrr ? fmtCur(meta.value_mrr) : fmtCur(lead.value_mrr || 0);
      case "valor_ps": return meta.value_ps ? fmtCur(meta.value_ps) : fmtCur(lead.value_ps || 0);
      case "assinatura": return "______________________________";

      // Legacy/compat fields
      case "data": return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      case "plano": return registrationData?.plano_contratado || meta.sigla || "—";
      case "cnpj_cpf": return clientDoc || "—";
      case "empresa": {
        const parts = [
          clientName,
          clientDoc ? `inscrito(a) no CPF/CNPJ sob o nº ${clientDoc}` : "",
          clientAddr ? `com endereço em ${clientAddr}` : "",
          clientEmail ? `contato via e-mail ${clientEmail}` : "",
          clientPhone ? `telefone ${clientPhone}` : "",
        ].filter(Boolean);
        return parts.length > 0 ? `${parts[0]}, ${parts.slice(1).join(", ")}.` : "—";
      }
      case "nome_cliente": return clientName;
      case "cliente_email": return clientEmail || "—";
      case "cliente_telefone": return clientPhone || "—";
      case "cliente_cep": return registrationData?.cep || lead.cep || "—";
      case "cliente_endereco": return registrationData?.endereco || lead.endereco || "—";
      case "cliente_numero": return registrationData?.numero || lead.numero || "—";
      case "cliente_complemento": return registrationData?.complemento || lead.complemento || "—";
      case "codigo_contrato": return "{{Codigo_Contrato}}"; // Replaced at generation time

      default: return "";
    }
  };

  // ---- CONTRACT PREVIEW MODE ----
  if (contractPreview) {
    const isTemplateMode = contractPreview === "__template__" && templatePdfUrl;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            {generatedContractLink ? "Contrato Gerado" : "Visualizar Contrato"}
          </h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setContractPreview(null); setContractPreviewProposal(null); setGeneratedContractLink(null); setGeneratedContractId(null); setTemplatePdfUrl(null); setTemplateFields([]); }}>
            Voltar
          </Button>
        </div>

        {isTemplateMode ? (
          <div className="space-y-3">
            <div className="relative rounded-lg border border-border overflow-auto bg-muted/20" style={{ maxHeight: 650 }}>
              <div className="relative inline-block">
                <PdfRenderer
                  pdfUrl={templatePdfUrl}
                  currentPage={templateCurrentPage}
                  onTotalPages={setTemplateTotalPages}
                  scale={1.2}
                />
                {templateFields
                  .filter((f: any) => f.page === templateCurrentPage)
                  .map((f: any) => {
                    const value = resolveFieldValue(f.field_type);
                    const isLogo = f.field_type === "servidor_logo";
                    return (
                      <div
                        key={f.id}
                        className="absolute flex items-start"
                        style={{
                          left: f.pos_x * 1.2,
                          top: f.pos_y * 1.2,
                          width: f.width * 1.2,
                          minHeight: f.height * 1.2,
                          fontSize: Math.min(f.height * 0.55, 13),
                          background: "transparent",
                        }}
                      >
                        {isLogo && value ? (
                          <img src={value} alt="Logo" className="h-full w-auto object-contain" />
                        ) : (
                          <span className="whitespace-pre-wrap break-words leading-tight" style={{ color: "#000", fontSize: f.field_type === "campo_proposta" || f.field_type === "clausula" || f.field_type === "empresa" || f.field_type === "servidor_cnpj" ? 8 : 11, lineHeight: "1.3" }}>
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            {templateTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={templateCurrentPage <= 1} onClick={() => setTemplateCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{templateCurrentPage} / {templateTotalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={templateCurrentPage >= templateTotalPages} onClick={() => setTemplateCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={downloadContractWithOverlay}>
                <Download className="h-3.5 w-3.5" /> Imprimir / Baixar PDF
              </Button>
            </div>
          </div>
        ) : (
          <ContractPdfViewer content={contractPreview} companyName={lead.company_name} />
        )}

        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">Dados do Cliente</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>Nome: {registrationData?.nome_completo || lead.contact_name || "—"}</span>
            <span>CPF/CNPJ: {registrationData?.cpf || lead.documento || "—"}</span>
            <span>Empresa: {lead.company_name}</span>
            <span>Telefone: {lead.phone || "—"}</span>
            <span>E-mail: {lead.email || "—"}</span>
            <span>MRR: {fmtCur(lead.value_mrr || 0)}</span>
          </div>
        </div>

        {!generatedContractLink && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => { setContractPreview(null); setContractPreviewProposal(null); setTemplatePdfUrl(null); setTemplateFields([]); }}>
              <Edit className="h-3.5 w-3.5" /> Editar dados
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={handleConfirmAndGenerate} disabled={sendingToSign}>
              {sendingToSign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
              Confirmar contrato
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---- SIGNATURE MODE: show saved contract or selection panel ----
  if (signatureMode) {
    // If a contract already exists for this lead, show it
    if (loadingSavedContract) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (savedContract && !contractPreview) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Contrato Gerado</h3>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">✅ Contrato salvo com sucesso!</p>
            <p className="text-xs text-muted-foreground mb-1">Código: <span className="font-mono font-semibold">{savedContract.code}</span></p>
            <p className="text-xs text-muted-foreground mb-2">Status: {savedContract.signature_status === "signed" ? "Assinado" : "Aguardando assinatura"}</p>
            {savedContract.signature_link && (
              <div className="flex items-center gap-2 p-2 rounded bg-muted text-xs font-mono break-all">
                {savedContract.signature_link}
              </div>
            )}
          </div>

          {/* Contract PDF preview */}
          {(savedContract.pdf_url || templatePdfUrl) && (
            <div className="relative rounded-lg border border-border overflow-auto bg-muted/20" style={{ maxHeight: 450 }}>
              <div className="relative inline-block">
                <PdfRenderer
                  pdfUrl={savedContract.pdf_url || templatePdfUrl!}
                  currentPage={templateCurrentPage}
                  onTotalPages={setTemplateTotalPages}
                  scale={0.9}
                />
                {/* If using template (no pdf_url), show overlays */}
                {!savedContract.pdf_url && templatePdfUrl && templateFields
                  .filter((f: any) => f.page === templateCurrentPage)
                  .map((f: any) => {
                    const value = resolveFieldValue(f.field_type);
                    const isLogo = f.field_type === "servidor_logo";
                    const s = 0.9;
                    if (!value) return null;
                    return (
                      <div
                        key={f.id}
                        className="absolute flex items-start"
                        style={{
                          left: f.pos_x * s,
                          top: f.pos_y * s,
                          width: f.width * s,
                          minHeight: f.height * s,
                          fontSize: Math.min(f.height * 0.5, 12),
                          background: "transparent",
                        }}
                      >
                        {isLogo && value ? (
                          <img src={value} alt="Logo" className="h-full w-auto object-contain" />
                        ) : (
                          <span className="whitespace-pre-wrap break-words leading-tight" style={{ color: "#000", fontSize: f.field_type === "campo_proposta" || f.field_type === "clausula" || f.field_type === "empresa" || f.field_type === "servidor_cnpj" ? 8 : 10, lineHeight: "1.2" }}>
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {templateTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={templateCurrentPage <= 1} onClick={() => setTemplateCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{templateCurrentPage} / {templateTotalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={templateCurrentPage >= templateTotalPages} onClick={() => setTemplateCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={downloadContractWithOverlay}>
              <Download className="h-3.5 w-3.5" /> Imprimir / Baixar PDF
            </Button>
          </div>

          <div className="flex gap-2">
            {savedContract.signature_link && (
              <>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 flex-1" onClick={() => {
                  navigator.clipboard.writeText(savedContract.signature_link);
                  toast.success("Link copiado!");
                }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </Button>
                <Button size="sm" className="text-xs gap-1.5 flex-1" onClick={() => {
                  const clientName = registrationData?.nome_completo || lead.contact_name || lead.company_name;
                  const message = `Olá ${clientName},\nsegue o link para assinatura do seu contrato.\n\n${savedContract.signature_link}\n\nApós a assinatura o sistema confirmará automaticamente.`;
                  const phone = lead.phone?.replace(/\D/g, "") || "";
                  const url = `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(message)}`;
                  window.open(url, "_blank");
                }}>
                  <MessageSquare className="h-3.5 w-3.5" /> Enviar via WhatsApp
                </Button>
              </>
            )}
          </div>

          {/* Signers Status */}
          {savedContract.id && (
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Users className="h-4 w-4 text-primary" /> Assinaturas do Contrato
                </h3>
                {savedContract.signature_status !== "signed" && (
                  <Button size="sm" variant="outline" onClick={() => setAddSignerOpen(true)} className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                )}
              </div>

              {/* Progress */}
              {contractSigners.length > 0 && (() => {
                const { signed: signedCount, total, allSigned } = getLeadContractSignatureStats(contractSigners);
                const progress = (signedCount / total) * 100;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{signedCount} de {total} assinaturas concluídas</span>
                      <span className={cn("font-semibold", allSigned ? "text-status-paid" : "text-status-open")}>
                        {allSigned ? "✅ Aprovado" : `⏳ ${total - signedCount} pendente(s)`}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })()}

              {/* Signers list */}
              {loadingSigners ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : contractSigners.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum signatário cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {contractSigners.map((signer: any) => {
                    const isSigned = !!signer.signed_at;
                    const roleLabel: Record<string, string> = { cliente: "Cliente", vendedor: "Vendedor", testemunha: "Testemunha", signatario: "Signatário", matriz: "Matriz" };
                    return (
                      <Card key={signer.id} className={cn("border-l-4", isSigned ? "border-l-green-500" : "border-l-amber-400")}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isSigned ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                                <span className="text-sm font-semibold text-foreground truncate">{signer.signer_name || "—"}</span>
                                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                  {roleLabel[signer.signer_role] || signer.signer_role}
                                </Badge>
                              </div>
                              {signer.signer_document && <p className="text-[11px] font-mono text-muted-foreground ml-6">{signer.signer_document}</p>}
                              {isSigned && signer.signed_at && (
                                <p className="text-[11px] text-green-600 ml-6">✅ Assinado em {new Date(signer.signed_at).toLocaleString("pt-BR")}</p>
                              )}
                              {!isSigned && signer.signing_token && (
                                <button onClick={() => handleCopySignerLink(signer.signing_token, signer.signer_name)} className="flex items-center gap-1 text-[11px] text-primary hover:underline ml-6 cursor-pointer">
                                  <Link2 className="h-3 w-3" /> Link para assinatura
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!isSigned && signer.signing_token && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopySignerLink(signer.signing_token, signer.signer_name)} title="Copiar link">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendSignerWhatsApp(signer.signing_token, signer.signer_name)} title="WhatsApp">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                  {savedContract.signature_status !== "signed" && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSigner(signer.id)} title="Excluir assinante">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </>
                              )}
                              {signer.signature_photo_url && (
                                <img src={signer.signature_photo_url} alt="Foto" className="h-8 w-8 rounded object-cover border" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Add Signer Dialog */}
              {addSignerOpen && (
                <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                  <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Adicionar Assinante</p>
                  <div className="grid gap-3">
                    <div><Label className="text-xs">Nome *</Label><Input placeholder="Nome completo" value={newSignerName} onChange={(e) => setNewSignerName(e.target.value)} /></div>
                    <div><Label className="text-xs">CPF/CNPJ</Label><Input placeholder="000.000.000-00" value={newSignerDoc} onChange={(e) => setNewSignerDoc(e.target.value)} /></div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="testemunha">Testemunha</SelectItem>
                          <SelectItem value="signatario">Signatário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setAddSignerOpen(false)}>Cancelar</Button>
                    <Button size="sm" onClick={handleAddContractSigner} disabled={addingSigner || !newSignerName.trim()} className="gap-1.5">
                      {addingSigner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    const availableProposals = proposals.filter(p => {
      const st = (p.metadata as any)?.status;
      return st !== "cancelada" && st !== "declinada";
    });
    const approvedProposals = proposals.filter(p => (p.metadata as any)?.status === "aceita");
    const hasTemplate = !!templatePdfUrl;

    // Get the selected proposal for live preview
    const selectedProposal = selectedSignProposal ? proposals.find(p => p.id === selectedSignProposal) : null;
    const selectedIsApproved = selectedProposal ? (selectedProposal.metadata as any)?.status === "aceita" : false;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Enviar para Assinatura</h3>
        </div>

        {/* Template status */}
        {!hasTemplate && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Nenhum template de contrato configurado para este servidor. Configure em Gestão de Acesso &gt; Editar Servidor &gt; Contrato.
          </div>
        )}

        {/* No approved proposals message */}
        {approvedProposals.length === 0 && availableProposals.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Aguardando aprovação da proposta. Aprove uma proposta na aba Propostas para gerar o contrato.
          </div>
        )}

        <Separator />

        <p className="text-xs text-muted-foreground">
          Selecione a proposta que deseja converter em contrato para assinatura.
          {approvedProposals.length > 0 && <span className="text-primary font-medium ml-1">({approvedProposals.length} aprovada(s))</span>}
        </p>
        <div className="space-y-2">
          {availableProposals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma proposta disponível. Crie uma proposta na aba Propostas primeiro.</p>
          ) : availableProposals.map(p => {
            const meta = (p.metadata as any) || {};
            const isSelected = selectedSignProposal === p.id;
            const isApproved = meta.status === "aceita";
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                  isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                )}
                onClick={() => setSelectedSignProposal(p.id)}
              >
                <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  isSelected ? "border-primary" : "border-muted-foreground/40"
                )}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1 text-xs">
                  <span className="font-medium text-foreground">{meta.sigla || p.title}</span>
                  {isApproved && <Badge variant="outline" className="ml-2 text-[9px] border-green-500 text-green-600">Aprovada</Badge>}
                  <span className="text-muted-foreground ml-2">P&S: {fmtCur(meta.value_ps || 0)} · MRR: {fmtCur(meta.value_mrr || 0)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            );
          })}
        </div>

        {/* Live contract preview when a proposal is selected */}
        {hasTemplate && selectedProposal && (
          <div className="space-y-2">
            <Separator />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização do Contrato</p>
            <div className="relative rounded-lg border border-border overflow-auto bg-muted/20" style={{ maxHeight: 450 }}>
              <div className="relative inline-block">
                <PdfRenderer
                  pdfUrl={templatePdfUrl!}
                  currentPage={templateCurrentPage}
                  onTotalPages={setTemplateTotalPages}
                  scale={0.9}
                />
                {templateFields
                  .filter((f: any) => f.page === templateCurrentPage)
                  .map((f: any) => {
                    const value = resolveFieldValue(f.field_type, selectedProposal);
                    const isLogo = f.field_type === "servidor_logo";
                    const s = 0.9;
                    if (!value) return null;
                    return (
                      <div
                        key={f.id}
                        className="absolute flex items-start"
                        style={{
                          left: f.pos_x * s,
                          top: f.pos_y * s,
                          width: f.width * s,
                          minHeight: f.height * s,
                          fontSize: Math.min(f.height * 0.5, 12),
                          background: "transparent",
                        }}
                      >
                        {isLogo && value ? (
                          <img src={value} alt="Logo" className="h-full w-auto object-contain" />
                        ) : (
                          <span className="whitespace-pre-wrap break-words leading-tight" style={{ color: "#000", fontSize: f.field_type === "campo_proposta" || f.field_type === "clausula" || f.field_type === "empresa" || f.field_type === "servidor_cnpj" ? 8 : 10, lineHeight: "1.2" }}>
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            {templateTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" className="h-6 w-6" disabled={templateCurrentPage <= 1} onClick={() => setTemplateCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-[10px] text-muted-foreground">{templateCurrentPage} / {templateTotalPages}</span>
                <Button variant="outline" size="icon" className="h-6 w-6" disabled={templateCurrentPage >= templateTotalPages} onClick={() => setTemplateCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Data summary */}
            <div className="rounded-lg border border-border p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-foreground">Dados mapeados</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                <span>Servidor: {servidorData?.razao_social || "—"}</span>
                <span>CNPJ: {servidorData?.cnpj || "—"}</span>
                <span>Cliente: {lead.contact_name || lead.company_name}</span>
                <span>MRR: {fmtCur((selectedProposal.metadata as any)?.value_mrr || lead.value_mrr || 0)}</span>
              </div>
            </div>

            {/* Print button */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={downloadContractWithOverlay}>
                <Download className="h-3.5 w-3.5" /> Imprimir / Baixar PDF
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            className="text-xs gap-1.5"
            disabled={!selectedSignProposal || sendingToSign || !hasTemplate || !selectedIsApproved}
            onClick={async () => {
              const proposal = proposals.find(p => p.id === selectedSignProposal);
              if (proposal) {
                await handleSendToSignature(proposal);
              }
            }}
          >
            {sendingToSign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
            Gerar contrato e enviar
          </Button>
          {selectedSignProposal && !selectedIsApproved && (
            <p className="text-[10px] text-amber-500 ml-2 self-center">Aprove a proposta primeiro</p>
          )}
        </div>
      </div>
    );
  }

  // ---- VIEW MODE ----
  if (viewProposal) {
    const meta = (viewProposal.metadata as any) || {};
    const srv = meta.servidor_snapshot || servidorData;
    const comp = meta.company_snapshot || companyData;
    const lineItemsData = (meta.line_items || []).map((it: any) => ({
      name: it.name || "",
      quantity: it.quantity || 1,
      unitValue: it.unitValue || 0,
      total: it.total || 0,
      discountValue: it.discountValue || 0,
      discountType: it.discountType || "percent",
    }));

    const brandInfo = meta.brand_snapshot || brands.find((b: any) => b.id === meta.brand_id);
    const logoUrl = brandInfo?.logo_url || srv?.brand_logo_url || null;

    const templateData: import("./ProposalTemplatePremium").ProposalTemplateData = {
      status: meta.status || "enviada",
      logoUrl,
      companyName: srv?.nome_fantasia || srv?.razao_social || "Empresa",
      companyRazaoSocial: srv?.razao_social,
      companyCnpj: srv?.cnpj,
      companyEmail: srv?.email,
      companyPhone: srv?.telefone,
      reference: meta.sigla || viewProposal.title,
      emissionDate: new Date(viewProposal.created_at).toLocaleDateString("pt-BR"),
      validityDays: meta.validity_days || 15,
      validUntil: meta.valid_until ? new Date(meta.valid_until).toLocaleDateString("pt-BR") : undefined,
      primaryColor: srv?.brand_primary_color || "#1E2952",
      secondaryColor: srv?.brand_secondary_color || "#4F46E5",
      accentColor: srv?.brand_accent_color || "#10B981",
      bgColor: srv?.brand_bg_color || "#F8F9FC",
      textColor: srv?.brand_text_color || "#1F2937",
      clientName: lead.contact_name || lead.company_name,
      clientDocument: lead.documento || comp?.cnpj,
      vendorName: srv?.responsavel || profile?.name || "Vendedor",
      vendorEmail: srv?.email,
      items: lineItemsData,
      totalMrr: meta.value_mrr || 0,
      currency: meta.currency || "BRL",
      conditions: meta.payment_method ? [
        meta.payment_method ? `Forma de pagamento: ${meta.payment_method}` : "",
        meta.validity_days ? `Validade: ${meta.validity_days} dias` : "",
      ].filter(Boolean) : [],
      introduction: meta.introduction,
      description: viewProposal.description,
      showAcceptButton: meta.status === "enviada",
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewProposal(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold">{viewProposal.title}</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => generateProposalPdf(viewProposal)} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Gerar PDF
          </Button>
        </div>

        <ProposalTemplatePremium data={templateData} />
      </div>
    );
  }

  // ---- CREATE/EDIT FORM ----
  if (showForm) {
    const srv = servidorData;
    const comp = companyData;
    const srvAddr = srv ? [srv.endereco, srv.numero && `${srv.numero}`, srv.bairro, srv.cidade && srv.estado ? `${srv.cidade} - ${srv.estado}` : null, srv.cep ? `CEP ${srv.cep}` : null].filter(Boolean).join(", ") : "";

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowForm(false); setEditingProposal(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">{editingProposal ? "Editar Proposta" : "Criar Proposta"}</h3>
        </div>

        {/* Brand selector */}
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-primary" /> Alterar a Marca
            </p>
            {(profile?.is_master || (profile as any)?.is_admin) && (
              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7" onClick={() => setShowBrandManager(true)}>
                <Settings2 className="h-3.5 w-3.5" /> Gerenciar Marcas
              </Button>
            )}
          </div>
          {brands.length > 1 ? (
            <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione uma marca (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      {b.logo_url && <img src={b.logo_url} alt="" className="h-4 w-4 object-contain" />}
                      {b.name} {b.is_default && "(Padrão)"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {/* Show active logo: server logo as global default, brand logo as override */}
          {(() => {
            const activeLogo = (selectedBrandId && brands.find(b => b.id === selectedBrandId)?.logo_url) || servidorData?.brand_logo_url;
            return activeLogo ? (
              <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                <img src={activeLogo} alt="Logo" className="h-10 object-contain" />
                <span className="text-xs text-muted-foreground">Logo será exibido no canto superior esquerdo da proposta</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma logo configurada. Configure em Editar Servidor → Identidade Visual.</p>
            );
          })()}
        </CardContent></Card>

        <BrandManagerDialog
          open={showBrandManager}
          onOpenChange={setShowBrandManager}
          servidorId={lead.servidor_id}
          onBrandsChange={fetchBrands}
        />

        {/* Servidor + Contact + Version */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-xs space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> {srv?.razao_social || "Servidor"}</p>
            {srv?.cnpj && <p className="text-muted-foreground"><span className="font-medium">CNPJ:</span> {srv.cnpj}</p>}
            {srv?.nome_fantasia && <p className="text-muted-foreground"><span className="font-medium">Nome Fantasia:</span> {srv.nome_fantasia}</p>}
            {srvAddr && <p className="text-muted-foreground flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {srvAddr}</p>}
          </CardContent></Card>

          <Card><CardContent className="p-4 text-xs space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary" /> Contato comercial</p>
            <p className="text-muted-foreground"><span className="font-medium">Nome:</span> {srv?.responsavel || profile?.name || "-"}</p>
            <p className="text-muted-foreground"><span className="font-medium">Telefone:</span> {srv?.telefone || "-"}</p>
            {srv?.email && <p className="text-muted-foreground"><span className="font-medium">E-mail:</span> {srv.email}</p>}
          </CardContent></Card>

          <Card><CardContent className="p-4 text-xs space-y-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Versão</Label>
              <Input className="h-8 text-xs" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
          </CardContent></Card>
        </div>

        {/* Person + Company cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4 text-xs space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-1.5"><User className="h-4 w-4 text-primary" /> Dados da pessoa</p>
            <p className="text-foreground text-base font-medium">{lead.contact_name || "Não informado"}</p>
            {lead.email && <p className="text-muted-foreground"><Mail className="inline h-3 w-3 mr-1" /> {lead.email}</p>}
            {lead.phone && <p className="text-muted-foreground"><PhoneCall className="inline h-3 w-3 mr-1" /> {lead.phone}</p>}
            {lead.cidade && <p className="text-muted-foreground"><MapPin className="inline h-3 w-3 mr-1" /> {lead.cidade}{lead.estado ? ` - ${lead.estado}` : ""}</p>}
          </CardContent></Card>

          <Card><CardContent className="p-4 text-xs space-y-1.5">
            <p className="font-semibold text-sm flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> Dados da empresa</p>
            <p className="text-foreground text-base font-medium">{comp?.razao_social || lead.company_name}</p>
            {comp?.cnpj ? <p className="text-muted-foreground">CNPJ: {comp.cnpj}</p> : <p className="text-muted-foreground">CNPJ: Não informado</p>}
            {comp?.email && <p className="text-muted-foreground">E-mail: {comp.email}</p>}
            {comp?.telefone && <p className="text-muted-foreground">Telefone: {comp.telefone}</p>}
            {comp?.endereco && (
              <p className="text-muted-foreground">
                <MapPin className="inline h-3 w-3 mr-1" />
                {[comp.endereco, comp.numero, comp.bairro, comp.cidade && comp.estado ? `${comp.cidade}/${comp.estado}` : null, comp.cep ? `CEP ${comp.cep}` : null].filter(Boolean).join(", ")}
              </p>
            )}
          </CardContent></Card>
        </div>

        {/* Dados da proposta */}
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-primary" /> Dados da proposta</p>
          <div className="grid grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Moeda *</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real Brasileiro</SelectItem>
                  <SelectItem value="USD">Dólar Americano</SelectItem>
                  <SelectItem value="EUR">Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Título *</Label>
              <Input className="h-8 text-xs" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Proposta Comercial" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Data de criação</Label>
              <Input className="h-8 text-xs bg-muted" value={new Date().toLocaleDateString("pt-BR")} readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Data de validade</Label>
              <Input className="h-8 text-xs" type="number" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) })} />
              <span className="text-[10px] text-muted-foreground">dias</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sigla de controle</Label>
              <Input className="h-8 text-xs bg-muted" value={form.sigla} readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nº OC cliente</Label>
              <Input className="h-8 text-xs" value={form.oc_number} onChange={(e) => setForm({ ...form, oc_number: e.target.value })} />
            </div>
          </div>
        </CardContent></Card>

        {/* Envolvidos */}
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-1.5"><User className="h-4 w-4 text-primary" /> Envolvidos na proposta</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Dono da proposta</Label>
              <Input className="h-8 text-xs bg-muted" value={profile?.name || ""} readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Papel do envolvido</Label>
              <Select value="vendedor" disabled>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent></Card>

        {/* Introdução */}
        <Card><CardContent className="p-4 space-y-2">
          <p className="font-semibold text-sm flex items-center gap-1.5"><Edit className="h-4 w-4 text-primary" /> Introdução</p>
          <Textarea className="text-xs min-h-[120px]" value={form.introduction} onChange={(e) => setForm({ ...form, introduction: e.target.value })} placeholder="Texto de introdução da proposta..." />
        </CardContent></Card>

        {/* Itens + Pagamento */}
        <ProposalItemsManager
          servidorId={lead.servidor_id}
          items={lineItems}
          onChange={setLineItems}
          canManageCatalog={isCeo}
          canAddItem={canAddItem}
          paymentFrequency={paymentFrequency}
          onPaymentFrequencyChange={setPaymentFrequency}
          firstPaymentDate={form.first_payment_date}
          onFirstPaymentDateChange={(v) => setForm({ ...form, first_payment_date: v })}
          dueDay={form.due_day}
          onDueDayChange={(v) => setForm({ ...form, due_day: v })}
          installments={installments}
          onInstallmentsChange={setInstallments}
          numberOfInstallments={numberOfInstallments}
          onNumberOfInstallmentsChange={setNumberOfInstallments}
        />

        {/* Observações */}
        <Card><CardContent className="p-4 space-y-2">
          <p className="font-semibold text-sm flex items-center gap-1.5"><Edit className="h-4 w-4 text-primary" /> Observações</p>
          <Textarea className="text-xs min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Condições e termos adicionais..." />
        </CardContent></Card>

        {/* Bottom action bar */}
        <div className="flex items-center gap-2 sticky bottom-0 bg-background border-t pt-3 pb-1">
          <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingProposal(null); }} className="text-xs">
            Fechar
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={async () => {
            if (!form.title.trim()) { toast.error("Preencha o título da proposta"); return; }
            // Save first (handleCreate handles create vs update)
            await handleCreate();
            // After saving, fetch latest proposals and generate PDF from the first match
            const { data } = await supabase
              .from("crm_lead_activities")
              .select("*")
              .eq("lead_id", lead.id)
              .eq("type", "proposal")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (data) {
              await generateProposalPdf(data);
            }
          }} disabled={!form.title.trim() || creating} className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Gerar PDF
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!form.title.trim() || creating}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  // ---- LIST MODE ----
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Propostas
          </h3>
          <Badge variant="secondary" className="text-xs">{proposals.length}</Badge>
        </div>
        <div className="flex gap-2">
          {proposals.some(p => (p.metadata as any)?.status === "aceita") && lead.company_id && (
            <Button size="sm" variant="outline" onClick={() => setShowSignatureSelect(true)} className="gap-1.5 text-xs">
              <FileSignature className="h-3.5 w-3.5" /> Enviar para Assinatura
            </Button>
          )}
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); setEditingProposal(null); }} className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Criar nova proposta
          </Button>
        </div>
      </div>

      {showSignatureSelect && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">Enviar proposta para assinatura</p>
                <p className="text-xs text-muted-foreground">
                  Selecione a proposta aceita que deseja converter em contrato para assinatura.
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => { setShowSignatureSelect(false); setSelectedSignProposal(null); }}>
                Cancelar
              </Button>
            </div>
            <div className="space-y-2">
              {proposals.filter(p => (p.metadata as any)?.status === "aceita").map(p => {
                const meta = (p.metadata as any) || {};
                const isSelected = selectedSignProposal === p.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors",
                      isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedSignProposal(p.id)}
                  >
                    <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected ? "border-primary" : "border-muted-foreground/40"
                    )}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 text-xs">
                      <span className="font-medium text-foreground">{meta.sigla || p.title}</span>
                      <span className="text-muted-foreground ml-2">P&S: {fmtCur(meta.value_ps || 0)} · MRR: {fmtCur(meta.value_mrr || 0)}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                );
              })}
              {proposals.filter(p => (p.metadata as any)?.status === "aceita").length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Nenhuma proposta aceita disponível.</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                className="text-xs gap-1.5"
                disabled={!selectedSignProposal || sendingToSign || !lead.company_id}
                onClick={async () => {
                  const proposal = proposals.find(p => p.id === selectedSignProposal);
                  if (proposal) {
                    await handleSendToSignature(proposal);
                    setShowSignatureSelect(false);
                    setSelectedSignProposal(null);
                  }
                }}
              >
                {sendingToSign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
                Enviar para Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Sigla</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Data</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Validade</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Total itens</th>
              <th className="text-left p-2.5 font-medium text-muted-foreground">Dono</th>
              <th className="text-right p-2.5 font-medium text-muted-foreground">P&S</th>
              <th className="text-right p-2.5 font-medium text-muted-foreground">MRR</th>
              <th className="text-right p-2.5 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr><td colSpan={9} className="p-4 text-muted-foreground">Nenhuma proposta.</td></tr>
            ) : (
              proposals.map((p) => {
                const meta = (p.metadata as any) || {};
                const isExpired = meta.valid_until && new Date(meta.valid_until) < new Date();
                const status = meta.status || "enviada";
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2.5">
                      <Badge variant="outline" className={cn("text-[10px]",
                        status === "aceita" ? "bg-green-100 text-green-700 border-green-300" :
                        status === "declinada" ? "bg-red-100 text-red-700 border-red-300" :
                        status === "cancelada" ? "bg-muted text-muted-foreground" :
                        isExpired ? "bg-red-100 text-red-700 border-red-300" :
                        "bg-blue-100 text-blue-700 border-blue-300"
                      )}>
                        {status === "aceita" ? "Aceita" : status === "declinada" ? "Declinada" : status === "cancelada" ? "Cancelada" : isExpired ? "Expirada" : "Enviada"}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-medium text-foreground">{meta.sigla || "-"}</td>
                    <td className="p-2.5 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2.5 text-muted-foreground">{meta.valid_until ? new Date(meta.valid_until).toLocaleDateString("pt-BR") : "-"}</td>
                    <td className="p-2.5 text-muted-foreground">{meta.total_items || 0}</td>
                    <td className="p-2.5 text-muted-foreground">{p.created_by_name || "Sistema"}</td>
                    <td className="p-2.5 text-right font-medium text-foreground">{fmtCur(meta.value_ps || 0)}</td>
                    <td className="p-2.5 text-right font-medium text-foreground">{fmtCur(meta.value_mrr || 0)}</td>
                    <td className="p-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Ações <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            const m = meta;
                            setForm({
                              title: p.title.replace("Proposta: ", ""),
                              sigla: m.sigla || "", introduction: m.introduction || "",
                              description: p.description || "", items: m.items || "",
                              value_ps: m.value_ps || 0, value_mrr: m.value_mrr || 0,
                              validity_days: m.validity_days || 15, payment_method: m.payment_method || "",
                              first_payment_date: m.first_payment_date || "", due_day: m.due_day || "",
                              version: m.version || "1", oc_number: m.oc_number || "",
                            });
                            setLineItems(m.line_items || []);
                            setPaymentFrequency(m.payment_frequency || "mensal");
                            setCurrency(m.currency || "BRL");
                            if (m.installments) setInstallments(m.installments);
                            if (m.number_of_installments) setNumberOfInstallments(m.number_of_installments);
                            if (m.brand_id) setSelectedBrandId(m.brand_id);
                            setEditingProposal(p);
                            setShowForm(true);
                          }}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProposal(p)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={async () => {
                            await handleUpdateProposalStatus(p, "aceita");
                            setShowSignatureSelect(true);
                            setSelectedSignProposal(p.id);
                          }}>
                            <ThumbsUp className="h-3.5 w-3.5 mr-2" /> Aprovar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateProposalStatus(p, "declinada")}>
                            <ThumbsDown className="h-3.5 w-3.5 mr-2" /> Declinar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateProposalStatus(p, "cancelada")}>
                            <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setViewProposal(p)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateProposalPdf(p)}>
                            <Download className="h-3.5 w-3.5 mr-2" /> Gerar PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicateProposal(p)}>
                            <CopyPlus className="h-3.5 w-3.5 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          {status === "aceita" && lead.company_id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSendToSignature(p)}
                                disabled={sendingToSign}
                                className="text-primary font-medium"
                              >
                                <FileSignature className="h-3.5 w-3.5 mr-2" />
                                {sendingToSign ? "Gerando..." : "Enviar para Assinatura"}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
