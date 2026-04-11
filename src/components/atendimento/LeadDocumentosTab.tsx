import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, MoreVertical, Eye, Download, Trash2,
  FileText, Clock, CheckCircle2, AlertCircle, FileSignature,
  Send, Copy, Link2, Users, XCircle, ExternalLink, UserPlus, Mail, MessageCircle,
} from "lucide-react";
import { ContractVariableAudit } from "./ContractVariableAudit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { renderGeneratedDocumentPdf } from "@/lib/renderGeneratedDocumentPdf";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  socio: "Sócio",
  financeiro: "Financeiro",
  representante_legal: "Representante Legal",
  avalista: "Avalista",
};

const EXTRA_SIGNER_ROLES = [
  { value: "signatario", label: "Signatário" },
  { value: "testemunha", label: "Testemunha" },
  { value: "socio", label: "Sócio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "representante_legal", label: "Representante Legal" },
  { value: "avalista", label: "Avalista" },
];

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
  html_content?: string | null;
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

const ACCEPTED_STATUSES = new Set(["aceita", "accepted", "aprovada", "approved"]);

/** Convert a crm_lead_activities proposal activity into the shape buildVariableMap expects */
function activityToProposal(activity: any): any {
  if (!activity) return null;
  const meta = activity.metadata || {};
  const lineItems = (meta.line_items || []).map((item: any) => ({
    nome: item.name || "",
    name: item.name || "",
    descricao: item.description || item.descricao || "",
    quantidade: item.quantity || 1,
    valor: item.total ?? item.unitValue ?? 0,
  }));
  return {
    titulo: (activity.title || "").replace(/^Proposta:\s*/i, ""),
    descricao: meta.introduction || meta.description || "",
    valor: meta.value_mrr || meta.value_ps || 0,
    proposal_items: lineItems,
    created_by_user_id: activity.created_by_user_id,
    status: meta.status,
    sigla: meta.sigla,
    // Payment data
    value_ps: meta.value_ps || 0,
    value_mrr: meta.value_mrr || 0,
    payment_method: meta.payment_method || "",
    payment_frequency: meta.payment_frequency || "",
    first_payment_date: meta.first_payment_date || "",
    due_day: meta.due_day || "",
    number_of_installments: meta.number_of_installments || 0,
    installments: meta.installments || [],
    currency: meta.currency || "BRL",
  };
}

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

  const freqLabels: Record<string, string> = {
    mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual", avista: "À Vista",
  };
  const payLabels: Record<string, string> = {
    boleto: "Boleto", pix: "PIX", cartao: "Cartão", transferencia: "Transferência", dinheiro: "Dinheiro",
  };

  let servicosContratados = "";
  let nomeItem = "";
  let descricaoItem = "";
  let valorProposta = "";
  let valorTotal = "";

  let formaPagamentoMrr = "";
  let quantidadeParcelasMrr = "";
  let dataPrimeiraParcelaMrr = "";
  let diaVencimentoMrr = "";
  let meioPagamentoMrr = "";
  let valorParcelaMrr = "";
  let valorTotalMrr = "";
  let valorTotalContratoMrr = "";
  let resumoPagamentoMrr = "";
  let parcelasMrr = "";
  let formaPagamentoPs = "";
  let quantidadeParcelasPs = "";
  let valorTotalPs = "";
  let resumoPagamentoPs = "";

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

    // MRR payment
    const freq = proposal.payment_frequency || "";
    const freqLabel = freqLabels[freq] || freq || "";
    const nParcelas = proposal.number_of_installments || 0;
    const dueDay = proposal.due_day || "";
    const firstDate = proposal.first_payment_date || "";
    const payMethod = proposal.payment_method || "";
    const payMethodLabel = payLabels[payMethod] || payMethod || "";
    const mrrValue = proposal.value_mrr || 0;

    formaPagamentoMrr = freqLabel;
    quantidadeParcelasMrr = nParcelas > 0 ? String(nParcelas) : "";
    dataPrimeiraParcelaMrr = firstDate;
    diaVencimentoMrr = dueDay;
    meioPagamentoMrr = payMethodLabel;
    valorTotalMrr = mrrValue > 0 ? fmtCurrency(mrrValue) : "";
    valorTotalContratoMrr = nParcelas > 0 && mrrValue > 0 ? fmtCurrency(mrrValue * nParcelas) : valorTotalMrr;
    if (nParcelas > 0 && mrrValue > 0) valorParcelaMrr = fmtCurrency(mrrValue);

    const resumoParts: string[] = [];
    if (freqLabel) resumoParts.push(freqLabel);
    if (nParcelas > 0) resumoParts.push(`${nParcelas} parcelas`);
    if (dueDay) resumoParts.push(`vencimento todo dia ${dueDay}`);
    if (firstDate) resumoParts.push(`1ª parcela em ${firstDate}`);
    if (payMethodLabel) resumoParts.push(`pagamento via ${payMethodLabel}`);
    resumoPagamentoMrr = resumoParts.join(" | ");

    const installmentsList = proposal.installments || [];
    if (installmentsList.length > 0) {
      parcelasMrr = installmentsList.map((inst: any, idx: number) => {
        const num = inst.number || idx + 1;
        const val = inst.value != null ? fmtCurrency(inst.value) : fmtCurrency(mrrValue);
        const dueDate = inst.due_date || "";
        const method = payLabels[inst.payment_method] || inst.payment_method || payMethodLabel;
        return `Parcela ${num} - ${val} - vencimento em ${dueDate} - ${method}`;
      }).join("\n");
    }

    // P&S payment
    const psValue = proposal.value_ps || 0;
    if (psValue > 0) {
      valorTotalPs = fmtCurrency(psValue);
      formaPagamentoPs = "À Vista";
      quantidadeParcelasPs = "1";
      resumoPagamentoPs = `À Vista | ${payMethodLabel || "PIX"}`;
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
    "{{telefone_vendedor}}": vendor?.whatsapp || "",
    "{{data_nascimento_vendedor}}": vendor?.birth_date || "",
    // Payment MRR
    "{{forma_pagamento_mrr}}": formaPagamentoMrr,
    "{{quantidade_parcelas_mrr}}": quantidadeParcelasMrr,
    "{{data_primeira_parcela_mrr}}": dataPrimeiraParcelaMrr,
    "{{dia_vencimento_mrr}}": diaVencimentoMrr,
    "{{meio_pagamento_mrr}}": meioPagamentoMrr,
    "{{valor_parcela_mrr}}": valorParcelaMrr,
    "{{valor_total_mrr}}": valorTotalMrr,
    "{{valor_total_contrato_mrr}}": valorTotalContratoMrr,
    "{{resumo_pagamento_mrr}}": resumoPagamentoMrr,
    "{{parcelas_mrr}}": parcelasMrr,
    // Payment P&S
    "{{forma_pagamento_ps}}": formaPagamentoPs,
    "{{quantidade_parcelas_ps}}": quantidadeParcelasPs,
    "{{valor_total_ps}}": valorTotalPs,
    "{{resumo_pagamento_ps}}": resumoPagamentoPs,
    // Signature
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
    forma_pagamento_mrr: "proposta", quantidade_parcelas_mrr: "proposta",
    data_primeira_parcela_mrr: "proposta", dia_vencimento_mrr: "proposta",
    meio_pagamento_mrr: "proposta", valor_parcela_mrr: "proposta",
    valor_total_mrr: "proposta", valor_total_contrato_mrr: "proposta",
    resumo_pagamento_mrr: "proposta", parcelas_mrr: "proposta",
    forma_pagamento_ps: "proposta", quantidade_parcelas_ps: "proposta",
    valor_total_ps: "proposta", resumo_pagamento_ps: "proposta",
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
  const [confirmMissingOpen, setConfirmMissingOpen] = useState(false);

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

  // Signer counts per document { docId: { total, signed } }
  const [signerCounts, setSignerCounts] = useState<Record<string, { total: number; signed: number }>>({});

  const servidorId = companyId || lead.servidor_id;

  const fetchSignerCounts = useCallback(async (docIds: string[]) => {
    if (docIds.length === 0) return;
    const { data } = await supabase
      .from("document_signers")
      .select("document_id, status")
      .in("document_id", docIds);
    if (!data) return;
    const counts: Record<string, { total: number; signed: number }> = {};
    data.forEach((s: any) => {
      if (!counts[s.document_id]) counts[s.document_id] = { total: 0, signed: 0 };
      counts[s.document_id].total++;
      if (s.status === "signed") counts[s.document_id].signed++;
    });
    setSignerCounts(counts);
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_documents")
      .select("*, html_content, document_templates(nome)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    const docs = (data as any) || [];
    setDocuments(docs);
    setLoading(false);
    // Fetch signer counts for docs that have been sent for signature
    const sentDocIds = docs
      .filter((d: any) => ["pending_signature", "partially_signed", "signed"].includes(d.status))
      .map((d: any) => d.id);
    fetchSignerCounts(sentDocIds);
  }, [lead.id, fetchSignerCounts]);

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

  const uploadGeneratedPdf = useCallback(async (documentId: string, fileName: string, pdfBytes: Uint8Array) => {
    const arrayBuf = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuf], { type: "application/pdf" });
    const safeName = fileName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 100);
    const filePath = `generated/${servidorId}/${documentId}_${safeName}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("contract-pdfs")
      .upload(filePath, blob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      throw new Error("Falha ao salvar PDF no storage: " + uploadErr.message);
    }

    const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);
    return urlData.publicUrl;
  }, [servidorId]);

  const ensureDocumentPdfUrl = useCallback(async (doc: GeneratedDoc) => {
    // For signed documents, prefer the signed PDF from the edge function (has the professional dark certificate)
    if (doc.status === "signed" && doc.signed_pdf_url) return doc.signed_pdf_url;

    // For non-signed documents, re-render from html_content
    if (doc.html_content) {
      const { data: tenant } = await supabase.from("companies").select("brand_logo_url, brand_primary_color, nome_fantasia, razao_social, cnpj").eq("id", servidorId).maybeSingle();

      const brandingOpts = {
        logoUrl: tenant?.brand_logo_url || undefined,
        primaryColor: tenant?.brand_primary_color || undefined,
        tenantName: tenant?.nome_fantasia || tenant?.razao_social || undefined,
        tenantCnpj: tenant?.cnpj || undefined,
      };

      const pdfBytes = await renderGeneratedDocumentPdf(doc.nome, doc.html_content, brandingOpts);
      const pdfUrl = await uploadGeneratedPdf(doc.id, doc.nome, pdfBytes);

      await supabase
        .from("generated_documents")
        .update({ pdf_url: pdfUrl } as any)
        .eq("id", doc.id);

      setDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, pdf_url: pdfUrl } : item));
      return pdfUrl;
    }

    if (doc.pdf_url) return doc.pdf_url;
    throw new Error("Documento sem conteúdo renderizado para gerar PDF");
  }, [uploadGeneratedPdf, servidorId]);

  const handleOpenDocument = useCallback(async (doc: GeneratedDoc) => {
    try {
      const resolvedUrl = await ensureDocumentPdfUrl(doc);
      setViewDoc({ ...doc, pdf_url: resolvedUrl });
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir documento");
    }
  }, [ensureDocumentPdfUrl]);

  const handleDownloadDocument = useCallback(async (doc: GeneratedDoc) => {
    try {
      const resolvedUrl = await ensureDocumentPdfUrl(doc);
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Erro ao baixar documento");
    }
  }, [ensureDocumentPdfUrl]);

  const handleGenerate = async () => {
    if (!selectedTemplate) return toast.error("Selecione um modelo");
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;
    setGenerating(true);

    try {
      const [tenantRes, activityRes, regRes] = await Promise.all([
        supabase.from("companies").select("*").eq("id", servidorId).maybeSingle(),
        supabase.from("crm_lead_activities").select("*").eq("lead_id", lead.id).eq("type", "proposal").order("created_at", { ascending: false }),
        supabase.from("crm_client_registrations").select("*").eq("lead_id", lead.id).maybeSingle(),
      ]);
      const tenant = tenantRes.data;
      const registration = regRes.data;

      const activities = activityRes.data || [];
      const acceptedActivity = activities.find((a: any) => ACCEPTED_STATUSES.has(((a.metadata as any)?.status || "").toLowerCase()))
        || activities[0] || null;

      const proposal = activityToProposal(acceptedActivity);

      let vendor: any = null;
      if (acceptedActivity?.created_by_user_id) {
        const { data: v } = await supabase
          .from("profiles")
          .select("name, email, whatsapp, birth_date")
          .eq("user_id", acceptedActivity.created_by_user_id)
          .maybeSingle();
        vendor = v;
      }

      const vars = buildVariableMap(lead, tenant, proposal, vendor, registration);
      const missingCritical = CRITICAL_VARS.filter((v) => !vars[`{{${v}}}`]);
      const hasMissingFields = missingCritical.length > 0;

      const contentTemplate = (template as any).content_template;
      let htmlContent: string;
      if (contentTemplate) {
        htmlContent = contentTemplate;
        Object.entries(vars).forEach(([key, val]) => {
          const varName = key.replace(/\{\{|\}\}/g, "");
          if (SIGNATURE_VARS.has(varName)) return;
          htmlContent = htmlContent.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
        });
      } else {
        htmlContent = `<h1>${template.nome}</h1><p>Documento gerado automaticamente.</p>`;
      }

      const finalName = template.nome;
      const snapshot = buildSnapshot(vars);

      const { data: insertedDoc, error } = await supabase.from("generated_documents").insert({
        servidor_id: servidorId,
        lead_id: lead.id,
        template_id: template.id,
        proposal_id: proposal?.id || null,
        nome: finalName,
        tipo: template.tipo,
        status: "gerado",
        html_content: htmlContent,
        pdf_url: null,
        created_by_user_id: profile?.user_id,
        created_by_name: profile?.name,
        rendered_variables_json: snapshot as any,
        generated_with_missing_fields: hasMissingFields,
      } as any).select("id").maybeSingle();

      if (error || !insertedDoc?.id) throw error || new Error("Documento não foi criado");

      const pdfBytes = await renderGeneratedDocumentPdf(finalName, htmlContent, {
        logoUrl: tenant?.brand_logo_url || undefined,
        primaryColor: tenant?.brand_primary_color || undefined,
        tenantName: tenant?.nome_fantasia || tenant?.razao_social || undefined,
        tenantCnpj: tenant?.cnpj || undefined,
      });
      const pdfUrl = await uploadGeneratedPdf(insertedDoc.id, finalName, pdfBytes);

      const { error: updateError } = await supabase
        .from("generated_documents")
        .update({ pdf_url: pdfUrl } as any)
        .eq("id", insertedDoc.id);

      if (updateError) throw updateError;

      const hasPendingSig = Object.values(snapshot).some((v: any) => v?.status === "pending_signature");
      await supabase.from("document_events").insert({
        document_id: insertedDoc.id,
        evento: "documento_gerado",
        descricao: `Documento "${finalName}" gerado a partir do modelo "${template.nome}" por ${profile?.name || "Sistema"}${hasPendingSig ? " (variáveis de assinatura pendentes)" : ""}${hasMissingFields ? " ⚠ GERADO COM CAMPOS OBRIGATÓRIOS AUSENTES" : ""}`,
        metadata_json: {
          template_id: template.id,
          template_nome: template.nome,
          template_arquivo: (template as any).arquivo_nome || null,
          generated_by: profile?.name,
          generated_at: new Date().toISOString(),
          pending_signature_vars: hasPendingSig,
          generated_with_missing_fields: hasMissingFields,
          missing_fields: hasMissingFields ? missingCritical : [],
        },
      });

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

    // Validate owner profile data
    const missingFields: string[] = [];
    if (!profile?.name?.trim()) missingFields.push("Nome completo");
    if (!profile?.email?.trim()) missingFields.push("E-mail");
    if (!profile?.cpf?.trim()) missingFields.push("CPF");
    if (!profile?.whatsapp?.trim()) missingFields.push("Telefone");
    if (!profile?.birth_date) missingFields.push("Data de nascimento");

    if (missingFields.length > 0) {
      toast.error(
        `Complete os dados obrigatórios do seu perfil para enviar para assinatura: ${missingFields.join(", ")}`,
        { duration: 6000 }
      );
      return;
    }

    // Auto-fill signers
    const autoSigners: typeof signers = [];

    // Signer 1: proposal owner (current user) — fixed, read-only
    autoSigners.push({
      nome_completo: profile.name,
      email: profile.email,
      telefone: profile.whatsapp || "",
      cpf: profile.cpf || "",
      data_nascimento: profile.birth_date || "",
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

    // Server-side enforcement: always use fresh profile data for owner signer
    if (!profile?.name || !profile?.email || !profile?.cpf) {
      return toast.error("Complete os dados obrigatórios do seu perfil antes de enviar para assinatura.");
    }

    setSendingSignature(true);

    // Create signers in DB — enforce owner data from profile
    const signersToInsert = signers.map((s, i) => {
      const isOwner = s.papel === "proprietario_proposta";
      return {
        document_id: signDoc.id,
        nome_completo: isOwner ? profile.name : s.nome_completo,
        email: isOwner ? profile.email : (s.email || null),
        telefone: isOwner ? (profile.whatsapp || null) : (s.telefone || null),
        cpf: isOwner ? (profile.cpf || null) : (s.cpf || null),
        data_nascimento: isOwner ? (profile.birth_date || null) : (s.data_nascimento || null),
        papel: s.papel,
        obrigatorio: s.obrigatorio,
        ordem: i + 1,
        status: "pending",
      };
    });

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
          // Pre-fetch tenant, proposal (from activities), vendor, registration for variable preview
          const [tenantRes, activityRes, regRes] = await Promise.all([
            supabase.from("companies").select("*").eq("id", servidorId).maybeSingle(),
            supabase.from("crm_lead_activities").select("*").eq("lead_id", lead.id).eq("type", "proposal").order("created_at", { ascending: false }),
            supabase.from("crm_client_registrations").select("*").eq("lead_id", lead.id).maybeSingle(),
          ]);
          setPreviewTenant(tenantRes.data);
          setPreviewRegistration(regRes.data);
          const activities = activityRes.data || [];
          const acceptedActivity = activities.find((a: any) => ACCEPTED_STATUSES.has(((a.metadata as any)?.status || "").toLowerCase()))
            || activities[0] || null;
          const p = activityToProposal(acceptedActivity);
          setPreviewProposal(p);
          if (acceptedActivity?.created_by_user_id) {
            const { data: v } = await supabase.from("profiles").select("name, email, whatsapp, birth_date").eq("user_id", acceptedActivity.created_by_user_id).maybeSingle();
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
                          {signerCounts[doc.id]
                            ? `${signerCounts[doc.id].signed}/${signerCounts[doc.id].total} assinaturas`
                            : cfg.label}
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
                        {doc.validation_code && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {doc.validation_code}
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
                        {((doc.status === "signed" && doc.signed_pdf_url) || doc.pdf_url || doc.html_content) && (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenDocument(doc)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadDocument(doc)}>
                              <Download className="h-3.5 w-3.5 mr-2" /> {doc.status === "signed" && doc.signed_pdf_url ? "Baixar PDF assinado" : "Baixar PDF original"}
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
                  compact
                  templateText={templateText}
                  resolvedValues={vars}
                  onValidationChange={setCanGenerate}
                />
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            {!canGenerate ? (
              <Button size="sm" variant="destructive" onClick={() => { setGenerateOpen(false); setConfirmMissingOpen(true); }} disabled={generating || !selectedTemplate}>
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                Gerar com dados ausentes
              </Button>
            ) : (
              <Button size="sm" onClick={handleGenerate} disabled={generating || !selectedTemplate}>
                {generating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Gerar Documento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for missing required fields */}
      <AlertDialog open={confirmMissingOpen} onOpenChange={setConfirmMissingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Atenção: dados obrigatórios ausentes
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Este documento possui variáveis obrigatórias sem valor. Você pode voltar para corrigir os dados ou gerar o documento mesmo assim.
                </p>
                <p className="text-xs text-muted-foreground">
                  Campos não preenchidos ficarão em branco ou incompletos no arquivo final. O documento será marcado como gerado com dados ausentes.
                </p>
                {(() => {
                  const tpl = templates.find(t => t.id === selectedTemplate);
                  const contentTemplate = (tpl as any)?.content_template || "";
                  const placeholderList = (tpl as any)?.placeholders_json as string[] | null;
                  const templateText = contentTemplate
                    || (placeholderList && placeholderList.length > 0
                      ? placeholderList.map(p => `{{${p}}}`).join(" ")
                      : "");
                  const vars = buildVariableMap(lead, previewTenant, previewProposal, previewVendor, previewRegistration);
                  const missing = CRITICAL_VARS.filter(v => !vars[`{{${v}}}`]);
                  if (missing.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3 space-y-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Variáveis obrigatórias sem valor ({missing.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {missing.map(v => {
                          const def = { nome_completo: "Nome do cliente", documento_contratante: "CPF/CNPJ do contratante", tenant_nome: "Nome do Tenant", tenant_cnpj: "CNPJ do Tenant" }[v] || v;
                          return (
                            <code key={v} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              {`{{${v}}}`} — {def}
                            </code>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmMissingOpen(false); setGenerateOpen(true); }}>
              Voltar e corrigir
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => { setConfirmMissingOpen(false); handleGenerate(); }}
            >
              Gerar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            ) : viewDoc?.html_content ? (
              <ScrollArea className="rounded-lg border bg-muted/20 h-[600px]">
                <div className="p-6 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: viewDoc.html_content }} />
              </ScrollArea>
            ) : null;
          })()}
        </DialogContent>
      </Dialog>

      {/* Signature Drawer */}
      <Sheet open={signDrawerOpen} onOpenChange={setSignDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-5 w-5 text-primary" />
              {signStep === "config" ? "Enviar para Assinatura" : "Links de Assinatura"}
            </SheetTitle>
            {signDoc && (
              <SheetDescription className="text-left">
                <span className="text-xs text-primary font-medium">{signDoc.validation_code || signDoc.id.slice(0,8).toUpperCase()}</span>
                <span className="text-xs text-muted-foreground"> — {signDoc.nome}</span>
              </SheetDescription>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            {signStep === "config" && (
              <div className="space-y-4 py-4">
                <h4 className="text-sm font-semibold text-foreground">Signatários</h4>

                {signers.map((signer, idx) => {
                  const isOwner = signer.papel === "proprietario_proposta";
                  const isRequired = signer.obrigatorio;
                  return (
                    <Card key={idx} className="border relative overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                              {papelLabels[signer.papel] || signer.papel}
                            </Badge>
                            {isRequired && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                          {!isRequired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setSigners(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Nome completo</Label>
                            <Input
                              value={signer.nome_completo}
                              onChange={(e) => updateSigner(idx, "nome_completo", e.target.value)}
                              className="h-8 text-xs"
                              readOnly={isOwner}
                              disabled={isOwner}
                              placeholder="Nome do signatário"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">E-mail</Label>
                              <Input
                                value={signer.email}
                                onChange={(e) => updateSigner(idx, "email", e.target.value)}
                                className="h-8 text-xs"
                                readOnly={isOwner}
                                disabled={isOwner}
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                              <Input
                                value={signer.telefone}
                                onChange={(e) => updateSigner(idx, "telefone", e.target.value)}
                                className="h-8 text-xs"
                                readOnly={isOwner}
                                disabled={isOwner}
                                placeholder="(00) 00000-0000"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">CPF</Label>
                              <Input
                                value={signer.cpf}
                                onChange={(e) => updateSigner(idx, "cpf", e.target.value)}
                                className="h-8 text-xs"
                                readOnly={isOwner}
                                disabled={isOwner}
                                placeholder="000.000.000-00"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Data de nascimento</Label>
                              <Input
                                type="date"
                                value={signer.data_nascimento}
                                onChange={(e) => updateSigner(idx, "data_nascimento", e.target.value)}
                                className="h-8 text-xs"
                                readOnly={isOwner}
                                disabled={isOwner}
                              />
                            </div>
                          </div>
                          {!isRequired && !isOwner && (
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Papel do signatário</Label>
                              <Select value={signer.papel} onValueChange={(v) => updateSigner(idx, "papel", v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXTRA_SIGNER_ROLES.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {isOwner && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Dados preenchidos automaticamente com base no usuário responsável pela proposta.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed text-xs"
                  onClick={() => {
                    setSigners(prev => [...prev, {
                      nome_completo: "",
                      email: "",
                      telefone: "",
                      cpf: "",
                      data_nascimento: "",
                      papel: "signatario",
                      obrigatorio: false,
                    }]);
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar Signatário
                </Button>
              </div>
            )}

            {signStep === "links" && (
              <div className="space-y-4 py-4">
                {/* Progress bar */}
                {(() => {
                  const signed = generatedSigners.filter(s => s.status === "signed").length;
                  const total = generatedSigners.length;
                  const pct = total > 0 ? (signed / total) * 100 : 0;
                  return (
                    <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          Assinaturas ({signed}/{total})
                        </span>
                        <span className="text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })()}

                <h4 className="text-sm font-semibold text-foreground">Signatários</h4>

                {generatedSigners.map((signer) => {
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    pending: { label: "Aguardando", cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
                    signed: { label: "Assinado", cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
                    rejected: { label: "Recusado", cls: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
                  };
                  const st = statusMap[signer.status] || statusMap.pending;
                  const link = `${window.location.origin}/assinar-documento/${signer.auth_token}`;

                  return (
                    <Card key={signer.id} className="border overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                            {papelLabels[signer.papel] || signer.papel}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px] font-medium", st.cls)}>
                            {st.label}
                          </Badge>
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">{signer.nome_completo}</p>
                          {signer.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {signer.email}
                            </p>
                          )}
                          {signer.telefone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> {signer.telefone}
                            </p>
                          )}
                        </div>

                        {/* Signing link */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground">Link de Assinatura</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={link}
                              readOnly
                              className="h-8 text-[11px] font-mono bg-muted/50"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-1.5 text-xs h-8"
                              onClick={() => {
                                navigator.clipboard.writeText(link);
                                toast.success("Link copiado!");
                                if (signDoc) {
                                  supabase.from("document_events").insert({
                                    document_id: signDoc.id,
                                    signer_id: signer.id,
                                    evento: "link_copiado",
                                    descricao: `Link de assinatura copiado para ${signer.nome_completo}`,
                                  });
                                }
                              }}
                            >
                              <Copy className="h-3 w-3" /> Copiar
                            </Button>
                          </div>
                        </div>

                        {/* Send options */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox defaultChecked={!!signer.email} disabled={!signer.email} className="h-3.5 w-3.5" />
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> E-mail
                              </span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox defaultChecked={!!signer.telefone} disabled={!signer.telefone} className="h-3.5 w-3.5" />
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </span>
                            </label>
                          </div>
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            onClick={() => {
                              toast.success(`Link enviado para ${signer.nome_completo}!`);
                              if (signDoc) {
                                supabase.from("document_events").insert({
                                  document_id: signDoc.id,
                                  signer_id: signer.id,
                                  evento: "link_enviado",
                                  descricao: `Link de assinatura enviado para ${signer.nome_completo}`,
                                });
                              }
                            }}
                          >
                            <Send className="h-3 w-3" /> Enviar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Fixed footer */}
          <div className="px-6 py-4 border-t shrink-0 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSignDrawerOpen(false)}>
              Cancelar
            </Button>
            {signStep === "config" && (
              <Button
                className="flex-1 gap-2"
                onClick={handleSendForSignature}
                disabled={sendingSignature}
              >
                {sendingSignature ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando envelope...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar para Assinatura
                  </>
                )}
              </Button>
            )}
            {signStep === "links" && (
              <Button className="flex-1" onClick={() => setSignDrawerOpen(false)}>
                Fechar
              </Button>
            )}
          </div>
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
