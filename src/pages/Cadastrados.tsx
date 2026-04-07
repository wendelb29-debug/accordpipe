import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, Users, UserCheck, Clock, FileWarning, Eye, Paperclip,
  FileSignature, Download, User, UsersRound, Pencil, Save, Loader2,
  DollarSign, TrendingUp, FileText, Activity, ChevronRight,
  CreditCard, AlertTriangle, CheckCircle2, XCircle, BarChart3,
  Calendar, Mail, Phone, MapPin, Building2, Heart, ArrowLeft,
  Plus, Rocket, PauseCircle, Trash2, MoreVertical
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { CadastradosCharts } from "@/components/cadastrados/CadastradosCharts";
import { generateSignedContractPdf } from "@/lib/generateSignedContractPdf";
import { generateContractPdf } from "@/lib/generateContractPdf";

// ──────────── Status configs ────────────
const registrationStatusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: "Cadastro Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  em_analise: { label: "Dados em Análise", color: "bg-blue-100 text-blue-800 border-blue-200" },
  concluido: { label: "Cadastro Concluído", color: "bg-green-100 text-green-800 border-green-200" },
  doc_pendente: { label: "Doc. Pendente", color: "bg-red-100 text-red-800 border-red-200" },
};

const clientStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ativo: { label: "Ativo", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle2 },
  pendente: { label: "Pendente", color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: Clock },
  inadimplente: { label: "Inadimplente", color: "text-red-700 bg-red-50 border-red-200", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "text-muted-foreground bg-muted border-border", icon: XCircle },
};

const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

// ──────────── Health Score ────────────
function getClientHealth(reg: any, transactions: any[], contracts: any[]) {
  let score = 0;
  const cs = reg.client_status || "pendente";
  if (cs === "ativo") score += 40;
  else if (cs === "pendente") score += 20;
  else if (cs === "inadimplente") score += 0;
  else score -= 10;

  // Payments on time
  const paid = transactions.filter(t => t.status === "pago").length;
  const total = transactions.length;
  if (total > 0) score += Math.round((paid / total) * 30);
  else score += 15;

  // Has contract signed
  const signed = contracts.some(c => c.contract_status === "assinado");
  if (signed) score += 20;

  // Time as client
  if (reg.data_adesao) {
    const days = Math.floor((Date.now() - new Date(reg.data_adesao).getTime()) / 86400000);
    if (days > 180) score += 10;
    else if (days > 30) score += 5;
  }

  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 70) return { score: clamped, level: "green" as const, label: "Saudável" };
  if (clamped >= 40) return { score: clamped, level: "yellow" as const, label: "Atenção" };
  return { score: clamped, level: "red" as const, label: "Crítico" };
}

// ──────────── Main Component ────────────
export default function Cadastrados() {
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Detail view
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [detailContracts, setDetailContracts] = useState<any[]>([]);
  const [detailCrmContracts, setDetailCrmContracts] = useState<any[]>([]);
  const [detailTransactions, setDetailTransactions] = useState<any[]>([]);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [detailDocuments, setDetailDocuments] = useState<any[]>([]);
  const [detailLeadDocs, setDetailLeadDocs] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");

  // Upsell
  const [detailUpsells, setDetailUpsells] = useState<any[]>([]);
  const [upsellDialogOpen, setUpsellDialogOpen] = useState(false);
  const [upsellForm, setUpsellForm] = useState({ name: "", description: "", amount: "", type: "mensal", start_date: new Date().toISOString().split("T")[0] });
  const [upsellSaving, setUpsellSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  // Manual Registration state (must be before any early return)
  const [manualRegOpen, setManualRegOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    nome_completo: "", cpf: "", email: "", telefone: "",
    empresa: "", plano: "", valor: "", client_status: "pendente",
    data_adesao: new Date().toISOString().split("T")[0], observacoes: "", origem: "manual",
  });
  const [manualSaving, setManualSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Check if user can manage upsells (Master/CEO/Admin)
  const canManageUpsell = profile?.is_master || true; // Role check done via RLS

  useEffect(() => {
    fetchRegistrations();
  }, [profile]);

  const fetchRegistrations = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_client_registrations")
      .select("*, crm_leads(*), crm_client_dependents(*)")
      .eq("servidor_id", profile.company_id)
      .order("created_at", { ascending: false });
    setRegistrations(data || []);
    setLoading(false);
  };

  // ──────── Aggregated stats ────────
  const stats = useMemo(() => {
    const all = registrations;
    const ativos = all.filter(r => (r.client_status || "pendente") === "ativo");
    const inadimplentes = all.filter(r => (r.client_status || "pendente") === "inadimplente");
    const mrr = all.reduce((sum, r) => {
      if ((r.client_status || "pendente") === "ativo" && r.valor_mensal) return sum + Number(r.valor_mensal);
      return sum;
    }, 0);
    const contractCount = all.filter(r => r.status === "concluido").length;
    const ticketMedio = ativos.length > 0 ? mrr / ativos.length : 0;
    return {
      total: all.length,
      ativos: ativos.length,
      mrr,
      inadimplentes: inadimplentes.length,
      contratos: contractCount,
      ticketMedio,
    };
  }, [registrations]);

  // ──────── Filtering ────────
  const filtered = useMemo(() => {
    return registrations.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (clientStatusFilter !== "all" && (r.client_status || "pendente") !== clientStatusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (r.nome_completo || "").toLowerCase().includes(s) ||
        (r.cpf || "").includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.crm_leads?.company_name || "").toLowerCase().includes(s)
      );
    });
  }, [registrations, search, statusFilter, clientStatusFilter]);

  // ──────── Open detail ────────
  const openDetail = async (reg: any) => {
    setSelectedReg(reg);
    setEditing(false);
    setActiveTab("dados");
    setEditData({
      nome_completo: reg.nome_completo || "",
      cpf: reg.cpf || "",
      rg: reg.rg || "",
      data_nascimento: reg.data_nascimento || "",
      email: reg.email || "",
      nome_pai: reg.nome_pai || "",
      nome_mae: reg.nome_mae || "",
      cep: reg.cep || "",
      endereco: reg.endereco || "",
      numero: reg.numero || "",
      bairro: reg.bairro || "",
      cidade: reg.cidade || "",
      estado: reg.estado || "",
    });

    // Fetch contracts, transactions, history, upsells in parallel
    const contractIds = (await supabase.from("client_contracts").select("id").eq("registration_id", reg.id)).data?.map((c: any) => c.id) || [];

    const [contractsRes, transactionsRes, historyRes, upsellsRes, docsRes, crmContractsRes, leadDocsRes] = await Promise.all([
      supabase
        .from("client_contracts")
        .select("*")
        .eq("registration_id", reg.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("financial_transactions")
        .select("*")
        .eq("registration_id", reg.id)
        .order("created_at", { ascending: false }),
      contractIds.length > 0 ? supabase
        .from("client_contract_history")
        .select("*")
        .in("contract_id", contractIds)
        .order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      supabase
        .from("client_upsells" as any)
        .select("*")
        .eq("registration_id", reg.id)
        .order("created_at", { ascending: false }),
      reg.lead_id ? supabase
        .from("drive_files")
        .select("*")
        .eq("servidor_id", reg.servidor_id)
        .eq("type", "file")
        .order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      reg.lead_id ? supabase
        .from("contracts")
        .select("id, code, signature_status, signed_at, validation_code, document_hash, pdf_url, pdf_assinado_url, signer_name, signer_document, signature_photo_url, created_at")
        .eq("lead_id", reg.lead_id)
        .eq("signature_status", "signed") : Promise.resolve({ data: [] }),
      reg.lead_id ? (supabase as any)
        .from("lead_documents")
        .select("*")
        .eq("lead_id", reg.lead_id)
        .order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    setDetailContracts(contractsRes.data || []);
    setDetailTransactions(transactionsRes.data || []);
    setDetailHistory(historyRes.data || []);
    setDetailUpsells((upsellsRes as any).data || []);
    setDetailDocuments((docsRes as any).data || []);
    setDetailLeadDocs(leadDocsRes.data || []);

    // Fetch signers for each CRM contract (deduplicated by role)
    const crmWithSigners: any[] = [];
    for (const c of (crmContractsRes.data || [])) {
      const { data: sigs } = await supabase
        .from("contract_signatures")
        .select("signer_name, signer_role, signer_document, signed_at, signer_ip, signature_photo_url")
        .eq("contract_id", c.id)
        .order("created_at", { ascending: true });

      const roleMap = new Map<string, any>();
      for (const s of (sigs || [])) {
        const role = s.signer_role || "signatário";
        const existing = roleMap.get(role);
        if (!existing || (s.signed_at && !existing.signed_at)) {
          roleMap.set(role, s);
        }
      }
      crmWithSigners.push({ ...c, signers: Array.from(roleMap.values()) });
    }
    setDetailCrmContracts(crmWithSigners);
  };

  const handleSaveEdit = async () => {
    if (!selectedReg?.id) return;
    setSaving(true);
    try {
      // Only send valid columns to avoid errors
      const validFields = [
        "nome_completo", "cpf", "rg", "data_nascimento", "email",
        "nome_pai", "nome_mae", "cep", "endereco", "numero",
        "bairro", "cidade", "estado",
      ];
      const cleanData: Record<string, any> = {};
      for (const key of validFields) {
        if (key in editData) {
          cleanData[key] = editData[key] || null;
        }
      }
      const { error } = await supabase
        .from("crm_client_registrations")
        .update(cleanData as any)
        .eq("id", selectedReg.id);
      if (error) {
        console.error("Save error:", error);
        throw error;
      }
      const updated = { ...selectedReg, ...cleanData };
      setSelectedReg(updated);
      setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? { ...r, ...cleanData } : r));
      setEditing(false);
      toast.success("Cadastro atualizado com sucesso!");
    } catch (err: any) {
      console.error("Save error details:", err);
      toast.error(err?.message || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  // ──────── Create Upsell ────────
  const handleCreateUpsell = async () => {
    if (!selectedReg?.id || !profile?.company_id || !upsellForm.name || !upsellForm.amount) {
      toast.error("Preencha nome e valor do upsell");
      return;
    }
    setUpsellSaving(true);
    try {
      const amount = parseFloat(upsellForm.amount.replace(",", "."));
      if (isNaN(amount) || amount <= 0) throw new Error("Valor inválido");

      // Create upsell
      await supabase.from("client_upsells" as any).insert({
        registration_id: selectedReg.id,
        servidor_id: profile.company_id,
        lead_id: selectedReg.lead_id,
        name: upsellForm.name,
        description: upsellForm.description,
        amount,
        type: upsellForm.type,
        start_date: upsellForm.start_date,
        created_by_user_id: profile.user_id,
        created_by_name: profile.name,
      });

      // Generate financial transaction for the upsell
      const dueDate = new Date(upsellForm.start_date || Date.now());
      if (dueDate < new Date()) dueDate.setMonth(dueDate.getMonth() + 1);

      await supabase.from("financial_transactions").insert({
        servidor_id: profile.company_id,
        registration_id: selectedReg.id,
        lead_id: selectedReg.lead_id,
        amount,
        type: "cobranca",
        description: `Upsell - ${upsellForm.name}`,
        status: "pendente",
        due_date: dueDate.toISOString().split("T")[0],
        created_by_user_id: profile.user_id,
        created_by_name: profile.name,
      } as any);

      // Update MRR on registration if recurring
      if (upsellForm.type === "mensal") {
        const newTotal = Number(selectedReg.valor_mensal || 0) + amount;
        await supabase.from("crm_client_registrations").update({ valor_mensal: newTotal } as any).eq("id", selectedReg.id);
        setSelectedReg((prev: any) => ({ ...prev, valor_mensal: newTotal }));
        setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? { ...r, valor_mensal: newTotal } : r));
      }

      toast.success(`Upsell "${upsellForm.name}" criado com sucesso!`);
      setUpsellDialogOpen(false);
      setUpsellForm({ name: "", description: "", amount: "", type: "mensal", start_date: new Date().toISOString().split("T")[0] });

      // Refresh detail data
      await openDetail(selectedReg);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar upsell");
    } finally {
      setUpsellSaving(false);
    }
  };

  // ──────── Mark transaction as paid ────────
  const handleMarkAsPaid = async (transactionId: string) => {
    const { error } = await supabase.from("financial_transactions").update({
      status: "pago",
      paid_at: new Date().toISOString(),
    } as any).eq("id", transactionId);
    if (error) {
      toast.error("Erro ao marcar como pago");
      return;
    }
    toast.success("Pagamento registrado!");

    // Update client status to active
    if (selectedReg?.id) {
      await supabase.from("crm_client_registrations").update({ client_status: "ativo" } as any).eq("id", selectedReg.id);
      setSelectedReg((prev: any) => ({ ...prev, client_status: "ativo" }));
      setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? { ...r, client_status: "ativo" } : r));
    }

    // Refresh transactions
    if (selectedReg) await openDetail(selectedReg);
  };

  // ──────── Cancel upsell ────────
  const handleCancelUpsell = async (upsellId: string, upsellAmount: number, upsellType: string) => {
    await supabase.from("client_upsells" as any).update({ status: "cancelado" }).eq("id", upsellId);

    // Reduce MRR if recurring
    if (upsellType === "mensal" && selectedReg?.id) {
      const newTotal = Math.max(0, Number(selectedReg.valor_mensal || 0) - upsellAmount);
      await supabase.from("crm_client_registrations").update({ valor_mensal: newTotal } as any).eq("id", selectedReg.id);
      setSelectedReg((prev: any) => ({ ...prev, valor_mensal: newTotal }));
      setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? { ...r, valor_mensal: newTotal } : r));
    }

    toast.success("Upsell cancelado");
    if (selectedReg) await openDetail(selectedReg);
  };

  const health = selectedReg ? getClientHealth(selectedReg, detailTransactions, detailContracts) : null;

  const healthColors = {
    green: "text-green-600 bg-green-50 border-green-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  // ──────── InfoRow helper ────────
  const InfoRow = ({ label, value, field, icon: Icon }: { label: string; value: string; field?: string; icon?: any }) => (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      {editing && field ? (
        <Input
          className="flex-1 h-8 text-sm"
          value={editData[field] || ""}
          onChange={(e) => setEditData((prev: any) => ({ ...prev, [field]: e.target.value }))}
        />
      ) : (
        <span className="text-sm font-medium text-foreground flex-1">{value || "—"}</span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ──────── Full-page detail view ────────
  if (selectedReg) {
    return (
      <div className="space-y-6">
        {/* Back button + Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedReg(null)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        {/* Client header */}
        <div className="bg-card border rounded-xl px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedReg.nome_completo || "Cliente"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">{selectedReg.cpf || "CPF não informado"}</span>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{selectedReg.crm_leads?.company_name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${healthColors[health.level]}`}>
                  <Heart className="h-4 w-4" />
                  <span className="text-xs font-bold">{health.score}%</span>
                  <span className="text-xs">{health.label}</span>
                </div>
              )}
              {(() => {
                const cs = (selectedReg.client_status || "pendente") as string;
                const cfg = clientStatusConfig[cs] || clientStatusConfig.pendente;
                return (
                  <Badge variant="outline" className={`${cfg.color} text-xs`}>
                    <cfg.icon className="h-3.5 w-3.5 mr-1" />
                    {cfg.label}
                  </Badge>
                );
              })()}
              {editing ? (
                <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              )}
            </div>
          </div>

          {/* Quick info strip */}
          <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
            {selectedReg.plano_contratado && (
              <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {selectedReg.plano_contratado}</span>
            )}
            {selectedReg.valor_mensal > 0 && (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <DollarSign className="h-4 w-4" /> {fmtCur(Number(selectedReg.valor_mensal))}/mês
              </span>
            )}
            {selectedReg.data_adesao && (
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Desde {fmtDate(selectedReg.data_adesao)}</span>
            )}
          </div>
        </div>

        {/* Tabs content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="dados" className="text-xs gap-1.5"><User className="h-3.5 w-3.5" /> Dados</TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Documentos</TabsTrigger>
            <TabsTrigger value="contrato" className="text-xs gap-1.5"><FileSignature className="h-3.5 w-3.5" /> Contrato</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
            <TabsTrigger value="upsell" className="text-xs gap-1.5"><Rocket className="h-3.5 w-3.5" /> Upsell</TabsTrigger>
            <TabsTrigger value="dependentes" className="text-xs gap-1.5"><UsersRound className="h-3.5 w-3.5" /> Dependentes</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
          </TabsList>

          {/* ─── TAB: Dados Gerais ─── */}
          <TabsContent value="dados" className="space-y-4 mt-0">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Dados do Titular
                </h3>
                <InfoRow label="Nome completo" value={selectedReg.nome_completo} field="nome_completo" icon={User} />
                <InfoRow label="CPF" value={selectedReg.cpf} field="cpf" />
                <InfoRow label="RG" value={selectedReg.rg} field="rg" />
                <InfoRow label="Nascimento" value={selectedReg.data_nascimento ? fmtDate(selectedReg.data_nascimento) : ""} field="data_nascimento" icon={Calendar} />
                <InfoRow label="E-mail" value={selectedReg.email} field="email" icon={Mail} />
                <InfoRow label="Nome do pai" value={selectedReg.nome_pai} field="nome_pai" />
                <InfoRow label="Nome da mãe" value={selectedReg.nome_mae} field="nome_mae" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Endereço
                </h3>
                <InfoRow label="CEP" value={selectedReg.cep} field="cep" />
                <InfoRow label="Endereço" value={selectedReg.endereco} field="endereco" icon={MapPin} />
                <InfoRow label="Número" value={selectedReg.numero} field="numero" />
                <InfoRow label="Bairro" value={selectedReg.bairro} field="bairro" />
                <InfoRow label="Cidade" value={selectedReg.cidade} field="cidade" icon={Building2} />
                <InfoRow label="Estado" value={selectedReg.estado} field="estado" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: Documentos (arquivos gerais + contratos assinados + lead docs) ─── */}
          <TabsContent value="documentos" className="space-y-3 mt-0">
            {/* CRM Signed Contracts */}
            {detailCrmContracts.length > 0 && (
              <>
                <h4 className="text-xs font-semibold flex items-center gap-1.5 text-green-700 dark:text-green-400 uppercase tracking-wider">
                  <FileSignature className="h-3.5 w-3.5" /> Contratos Assinados
                </h4>
                {detailCrmContracts.map((c: any) => {
                  const pdfUrl = c.pdf_assinado_url || c.pdf_url;
                  return (
                    <Card key={c.id} className="border-green-200/50 dark:border-green-800/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-green-500/10">
                            <FileSignature className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.code} — Contrato Assinado</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800">Assinado</Badge>
                              {c.signed_at && <span className="text-[10px] text-muted-foreground">{fmtDate(c.signed_at)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {pdfUrl && (
                            <>
                              <Button size="sm" variant="ghost" title="Visualizar" onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
                                try {
                                  const res = await fetch(pdfUrl);
                                  const blob = await res.blob();
                                  const link = document.createElement("a");
                                  link.href = URL.createObjectURL(blob);
                                  link.download = `${c.code}_assinado.pdf`;
                                  link.click();
                                  URL.revokeObjectURL(link.href);
                                } catch { window.open(pdfUrl, "_blank"); }
                              }}>
                                <Download className="h-4 w-4" /> Baixar
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}

            {/* Lead Documents from CRM */}
            {detailLeadDocs.length > 0 && (
              <>
                <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground uppercase tracking-wider mt-2">
                  <Paperclip className="h-3.5 w-3.5" /> Documentos do Lead
                </h4>
                {detailLeadDocs.map((doc: any) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.doc_type?.toUpperCase() || "Documento"} · {fmtDate(doc.created_at)}
                            {doc.uploaded_by_name && ` · ${doc.uploaded_by_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" asChild title="Visualizar">
                          <a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="gap-1.5">
                          <a href={doc.file_url} target="_blank" rel="noreferrer" download={doc.file_name}><Download className="h-4 w-4" /> Baixar</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {selectedReg.comprovante_url && (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Paperclip className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Comprovante de endereço</p>
                      <p className="text-xs text-muted-foreground">Upload manual</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" asChild title="Visualizar">
                      <a href={selectedReg.comprovante_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="gap-1.5">
                      <a href={selectedReg.comprovante_url} target="_blank" rel="noreferrer" download><Download className="h-4 w-4" /> Baixar</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {detailDocuments.length > 0 && detailDocuments.map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.file_type || "Arquivo"} · {fmtDate(doc.created_at)}
                        {doc.created_by_name && ` · ${doc.created_by_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {doc.file_url && (
                      <>
                        <Button size="sm" variant="ghost" asChild title="Visualizar">
                          <a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="gap-1.5">
                          <a href={doc.file_url} target="_blank" rel="noreferrer" download><Download className="h-4 w-4" /> Baixar</a>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {!selectedReg.comprovante_url && detailDocuments.length === 0 && detailCrmContracts.length === 0 && detailLeadDocs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum documento anexado</p>
                <p className="text-xs mt-1">Documentos do CRM e uploads manuais aparecerão aqui</p>
              </div>
            )}
          </TabsContent>

          {/* ─── TAB: Contrato (apenas contrato oficial) ─── */}
          <TabsContent value="contrato" className="space-y-3 mt-0">
            {(() => {
              const signedContracts = detailContracts.filter(c => c.contract_status === "assinado");
              const pendingContracts = detailContracts.filter(c => c.contract_status === "pendente");
              const hasCrmContracts = detailCrmContracts.length > 0;

              if (signedContracts.length === 0 && pendingContracts.length === 0 && !hasCrmContracts) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum contrato oficial vinculado</p>
                    <p className="text-xs mt-1">O contrato aparecerá aqui após assinatura</p>
                  </div>
                );
              }

              return (
                <>
                  {/* CRM Signed Contracts (from contracts table) */}
                  {detailCrmContracts.map((c: any) => {
                    const isGen = generatingPdf === c.id;
                    const signers = (c.signers || []).map((s: any) => ({
                      name: s.signer_name || "—",
                      role: s.signer_role || "signatário",
                      email: null,
                      document: s.signer_document,
                      signed_at: s.signed_at,
                      ip: s.signer_ip,
                      signature_photo_url: s.signature_photo_url,
                    }));
                    if (signers.length === 0 && c.signer_name) {
                      signers.push({ name: c.signer_name, role: "signatário", email: null, document: c.signer_document, signed_at: c.signed_at, ip: null, signature_photo_url: c.signature_photo_url });
                    }

                    const buildPdf = async () => {
                      let pdfUrl = c.pdf_url || "";
                      let tempUrl: string | null = null;
                      if (!pdfUrl && c.contract_content) {
                        const basePdfBlob = generateContractPdf({ content: c.contract_content, code: c.code, companyName: selectedReg?.crm_leads?.company_name || "" });
                        tempUrl = URL.createObjectURL(basePdfBlob);
                        pdfUrl = tempUrl;
                      }
                      if (!pdfUrl) throw new Error("PDF do contrato não disponível");
                      try {
                        return await generateSignedContractPdf({
                          pdfUrl,
                          code: c.code,
                          companyName: selectedReg?.crm_leads?.company_name || selectedReg?.nome_completo || "",
                          documentHash: c.document_hash || "",
                          validationCode: c.validation_code || "",
                          signedAt: c.signed_at || new Date().toISOString(),
                          signers,
                          validationUrl: `${window.location.origin}/validar-documento/${c.validation_code || ""}`,
                        });
                      } finally {
                        if (tempUrl) URL.revokeObjectURL(tempUrl);
                      }
                    };

                    const handleView = async () => {
                      setGeneratingPdf(c.id);
                      try {
                        const blob = await buildPdf();
                        window.open(URL.createObjectURL(blob), "_blank");
                      } catch (err: any) { toast.error(err.message || "Erro ao gerar PDF"); }
                      setGeneratingPdf(null);
                    };

                    const handleDownload = async () => {
                      setGeneratingPdf(c.id);
                      try {
                        const blob = await buildPdf();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `${c.code}_assinado.pdf`;
                        link.click();
                        URL.revokeObjectURL(url);
                      } catch (err: any) { toast.error(err.message || "Erro ao baixar contrato"); }
                      setGeneratingPdf(null);
                    };

                    const roleLabels: Record<string, string> = { cliente: "Cliente", vendedor: "Vendedor", testemunha: "Testemunha", diretor: "Diretor/CEO" };

                    return (
                      <Card key={`crm-${c.id}`} className="border-green-200/50">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-green-500/10">
                                <FileSignature className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{c.code} — Contrato CRM Assinado</p>
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800 mt-1">Assinado</Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" title="Visualizar" onClick={handleView} disabled={isGen}>
                                {isGen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload} disabled={isGen}>
                                <Download className="h-4 w-4" /> Baixar
                              </Button>
                            </div>
                          </div>

                          {/* Signers */}
                          {signers.length > 0 && (
                            <div className="border-t pt-3 space-y-1.5">
                              {signers.map((s: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="font-medium">{s.name}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                    {roleLabels[s.role] || s.role}
                                  </Badge>
                                  {s.document && <span className="text-muted-foreground">{s.document}</span>}
                                  {s.signed_at && (
                                    <span className="text-muted-foreground ml-auto">
                                      {new Date(s.signed_at).toLocaleDateString("pt-BR")} {new Date(s.signed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <Separator />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {c.signed_at && (
                              <div><span className="text-muted-foreground">Data de Assinatura</span><p className="font-semibold text-foreground">{fmtDate(c.signed_at)}</p></div>
                            )}
                            {c.validation_code && (
                              <div><span className="text-muted-foreground">Código de Validação</span><p className="font-semibold text-foreground">{c.validation_code}</p></div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}



                  {/* Client Contracts (from client_contracts table) */}
                  {signedContracts.map(c => {
                    const contractName = `Contrato_${(selectedReg.nome_completo || "Cliente").replace(/\s+/g, "_")}_${fmtDate(c.signed_at || c.created_at).replace(/\//g, "-")}.pdf`;
                    return (
                      <Card key={c.id} className="border-green-200/50">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-green-500/10">
                                <FileSignature className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{contractName}</p>
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 mt-1">Assinado</Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {c.signature_photo_url && (
                                <Button size="sm" variant="ghost" asChild title="Ver assinatura">
                                  <a href={c.signature_photo_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                                </Button>
                              )}
                            </div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {c.signed_at && (
                              <div><span className="text-muted-foreground">Data de Assinatura</span><p className="font-semibold text-foreground">{fmtDate(c.signed_at)}</p></div>
                            )}
                            {c.signer_name && (
                              <div><span className="text-muted-foreground">Assinante</span><p className="font-semibold text-foreground">{c.signer_name}</p></div>
                            )}
                            {c.plan_name && (
                              <div><span className="text-muted-foreground">Plano</span><p className="font-semibold text-foreground">{c.plan_name}</p></div>
                            )}
                            {c.monthly_value > 0 && (
                              <div><span className="text-muted-foreground">Valor Mensal</span><p className="font-semibold text-foreground">{fmtCur(Number(c.monthly_value))}</p></div>
                            )}
                            {c.signature_address && (
                              <div className="col-span-2"><span className="text-muted-foreground">Local da Assinatura</span><p className="font-semibold text-foreground">{c.signature_address}</p></div>
                            )}
                            {c.signer_document && (
                              <div><span className="text-muted-foreground">Documento</span><p className="font-semibold text-foreground">{c.signer_document}</p></div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {pendingContracts.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendentes de Assinatura</p>
                      {pendingContracts.map(c => (
                        <Card key={c.id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-yellow-500/10">
                                <FileSignature className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{c.plan_name || "Contrato"}</p>
                                <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200 mt-1">Pendente</Badge>
                              </div>
                            </div>
                            {c.signing_token && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                                <a href={`/assinar/${c.signing_token}`} target="_blank" rel="noreferrer">
                                  <FileSignature className="h-4 w-4" /> Assinar
                                </a>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </TabsContent>

          {/* ─── TAB: Financeiro ─── */}
          <TabsContent value="financeiro" className="space-y-3 mt-0">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Pago", value: fmtCur(detailTransactions.filter(t => t.status === "pago").reduce((s, t) => s + Number(t.amount), 0)), color: "text-green-600" },
                { label: "Pendente", value: fmtCur(detailTransactions.filter(t => t.status === "pendente").reduce((s, t) => s + Number(t.amount), 0)), color: "text-yellow-600" },
                { label: "Atrasado", value: fmtCur(detailTransactions.filter(t => t.status === "atrasado" || t.status === "vencido").reduce((s, t) => s + Number(t.amount), 0)), color: "text-red-600" },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-4 text-center">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {detailTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Descrição</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Vencimento</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Pago em</TableHead>
                        <TableHead className="text-xs text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTransactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">{t.description || "Cobrança"}</TableCell>
                          <TableCell className="text-sm font-semibold">{fmtCur(Number(t.amount))}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.due_date ? fmtDate(t.due_date) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${
                              t.status === "pago" ? "bg-green-50 text-green-700 border-green-200" :
                              t.status === "pendente" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {t.status === "pago" ? "Pago" : t.status === "pendente" ? "Pendente" : "Atrasado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.paid_at ? fmtDate(t.paid_at) : "—"}</TableCell>
                          <TableCell className="text-center">
                            {t.status !== "pago" && (
                              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleMarkAsPaid(t.id)}>
                                <CheckCircle2 className="h-3 w-3" /> Pago
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── TAB: Upsell ─── */}
          <TabsContent value="upsell" className="space-y-3 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Produtos & Upsells</h3>
                <p className="text-xs text-muted-foreground">Gerencie serviços adicionais do cliente</p>
              </div>
              {canManageUpsell && (
                <Button size="sm" className="gap-1.5" onClick={() => setUpsellDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Novo Upsell
                </Button>
              )}
            </div>

            {selectedReg.plano_contratado && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedReg.plano_contratado}</p>
                        <p className="text-[10px] text-muted-foreground">Plano principal · Recorrente</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmtCur(Number(selectedReg.valor_mensal || 0))}/mês</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {detailUpsells.length === 0 && !selectedReg.plano_contratado ? (
              <div className="text-center py-12 text-muted-foreground">
                <Rocket className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum produto ou upsell</p>
              </div>
            ) : (
              detailUpsells.map(up => (
                <Card key={up.id} className={up.status === "cancelado" ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${up.status === "ativo" ? "bg-emerald-50" : "bg-muted"}`}>
                          <Rocket className={`h-4 w-4 ${up.status === "ativo" ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{up.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${
                              up.status === "ativo" ? "bg-green-50 text-green-700 border-green-200" :
                              up.status === "pausado" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>{up.status === "ativo" ? "Ativo" : up.status === "pausado" ? "Pausado" : "Cancelado"}</Badge>
                            <span className="text-[10px] text-muted-foreground">{up.type === "mensal" ? "Recorrente" : "Único"}</span>
                            {up.start_date && <span className="text-[10px] text-muted-foreground">· Início: {fmtDate(up.start_date)}</span>}
                          </div>
                          {up.description && <p className="text-xs text-muted-foreground mt-1">{up.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{fmtCur(Number(up.amount))}{up.type === "mensal" ? "/mês" : ""}</p>
                        {up.status === "ativo" && canManageUpsell && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCancelUpsell(up.id, Number(up.amount), up.type)}>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {(detailUpsells.filter(u => u.status === "ativo" && u.type === "mensal").length > 0 || selectedReg.plano_contratado) && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Receita Mensal Total</span>
                  <span className="text-lg font-bold text-foreground">{fmtCur(Number(selectedReg.valor_mensal || 0))}</span>
                </CardContent>
              </Card>
            )}
          </TabsContent>



          {/* ─── TAB: Dependentes ─── */}
          <TabsContent value="dependentes" className="space-y-3 mt-0">
            {(selectedReg.crm_client_dependents?.length || 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UsersRound className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum dependente cadastrado</p>
              </div>
            ) : (
              selectedReg.crm_client_dependents.map((dep: any, i: number) => (
                <Card key={dep.id || i}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{dep.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{dep.grau_parentesco || "Dependente"}</p>
                      </div>
                    </div>
                    {dep.data_nascimento && (
                      <p className="text-xs text-muted-foreground ml-11">
                        Nascimento: {fmtDate(dep.data_nascimento)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ─── TAB: Histórico (Timeline) ─── */}
          <TabsContent value="historico" className="mt-0">
            {detailHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum registro no histórico</p>
              </div>
            ) : (
              <div className="space-y-0 relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                {detailHistory.map((h, i) => (
                  <div key={h.id || i} className="flex gap-4 py-3 relative">
                    <div className="h-3 w-3 rounded-full bg-primary border-2 border-card mt-1.5 z-10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{h.action}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {fmtDate(h.created_at)}
                        </span>
                      </div>
                      {h.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>
                      )}
                      {h.created_by_name && (
                        <p className="text-[10px] text-muted-foreground mt-1">por {h.created_by_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ──────── Manual Registration Logic ────────

  const applyMask = (value: string, type: "cpf" | "phone") => {
    const digits = value.replace(/\D/g, "");
    if (type === "cpf") {
      if (digits.length <= 11) return digits.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, d) => [a, b, c].filter(Boolean).join(".") + (d ? `-${d}` : ""));
      return digits.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})?/, "$1.$2.$3/$4" + (digits.length > 12 ? "-" : "")).replace(/\/$/, "");
    }
    if (type === "phone") {
      if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
      return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
    }
    return value;
  };

  const handleManualRegister = async () => {
    if (!manualForm.nome_completo || !profile?.company_id) {
      toast.error("Nome completo é obrigatório");
      return;
    }
    setManualSaving(true);
    try {
      // Create a lead first
      const { data: leadData, error: leadErr } = await supabase.from("crm_leads").insert({
        servidor_id: profile.company_id,
        company_name: manualForm.empresa || manualForm.nome_completo,
        contact_name: manualForm.nome_completo,
        email: manualForm.email || null,
        phone: manualForm.telefone || null,
        documento: manualForm.cpf || null,
        source: manualForm.origem || "manual",
        stage: "cadastro-pendente",
        lead_status: "won",
        value_mrr: parseFloat(manualForm.valor.replace(",", ".")) || 0,
        created_by_user_id: profile.user_id,
        created_by_name: profile.name,
      }).select("id").single();

      if (leadErr || !leadData) throw leadErr || new Error("Erro ao criar lead");

      // Create registration
      const { error: regErr } = await supabase.from("crm_client_registrations").insert({
        lead_id: leadData.id,
        servidor_id: profile.company_id,
        nome_completo: manualForm.nome_completo,
        cpf: manualForm.cpf || null,
        email: manualForm.email || null,
        plano_contratado: manualForm.plano || null,
        valor_mensal: parseFloat(manualForm.valor.replace(",", ".")) || 0,
        client_status: manualForm.client_status,
        data_adesao: manualForm.data_adesao || null,
        created_by_user_id: profile.user_id,
        created_by_name: profile.name,
      });

      if (regErr) throw regErr;

      toast.success("Cliente cadastrado com sucesso!");
      setManualRegOpen(false);
      setManualForm({ nome_completo: "", cpf: "", email: "", telefone: "", empresa: "", plano: "", valor: "", client_status: "pendente", data_adesao: new Date().toISOString().split("T")[0], observacoes: "", origem: "manual" });
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar cliente");
    } finally {
      setManualSaving(false);
    }
  };

  // ──────── Change client status ────────
  const handleChangeStatus = async (regId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("crm_client_registrations").update({ client_status: newStatus } as any).eq("id", regId);
    if (error) { toast.error("Erro ao alterar status"); return; }
    setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, client_status: newStatus } : r));
    toast.success(`Status alterado para ${clientStatusConfig[newStatus]?.label || newStatus}`);
  };

  // ──────── Delete registration ────────
  // ──────── Delete registration ────────
  const handleDeleteRegistration = async (regId: string) => {
    const { error } = await supabase.from("crm_client_registrations").delete().eq("id", regId);
    if (error) { toast.error("Erro ao excluir"); return; }
    setRegistrations(prev => prev.filter(r => r.id !== regId));
    setDeleteConfirmId(null);
    toast.success("Cadastro excluído");
  };

  // ──────── List view ────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de gestão completa da sua base de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="h-4 w-4" /> Importar Lista
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setManualRegOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Cadastro
          </Button>
        </div>
      </div>

      {/* ────── KPI Cards ────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Clientes", value: stats.total, icon: Users, color: "text-primary bg-primary/10" },
          { label: "Ativos", value: stats.ativos, icon: UserCheck, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Receita Mensal", value: fmtCur(stats.mrr), icon: DollarSign, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Inadimplentes", value: stats.inadimplentes, icon: AlertTriangle, color: "text-red-600 bg-red-500/10" },
          { label: "Cadastros OK", value: stats.contratos, icon: FileText, color: "text-blue-600 bg-blue-500/10" },
          { label: "Ticket Médio", value: fmtCur(stats.ticketMedio), icon: TrendingUp, color: "text-violet-600 bg-violet-500/10" },
        ].map((kpi, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground leading-tight">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ────── Charts ────── */}
      <CadastradosCharts registrations={registrations} />

      {/* ────── Filters ────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, email, empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
          <SelectTrigger className="w-44 h-10 text-xs">
            <SelectValue placeholder="Status cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(clientStatusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-10 text-xs">
            <SelectValue placeholder="Cadastro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Cadastros</SelectItem>
            {Object.entries(registrationStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ────── Client Table ────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Nome</TableHead>
                  <TableHead className="text-xs font-semibold">CPF/CNPJ</TableHead>
                  <TableHead className="text-xs font-semibold">Empresa</TableHead>
                  <TableHead className="text-xs font-semibold">Plano</TableHead>
                  <TableHead className="text-xs font-semibold">Valor</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Entrada</TableHead>
                  <TableHead className="text-xs font-semibold">Deps.</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum cadastro encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => {
                    const cs = (r.client_status || "pendente") as string;
                    const cfg = clientStatusConfig[cs] || clientStatusConfig.pendente;
                    return (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openDetail(r)}>
                        <TableCell className="text-sm font-medium">{r.nome_completo || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.cpf || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.crm_leads?.company_name || "—"}</TableCell>
                        <TableCell className="text-xs">{r.plano_contratado || "—"}</TableCell>
                        <TableCell className="text-xs font-semibold">{r.valor_mensal ? fmtCur(Number(r.valor_mensal)) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                            <cfg.icon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.data_adesao ? fmtDate(r.data_adesao) : r.created_at ? fmtDate(r.created_at) : "—"}</TableCell>
                        <TableCell className="text-xs text-center">{r.crm_client_dependents?.length || 0}</TableCell>
                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openDetail(r)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { openDetail(r); setTimeout(() => setEditing(true), 100); }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <Separator className="my-1" />
                              {cs !== "ativo" && (
                                <DropdownMenuItem onClick={(e) => handleChangeStatus(r.id, "ativo", e)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" /> Marcar como Ativo
                                </DropdownMenuItem>
                              )}
                              {cs !== "inadimplente" && (
                                <DropdownMenuItem onClick={(e) => handleChangeStatus(r.id, "inadimplente", e)}>
                                  <AlertTriangle className="h-3.5 w-3.5 mr-2 text-red-600" /> Marcar Inadimplente
                                </DropdownMenuItem>
                              )}
                              {cs !== "cancelado" && (
                                <DropdownMenuItem onClick={(e) => handleChangeStatus(r.id, "cancelado", e)}>
                                  <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar
                                </DropdownMenuItem>
                              )}
                              <Separator className="my-1" />
                              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirmId(r.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ────── Delete Confirmation Dialog ────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este cadastro? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteConfirmId && handleDeleteRegistration(deleteConfirmId)}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ────── Manual Registration Dialog ────── */}
      <Dialog open={manualRegOpen} onOpenChange={setManualRegOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Cadastrar Cliente Manualmente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Dados Pessoais */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Pessoais</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome completo *</Label>
                  <Input value={manualForm.nome_completo} onChange={e => setManualForm(f => ({ ...f, nome_completo: e.target.value }))} placeholder="Nome completo do cliente" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">CPF/CNPJ</Label>
                    <Input value={manualForm.cpf} onChange={e => setManualForm(f => ({ ...f, cpf: applyMask(e.target.value, "cpf") }))} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={manualForm.telefone} onChange={e => setManualForm(f => ({ ...f, telefone: applyMask(e.target.value, "phone") }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <Input type="email" value={manualForm.email} onChange={e => setManualForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados Comerciais */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Comerciais</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Empresa vinculada</Label>
                  <Input value={manualForm.empresa} onChange={e => setManualForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Plano</Label>
                    <Input value={manualForm.plano} onChange={e => setManualForm(f => ({ ...f, plano: e.target.value }))} placeholder="Ex: Plano Premium" />
                  </div>
                  <div>
                    <Label className="text-xs">Valor mensal (R$)</Label>
                    <Input value={manualForm.valor} onChange={e => setManualForm(f => ({ ...f, valor: e.target.value }))} placeholder="99,90" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={manualForm.client_status} onValueChange={v => setManualForm(f => ({ ...f, client_status: v }))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(clientStatusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Data de entrada</Label>
                    <Input type="date" value={manualForm.data_adesao} onChange={e => setManualForm(f => ({ ...f, data_adesao: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Origem</Label>
                  <Select value={manualForm.origem} onValueChange={v => setManualForm(f => ({ ...f, origem: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="accord">Accord Sales</SelectItem>
                      <SelectItem value="formulario">Formulário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={manualForm.observacoes}
                onChange={e => setManualForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Observações sobre o cliente..."
                className="h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setManualRegOpen(false)}>Cancelar</Button>
              <Button onClick={handleManualRegister} disabled={manualSaving} className="gap-1.5">
                {manualSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ────── Upsell Creation Dialog ────── */}
      <Dialog open={upsellDialogOpen} onOpenChange={setUpsellDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> Novo Upsell
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome do Produto/Serviço *</Label>
              <Input
                placeholder="Ex: Assistência Premium"
                value={upsellForm.name}
                onChange={e => setUpsellForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Detalhes do upsell..."
                value={upsellForm.description}
                onChange={e => setUpsellForm(f => ({ ...f, description: e.target.value }))}
                className="h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor (R$) *</Label>
                <Input
                  placeholder="99,90"
                  value={upsellForm.amount}
                  onChange={e => setUpsellForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={upsellForm.type} onValueChange={v => setUpsellForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal (Recorrente)</SelectItem>
                    <SelectItem value="unico">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Data de Início</Label>
              <Input
                type="date"
                value={upsellForm.start_date}
                onChange={e => setUpsellForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUpsellDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUpsell} disabled={upsellSaving} className="gap-1.5">
                {upsellSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Upsell
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
