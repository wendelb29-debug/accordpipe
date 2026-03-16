import { useState, useMemo, useCallback, useEffect } from "react";
import { FileSpreadsheet, Download, Filter, Loader2, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface RegistrationRow {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  email: string | null;
  nome_pai: string | null;
  nome_mae: string | null;
  cep: string | null;
  rg: string | null;
  comprovante_url: string | null;
  client_status: string;
  plano_contratado: string | null;
  valor_mensal: number | null;
  data_adesao: string | null;
  cidade: string | null;
  created_at: string;
  servidor_id: string;
}

interface DependentRow {
  id: string;
  registration_id: string;
  nome_completo: string;
  data_nascimento: string | null;
  grau_parentesco: string | null;
}

const clientStatusConfig: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-700 border-green-300" },
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-700 border-red-300" },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

export default function Relatorios() {
  const { role, isMaster, profile } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [dependents, setDependents] = useState<DependentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [cpfFilter, setCpfFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [generated, setGenerated] = useState(false);

  const canExport = isMaster || role === "admin" || role === "ceo" || role === "administrativo" || role === "financeiro";

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from("crm_client_registrations").select("*");
    if (profile?.company_id) {
      query = query.eq("servidor_id", profile.company_id);
    }
    const { data: regs } = await query.order("created_at", { ascending: false });
    setRegistrations((regs as RegistrationRow[]) || []);

    if (regs && regs.length > 0) {
      const regIds = regs.map((r: any) => r.id);
      const { data: deps } = await supabase
        .from("crm_client_dependents")
        .select("*")
        .in("registration_id", regIds);
      setDependents((deps as DependentRow[]) || []);
    }
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    if (!generated) return [];
    return registrations.filter((r) => {
      if (statusFilter !== "all" && r.client_status !== statusFilter) return false;
      if (nameFilter && !(r.nome_completo || "").toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (cpfFilter && !(r.cpf || "").replace(/\D/g, "").includes(cpfFilter.replace(/\D/g, ""))) return false;
      if (cityFilter && !(r.cidade || "").toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (dateFrom) {
        const regDate = new Date(r.created_at).toISOString().slice(0, 10);
        if (regDate < dateFrom) return false;
      }
      if (dateTo) {
        const regDate = new Date(r.created_at).toISOString().slice(0, 10);
        if (regDate > dateTo) return false;
      }
      return true;
    });
  }, [registrations, generated, statusFilter, nameFilter, cpfFilter, cityFilter, dateFrom, dateTo]);

  const handleGenerate = () => {
    setGenerated(true);
    toast.success(`${filteredData.length || "Nenhum"} registro(s) encontrado(s)`);
  };

  const handleExportExcel = useCallback(() => {
    if (!canExport) {
      toast.error("Você não tem permissão para exportar relatórios");
      return;
    }
    if (filteredData.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const rows: Record<string, any>[] = [];

    filteredData.forEach((reg) => {
      const regDeps = dependents.filter((d) => d.registration_id === reg.id);

      const baseRow = {
        "Nome do Titular": reg.nome_completo || "-",
        "CPF": reg.cpf || "-",
        "Data de Nascimento": reg.data_nascimento ? new Date(reg.data_nascimento).toLocaleDateString("pt-BR") : "-",
        "Email": reg.email || "-",
        "Nome do Pai": reg.nome_pai || "-",
        "Nome da Mãe": reg.nome_mae || "-",
        "CEP": reg.cep || "-",
        "RG": reg.rg || "-",
        "Dependente": "",
        "Data de Nascimento do Dependente": "",
        "Grau de Parentesco": "",
        "Status do Cliente": clientStatusConfig[reg.client_status]?.label || reg.client_status,
      };

      if (regDeps.length === 0) {
        rows.push(baseRow);
      } else {
        regDeps.forEach((dep) => {
          rows.push({
            ...baseRow,
            "Dependente": dep.nome_completo,
            "Data de Nascimento do Dependente": dep.data_nascimento ? new Date(dep.data_nascimento).toLocaleDateString("pt-BR") : "-",
            "Grau de Parentesco": dep.grau_parentesco || "-",
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    XLSX.writeFile(wb, `Relatorio_Clientes_${dateStr}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  }, [filteredData, dependents, canExport]);

  if (!canExport && role === "operador") {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Seu perfil não possui permissão para acessar os relatórios. Solicite acesso ao administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios de Clientes</h1>
        <p className="text-muted-foreground">Exporte dados dos cadastros com filtros avançados</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-5 w-5" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Período de Cadastro</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Data inicial</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Data final</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Titular</Label>
              <Input placeholder="Buscar por nome..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">CPF</Label>
              <Input placeholder="000.000.000-00" value={cpfFilter} onChange={(e) => setCpfFilter(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status do Cliente</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">🟢 Ativo</SelectItem>
                  <SelectItem value="pendente">🟡 Pendente</SelectItem>
                  <SelectItem value="inadimplente">🔴 Inadimplente</SelectItem>
                  <SelectItem value="cancelado">⚫ Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cidade</Label>
              <Input placeholder="Filtrar por cidade..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleGenerate} className="flex-1 gap-2 text-xs">
                <Search className="h-3.5 w-3.5" /> Gerar Relatório
              </Button>
            </div>
            <Button variant="outline" onClick={handleExportExcel} disabled={!generated || filteredData.length === 0} className="w-full gap-2 text-xs">
              <Download className="h-3.5 w-3.5" /> Exportar para Excel
            </Button>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Prévia do Relatório</CardTitle>
              <CardDescription>{generated ? `${filteredData.length} registro(s)` : "Configure os filtros e clique em Gerar"}</CardDescription>
            </div>
            {generated && filteredData.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <FileSpreadsheet className="h-3 w-3 mr-1" /> {filteredData.length} registros
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !generated ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Configure os filtros e clique em "Gerar Relatório"</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum registro encontrado com os filtros aplicados</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">CPF</TableHead>
                      <TableHead className="text-xs">Cidade</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Dependentes</TableHead>
                      <TableHead className="text-xs">Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((reg) => {
                      const regDeps = dependents.filter((d) => d.registration_id === reg.id);
                      const st = clientStatusConfig[reg.client_status] || clientStatusConfig.pendente;
                      return (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium text-xs">{reg.nome_completo || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{reg.cpf || "-"}</TableCell>
                          <TableCell className="text-xs">{reg.cidade || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{regDeps.length}</TableCell>
                          <TableCell className="text-xs">{new Date(reg.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
