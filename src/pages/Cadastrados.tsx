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
  Plus, Rocket, PauseCircle, Trash2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
  const [detailTransactions, setDetailTransactions] = useState<any[]>([]);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");

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

    // Fetch contracts, transactions, history in parallel
    const [contractsRes, transactionsRes, historyRes] = await Promise.all([
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
      reg.id ? supabase
        .from("client_contract_history")
        .select("*")
        .in("contract_id", (await supabase.from("client_contracts").select("id").eq("registration_id", reg.id)).data?.map((c: any) => c.id) || [])
        .order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    setDetailContracts(contractsRes.data || []);
    setDetailTransactions(transactionsRes.data || []);
    setDetailHistory(historyRes.data || []);
  };

  const handleSaveEdit = async () => {
    if (!selectedReg?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("crm_client_registrations")
        .update(editData as any)
        .eq("id", selectedReg.id);
      if (error) throw error;
      const updated = { ...selectedReg, ...editData };
      setSelectedReg(updated);
      setRegistrations(prev => prev.map(r => r.id === selectedReg.id ? { ...r, ...editData } : r));
      setEditing(false);
      toast.success("Cadastro atualizado com sucesso!");
    } catch {
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  // ──────── Health for detail view ────────
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes & Cadastros</h1>
        <p className="text-sm text-muted-foreground mt-1">Centro de gestão completa da sua base de clientes</p>
      </div>

      {/* ────── KPI Cards ────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Clientes", value: stats.total, icon: Users, color: "text-primary bg-primary/10" },
          { label: "Ativos", value: stats.ativos, icon: UserCheck, color: "text-green-600 bg-green-50" },
          { label: "Receita Mensal", value: fmtCur(stats.mrr), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
          { label: "Inadimplentes", value: stats.inadimplentes, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
          { label: "Cadastros OK", value: stats.contratos, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Ticket Médio", value: fmtCur(stats.ticketMedio), icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
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
                  <TableHead className="text-xs font-semibold">CPF</TableHead>
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
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => {
                    const cs = (r.client_status || "pendente") as string;
                    const csConfig = clientStatusConfig[cs] || clientStatusConfig.pendente;
                    const depCount = r.crm_client_dependents?.length || 0;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => openDetail(r)}
                      >
                        <TableCell className="font-medium text-sm">{r.nome_completo || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cpf || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.crm_leads?.company_name || "—"}</TableCell>
                        <TableCell className="text-sm">{r.plano_contratado || "—"}</TableCell>
                        <TableCell className="text-sm font-semibold">
                          {r.valor_mensal ? fmtCur(Number(r.valor_mensal)) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${csConfig.color}`}>
                            <csConfig.icon className="h-3 w-3 mr-1" />
                            {csConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.data_adesao ? fmtDate(r.data_adesao) : r.created_at ? fmtDate(r.created_at) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{depCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
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

      {/* ────── Detail Dialog (ERP Style) ────── */}
      <Dialog open={!!selectedReg} onOpenChange={(open) => { if (!open) setSelectedReg(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedReg && (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 bg-card border-b px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{selectedReg.nome_completo || "Cliente"}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{selectedReg.cpf || "CPF não informado"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{selectedReg.crm_leads?.company_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Health Score */}
                    {health && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${healthColors[health.level]}`}>
                        <Heart className="h-4 w-4" />
                        <span className="text-xs font-bold">{health.score}%</span>
                        <span className="text-xs">{health.label}</span>
                      </div>
                    )}
                    {/* Client Status */}
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
                <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
                  {selectedReg.plano_contratado && (
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {selectedReg.plano_contratado}</span>
                  )}
                  {selectedReg.valor_mensal > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <DollarSign className="h-3.5 w-3.5" /> {fmtCur(Number(selectedReg.valor_mensal))}/mês
                    </span>
                  )}
                  {selectedReg.data_adesao && (
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Desde {fmtDate(selectedReg.data_adesao)}</span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="dados" className="text-xs gap-1.5"><User className="h-3.5 w-3.5" /> Dados</TabsTrigger>
                    <TabsTrigger value="contratos" className="text-xs gap-1.5"><FileSignature className="h-3.5 w-3.5" /> Contratos</TabsTrigger>
                    <TabsTrigger value="financeiro" className="text-xs gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
                    <TabsTrigger value="documentos" className="text-xs gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Docs</TabsTrigger>
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

                  {/* ─── TAB: Contratos ─── */}
                  <TabsContent value="contratos" className="space-y-3 mt-0">
                    {detailContracts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhum contrato vinculado</p>
                      </div>
                    ) : (
                      detailContracts.map(c => {
                        const statusMap: Record<string, { label: string; color: string }> = {
                          pendente: { label: "Pendente", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                          assinado: { label: "Assinado", color: "bg-green-50 text-green-700 border-green-200" },
                          cancelado: { label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
                        };
                        const st = statusMap[c.contract_status] || statusMap.pendente;
                        return (
                          <Card key={c.id}>
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Criado em {fmtDate(c.created_at)}
                                    {c.signed_at && ` · Assinado em ${fmtDate(c.signed_at)}`}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  {c.signature_photo_url && (
                                    <Button size="sm" variant="ghost" asChild title="Ver assinatura">
                                      <a href={c.signature_photo_url} target="_blank" rel="noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  {c.signing_token && c.contract_status === "pendente" && (
                                    <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                                      <a href={`/assinar/${c.signing_token}`} target="_blank" rel="noreferrer">
                                        <FileSignature className="h-4 w-4" /> Assinar
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                {c.plan_name && (
                                  <div><span className="text-muted-foreground">Plano</span><p className="font-semibold text-foreground">{c.plan_name}</p></div>
                                )}
                                {c.monthly_value > 0 && (
                                  <div><span className="text-muted-foreground">Valor</span><p className="font-semibold text-foreground">{fmtCur(Number(c.monthly_value))}</p></div>
                                )}
                                {c.signer_name && (
                                  <div><span className="text-muted-foreground">Assinante</span><p className="font-semibold text-foreground">{c.signer_name}</p></div>
                                )}
                                {c.signature_address && (
                                  <div><span className="text-muted-foreground">Local</span><p className="font-semibold text-foreground truncate">{c.signature_address}</p></div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* ─── TAB: Financeiro ─── */}
                  <TabsContent value="financeiro" className="space-y-3 mt-0">
                    {/* Summary */}
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
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* ─── TAB: Documentos ─── */}
                  <TabsContent value="documentos" className="space-y-3 mt-0">
                    {selectedReg.comprovante_url ? (
                      <Card>
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10">
                              <Paperclip className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Comprovante de endereço</p>
                              <p className="text-xs text-muted-foreground">Documento disponível para download</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" asChild className="gap-1.5">
                            <a href={selectedReg.comprovante_url} target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4" /> Baixar
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhum documento anexado</p>
                      </div>
                    )}
                    {/* Signed contracts as docs */}
                    {detailContracts.filter(c => c.contract_status === "assinado").map(c => (
                      <Card key={c.id}>
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-green-50">
                              <FileSignature className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Contrato Assinado</p>
                              <p className="text-xs text-muted-foreground">
                                {c.plan_name} · Assinado em {c.signed_at ? fmtDate(c.signed_at) : "—"}
                              </p>
                            </div>
                          </div>
                          {c.signature_photo_url && (
                            <Button size="sm" variant="outline" asChild className="gap-1.5">
                              <a href={c.signature_photo_url} target="_blank" rel="noreferrer">
                                <Eye className="h-4 w-4" /> Ver
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
