import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, MoreVertical, Eye, Download, Trash2,
  FileText, Clock, CheckCircle2, AlertCircle, FileSignature,
  Send, Copy, Link2, Users, XCircle, ExternalLink,
} from "lucide-react";
import { ContractVariableAudit } from "./ContractVariableAudit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtDateTime = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const docStatusConfig: Record<string, { label: string; color: string }> = {
  gerado: { label: "Gerado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pending_signature: { label: "Pendente de assinatura", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  partially_signed: { label: "Parcialmente assinado", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  signed: { label: "Assinado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Recusado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expirado", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const signerStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "text-muted-foreground" },
  validation_started: { label: "Validando", color: "text-amber-600" },
  code_sent: { label: "Código enviado", color: "text-blue-600" },
  validated: { label: "Validado", color: "text-blue-600" },
  signed: { label: "Assinado", color: "text-green-600" },
  rejected: { label: "Recusado", color: "text-red-600" },
  expired: { label: "Expirado", color: "text-muted-foreground" },
};

const tipoLabels: Record<string, string> = {
  contrato: "Contrato",
  proposta: "Proposta",
  termo: "Termo",
  aditivo: "Aditivo",
};

const papelLabels: Record<string, string> = {
  proprietario_proposta: "Proprietário da Proposta",
  cliente: "Cliente",
  testemunha: "Testemunha",
  signatario: "Signatário",
};

interface Template {
  id: string;
  nome: string;
  tipo: string;
  arquivo_url: string | null;
}

interface DocumentSigner {
  id: string;
  document_id: string;
  nome_completo: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  papel: string;
  obrigatorio: boolean;
  ordem: number;
  status: string;
  auth_token: string;
  signed_at: string | null;
  rejected_at: string | null;
}

interface GeneratedDoc {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  created_by_name: string | null;
  created_at: string;
  template_id: string | null;
  proposal_id: string | null;
  sent_for_signature_at: string | null;
  signed_at: string | null;
  validation_code: string | null;
  document_hash: string | null;
  document_templates?: { nome: string } | null;
}

interface Props {
  lead: CrmLead;
  addActivity?: (data: any) => Promise<any>;
}

const SIGNATURE_VARS = new Set([
  "data_assinatura_cliente", "hora_assinatura_cliente", "geolocalizacao_cliente", "selfie_cliente",
  "data_assinatura_vendedor", "hora_assinatura_vendedor", "geolocalizacao_vendedor", "selfie_vendedor",
]);

const CRITICAL_VARS = ["nome_completo", "documento_contratante", "tenant_nome", "tenant_cnpj"];

function buildVariableMap(
  lead: CrmLead,
  tenant?: any,
  proposal?: any,
  vendor?: any,
  registration?: any,
) {
  const now = new Date();
  const fmtCurrency = (v: number) =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

  let servicosContratados = "";
  let nomeItem = "";
  let descricaoItem = "";
  let valorProposta = "";
  let valorTotal = "";

  if (proposal) {
    nomeItem = proposal.titulo || "";
    descricaoItem = proposal.descricao || "";
    valorProposta = proposal.valor != null ? fmtCurrency(proposal.valor) : "";
    valorTotal = valorProposta;

    if (proposal.proposal_items && Array.isArray(proposal.proposal_items) && proposal.proposal_items.length > 0) {
      servicosContratados = proposal.proposal_items
        .map((item: any) => {
          const name = item.nome || item.name || "";
          const desc = item.descricao || "";
          const qty = item.quantidade || 1;
          const val = item.valor != null ? fmtCurrency(item.valor) : "";
          const parts = [`Serviço: ${name}`];
          if (desc) parts.push(`Descrição: ${desc}`);
          if (qty > 1) parts.push(`Quantidade: ${qty}`);
          if (val) parts.push(`Valor Total: ${val}`);
          return parts.join("\n");
        })
        .filter(Boolean)
        .join("\n\n");

      if (proposal.proposal_items.length === 1) {
        const firstItem = proposal.proposal_items[0];
        nomeItem = nomeItem || firstItem.nome || firstItem.name || "";
        descricaoItem = descricaoItem || firstItem.descricao || "";
      }

      const itemsTotal = proposal.proposal_items.reduce(
        (sum: number, it: any) => sum + (Number(it.valor) || 0), 0
      );
      if (itemsTotal > 0) {
        valorTotal = fmtCurrency(itemsTotal);
      }
    }
  }

  const cpfValue = registration?.cpf || lead.documento || "";
  const cnpjValue = lead.documento || "";
  const documentoContratante = cpfValue || cnpjValue;
  const dataNascimento = registration?.data_nascimento || "";

  return {
    "{{nome_completo}}": registration?.nome_completo || lead.contact_name || lead.company_name || "",
    "{{cpf}}": cpfValue,
    "{{cnpj}}": cnpjValue,
    "{{razao_social}}": lead.company_name || "",
    "{{documento_contratante}}": documentoContratante,
    "{{email}}": lead.email || registration?.email || "",
    "{{telefone}}": lead.phone || "",
    "{{whatsapp}}": lead.phone || "",
    "{{data_nascimento}}": dataNascimento,
    "{{endereco}}": registration?.endereco || lead.endereco || "",
    "{{numero}}": registration?.numero || lead.numero || "",
    "{{bairro}}": registration?.bairro || lead.bairro || "",
    "{{cidade}}": registration?.cidade || lead.cidade || "",
    "{{estado}}": registration?.estado || lead.estado || "",
    "{{cep}}": registration?.cep || lead.cep || "",
    "{{nome_empresa}}": lead.company_name || "",
    "{{data_atual}}": now.toLocaleDateString("pt-BR"),
    "{{tenant_nome}}": tenant?.nome_fantasia || tenant?.razao_social || "",
    "{{tenant_cnpj}}": tenant?.cnpj || "",
    "{{tenant_razao_social}}": tenant?.razao_social || "",
    "{{tenant_email}}": tenant?.email || "",
    "{{tenant_telefone}}": tenant?.telefone || "",
    "{{tenant_endereco}}": [tenant?.endereco, tenant?.numero].filter(Boolean).join(", ") || "",
    "{{tenant_cidade}}": tenant?.cidade || "",
    "{{tenant_estado}}": tenant?.estado || "",
    "{{nome_item}}": nomeItem,
    "{{descricao_item}}": descricaoItem,
    "{{valor_proposta}}": valorProposta,
    "{{valor_total}}": valorTotal,
    "{{servicos_contratados}}": servicosContratados,
    "{{nome_vendedor}}": vendor?.name || "",
    "{{email_vendedor}}": vendor?.email || "",
    "{{telefone_vendedor}}": vendor?.phone || "",
    "{{data_nascimento_vendedor}}": vendor?.birth_date || "",
    "{{data_assinatura_cliente}}": "",
    "{{hora_assinatura_cliente}}": "",
    "{{geolocalizacao_cliente}}": "",
    "{{selfie_cliente}}": "",
    "{{data_assinatura_vendedor}}": "",
    "{{hora_assinatura_vendedor}}": "",
    "{{geolocalizacao_vendedor}}": "",
    "{{selfie_vendedor}}": "",
  };
}

function buildSnapshot(vars: Record<string, string>) {
  const sourceMap: Record<string, string> = {
    nome_completo: "lead", cpf: "lead", cnpj: "lead", razao_social: "lead",
    documento_contratante: "lead", email: "lead", telefone: "lead", whatsapp: "lead",
    data_nascimento: "lead", endereco: "lead", numero: "lead", bairro: "lead",
    cidade: "lead", estado: "lead", cep: "lead", nome_empresa: "lead", data_atual: "sistema",
    tenant_nome: "tenant", tenant_cnpj: "tenant", tenant_razao_social: "tenant",
    tenant_email: "tenant", tenant_telefone: "tenant", tenant_endereco: "tenant",
    tenant_cidade: "tenant", tenant_estado: "tenant",
    nome_item: "proposta", descricao_item: "proposta", valor_proposta: "proposta",
    valor_total: "proposta", servicos_contratados: "proposta",
    nome_vendedor: "vendedor", email_vendedor: "vendedor",
    telefone_vendedor: "vendedor", data_nascimento_vendedor: "vendedor",
    data_assinatura_cliente: "assinatura", hora_assinatura_cliente: "assinatura",
    geolocalizacao_cliente: "assinatura", selfie_cliente: "assinatura",
    data_assinatura_vendedor: "assinatura", hora_assinatura_vendedor: "assinatura",
    geolocalizacao_vendedor: "assinatura", selfie_vendedor: "assinatura",
  };

  const snapshot: Record<string, any> = { _generated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(vars)) {
    const varName = key.replace(/\{\{|\}\}/g, "");
    const isSig = SIGNATURE_VARS.has(varName);
    snapshot[varName] = {
      value: isSig ? null : (value || null),
      source: sourceMap[varName] || "unknown",
      status: isSig ? "pending_signature" : (value ? "filled" : "empty"),
    };
  }
  return snapshot;
}

export function LeadDocumentosTab({ lead, addActivity }: Props) {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();

  const [documents, setDocuments] = useState<GeneratedDoc[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [docName, setDocName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewTenant, setPreviewTenant] = useState<any>(null);
  const [previewProposal, setPreviewProposal] = useState<any>(null);
  const [previewVendor, setPreviewVendor] = useState<any>(null);
  const [previewRegistration, setPreviewRegistration] = useState<any>(null);
  const [canGenerate, setCanGenerate] = useState(true);

  // View
  const [viewDoc, setViewDoc] = useState<GeneratedDoc | null>(null);

  // Signature drawer
  const [signDrawerOpen, setSignDrawerOpen] = useState(false);
  const [signDoc, setSignDoc] = useState<GeneratedDoc | null>(null);
  const [signStep, setSignStep] = useState<"config" | "links">("config");
  const [signers, setSigners] = useState<Array<{
    nome_completo: string;
    email: string;
    telefone: string;
    cpf: string;
    data_nascimento: string;
    papel: string;
    obrigatorio: boolean;
  }>>([]);
  const [sendingSignature, setSendingSignature] = useState(false);
  const [generatedSigners, setGeneratedSigners] = useState<DocumentSigner[]>([]);

  // View signers dialog
  const [viewSignersDoc, setViewSignersDoc] = useState<GeneratedDoc | null>(null);
  const [viewSignersList, setViewSignersList] = useState<DocumentSigner[]>([]);
  const [loadingSigners, setLoadingSigners] = useState(false);

  const servidorId = companyId || lead.servidor_id;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_documents")
      .select("*, document_templates(nome)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setDocuments((data as any) || []);
    setLoading(false);
  }, [lead.id]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("servidor_id", servidorId)
      .eq("ativo", true)
      .order("nome");
    setTemplates((data as any) || []);
  }, [servidorId]);

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, [fetchDocuments, fetchTemplates]);

  const handleGenerate = async () => {
    if (!selectedTemplate) return toast.error("Selecione um modelo");
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;
    setGenerating(true);

    try {
      // Fetch tenant, proposal, registration in parallel
      const [tenantRes, proposalRes, regRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", servidorId).maybeSingle(),
        supabase.from("proposals").select("*, proposal_items(*)").eq("lead_id", lead.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("crm_client_registrations").select("*").eq("lead_id", lead.id).maybeSingle(),
      ]);
      const tenant = tenantRes.data;
      const registration = regRes.data;
      let proposal = proposalRes.data;

      if (!proposal) {
        const { data: fallback } = await supabase.from("proposals").select("*, proposal_items(*)").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        proposal = fallback;
      }

      let vendor: any = null;
      if (proposal?.created_by_user_id) {
        const { data: v } = await supabase
          .from("profiles")
          .select("name, email, phone, birth_date")
          .eq("user_id", proposal.created_by_user_id)
          .maybeSingle();
        vendor = v;
      }

      const vars = buildVariableMap(lead, tenant, proposal, vendor, registration);

      // Validate critical variables
      const missingCritical = CRITICAL_VARS.filter((v) => !vars[`{{${v}}}`]);
      if (missingCritical.length > 0) {
        toast.error(`Não foi possível gerar: variáveis obrigatórias sem valor (${missingCritical.join(", ")})`);
        setGenerating(false);
        return;
      }

      // Generate PDF with variable substitution
      let pdfUrl = template.arquivo_url;
      if (template.arquivo_url) {
        try {
          const pdfBytes = await fetch(template.arquivo_url).then(r => r.arrayBuffer());
          const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
          const modifiedPdfBytes = await pdfDoc.save();
          const blob = new Blob([modifiedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
          const filePath = `generated/${servidorId}/${Date.now()}_${template.nome.replace(/\s+/g, "_")}.pdf`;
          const { error: uploadErr } = await supabase.storage
            .from("contract-pdfs")
            .upload(filePath, blob, { contentType: "application/pdf" });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);
            pdfUrl = urlData.publicUrl;
          }
        } catch (pdfErr) {
          console.warn("PDF processing failed, using original:", pdfErr);
        }
      }

      // Build HTML content with variable substitution
      let htmlContent = template.arquivo_url
        ? `<p>Documento gerado a partir do modelo: ${template.nome}</p>`
        : `<h1>${template.nome}</h1><p>Documento gerado automaticamente.</p>`;

      const contentTemplate = (template as any).content_template;
      if (contentTemplate) {
        htmlContent = contentTemplate;
        Object.entries(vars).forEach(([key, val]) => {
          // Skip signature placeholders — keep them as-is
          const varName = key.replace(/\{\{|\}\}/g, "");
          if (SIGNATURE_VARS.has(varName)) return;
          htmlContent = htmlContent.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
        });
      }

      // Build structured snapshot
      const snapshot = buildSnapshot(vars);

      const finalName = docName.trim() || `${template.nome} - ${lead.company_name}`;
      const { data: insertedDoc, error } = await supabase.from("generated_documents").insert({
        servidor_id: servidorId,
        lead_id: lead.id,
        template_id: template.id,
        proposal_id: proposal?.id || null,
        nome: finalName,
        tipo: template.tipo,
        status: "gerado",
        html_content: htmlContent,
        pdf_url: pdfUrl,
        created_by_user_id: profile?.user_id,
        created_by_name: profile?.name,
        rendered_variables_json: snapshot as any,
      }).select("id").maybeSingle();

      if (error) throw error;

      // Log document generation event
      if (insertedDoc?.id) {
        const hasPendingSig = Object.values(snapshot).some(
          (v: any) => v?.status === "pending_signature"
        );
        await supabase.from("document_events").insert({
          document_id: insertedDoc.id,
          evento: "documento_gerado",
          descricao: `Documento "${finalName}" gerado a partir do modelo "${template.nome}" por ${profile?.name || "Sistema"}${hasPendingSig ? " (variáveis de assinatura pendentes)" : ""}`,
          metadata_json: {
            template_id: template.id,
            template_nome: template.nome,
            template_arquivo: (template as any).arquivo_nome || null,
            generated_by: profile?.name,
            generated_at: new Date().toISOString(),
            pending_signature_vars: hasPendingSig,
          },
        });
      }

      toast.success("Documento gerado com sucesso e salvo em Docs.");
      setGenerateOpen(false);
      setSelectedTemplate("");
      setDocName("");
      fetchDocuments();
      addActivity?.({ type: "document", title: `Documento "${finalName}" gerado` });
    } catch (err: any) {
      toast.error("Erro ao gerar documento: " + (err.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (doc: GeneratedDoc) => {
    const { error } = await supabase.from("generated_documents").delete().eq("id", doc.id);
    if (error) return toast.error("Erro ao excluir documento");
    toast.success("Documento excluído");
    fetchDocuments();
  };

  // Open signature drawer
  const openSignDrawer = async (doc: GeneratedDoc) => {
    setSignDoc(doc);
    setSignStep("config");
    setGeneratedSigners([]);

    // Auto-fill signers
    const autoSigners: typeof signers = [];

    // Signer 1: proposal owner (current user / creator)
    autoSigners.push({
      nome_completo: profile?.name || "",
      email: profile?.email || "",
      telefone: "",
      cpf: "",
      data_nascimento: "",
      papel: "proprietario_proposta",
      obrigatorio: true,
    });

    // Signer 2: lead/client
    autoSigners.push({
      nome_completo: lead.contact_name || lead.company_name || "",
      email: lead.email || "",
      telefone: lead.phone || "",
      cpf: lead.documento || "",
      data_nascimento: "",
      papel: "cliente",
      obrigatorio: true,
    });

    setSigners(autoSigners);
    setSignDrawerOpen(true);
  };

  const updateSigner = (index: number, field: string, value: string | boolean) => {
    setSigners((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSendForSignature = async () => {
    if (!signDoc) return;
    if (signers.some((s) => !s.nome_completo.trim())) return toast.error("Todos os signatários precisam de nome");

    setSendingSignature(true);

    // Create signers in DB
    const signersToInsert = signers.map((s, i) => ({
      document_id: signDoc.id,
      nome_completo: s.nome_completo,
      email: s.email || null,
      telefone: s.telefone || null,
      cpf: s.cpf || null,
      data_nascimento: s.data_nascimento || null,
      papel: s.papel,
      obrigatorio: s.obrigatorio,
      ordem: i + 1,
      status: "pending",
    }));

    const { data: insertedSigners, error: signersError } = await supabase
      .from("document_signers")
      .insert(signersToInsert)
      .select();

    if (signersError) {
      setSendingSignature(false);
      return toast.error("Erro ao configurar signatários");
    }

    // Update document status
    await supabase
      .from("generated_documents")
      .update({
        status: "pending_signature",
        sent_for_signature_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", signDoc.id);

    // Log event
    await supabase.from("document_events").insert({
      document_id: signDoc.id,
      evento: "envelope_configurado",
      descricao: `Envelope configurado com ${signers.length} signatário(s)`,
    });

    for (const signer of (insertedSigners || [])) {
      await supabase.from("document_events").insert({
        document_id: signDoc.id,
        signer_id: signer.id,
        evento: "link_gerado",
        descricao: `Link de assinatura gerado para ${signer.nome_completo}`,
      });
    }

    setGeneratedSigners((insertedSigners as DocumentSigner[]) || []);
    setSendingSignature(false);
    setSignStep("links");
    fetchDocuments();
    addActivity?.({ type: "signature", title: `Documento "${signDoc.nome}" enviado para assinatura` });
    toast.success("Envelope configurado!");
  };

  const copySignerLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/assinar-documento/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const fetchSigners = async (doc: GeneratedDoc) => {
    setViewSignersDoc(doc);
    setLoadingSigners(true);
    const { data } = await supabase
      .from("document_signers")
      .select("*")
      .eq("document_id", doc.id)
      .order("ordem");
    setViewSignersList((data as DocumentSigner[]) || []);
    setLoadingSigners(false);
  };

  const handleCancelSignature = async (doc: GeneratedDoc) => {
    await supabase
      .from("generated_documents")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", doc.id);
    await supabase.from("document_events").insert({
      document_id: doc.id,
      evento: "assinatura_cancelada",
      descricao: "Processo de assinatura cancelado",
    });
    toast.success("Assinatura cancelada");
    fetchDocuments();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getSignerCountLabel = (doc: GeneratedDoc) => {
    // We don't have signer counts in the list query, so we just show status
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Documentos Gerados</h3>
          <p className="text-xs text-muted-foreground">{documents.length} documento(s)</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={async () => {
          setGenerateOpen(true);
          setCanGenerate(true);
          setSelectedTemplate("");
          // Pre-fetch tenant, proposal, vendor, registration for variable preview
          const [tenantRes, proposalRes, regRes] = await Promise.all([
            supabase.from("companies").select("*").eq("id", servidorId).maybeSingle(),
            supabase.from("proposals").select("*, proposal_items(*)").eq("lead_id", lead.id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
            supabase.from("crm_client_registrations").select("*").eq("lead_id", lead.id).maybeSingle(),
          ]);
          setPreviewTenant(tenantRes.data);
          setPreviewRegistration(regRes.data);
          let p = proposalRes.data;
          // Fallback: if no approved proposal, get the most recent one
          if (!p) {
            const { data: fallback } = await supabase.from("proposals").select("*, proposal_items(*)").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
            p = fallback;
          }
          setPreviewProposal(p);
          if (p?.created_by_user_id) {
            const { data: v } = await supabase.from("profiles").select("name, email, phone, birth_date").eq("user_id", p.created_by_user_id).maybeSingle();
            setPreviewVendor(v);
          } else {
            setPreviewVendor(null);
          }
        }}>
          <Plus className="h-3.5 w-3.5" /> Gerar Documento
        </Button>
      </div>

      {/* List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum documento</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Gere um documento a partir de um modelo do Tenant</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const cfg = docStatusConfig[doc.status] || docStatusConfig.gerado;
            return (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileSignature className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{doc.nome}</span>
                        <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.color)}>
                          {cfg.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {tipoLabels[doc.tipo] || doc.tipo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtDate(doc.created_at)}
                        </span>
                        {doc.created_by_name && <span>por {doc.created_by_name}</span>}
                        {doc.sent_for_signature_at && (
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" /> Enviado {fmtDate(doc.sent_for_signature_at)}
                          </span>
                        )}
                        {doc.signed_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Assinado {fmtDate(doc.signed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {doc.pdf_url && (
                          <>
                            <DropdownMenuItem onClick={() => setViewDoc(doc)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(doc.pdf_url!, "_blank")}>
                              <Download className="h-3.5 w-3.5 mr-2" /> Baixar PDF original
                            </DropdownMenuItem>
                          </>
                        )}
                        {doc.status === "signed" && doc.signed_pdf_url && (
                          <>
                            <DropdownMenuItem onClick={() => window.open(doc.signed_pdf_url!, "_blank")}>
                              <Download className="h-3.5 w-3.5 mr-2" /> Baixar PDF assinado
                            </DropdownMenuItem>
                          </>
                        )}
                        {doc.status === "signed" && doc.validation_code && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(doc.validation_code!);
                              toast.success("Código de validação copiado!");
                            }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copiar código de validação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const link = `${window.location.origin}/validar-documento/${doc.validation_code}`;
                              navigator.clipboard.writeText(link);
                              toast.success("Link de validação copiado!");
                            }}>
                              <Link2 className="h-3.5 w-3.5 mr-2" /> Copiar link de validação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              window.open(`${window.location.origin}/validar-documento/${doc.validation_code}`, "_blank");
                            }}>
                              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir página de validação
                            </DropdownMenuItem>
                          </>
                        )}
                        {doc.status === "gerado" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openSignDrawer(doc)}>
                              <Send className="h-3.5 w-3.5 mr-2" /> Enviar para assinatura
                            </DropdownMenuItem>
                          </>
                        )}
                        {["pending_signature", "partially_signed"].includes(doc.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchSigners(doc)}>
                              <Users className="h-3.5 w-3.5 mr-2" /> Ver signatários
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCancelSignature(doc)} className="text-destructive">
                              <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar assinatura
                            </DropdownMenuItem>
                          </>
                        )}
                        {doc.status === "signed" && (
                          <DropdownMenuItem onClick={() => fetchSigners(doc)}>
                            <Users className="h-3.5 w-3.5 mr-2" /> Ver signatários
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Gerar Documento
            </DialogTitle>
            <DialogDescription>Selecione um modelo e gere o documento preenchido</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo de Documento *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mx-auto mb-2 text-muted-foreground/40" />
                      Nenhum modelo cadastrado no Tenant
                    </div>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome} ({tipoLabels[t.tipo] || t.tipo})</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do documento (opcional)</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Deixe vazio para usar o nome do modelo" />
            </div>
            {selectedTemplate && (() => {
              const tpl = templates.find(t => t.id === selectedTemplate);
              const contentTemplate = (tpl as any)?.content_template || "";
              const placeholderList = (tpl as any)?.placeholders_json as string[] | null;
              // Build template text: prefer content_template, then placeholders_json, then fallback
              const templateText = contentTemplate
                || (placeholderList && placeholderList.length > 0
                  ? placeholderList.map(p => `{{${p}}}`).join(" ")
                  : "");
              const vars = buildVariableMap(lead, previewTenant, previewProposal, previewVendor, previewRegistration);
              if (!templateText) {
                return (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    O modelo selecionado não possui variáveis configuradas. O documento será gerado com o PDF original.
                  </div>
                );
              }
              return (
                <ContractVariableAudit
                  templateText={templateText}
                  resolvedValues={vars}
                  onValidationChange={setCanGenerate}
                />
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating || !selectedTemplate || !canGenerate}>
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {!canGenerate ? "Dados obrigatórios ausentes" : "Gerar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {viewDoc?.nome}
              {viewDoc?.status === "signed" && viewDoc?.signed_pdf_url && (
                <Badge variant="outline" className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  PDF Assinado
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const pdfToShow = (viewDoc?.status === "signed" && viewDoc?.signed_pdf_url) ? viewDoc.signed_pdf_url : viewDoc?.pdf_url;
            return pdfToShow ? (
              <div className="rounded-lg border overflow-hidden bg-muted/20" style={{ height: "600px" }}>
                <iframe
                  src={`${pdfToShow}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full"
                  title="Visualização do documento"
                  style={{ border: "none" }}
                />
              </div>
            ) : null;
          })()}
        </DialogContent>
      </Dialog>

      {/* Signature Drawer */}
      <Sheet open={signDrawerOpen} onOpenChange={setSignDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              {signStep === "config" ? "Enviar para assinatura" : "Links de assinatura"}
            </SheetTitle>
            {signDoc && (
              <SheetDescription className="text-left">
                <span className="font-medium text-foreground">{signDoc.nome}</span>
                <br />
                <span className="text-xs">
                  Tipo: {tipoLabels[signDoc.tipo] || signDoc.tipo} · Gerado em {fmtDateTime(signDoc.created_at)}
                </span>
              </SheetDescription>
            )}
          </SheetHeader>

          {signStep === "config" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Signatários</h4>
              </div>

              {signers.map((signer, idx) => (
                <Card key={idx} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {papelLabels[signer.papel] || signer.papel}
                      </Badge>
                      {signer.obrigatorio && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Nome completo</Label>
                        <Input
                          value={signer.nome_completo}
                          onChange={(e) => updateSigner(idx, "nome_completo", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">E-mail</Label>
                        <Input
                          value={signer.email}
                          onChange={(e) => updateSigner(idx, "email", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                        <Input
                          value={signer.telefone}
                          onChange={(e) => updateSigner(idx, "telefone", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">CPF</Label>
                        <Input
                          value={signer.cpf}
                          onChange={(e) => updateSigner(idx, "cpf", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Data de nascimento</Label>
                        <Input
                          type="date"
                          value={signer.data_nascimento}
                          onChange={(e) => updateSigner(idx, "data_nascimento", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Separator />

              <Button
                className="w-full gap-2"
                onClick={handleSendForSignature}
                disabled={sendingSignature}
              >
                {sendingSignature ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Configurando envelope de assinatura...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar para assinatura
                  </>
                )}
              </Button>
            </div>
          )}

          {signStep === "links" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Os links abaixo foram gerados para os signatários deste documento.
              </p>

              {generatedSigners.map((signer) => (
                <Card key={signer.id} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {papelLabels[signer.papel] || signer.papel}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-amber-600">
                        Aguardando assinatura
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{signer.nome_completo}</p>
                    {signer.email && <p className="text-xs text-muted-foreground">{signer.email}</p>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => copySignerLink(signer.auth_token)}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar link
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSignDrawerOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* View Signers Dialog */}
      <Dialog open={!!viewSignersDoc} onOpenChange={() => setViewSignersDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Signatários
            </DialogTitle>
            <DialogDescription>{viewSignersDoc?.nome}</DialogDescription>
          </DialogHeader>
          {loadingSigners ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {viewSignersList.map((s) => {
                const sCfg = signerStatusConfig[s.status] || signerStatusConfig.pending;
                return (
                  <Card key={s.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{s.nome_completo}</span>
                        <span className={cn("text-[11px] font-medium", sCfg.color)}>{sCfg.label}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        <p>Papel: {papelLabels[s.papel] || s.papel}</p>
                        {s.email && <p>E-mail: {s.email}</p>}
                        {s.signed_at && <p>Assinado em: {fmtDateTime(s.signed_at)}</p>}
                        {s.rejected_at && <p>Recusado em: {fmtDateTime(s.rejected_at)}</p>}
                      </div>
                      {["pending", "validation_started", "code_sent"].includes(s.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs gap-1.5 w-full"
                          onClick={() => copySignerLink(s.auth_token)}
                        >
                          <Copy className="h-3 w-3" /> Copiar link
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
