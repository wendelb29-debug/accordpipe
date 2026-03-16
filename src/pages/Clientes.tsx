import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Users, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ativo: { label: "Ativo", color: "bg-green-500/10 text-green-700 border-green-300", icon: CheckCircle2 },
  pendente: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-700 border-yellow-300", icon: Clock },
  inadimplente: { label: "Inadimplente", color: "bg-red-500/10 text-red-700 border-red-300", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Clientes() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("crm_client_registrations")
        .select("*, crm_leads(company_name, contact_name, phone, email)")
        .order("created_at", { ascending: false });
      setClients(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter !== "all" && (c.client_status || "pendente") !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        c.nome_completo?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.cpf?.includes(s) ||
        (c.crm_leads as any)?.company_name?.toLowerCase().includes(s)
      );
    });
  }, [clients, search, statusFilter]);

  const counts = useMemo(() => ({
    total: clients.length,
    ativo: clients.filter(c => (c.client_status || "pendente") === "ativo").length,
    pendente: clients.filter(c => (c.client_status || "pendente") === "pendente").length,
    inadimplente: clients.filter(c => (c.client_status || "pendente") === "inadimplente").length,
    cancelado: clients.filter(c => (c.client_status || "pendente") === "cancelado").length,
  }), [clients]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Clientes</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground">Total</p><p className="text-lg font-bold">{counts.total}</p></div>
        </CardContent></Card>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key}><CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${cfg.color.split(" ")[0]}`}><cfg.icon className="h-4 w-4" /></div>
            <div><p className="text-[10px] text-muted-foreground">{cfg.label}</p><p className="text-lg font-bold">{counts[key as keyof typeof counts]}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Nome</TableHead>
            <TableHead className="text-xs">CPF</TableHead>
            <TableHead className="text-xs">Email</TableHead>
            <TableHead className="text-xs">Plano</TableHead>
            <TableHead className="text-xs">Valor</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Adesão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
          )}
          {filtered.map(c => {
            const st = (c.client_status || "pendente") as string;
            const cfg = statusConfig[st] || statusConfig.pendente;
            return (
              <TableRow key={c.id}>
                <TableCell className="text-xs font-medium">{c.nome_completo || "—"}</TableCell>
                <TableCell className="text-xs">{c.cpf || "—"}</TableCell>
                <TableCell className="text-xs">{c.email || "—"}</TableCell>
                <TableCell className="text-xs">{c.plano_contratado || "—"}</TableCell>
                <TableCell className="text-xs">{c.valor_mensal ? fmtCur(Number(c.valor_mensal)) : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                </TableCell>
                <TableCell className="text-xs">{c.data_adesao ? new Date(c.data_adesao).toLocaleDateString("pt-BR") : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
