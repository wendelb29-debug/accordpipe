import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, Building2, User, Mail, PhoneCall, MapPin, Calendar,
  DollarSign, FileSpreadsheet, Plus, Loader2, Send, Download,
  Edit, Trash2, MoreVertical, ThumbsUp, ThumbsDown, XCircle,
  Eye, CopyPlus, Link2, Briefcase, Hash, FileSignature, Copy, MessageSquare,
  ImageIcon, Settings2,
} from "lucide-react";
import { ProposalItemsManager, ProposalLineItem } from "./ProposalItemsManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContracts } from "@/hooks/useContracts";
import { generateContractPdf, downloadContractPdf } from "@/lib/generateContractPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
    <div className="rounded-lg border border-border overflow-hidden" style={{ height: "500px" }}>
      <iframe src={pdfUrl} className="w-full h-full" title="Visualização do contrato" />
    </div>
  );
}

export function LeadPropostasTab({ lead, addActivity, signatureMode = false, onUpdateLead }: { lead: CrmLead; addActivity: (data: any) => Promise<any>; signatureMode?: boolean; onUpdateLead?: (id: string, updates: Partial<CrmLead>) => Promise<boolean> }) {

  const { profile } = useAuth();
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
  const [registrationData, setRegistrationData] = useState<any>(null);

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
    if (data) setRegistrationData(data);
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
        .select("id, razao_social, nome_fantasia, cnpj, responsavel, email, telefone, endereco, numero, bairro, cidade, estado, cep")
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
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const mL = 15;
    const mR = 15;
    const usable = pageWidth - mL - mR;
    let y = 15;

    const srv = meta.servidor_snapshot || servidorData;
    const comp = meta.company_snapshot || companyData;
    const brandInfo = meta.brand_snapshot || brands.find(b => b.id === meta.brand_id);
    const createdDate = new Date(proposal.created_at).toLocaleDateString("pt-BR");
    const validUntilStr = meta.valid_until ? new Date(meta.valid_until).toLocaleDateString("pt-BR") : "-";
    const sigla = meta.sigla || "SEM-SIGLA";
    const version = meta.version || "1";
    const curCode = meta.currency || "BRL";

    const fmtVal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: curCode });
    const fmtCpfCnpj = (doc: string) => {
      const d = doc.replace(/\D/g, "");
      if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      return doc;
    };
    const fmtPhone = (p: string) => {
      const d = p.replace(/\D/g, "");
      if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
      return p;
    };

    // Colors
    const primary = { r: 30, g: 41, b: 82 };
    const accent = { r: 79, g: 70, b: 229 };
    const lightBg = { r: 243, g: 244, b: 246 };
    const borderColor = { r: 209, g: 213, b: 219 };
    const textDark = { r: 31, g: 41, b: 55 };
    const textMuted = { r: 107, g: 114, b: 128 };
    const greenAccent = { r: 16, g: 185, b: 129 };

    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - 20) {
        pdf.addPage();
        y = 15;
      }
    };

    const drawSectionTitle = (title: string) => {
      checkPageBreak(12);
      pdf.setFillColor(primary.r, primary.g, primary.b);
      pdf.rect(mL, y, usable, 7, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(title.toUpperCase(), mL + 4, y + 5);
      y += 10;
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    };

    const drawInfoRow = (label: string, value: string, indent = 0) => {
      if (!value || value.trim() === "") return;
      checkPageBreak(5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
      pdf.text(label + ":", mL + 4 + indent, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);
      pdf.text(value, mL + 4 + indent + pdf.getTextWidth(label + ": "), y);
      y += 4.5;
    };

    // ===== HEADER WITH LOGO =====
    let logoLoaded = false;
    if (brandInfo?.logo_url) {
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject();
          logoImg.src = brandInfo.logo_url;
        });
        pdf.addImage(logoImg, "PNG", mL, y, 44, 22);
        logoLoaded = true;
      } catch { /* skip */ }
    }

    // Header right: proposal info
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(primary.r, primary.g, primary.b);
    pdf.text("PROPOSTA COMERCIAL", pageWidth - mR, y + 5, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
    pdf.text(`Nº ${sigla}  |  Versão ${version}`, pageWidth - mR, y + 10, { align: "right" });
    pdf.text(`Emissão: ${createdDate}  |  Validade: ${validUntilStr}`, pageWidth - mR, y + 14, { align: "right" });

    y += (logoLoaded ? 26 : 18);

    // Accent line
    pdf.setDrawColor(accent.r, accent.g, accent.b);
    pdf.setLineWidth(0.8);
    pdf.line(mL, y, pageWidth - mR, y);
    y += 6;

    // ===== EMPRESA EMISSORA =====
    if (srv) {
      drawSectionTitle("Empresa Emissora");
      drawInfoRow("Empresa", srv.nome_fantasia || srv.razao_social || "");
      if (srv.razao_social && srv.nome_fantasia) drawInfoRow("Razão Social", srv.razao_social);
      if (srv.cnpj) drawInfoRow("CNPJ", fmtCpfCnpj(srv.cnpj));
      const srvAddr = [srv.endereco, srv.numero].filter(Boolean).join(", ");
      const srvAddr2 = [srv.bairro, srv.cidade && srv.estado ? `${srv.cidade}/${srv.estado}` : null, srv.cep].filter(Boolean).join(" - ");
      const fullSrvAddr = [srvAddr, srvAddr2].filter(Boolean).join(" - ");
      if (fullSrvAddr) drawInfoRow("Endereço", fullSrvAddr);
      if (srv.email) drawInfoRow("E-mail", srv.email);
      if (srv.telefone) drawInfoRow("Telefone", fmtPhone(srv.telefone));
      y += 2;
    }

    // ===== CONTATO =====
    drawSectionTitle("Contato");
    const contactName = srv?.responsavel || profile?.name || "-";
    drawInfoRow("Nome", contactName);
    if (srv?.email) drawInfoRow("E-mail", srv.email);
    if (srv?.telefone) drawInfoRow("Telefone", fmtPhone(srv.telefone));
    y += 2;

    // ===== DADOS DA PESSOA =====
    const isPJ = !!(comp?.cnpj);

    if (isPJ) {
      // Two-column layout
      checkPageBreak(40);
      const halfW = (usable - 4) / 2;

      // Left: Dados da pessoa
      const leftX = mL;
      pdf.setFillColor(primary.r, primary.g, primary.b);
      pdf.rect(leftX, y, halfW, 7, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("DADOS DA PESSOA", leftX + 4, y + 5);

      // Right: Dados da empresa
      const rightX = mL + halfW + 4;
      pdf.rect(rightX, y, halfW, 7, "F");
      pdf.text("DADOS DA EMPRESA", rightX + 4, y + 5);
      y += 10;

      pdf.setTextColor(textDark.r, textDark.g, textDark.b);

      // Build person data
      const personLines: { label: string; value: string }[] = [];
      if (lead.contact_name) personLines.push({ label: "Nome", value: lead.contact_name });
      if (lead.documento) personLines.push({ label: "CPF", value: fmtCpfCnpj(lead.documento) });
      if (lead.email) personLines.push({ label: "E-mail", value: lead.email });
      if (lead.phone) personLines.push({ label: "Telefone", value: fmtPhone(lead.phone) });

      // Build company data
      const compLines: { label: string; value: string }[] = [];
      if (comp?.razao_social) compLines.push({ label: "Razão Social", value: comp.razao_social });
      if (comp?.nome_fantasia) compLines.push({ label: "Nome Fantasia", value: comp.nome_fantasia });
      if (comp?.cnpj) compLines.push({ label: "CNPJ", value: fmtCpfCnpj(comp.cnpj) });
      if (comp?.email) compLines.push({ label: "E-mail", value: comp.email });
      if (comp?.telefone) compLines.push({ label: "Telefone", value: fmtPhone(comp.telefone) });
      const compAddr = [comp?.endereco, comp?.numero].filter(Boolean).join(", ");
      const compAddr2 = [comp?.bairro, comp?.cidade && comp?.estado ? `${comp.cidade}/${comp.estado}` : null, comp?.cep].filter(Boolean).join(" - ");
      const fullCompAddr = [compAddr, compAddr2].filter(Boolean).join(" - ");
      if (fullCompAddr) compLines.push({ label: "Endereço", value: fullCompAddr });

      const maxRows = Math.max(personLines.length, compLines.length);
      const savedY = y;

      // Render left column
      let ly = savedY;
      for (const line of personLines) {
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
        pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
        pdf.text(line.label + ":", leftX + 4, ly);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(textDark.r, textDark.g, textDark.b);
        const labelW = pdf.getTextWidth(line.label + ": ");
        const valLines = pdf.splitTextToSize(line.value, halfW - 8 - labelW);
        pdf.text(valLines, leftX + 4 + labelW, ly);
        ly += valLines.length * 4;
      }

      // Render right column
      let ry = savedY;
      for (const line of compLines) {
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
        pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
        pdf.text(line.label + ":", rightX + 4, ry);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(textDark.r, textDark.g, textDark.b);
        const labelW = pdf.getTextWidth(line.label + ": ");
        const valLines = pdf.splitTextToSize(line.value, halfW - 8 - labelW);
        pdf.text(valLines, rightX + 4 + labelW, ry);
        ry += valLines.length * 4;
      }

      // Draw borders
      const boxH = Math.max(ly, ry) - savedY + 3;
      pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      pdf.setLineWidth(0.3);
      pdf.rect(leftX, savedY - 3, halfW, boxH + 3);
      pdf.rect(rightX, savedY - 3, halfW, boxH + 3);

      y = Math.max(ly, ry) + 5;
    } else {
      // PF: full width
      drawSectionTitle("Dados da Pessoa");
      if (lead.contact_name) drawInfoRow("Nome", lead.contact_name);
      if (lead.documento) drawInfoRow("CPF", fmtCpfCnpj(lead.documento));
      if (lead.email) drawInfoRow("E-mail", lead.email);
      if (lead.phone) drawInfoRow("Telefone", fmtPhone(lead.phone));
      y += 2;
    }

    // ===== PRODUTOS E SERVIÇOS (TABELA) =====
    const items: ProposalLineItem[] = meta.line_items || [];
    if (items.length > 0) {
      drawSectionTitle("Produtos e Serviços");

      const colWidths = [12, 15, usable - 12 - 15 - 30 - 30 - 30, 30, 30, 30]; // Order, Qty, Name, Unit, Discount, Total
      const headers = ["#", "Qtd", "Descrição", "Valor Unit.", "Desconto", "Subtotal"];

      // Table header
      pdf.setFillColor(lightBg.r, lightBg.g, lightBg.b);
      pdf.rect(mL, y - 1, usable, 7, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
      let cx = mL + 2;
      headers.forEach((h, i) => {
        const align = i >= 3 ? "right" : "left";
        if (align === "right") {
          pdf.text(h, cx + colWidths[i] - 2, y + 3, { align: "right" });
        } else {
          pdf.text(h, cx, y + 3);
        }
        cx += colWidths[i];
      });
      y += 8;

      // Table rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);

      items.forEach((item, idx) => {
        checkPageBreak(7);
        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 252);
          pdf.rect(mL, y - 3, usable, 6, "F");
        }
        cx = mL + 2;
        // Order
        pdf.text(`${idx + 1}`, cx, y);
        cx += colWidths[0];
        // Qty
        pdf.text(`${item.quantity}`, cx, y);
        cx += colWidths[1];
        // Name
        const nameLines = pdf.splitTextToSize(item.name, colWidths[2] - 4);
        pdf.text(nameLines[0], cx, y);
        cx += colWidths[2];
        // Unit value
        pdf.text(fmtVal(item.unitValue), cx + colWidths[3] - 2, y, { align: "right" });
        cx += colWidths[3];
        // Discount
        const discStr = item.discountValue > 0
          ? (item.discountType === "percent" ? `${item.discountValue}%` : fmtVal(item.discountValue))
          : "-";
        pdf.text(discStr, cx + colWidths[4] - 2, y, { align: "right" });
        cx += colWidths[4];
        // Subtotal
        pdf.setFont("helvetica", "bold");
        pdf.text(fmtVal(item.total), cx + colWidths[5] - 2, y, { align: "right" });
        pdf.setFont("helvetica", "normal");

        y += 6;
      });

      // Table footer line
      pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      pdf.setLineWidth(0.3);
      pdf.line(mL, y - 2, pageWidth - mR, y - 2);
      y += 2;
    }

    // ===== RESUMO FINANCEIRO =====
    checkPageBreak(30);
    drawSectionTitle("Resumo Financeiro");

    const totalProducts = items.reduce((s, it) => s + it.total, 0);
    const totalPS = meta.value_ps || 0;
    const totalMRR = meta.value_mrr || totalProducts;
    const grandTotal = totalPS + totalMRR;

    const drawSummaryRow = (label: string, value: string, bold = false, highlight = false) => {
      checkPageBreak(7);
      if (highlight) {
        pdf.setFillColor(greenAccent.r, greenAccent.g, greenAccent.b);
        pdf.rect(mL, y - 3.5, usable, 8, "F");
        pdf.setTextColor(255, 255, 255);
      }
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(bold ? 10 : 9);
      pdf.text(label, mL + 4, y);
      pdf.text(value, pageWidth - mR - 4, y, { align: "right" });
      if (highlight) pdf.setTextColor(textDark.r, textDark.g, textDark.b);
      y += bold ? 7 : 5.5;
    };

    if (totalPS > 0) drawSummaryRow("Subtotal Produtos/Serviços (P&S)", fmtVal(totalPS));
    if (totalMRR > 0) drawSummaryRow("Subtotal Recorrente (MRR)", fmtVal(totalMRR));
    drawSummaryRow("TOTAL GERAL", fmtVal(grandTotal), true, true);
    y += 3;

    // ===== MENSALIDADE (MRR) - INSTALLMENTS =====
    const installmentData: import("./ProposalItemsManager").Installment[] = meta.installments || [];
    if (installmentData.length > 0) {
      checkPageBreak(20);
      drawSectionTitle("Mensalidade (MRR) - Parcelamento");

      const freqLabels: Record<string, string> = { mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual", unica: "Única" };
      const payFreq = meta.payment_frequency || "mensal";
      drawInfoRow("Periodicidade", freqLabels[payFreq] || payFreq);
      drawInfoRow("Parcelas", `${installmentData.length}x`);
      y += 2;

      // Installment table
      const instColWidths = [20, usable - 20 - 45 - 40, 45, 40];
      const instHeaders = ["Parcela", "Vencimento", "Valor", "Método"];

      pdf.setFillColor(lightBg.r, lightBg.g, lightBg.b);
      pdf.rect(mL, y - 1, usable, 6, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
      let cx = mL + 2;
      instHeaders.forEach((h, i) => {
        pdf.text(h, cx, y + 3);
        cx += instColWidths[i];
      });
      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);

      for (const inst of installmentData) {
        checkPageBreak(6);
        let cx = mL + 2;
        pdf.text(`${inst.number}ª`, cx, y);
        cx += instColWidths[0];
        pdf.text(inst.dueDate ? new Date(inst.dueDate + "T12:00:00").toLocaleDateString("pt-BR") : "-", cx, y);
        cx += instColWidths[1];
        pdf.setFont("helvetica", "bold");
        pdf.text(fmtVal(inst.value), cx, y);
        pdf.setFont("helvetica", "normal");
        cx += instColWidths[2];
        const payMethods: Record<string, string> = { boleto: "Boleto", pix: "PIX", cartao: "Cartão", transferencia: "Transf." };
        pdf.text(payMethods[inst.paymentMethod] || inst.paymentMethod || "Boleto", cx, y);
        y += 5;
      }

      // Total do contrato
      y += 2;
      const totalContrato = installmentData.reduce((s, i) => s + i.value, 0);
      pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      pdf.line(mL, y - 1, pageWidth - mR, y - 1);
      y += 3;
      drawSummaryRow("TOTAL DO CONTRATO", fmtVal(totalContrato), true, true);
      y += 3;
    }

    // ===== OBSERVAÇÕES =====
    if (proposal.description || meta.introduction) {
      checkPageBreak(15);
      drawSectionTitle("Observações");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);

      const obsText = [meta.introduction, proposal.description].filter(Boolean).join("\n\n");
      const obsLines = pdf.splitTextToSize(obsText, usable - 8);
      for (const line of obsLines) {
        checkPageBreak(5);
        pdf.text(line, mL + 4, y);
        y += 4;
      }
      y += 3;
    }

    // ===== FOOTER =====
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      // Bottom accent line
      pdf.setDrawColor(accent.r, accent.g, accent.b);
      pdf.setLineWidth(0.5);
      pdf.line(mL, pageHeight - 12, pageWidth - mR, pageHeight - 12);
      // Footer text
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(textMuted.r, textMuted.g, textMuted.b);
      pdf.text(`Proposta ${sigla} - v${version}`, mL, pageHeight - 8);
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth - mR, pageHeight - 8, { align: "right" });
      if (srv?.nome_fantasia || srv?.razao_social) {
        pdf.text(srv.nome_fantasia || srv.razao_social, pageWidth / 2, pageHeight - 8, { align: "center" });
      }
    }

    pdf.save(`${lead.company_name.replace(/\s+/g, "_")}_${sigla}.pdf`);
    toast.success("PDF baixado!");
    await addActivity({
      type: "pdf_download",
      title: `PDF da proposta ${sigla} gerado`,
      description: `Download do PDF da proposta "${proposal.title}" para ${lead.company_name}.`,
      servidor_id: lead.servidor_id,
    });
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

    setContractPreview(content);
    setContractPreviewProposal(proposal);
    setGeneratedContractLink(null);
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
        clause
      );

      if (result) {
        // Get the generated contract to retrieve the link
        const { data: latestContract } = await supabase
          .from("contracts")
          .select("signature_link")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const link = latestContract?.signature_link || "";
        setGeneratedContractLink(link);

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

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // ---- CONTRACT PREVIEW MODE ----
  if (contractPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            {generatedContractLink ? "Contrato Gerado" : "Visualizar Contrato"}
          </h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setContractPreview(null); setContractPreviewProposal(null); setGeneratedContractLink(null); }}>
            Voltar
          </Button>
        </div>

        <ContractPdfViewer content={contractPreview} companyName={lead.company_name} />

        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">Dados do Cliente</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>Nome: {registrationData?.nome_completo || lead.contact_name || "—"}</span>
            <span>CPF: {registrationData?.cpf || "—"}</span>
            <span>Empresa: {lead.company_name}</span>
            <span>Telefone: {lead.phone || "—"}</span>
          </div>
        </div>

        {!generatedContractLink ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => { setContractPreview(null); setContractPreviewProposal(null); }}>
              <Edit className="h-3.5 w-3.5" /> Editar dados
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={handleConfirmAndGenerate} disabled={sendingToSign}>
              {sendingToSign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
              Confirmar contrato
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-foreground mb-1">✅ Contrato gerado com sucesso!</p>
              <p className="text-xs text-muted-foreground mb-2">Status: Contrato enviado para assinatura</p>
              <div className="flex items-center gap-2 p-2 rounded bg-muted text-xs font-mono break-all">
                {generatedContractLink}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 flex-1" onClick={handleCopySignatureLink}>
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </Button>
              <Button size="sm" className="text-xs gap-1.5 flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleSendWhatsApp}>
                <MessageSquare className="h-3.5 w-3.5" /> Enviar via WhatsApp
              </Button>
            </div>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 w-full" onClick={() => {
              if (contractPreview) {
                downloadContractPdf({ content: contractPreview, code: "Contrato", companyName: lead.company_name });
              }
            }}>
              <Download className="h-3.5 w-3.5" /> Baixar contrato em PDF
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---- SIGNATURE MODE: only show selection panel ----
  if (signatureMode) {
    const availableProposals = proposals.filter(p => {
      const st = (p.metadata as any)?.status;
      return st !== "cancelada" && st !== "declinada";
    });
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Enviar para Assinatura</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione a proposta que deseja converter em contrato para assinatura.
        </p>
        <div className="space-y-2">
          {availableProposals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma proposta disponível. Crie uma proposta na aba Propostas primeiro.</p>
          ) : availableProposals.map(p => {
            const meta = (p.metadata as any) || {};
            const isSelected = selectedSignProposal === p.id;
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
                  <span className="text-muted-foreground ml-2">P&S: {fmtCur(meta.value_ps || 0)} · MRR: {fmtCur(meta.value_mrr || 0)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            className="text-xs gap-1.5"
            disabled={!selectedSignProposal || sendingToSign}
            onClick={async () => {
              const proposal = proposals.find(p => p.id === selectedSignProposal);
              if (proposal) {
                await handleSendToSignature(proposal);
              }
            }}
          >
            {sendingToSign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Visualizar contrato
          </Button>
        </div>
      </div>
    );
  }

  // ---- VIEW MODE ----
  if (viewProposal) {
    const meta = (viewProposal.metadata as any) || {};
    const srv = meta.servidor_snapshot || servidorData;
    const comp = meta.company_snapshot || companyData;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewProposal(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">{viewProposal.title}</h3>
        </div>

        {/* Servidor + Contact + Version */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-primary" /> {srv?.razao_social || "Servidor"}</p>
            {srv?.cnpj && <p className="text-muted-foreground">CNPJ: {srv.cnpj}</p>}
            {srv?.nome_fantasia && <p className="text-muted-foreground">Nome Fantasia: {srv.nome_fantasia}</p>}
          </CardContent></Card>
          <Card><CardContent className="p-3 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-primary" /> Contato comercial</p>
            <p className="text-muted-foreground">Nome: {srv?.responsavel || "-"}</p>
            <p className="text-muted-foreground">Telefone: {srv?.telefone || "-"}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-xs space-y-1">
            <p className="font-semibold">Versão: {meta.version || "1"}</p>
            <p className="text-muted-foreground">Sigla: {meta.sigla || "-"}</p>
          </CardContent></Card>
        </div>

        {/* Person + Company data */}
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-3 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1"><User className="h-3.5 w-3.5 text-primary" /> Dados da pessoa</p>
            <p className="text-foreground text-sm font-medium">{lead.contact_name || "Não informado"}</p>
            {lead.email && <p className="text-muted-foreground">E-mail: {lead.email}</p>}
            {lead.phone && <p className="text-muted-foreground">Telefone: {lead.phone}</p>}
          </CardContent></Card>
          <Card><CardContent className="p-3 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-primary" /> Dados da empresa</p>
            <p className="text-foreground text-sm font-medium">{comp?.razao_social || lead.company_name}</p>
            {comp?.cnpj && <p className="text-muted-foreground">CNPJ: {comp.cnpj}</p>}
            {comp?.email && <p className="text-muted-foreground">E-mail: {comp.email}</p>}
          </CardContent></Card>
        </div>

        {/* Proposal details */}
        <Card><CardContent className="p-3 text-xs space-y-2">
          <p className="font-semibold flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-primary" /> Dados da proposta</p>
          <div className="grid grid-cols-4 gap-3">
            <div><span className="text-muted-foreground">Data criação:</span> <span className="font-medium">{new Date(viewProposal.created_at).toLocaleDateString("pt-BR")}</span></div>
            <div><span className="text-muted-foreground">Validade:</span> <span className="font-medium">{meta.valid_until ? new Date(meta.valid_until).toLocaleDateString("pt-BR") : "-"}</span></div>
            <div><span className="text-muted-foreground">Valor P&S:</span> <span className="font-medium">{fmtCur(meta.value_ps || 0)}</span></div>
            <div><span className="text-muted-foreground">Valor MRR:</span> <span className="font-medium">{fmtCur(meta.value_mrr || 0)}</span></div>
          </div>
        </CardContent></Card>

        {meta.introduction && (
          <Card><CardContent className="p-3 text-xs">
            <p className="font-semibold mb-1">Introdução</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{meta.introduction}</p>
          </CardContent></Card>
        )}

        {meta.items && (
          <Card><CardContent className="p-3 text-xs">
            <p className="font-semibold mb-1">Itens</p>
            <ul className="list-disc ml-4 space-y-0.5">
              {meta.items.split("\n").filter(Boolean).map((item: string, i: number) => <li key={i}>{item}</li>)}
            </ul>
          </CardContent></Card>
        )}

        {viewProposal.description && (
          <Card><CardContent className="p-3 text-xs">
            <p className="font-semibold mb-1">Observações</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{viewProposal.description}</p>
          </CardContent></Card>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => generateProposalPdf(viewProposal)} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Gerar PDF
          </Button>
        </div>
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
          {selectedBrandId && brands.find(b => b.id === selectedBrandId)?.logo_url && (
            <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
              <img src={brands.find(b => b.id === selectedBrandId)!.logo_url!} alt="Logo" className="h-10 object-contain" />
              <span className="text-xs text-muted-foreground">Logo será exibido no canto superior esquerdo da proposta</span>
            </div>
          )}
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
          canManageCatalog={!!(profile?.is_master || (profile as any)?.is_admin)}
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
