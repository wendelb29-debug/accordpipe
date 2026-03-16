import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DollarSign, Plus, Loader2, Search, AlertTriangle, CheckCircle2,
  XCircle, Clock, CreditCard, FileText, TrendingDown, History
} from "lucide-react";

const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  pago: "bg-green-500/10 text-green-700 border-green-300",
  vencido: "bg-red-500/10 text-red-700 border-red-300",
  cancelado: "bg-muted text-muted-foreground border-border",
};
const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export default function Financeiro() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);

  const [form, setForm] = useState({
    registration_id: "",
    type: "cobranca",
    description: "",
    amount: 0,
    due_date: "",
    status: "pendente",
    payment_method: "boleto",
    reference: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: txData }, { data: regData }] = await Promise.all([
      supabase.from("financial_transactions" as any).select("*, crm_client_registrations(nome_completo, lead_id)").order("created_at", { ascending: false }),
      supabase.from("crm_client_registrations").select("id, nome_completo, lead_id, servidor_id"),
    ]);
    setTransactions(txData || []);
    setRegistrations(regData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.amount || !form.due_date) { toast.error("Preencha valor e vencimento"); return; }
    setSaving(true);
    const servidorId = profile?.company_id;
    if (!servidorId) { toast.error("Empresa não encontrada"); setSaving(false); return; }

    const { error } = await supabase.from("financial_transactions" as any).insert({
      servidor_id: servidorId,
      registration_id: form.registration_id || null,
      type: form.type,
      description: form.description,
      amount: form.amount,
      due_date: form.due_date,
      status: form.status,
      payment_method: form.payment_method,
      reference: form.reference,
      notes: form.notes,
      created_by_user_id: profile?.user_id,
      created_by_name: profile?.name,
    });

    if (error) { toast.error("Erro ao criar transação"); console.error(error); }
    else {
      toast.success("Transação criada!");
      setDialogOpen(false);
      setForm({ registration_id: "", type: "cobranca", description: "", amount: 0, due_date: "", status: "pendente", payment_method: "boleto", reference: "", notes: "" });

      // Auto-update client status
      if (form.registration_id && form.status === "pago") {
        await supabase.from("crm_client_registrations").update({ client_status: "ativo" } as any).eq("id", form.registration_id);
      }
      await fetchData();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string, regId?: string) => {
    await supabase.from("financial_transactions" as any).update({
      status,
      ...(status === "pago" ? { paid_at: new Date().toISOString() } : {}),
    }).eq("id", id);

    // Auto-update client status based on payment
    if (regId) {
      if (status === "pago") {
        await supabase.from("crm_client_registrations").update({ client_status: "ativo" } as any).eq("id", regId);
      } else if (status === "vencido") {
        await supabase.from("crm_client_registrations").update({ client_status: "inadimplente" } as any).eq("id", regId);
      } else if (status === "cancelado") {
        await supabase.from("crm_client_registrations").update({ client_status: "cancelado" } as any).eq("id", regId);
      }
    }

    toast.success(`Status atualizado para ${statusLabels[status]}`);
    await fetchData();
  };

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter((t: any) =>
      t.description?.toLowerCase().includes(s) ||
      t.reference?.toLowerCase().includes(s) ||
      (t.crm_client_registrations as any)?.nome_completo?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const byStatus = (s: string) => filtered.filter((t: any) => t.status === s);
  const totals = useMemo(() => ({
    pendente: byStatus("pendente").reduce((a: number, t: any) => a + Number(t.amount), 0),
    pago: byStatus("pago").reduce((a: number, t: any) => a + Number(t.amount), 0),
    vencido: byStatus("vencido").reduce((a: number, t: any) => a + Number(t.amount), 0),
    cancelado: byStatus("cancelado").reduce((a: number, t: any) => a + Number(t.amount), 0),
  }), [filtered]);

  const TransactionTable = ({ items, showActions = true }: { items: any[]; showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Cliente</TableHead>
          <TableHead className="text-xs">Descrição</TableHead>
          <TableHead className="text-xs">Valor</TableHead>
          <TableHead className="text-xs">Vencimento</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          {showActions && <TableHead className="text-xs">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
        )}
        {items.map((t: any) => (
          <TableRow key={t.id}>
            <TableCell className="text-xs">{(t.crm_client_registrations as any)?.nome_completo || "—"}</TableCell>
            <TableCell className="text-xs">{t.description || t.type}</TableCell>
            <TableCell className="text-xs font-medium">{fmtCur(Number(t.amount))}</TableCell>
            <TableCell className="text-xs">{t.due_date ? fmtDate(t.due_date) : "—"}</TableCell>
            <TableCell>
              <Badge variant="outline" className={`text-[10px] ${statusColors[t.status] || ""}`}>
                {statusLabels[t.status] || t.status}
              </Badge>
            </TableCell>
            {showActions && (
              <TableCell>
                <div className="flex gap-1">
                  {t.status === "pendente" && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => updateStatus(t.id, "pago", t.registration_id)}>
                        <CheckCircle2 className="h-3 w-3" /> Pago
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-destructive" onClick={() => updateStatus(t.id, "vencido", t.registration_id)}>
                        <AlertTriangle className="h-3 w-3" /> Vencido
                      </Button>
                    </>
                  )}
                  {t.status === "vencido" && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => updateStatus(t.id, "pago", t.registration_id)}>
                      <CheckCircle2 className="h-3 w-3" /> Pago
                    </Button>
                  )}
                  {t.status !== "cancelado" && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => updateStatus(t.id, "cancelado", t.registration_id)}>
                      <XCircle className="h-3 w-3" /> Cancelar
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Financeiro</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Transação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase">Pendentes</p><p className="text-lg font-bold text-foreground">{fmtCur(totals.pendente)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase">Pagos</p><p className="text-lg font-bold text-foreground">{fmtCur(totals.pago)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase">Vencidos</p><p className="text-lg font-bold text-foreground">{fmtCur(totals.vencido)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><XCircle className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase">Cancelados</p><p className="text-lg font-bold text-foreground">{fmtCur(totals.cancelado)}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar transações..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cobrancas">
        <TabsList>
          <TabsTrigger value="cobrancas" className="text-xs gap-1"><CreditCard className="h-3.5 w-3.5" /> Cobranças</TabsTrigger>
          <TabsTrigger value="pagamentos" className="text-xs gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Pagamentos</TabsTrigger>
          <TabsTrigger value="inadimplencia" className="text-xs gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Inadimplência</TabsTrigger>
          <TabsTrigger value="cancelamentos" className="text-xs gap-1"><XCircle className="h-3.5 w-3.5" /> Cancelamentos</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs gap-1"><History className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="cobrancas"><TransactionTable items={byStatus("pendente")} /></TabsContent>
        <TabsContent value="pagamentos"><TransactionTable items={byStatus("pago")} showActions={false} /></TabsContent>
        <TabsContent value="inadimplencia"><TransactionTable items={byStatus("vencido")} /></TabsContent>
        <TabsContent value="cancelamentos"><TransactionTable items={byStatus("cancelado")} showActions={false} /></TabsContent>
        <TabsContent value="historico"><TransactionTable items={filtered} /></TabsContent>
      </Tabs>

      {/* New Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={form.registration_id} onValueChange={v => setForm({ ...form, registration_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {registrations.map(r => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome_completo || "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobranca" className="text-xs">Cobrança</SelectItem>
                    <SelectItem value="mensalidade" className="text-xs">Mensalidade</SelectItem>
                    <SelectItem value="adesao" className="text-xs">Adesão</SelectItem>
                    <SelectItem value="outro" className="text-xs">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto" className="text-xs">Boleto</SelectItem>
                    <SelectItem value="pix" className="text-xs">PIX</SelectItem>
                    <SelectItem value="cartao" className="text-xs">Cartão</SelectItem>
                    <SelectItem value="transferencia" className="text-xs">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-9 text-xs" placeholder="Ex: Mensalidade março/2026" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Referência</Label>
              <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="h-9 text-xs" placeholder="Nº boleto, código PIX..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
