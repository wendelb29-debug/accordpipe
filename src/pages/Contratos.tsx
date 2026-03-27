import { useState, useEffect, useMemo } from "react";
import {
  Plus, Search, FileSignature, Eye, Clock, CheckCircle2, XCircle, Loader2, Download, ShieldAlert, User, MapPin, Camera, Filter, Upload,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfContractsList } from "@/components/contratos/PdfContractsList";
import { downloadContractPdf, generateContractPdf } from "@/lib/generateContractPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: any; className: string; emoji: string }> = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-yellow-100 text-yellow-800 border-yellow-300", emoji: "🟡" },
  assinado: { label: "Assinado", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-300", emoji: "🟢" },
  cancelado: { label: "Cancelado", icon: XCircle, className: "bg-red-100 text-red-800 border-red-300", emoji: "🔴" },
};

function ContractPdfViewer({ content, code, companyName }: { content: string; code: string; companyName: string }) {
  const pdfUrl = useMemo(() => {
    const blob = generateContractPdf({ content, code, companyName });
    return URL.createObjectURL(blob);
  }, [content, code, companyName]);

  useEffect(() => {
    return () => URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  return <iframe src={pdfUrl} className="w-full h-[65vh] rounded-md border" title="Visualização do contrato" />;
}

interface ClientContract {
  id: string;
  registration_id: string;
  servidor_id: string;
  client_name: string;
  client_cpf: string | null;
  plan_name: string | null;
  monthly_value: number;
  contract_content: string | null;
  contract_status: string;
  signing_token: string | null;
  signed_at: string | null;
  signature_photo_url: string | null;
  signature_latitude: number | null;
  signature_longitude: number | null;
  signature_address: string | null;
  signer_name: string | null;
  signer_document: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
}

export default function Contratos() {
  const { isMaster, isCeo, isAdmin, profile, role } = useAuth();
  const isAdministrativo = role === "administrativo";
  const isFinanceiro = role === "financeiro";
  const isOperador = role === "operador";

  const canAccess = isMaster || isCeo || isAdmin || isAdministrativo || isFinanceiro || isOperador;

  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewContract, setViewContract] = useState<ClientContract | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchContracts = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    let query = supabase
      .from("client_contracts")
      .select("*")
      .eq("servidor_id", profile.company_id)
      .order("created_at", { ascending: false });

    // Operador only sees own contracts
    if (isOperador && !isMaster && !isAdmin && !isCeo && !isAdministrativo) {
      query = query.eq("created_by_user_id", profile.user_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar contratos");
    }
    setContracts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.company_id) fetchContracts();
  }, [profile]);

  const openContract = async (contract: ClientContract) => {
    setViewContract(contract);
    // Fetch history
    const { data } = await supabase
      .from("client_contract_history")
      .select("*")
      .eq("contract_id", contract.id)
      .order("created_at", { ascending: true });
    setHistory((data as any[]) || []);
  };

  // Unique vendedores for filter
  const vendedores = Array.from(new Map(
    contracts.filter(c => c.created_by_name).map(c => [c.created_by_user_id, c.created_by_name!])
  ).entries()).map(([id, name]) => ({ id: id!, name }));

  const filtered = contracts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (c.client_name || "").toLowerCase().includes(term) ||
      (c.client_cpf || "").includes(term);
    const matchesStatus = filterStatus === "all" || c.contract_status === filterStatus;
    const matchesVendedor = filterVendedor === "all" || c.created_by_user_id === filterVendedor;
    const matchesDateFrom = !filterDateFrom || c.created_at >= filterDateFrom;
    const matchesDateTo = !filterDateTo || c.created_at <= filterDateTo + "T23:59:59";
    return matchesSearch && matchesStatus && matchesVendedor && matchesDateFrom && matchesDateTo;
  });

  const counts = {
    total: contracts.length,
    pendente: contracts.filter(c => c.contract_status === "pendente").length,
    assinado: contracts.filter(c => c.contract_status === "assinado").length,
    cancelado: contracts.filter(c => c.contract_status === "cancelado").length,
  };

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <ShieldAlert className="h-16 w-16 mb-4 opacity-40" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-sm">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Contratos de adesão dos clientes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10"><FileSignature className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.pendente}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.assinado}</p><p className="text-xs text-muted-foreground">Assinados</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{counts.cancelado}</p><p className="text-xs text-muted-foreground">Cancelados</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nome ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">🟡 Pendente</SelectItem>
                <SelectItem value="assinado">🟢 Assinado</SelectItem>
                <SelectItem value="cancelado">🔴 Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVendedor} onValueChange={setFilterVendedor}>
              <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {vendedores.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} placeholder="Data início" />
            <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} placeholder="Data fim" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileSignature className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum contrato encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => {
                const config = statusConfig[contract.contract_status] || statusConfig.pendente;
                const StatusIcon = config.icon;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.client_name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{contract.client_cpf || "—"}</TableCell>
                    <TableCell>{contract.plan_name || "—"}</TableCell>
                    <TableCell>
                      {contract.monthly_value > 0 ? `R$ ${Number(contract.monthly_value).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">{contract.created_by_name || "—"}</TableCell>
                    <TableCell>
                      <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", config.className)}>
                        <span>{config.emoji}</span>
                        {config.label}
                      </div>
                      {contract.signed_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(contract.signed_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Visualizar contrato" onClick={() => openContract(contract)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {contract.contract_content && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Baixar PDF"
                            onClick={() => downloadContractPdf({
                              content: contract.contract_content!,
                              code: `CTRV-${contract.id.slice(0, 6).toUpperCase()}`,
                              companyName: contract.client_name,
                            })}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Contract Dialog */}
      <Dialog open={!!viewContract} onOpenChange={(open) => !open && setViewContract(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Contrato - {viewContract?.client_name}
              {viewContract?.contract_content && (
                <Button variant="outline" size="sm" className="ml-auto gap-1"
                  onClick={() => {
                    if (!viewContract?.contract_content) return;
                    downloadContractPdf({
                      content: viewContract.contract_content,
                      code: `CTRV-${viewContract.id.slice(0, 6).toUpperCase()}`,
                      companyName: viewContract.client_name,
                    });
                  }}
                >
                  <Download className="h-4 w-4" /> Baixar PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Status */}
          {viewContract && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const cfg = statusConfig[viewContract.contract_status] || statusConfig.pendente;
                  return (
                    <Badge className={cn("text-sm", cfg.className)} variant="outline">
                      {cfg.emoji} {cfg.label}
                    </Badge>
                  );
                })()}
                <div className="text-sm text-muted-foreground space-x-3">
                  {viewContract.plan_name && <span>Plano: <strong className="text-foreground">{viewContract.plan_name}</strong></span>}
                  {viewContract.monthly_value > 0 && <span>R$ {Number(viewContract.monthly_value).toFixed(2)}/mês</span>}
                </div>
              </div>

              {/* PDF Viewer */}
              {viewContract.contract_content ? (
                <ContractPdfViewer
                  content={viewContract.contract_content}
                  code={`CTRV-${viewContract.id.slice(0, 6).toUpperCase()}`}
                  companyName={viewContract.client_name}
                />
              ) : (
                <p className="text-muted-foreground p-4">Conteúdo do contrato não disponível</p>
              )}

              {/* Signature Data */}
              {viewContract.contract_status === "assinado" && viewContract.signed_at && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Dados da Assinatura
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <User className="h-4 w-4 text-primary" /> Signatário
                        </div>
                        <p className="text-sm text-muted-foreground">{viewContract.signer_name || "—"}</p>
                        <p className="text-sm font-mono text-muted-foreground">{viewContract.signer_document || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          Assinado em: {new Date(viewContract.signed_at).toLocaleString("pt-BR")}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <MapPin className="h-4 w-4 text-primary" /> Localização
                        </div>
                        <p className="text-sm text-muted-foreground">{viewContract.signature_address || "—"}</p>
                        {viewContract.signature_latitude && viewContract.signature_longitude && (
                          <p className="text-xs font-mono text-muted-foreground">
                            ({viewContract.signature_latitude.toFixed(6)}, {viewContract.signature_longitude.toFixed(6)})
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  {viewContract.signature_photo_url && (
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Camera className="h-4 w-4 text-primary" /> Foto de Assinatura
                        </div>
                        <img src={viewContract.signature_photo_url} alt="Foto" className="max-w-xs rounded-lg border" />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-foreground text-sm">Histórico do Contrato</h3>
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="text-foreground font-medium whitespace-pre-line">{h.description || h.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleString("pt-BR")}
                            {h.created_by_name && ` · ${h.created_by_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
