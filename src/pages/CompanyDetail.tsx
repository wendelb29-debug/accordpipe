import { COMPANY_SAFE_COLUMNS } from "@/lib/safeColumns";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Receipt, Loader2, Mail, Phone, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge, InvoiceStatus } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Company {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  status: string;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

interface Payment {
  id: string;
  kiwify_order_id: string;
  produto: string | null;
  forma_pagamento: string | null;
  status: string;
  valor: number | null;
  customer_name: string | null;
  created_at: string;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const [companyRes, paymentsRes] = await Promise.all([
        supabase.from("companies").select(COMPANY_SAFE_COLUMNS) as any.eq("id", id).maybeSingle(),
        supabase.from("payments").select("*").eq("company_id", id).order("created_at", { ascending: false }),
      ]);
      if (companyRes.error || !companyRes.data) {
        toast.error("Empresa não encontrada");
        navigate("/empresas");
        return;
      }
      setCompany(companyRes.data);
      setPayments((paymentsRes.data as Payment[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const getPaymentStatusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      paid: { label: "🟢 Pago", class: "bg-status-paid/10 text-status-paid border-status-paid/30" },
      approved: { label: "🟢 Pago", class: "bg-status-paid/10 text-status-paid border-status-paid/30" },
      pending: { label: "🟡 Pendente", class: "bg-status-open/10 text-status-open border-status-open/30" },
      refused: { label: "🔴 Recusado", class: "bg-status-overdue/10 text-status-overdue border-status-overdue/30" },
      refunded: { label: "🟣 Reembolsado", class: "bg-status-cancelled/10 text-status-cancelled border-status-cancelled/30" },
      chargedback: { label: "🔴 Chargeback", class: "bg-status-overdue/10 text-status-overdue border-status-overdue/30" },
    };
    const cfg = map[status] || { label: status, class: "bg-muted text-muted-foreground" };
    return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cfg.class}`}>{cfg.label}</span>;
  };

  const getFormaPagamento = (forma: string | null) => {
    if (!forma) return "-";
    const map: Record<string, string> = {
      credit_card: "🔵 Cartão",
      pix: "🟢 PIX",
      boleto: "🟡 Boleto",
    };
    return map[forma] || forma;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) return null;

  const address = [company.endereco, company.numero && `nº ${company.numero}`, company.bairro, company.cidade && company.estado && `${company.cidade}/${company.estado}`, company.cep].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/empresas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{company.nome_fantasia || company.razao_social}</h1>
          <p className="text-muted-foreground font-mono text-sm">{company.cnpj}</p>
        </div>
      </div>

      {/* Company Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Razão Social
          </div>
          <p className="font-medium text-foreground">{company.razao_social}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4 text-primary" />
            Responsável
          </div>
          <p className="font-medium text-foreground">{company.responsavel || "-"}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            Contato
          </div>
          <p className="text-sm text-foreground">{company.email || "-"}</p>
          <p className="text-sm text-foreground">{company.telefone || "-"}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Endereço
          </div>
          <p className="text-sm text-foreground">{address || "-"}</p>
        </Card>
      </div>

      {/* Payments / Boletos */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Pagamentos Emitidos
        </h2>
        <div className="rounded-xl border border-border bg-card shadow-card">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum pagamento registrado para esta empresa</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.kiwify_order_id.slice(0, 12)}...</TableCell>
                    <TableCell>{p.produto || "-"}</TableCell>
                    <TableCell className="font-semibold">
                      {p.valor ? p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-"}
                    </TableCell>
                    <TableCell>{getFormaPagamento(p.forma_pagamento)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(p.status)}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
