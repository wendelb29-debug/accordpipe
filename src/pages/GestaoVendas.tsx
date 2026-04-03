import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  DollarSign, Users, ShoppingCart, Download, Copy, ArrowLeft,
  TrendingUp, Calendar, FileText, Code, Send,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type VendaAccord = {
  id: string;
  mentor_id: string;
  mentor_nome: string;
  aluno_nome: string;
  aluno_email: string;
  produto: string;
  valor: number;
  transacao_id: string;
  gateway: string;
  data_venda: string;
  created_at: string;
};

export default function GestaoVendas() {
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [filterMentor, setFilterMentor] = useState("");
  const [filterProduto, setFilterProduto] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas-accord"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_orbit")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as VendaAccord[];
    },
  });

  const filteredVendas = useMemo(() => {
    let result = vendas;
    if (selectedMentor) result = result.filter((v) => v.mentor_id === selectedMentor);
    if (filterMentor) result = result.filter((v) => v.mentor_nome.toLowerCase().includes(filterMentor.toLowerCase()));
    if (filterProduto) result = result.filter((v) => v.produto.toLowerCase().includes(filterProduto.toLowerCase()));
    if (filterDateFrom) result = result.filter((v) => new Date(v.data_venda) >= new Date(filterDateFrom));
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
        map.set(v.mentor_id, { id: v.mentor_id, nome: v.mentor_nome, total: 1, valor: Number(v.valor) || 0 });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const exportCSV = () => {
    const headers = ["Site", "Aluno", "Email", "Produto", "Valor", "Data da Venda", "Gateway", "Transação ID"];
    const rows = filteredVendas.map((v) => [
      v.mentor_nome, v.aluno_nome, v.aluno_email, v.produto,
      String(v.valor), format(new Date(v.data_venda), "dd/MM/yyyy HH:mm"), v.gateway, v.transacao_id,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_orbit_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accord-vendas-webhook`;

  const payloadExample = `{
  "mentor_id": "glauberson",
  "mentor_nome": "Pastor Glauberson",
  "aluno_nome": "João Silva",
  "aluno_email": "joao@email.com",
  "produto": "Curso Bíblia Avançada",
  "valor": 197,
  "transacao_id": "EDZ123456",
  "data_venda": "2026-03-12",
  "gateway": "Eduzz"
}`;

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-accord-token: SEU_TOKEN_AQUI" \\
  -d '${payloadExample}'`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedMentor && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedMentor(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {selectedMentor
                ? `Vendas — ${mentors.find((m) => m.id === selectedMentor)?.nome || ""}`
                : "Accord Sales — Gestão de Vendas"}
            </h1>
            <p className="text-sm text-muted-foreground">Vendas centralizadas via webhook dos parceiros</p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas" className="gap-2"><ShoppingCart className="h-4 w-4" /> Vendas</TabsTrigger>
          <TabsTrigger value="docs" className="gap-2"><FileText className="h-4 w-4" /> Documentação</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6 mt-4">
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
                    {formatCurrency(selectedMentor ? filteredVendas.reduce((a, v) => a + (Number(v.valor) || 0), 0) : totalValor)}
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
                  <p className="text-sm text-muted-foreground">Sites</p>
                  <p className="text-2xl font-bold text-foreground">{totalMentores}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mentor cards */}
          {!selectedMentor && mentors.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Vendas por Site</h2>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {mentors.map((m) => (
                  <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => setSelectedMentor(m.id)}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-foreground">{m.nome}</p>
                        <Badge variant="secondary">{m.total} vendas</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" /> {formatCurrency(m.valor)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {!selectedMentor && (
                  <Input placeholder="Filtrar por site..." value={filterMentor} onChange={(e) => setFilterMentor(e.target.value)} />
                )}
                <Input placeholder="Filtrar por produto..." value={filterProduto} onChange={(e) => setFilterProduto(e.target.value)} />
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{selectedMentor ? "Vendas do Site" : "Últimas Vendas"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!selectedMentor && <TableHead>Site</TableHead>}
                      <TableHead>Aluno</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Transação</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedMentor ? 8 : 9} className="text-center text-muted-foreground py-8">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendas.map((v) => (
                        <TableRow key={v.id}>
                          {!selectedMentor && <TableCell className="font-medium">{v.mentor_nome}</TableCell>}
                          <TableCell>{v.aluno_nome}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{v.aluno_email}</TableCell>
                          <TableCell>{v.produto}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(v.valor))}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(v.data_venda), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{v.gateway}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{v.transacao_id}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyEmail(v.aluno_email)} title="Copiar email">
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
        </TabsContent>

        <TabsContent value="docs" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Documentação do Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">URL do Webhook</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">{webhookUrl}</code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Método: <strong>POST</strong></p>
              </div>

              {/* Headers */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Headers de Autenticação</h3>
                <div className="bg-muted rounded-md p-4 space-y-1">
                  <p className="text-sm font-mono"><span className="text-primary">Content-Type:</span> application/json</p>
                  <p className="text-sm font-mono"><span className="text-primary">x-accord-token:</span> SEU_TOKEN_AQUI</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Cada site receberá um token exclusivo. Enviar no header <code className="bg-muted px-1 rounded">x-accord-token</code>.
                </p>
              </div>

              {/* Payload */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Exemplo de Payload</h3>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto">{payloadExample}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => copyToClipboard(payloadExample)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Fields */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Campos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Obrigatório</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["mentor_id", "string", "Sim", "ID único do site"],
                      ["mentor_nome", "string", "Sim", "Nome do site"],
                      ["aluno_nome", "string", "Sim", "Nome do aluno"],
                      ["aluno_email", "string", "Sim", "Email do aluno"],
                      ["produto", "string", "Sim", "Nome do produto"],
                      ["transacao_id", "string", "Sim", "ID da transação (único, evita duplicidade)"],
                      ["valor", "number", "Não", "Valor da venda em R$"],
                      ["data_venda", "string", "Não", "Data da venda (ISO 8601)"],
                      ["gateway", "string", "Não", "Plataforma de pagamento (Eduzz, Gateway, etc)"],
                    ].map(([campo, tipo, obrig, desc]) => (
                      <TableRow key={campo}>
                        <TableCell className="font-mono text-sm">{campo}</TableCell>
                        <TableCell><Badge variant="outline">{tipo}</Badge></TableCell>
                        <TableCell>{obrig === "Sim" ? <Badge className="bg-primary/10 text-primary">Sim</Badge> : <span className="text-muted-foreground">Não</span>}</TableCell>
                        <TableCell className="text-sm">{desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* cURL */}
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Code className="h-4 w-4" /> Exemplo cURL</h3>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => copyToClipboard(curlExample)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Responses */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Respostas</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 bg-muted rounded-md p-3">
                    <Badge className="bg-green-500/10 text-green-600 shrink-0">201</Badge>
                    <p className="text-sm">Venda registrada com sucesso</p>
                  </div>
                  <div className="flex items-start gap-3 bg-muted rounded-md p-3">
                    <Badge className="bg-yellow-500/10 text-yellow-600 shrink-0">409</Badge>
                    <p className="text-sm">Transação duplicada (transacao_id já existe)</p>
                  </div>
                  <div className="flex items-start gap-3 bg-muted rounded-md p-3">
                    <Badge className="bg-red-500/10 text-red-600 shrink-0">401</Badge>
                    <p className="text-sm">Token inválido ou ausente</p>
                  </div>
                  <div className="flex items-start gap-3 bg-muted rounded-md p-3">
                    <Badge className="bg-red-500/10 text-red-600 shrink-0">400</Badge>
                    <p className="text-sm">Campos obrigatórios faltando</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
