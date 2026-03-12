import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  ShoppingCart,
  Download,
  Copy,
  ArrowLeft,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type VendaWebhook = {
  id: string;
  mentor_id: string;
  mentor_nome: string;
  nome_aluno: string;
  email_aluno: string;
  produto: string;
  valor: number;
  data_venda: string;
  origem: string;
  created_at: string;
};

export default function GestaoVendas() {
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [filterMentor, setFilterMentor] = useState("");
  const [filterProduto, setFilterProduto] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas-webhook"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_webhook")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as VendaWebhook[];
    },
  });

  const filteredVendas = useMemo(() => {
    let result = vendas;
    if (selectedMentor) {
      result = result.filter((v) => v.mentor_id === selectedMentor);
    }
    if (filterMentor) {
      result = result.filter((v) =>
        v.mentor_nome.toLowerCase().includes(filterMentor.toLowerCase())
      );
    }
    if (filterProduto) {
      result = result.filter((v) =>
        v.produto.toLowerCase().includes(filterProduto.toLowerCase())
      );
    }
    if (filterDateFrom) {
      result = result.filter(
        (v) => new Date(v.data_venda) >= new Date(filterDateFrom)
      );
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((v) => new Date(v.data_venda) <= to);
    }
    return result;
  }, [vendas, selectedMentor, filterMentor, filterProduto, filterDateFrom, filterDateTo]);

  const mentors = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; total: number; valor: number }>();
    vendas.forEach((v) => {
      const existing = map.get(v.mentor_id);
      if (existing) {
        existing.total += 1;
        existing.valor += Number(v.valor) || 0;
      } else {
        map.set(v.mentor_id, {
          id: v.mentor_id,
          nome: v.mentor_nome,
          total: 1,
          valor: Number(v.valor) || 0,
        });
      }
    });
    return Array.from(map.values());
  }, [vendas]);

  const totalVendas = vendas.length;
  const totalValor = vendas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
  const totalMentores = mentors.length;

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copiado!");
  };

  const exportCSV = () => {
    const headers = [
      "Mentor",
      "Aluno",
      "Email",
      "Produto",
      "Valor",
      "Data da Venda",
      "Origem",
    ];
    const rows = filteredVendas.map((v) => [
      v.mentor_nome,
      v.nome_aluno,
      v.email_aluno,
      v.produto,
      String(v.valor),
      format(new Date(v.data_venda), "dd/MM/yyyy HH:mm"),
      v.origem,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedMentor && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMentor(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {selectedMentor
                ? `Vendas — ${mentors.find((m) => m.id === selectedMentor)?.nome || ""}`
                : "Gestão de Vendas"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Vendas recebidas via webhook dos parceiros
            </p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Vendas</p>
              <p className="text-2xl font-bold text-foreground">
                {selectedMentor ? filteredVendas.length : totalVendas}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(
                  selectedMentor
                    ? filteredVendas.reduce((a, v) => a + (Number(v.valor) || 0), 0)
                    : totalValor
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mentores</p>
              <p className="text-2xl font-bold text-foreground">{totalMentores}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentor cards (only when no mentor selected) */}
      {!selectedMentor && mentors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Vendas por Mentor</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m) => (
              <Card
                key={m.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-border"
                onClick={() => setSelectedMentor(m.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">{m.nome}</p>
                    <Badge variant="secondary">{m.total} vendas</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {formatCurrency(m.valor)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {!selectedMentor && (
              <Input
                placeholder="Filtrar por mentor..."
                value={filterMentor}
                onChange={(e) => setFilterMentor(e.target.value)}
              />
            )}
            <Input
              placeholder="Filtrar por produto..."
              value={filterProduto}
              onChange={(e) => setFilterProduto(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="De"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="Até"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selectedMentor ? "Vendas do Mentor" : "Últimas Vendas"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!selectedMentor && <TableHead>Mentor</TableHead>}
                  <TableHead>Aluno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={selectedMentor ? 7 : 8}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendas.map((v) => (
                    <TableRow key={v.id}>
                      {!selectedMentor && (
                        <TableCell className="font-medium">{v.mentor_nome}</TableCell>
                      )}
                      <TableCell>{v.nome_aluno}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.email_aluno}</TableCell>
                      <TableCell>{v.produto}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(v.valor))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(v.data_venda), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {v.origem}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyEmail(v.email_aluno)}
                          title="Copiar email do aluno"
                        >
                          <Copy className="h-3.5 w-3.5" />
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
    </div>
  );
}
