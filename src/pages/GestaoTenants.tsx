import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, Search, Users, Crown, CreditCard,
  AlertTriangle, Ban, RefreshCw, Eye, Check, TrendingUp, Clock, Key,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMasterTenantClients, MasterTenantClient } from "@/hooks/useMasterTenantClients";
import { TenantBillingTab } from "@/components/gestao-tenants/TenantBillingTab";

const statusLabels: Record<string, string> = {
  active: "Ativo", trial: "Trial", past_due: "Inadimplente", overdue: "Inadimplente",
  suspended: "Suspenso", cancelled: "Cancelado", expired: "Expirado", canceled: "Cancelado",
};

const statusColors: Record<string, string> = {
  active: "border-green-500/30 text-green-600 bg-green-500/10",
  trial: "border-blue-500/30 text-blue-600 bg-blue-500/10",
  past_due: "border-amber-500/30 text-amber-600 bg-amber-500/10",
  overdue: "border-amber-500/30 text-amber-600 bg-amber-500/10",
  suspended: "border-red-500/30 text-red-600 bg-red-500/10",
  cancelled: "border-muted text-muted-foreground bg-muted/50",
  canceled: "border-muted text-muted-foreground bg-muted/50",
  expired: "border-muted text-muted-foreground bg-muted/50",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente", paid: "Pago", overdue: "Vencido", refunded: "Reembolsado", failed: "Falhou", canceled: "Cancelado",
};

const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export default function GestaoTenants() {
  const { isMasterTenantAdmin, isGlobalMaster, activeCompanyId } = useAuth();
  const { clients, loading, filters, setFilters, updateClient, syncUserCount, fetchClients } = useMasterTenantClients();
  const [search, setSearch] = useState("");
  const [detailClient, setDetailClient] = useState<MasterTenantClient | null>(null);

  // Only global master can access this page
  if (!isGlobalMaster) return <Navigate to="/home" replace />;

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.nome_fantasia || "").toLowerCase().includes(term) ||
      (c.razao_social || "").toLowerCase().includes(term) ||
      (c.cnpj || "").includes(term)
    );
  });

  const today = new Date().toISOString().split("T")[0];

  const totalActive = clients.filter((c) => c.subscription_status === "active").length;
  const totalOverdue = clients.filter((c) => ["past_due", "overdue"].includes(c.subscription_status) || c.payment_status === "overdue").length;
  const totalSuspended = clients.filter((c) => c.subscription_status === "suspended").length;
  const totalMRR = clients
    .filter((c) => ["active", "trial"].includes(c.subscription_status) && c.billing_cycle === "monthly")
    .reduce((sum, c) => sum + c.contracted_value, 0);
  const totalARR = clients
    .filter((c) => ["active", "trial"].includes(c.subscription_status) && c.billing_cycle === "annual")
    .reduce((sum, c) => sum + c.contracted_value, 0);
  const dueToday = clients.filter((c) => c.next_due_date === today).length;
  const inGrace = clients.filter((c) => c.grace_until && today > (c.next_due_date || "") && today <= c.grace_until).length;
  const totalLicenses = clients.reduce((sum, c) => sum + c.contracted_users, 0);
  const totalActiveUsers = clients.reduce((sum, c) => sum + c.active_users_count, 0);

  const handleStatusChange = async (client: MasterTenantClient, newStatus: string) => {
    const updates: Partial<MasterTenantClient> = { subscription_status: newStatus } as any;
    if (newStatus === "suspended") (updates as any).blocked_at = new Date().toISOString();
    else if (newStatus === "active") (updates as any).blocked_at = null;
    await updateClient(client.id, updates);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Gestão de Tenants
          </h1>
          <p className="text-sm text-muted-foreground">Controle centralizado de todos os clientes SaaS</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => clients.forEach((c) => syncUserCount(c.tenant_id))}>
          <RefreshCw className="h-3.5 w-3.5" /> Sincronizar Usuários
        </Button>
      </div>

      {/* KPIs - Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <KpiCard icon={Building2} label="Ativos" value={totalActive} color="text-green-600" />
        <KpiCard icon={AlertTriangle} label="Inadimplentes" value={totalOverdue} color="text-amber-600" />
        <KpiCard icon={Ban} label="Suspensos" value={totalSuspended} color="text-red-600" />
        <KpiCard icon={CreditCard} label="MRR" value={fmtCurrency(totalMRR)} color="text-primary" />
        <KpiCard icon={TrendingUp} label="ARR" value={fmtCurrency(totalARR)} color="text-primary" />
      </div>
      {/* KPIs - Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Clock} label="Vencendo hoje" value={dueToday} color="text-amber-500" />
        <KpiCard icon={AlertTriangle} label="Em carência" value={inGrace} color="text-orange-500" />
        <KpiCard icon={Key} label="Licenças contratadas" value={totalLicenses} color="text-blue-600" />
        <KpiCard icon={Users} label="Licenças em uso" value={`${totalActiveUsers}/${totalLicenses}`} color="text-blue-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar tenant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filters.subscription_status || "all"} onValueChange={(v) => setFilters({ ...filters, subscription_status: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="overdue">Inadimplentes</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="canceled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.billing_cycle || "all"} onValueChange={(v) => setFilters({ ...filters, billing_cycle: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Ciclo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.tenant_type || "all"} onValueChange={(v) => setFilters({ ...filters, tenant_type: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="reseller">Revenda</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.due_range || "all"} onValueChange={(v) => setFilters({ ...filters, due_range: v === "all" ? undefined : v as any })}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Vencimento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Vence hoje</SelectItem>
              <SelectItem value="this_week">Vence esta semana</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Listing */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Tenant</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum tenant encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailClient(c)}>
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-[200px]">{c.nome_fantasia || c.razao_social || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.cnpj}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${c.tenant_type === "reseller" ? "border-purple-500/30 text-purple-600 bg-purple-500/10" : ""}`}>
                          {c.tenant_type === "reseller" ? "Revenda" : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.plan_name || "—"}</TableCell>
                      <TableCell className="text-sm">{c.billing_cycle === "annual" ? "Anual" : "Mensal"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmtCurrency(c.contracted_value)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${c.active_users_count >= c.contracted_users ? "text-destructive" : ""}`}>
                          {c.active_users_count}/{c.contracted_users}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(c.next_due_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[c.subscription_status] || ""}`}>
                          {statusLabels[c.subscription_status] || c.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {paymentStatusLabels[c.payment_status] || c.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setDetailClient(c); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <TenantDetailDialog
        client={detailClient}
        onClose={() => setDetailClient(null)}
        onStatusChange={handleStatusChange}
        onUpdate={updateClient}
        onRefresh={fetchClients}
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold mt-1 ${color}`}>{value}</div>
    </Card>
  );
}

interface DetailDialogProps {
  client: MasterTenantClient | null;
  onClose: () => void;
  onStatusChange: (client: MasterTenantClient, status: string) => void;
  onUpdate: (id: string, updates: Partial<MasterTenantClient>) => Promise<boolean>;
  onRefresh: () => void;
}

function TenantDetailDialog({ client, onClose, onStatusChange, onUpdate, onRefresh }: DetailDialogProps) {
  if (!client) return null;

  const available = Math.max(0, client.contracted_users - client.active_users_count);
  const usagePercent = client.contracted_users > 0 ? Math.min(100, (client.active_users_count / client.contracted_users) * 100) : 0;

  return (
    <Dialog open={!!client} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {client.nome_fantasia || client.razao_social}
            <Badge variant="outline" className={`text-[10px] ml-auto ${statusColors[client.subscription_status] || ""}`}>
              {statusLabels[client.subscription_status] || client.subscription_status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info">Dados</TabsTrigger>
            <TabsTrigger value="subscription">Assinatura</TabsTrigger>
            <TabsTrigger value="billing">Cobranças</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="ID" value={client.master_client_id} />
              <InfoRow label="CNPJ" value={client.cnpj} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Telefone" value={client.telefone} />
              <InfoRow label="Responsável" value={client.responsavel} />
              <InfoRow label="Tipo" value={client.tenant_type === "reseller" ? "Revenda" : "Standard"} />
              <InfoRow label="Ativação" value={fmtDate(client.activation_date)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {client.subscription_status !== "suspended" && (
                <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => onStatusChange(client, "suspended")}>
                  <Ban className="h-3.5 w-3.5" /> Suspender
                </Button>
              )}
              {client.subscription_status === "suspended" && (
                <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={() => onStatusChange(client, "active")}>
                  <Check className="h-3.5 w-3.5" /> Reativar
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4 mt-3">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  Assinatura da Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniStat label="Plano" value={client.plan_name || "—"} />
                  <MiniStat label="Ciclo" value={client.billing_cycle === "annual" ? "Anual" : "Mensal"} />
                  <MiniStat label="Valor" value={fmtCurrency(client.contracted_value)} />
                  <MiniStat label="Pagamento" value={paymentStatusLabels[client.payment_status] || client.payment_status} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="Contratados" value={String(client.contracted_users)} />
                  <MiniStat label="Ativos" value={String(client.active_users_count)} />
                  <MiniStat label="Disponíveis" value={String(available)} highlight={available === 0} />
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${usagePercent >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${usagePercent}%` }} />
                </div>
                {available === 0 && (
                  <p className="text-[11px] text-destructive font-medium text-center">
                    ⚠ Limite de licenças atingido — novos usuários não podem ser criados neste tenant
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="Vencimento" value={fmtDate(client.next_due_date)} />
                  <MiniStat label="Carência até" value={fmtDate(client.grace_until)} />
                  <MiniStat label="Bloqueio em" value={fmtDate(client.blocked_at)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-3">
            <TenantBillingTab tenantId={client.tenant_id} onStatusUpdate={onRefresh} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="font-medium text-sm truncate">{value || "—"}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
