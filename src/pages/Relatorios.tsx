import { useState, useMemo, useCallback } from "react";
import { FileSpreadsheet, FileText, Download, Filter, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCompanies } from "@/hooks/useCompanies";
import { useContracts } from "@/hooks/useContracts";
import { useDocuments } from "@/hooks/useDocuments";
import * as XLSX from "xlsx";

const reportFields = [
  { id: "empresa", label: "Nome da Empresa" },
  { id: "responsavel", label: "Nome do Responsável" },
  { id: "cnpj", label: "CNPJ" },
  { id: "endereco", label: "Endereço" },
  { id: "situacao", label: "Situação da Empresa" },
  { id: "contratos", label: "Total de Contratos" },
  { id: "documentos", label: "Total de Documentos" },
  { id: "dataCadastro", label: "Data de Cadastro" },
];

export default function Relatorios() {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "empresa", "cnpj", "situacao", "contratos", "documentos",
  ]);
  const [companySituation, setCompanySituation] = useState("all");

  const { companies, loading: loadingCompanies } = useCompanies();
  const { contracts } = useContracts();
  const { documents } = useDocuments();

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const reportData = useMemo(() => {
    return companies
      .filter((c) => companySituation === "all" || c.status === companySituation)
      .map((c) => {
        const companyContracts = contracts.filter((ct) => ct.company_id === c.id);
        const companyDocs = documents.filter((d) => d.company_id === c.id);
        const addressParts = [c.endereco, c.numero && `nº ${c.numero}`, c.bairro, c.cidade && c.estado && `${c.cidade}/${c.estado}`].filter(Boolean);
        return {
          id: c.id,
          empresa: c.nome_fantasia || c.razao_social,
          responsavel: c.responsavel || "-",
          cnpj: c.cnpj,
          endereco: addressParts.join(", ") || "-",
          situacao: c.status,
          contratos: companyContracts.length,
          documentos: companyDocs.length,
          dataCadastro: new Date(c.created_at).toLocaleDateString("pt-BR"),
        };
      });
  }, [companies, contracts, documents, companySituation]);

  const loading = loadingCompanies;

  const statusLabels: Record<string, string> = {
    active: "Ativo",
    delinquent: "Inadimplente",
    cancelled: "Cancelado",
  };

  const handleExportExcel = useCallback(() => {
    if (reportData.length === 0) return;

    const fieldLabels: Record<string, string> = {
      empresa: "Nome da Empresa",
      responsavel: "Nome do Responsável",
      cnpj: "CNPJ",
      endereco: "Endereço",
      situacao: "Situação da Empresa",
      contratos: "Total de Contratos",
      documentos: "Total de Documentos",
      dataCadastro: "Data de Cadastro",
    };

    const rows = reportData.map((row) => {
      const obj: Record<string, any> = {};
      selectedFields.forEach((f) => {
        const label = fieldLabels[f] || f;
        let value = (row as any)[f];
        if (f === "situacao") value = statusLabels[value] || value;
        obj[label] = value;
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [reportData, selectedFields]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Dados consolidados de todas as abas do sistema</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>Configure os parâmetros do relatório</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Situação da Empresa</Label>
              <Select value={companySituation} onValueChange={setCompanySituation}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="delinquent">Inadimplente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Campos do Relatório</Label>
              <div className="space-y-2">
                {reportFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <label htmlFor={field.id} className="text-sm font-medium leading-none cursor-pointer">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Prévia do Relatório</CardTitle>
              <CardDescription>{reportData.length} registros encontrados</CardDescription>
            </div>
            <Button onClick={handleExportExcel} disabled={reportData.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Gerar Relatório
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedFields.includes("empresa") && <TableHead>Empresa</TableHead>}
                      {selectedFields.includes("responsavel") && <TableHead>Responsável</TableHead>}
                      {selectedFields.includes("cnpj") && <TableHead>CNPJ</TableHead>}
                      {selectedFields.includes("endereco") && <TableHead>Endereço</TableHead>}
                      {selectedFields.includes("situacao") && <TableHead>Situação</TableHead>}
                      {selectedFields.includes("contratos") && <TableHead>Contratos</TableHead>}
                      {selectedFields.includes("documentos") && <TableHead>Documentos</TableHead>}
                      {selectedFields.includes("dataCadastro") && <TableHead>Cadastro</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedFields.length} className="text-center py-8 text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((row) => (
                        <TableRow key={row.id}>
                          {selectedFields.includes("empresa") && <TableCell className="font-medium">{row.empresa}</TableCell>}
                          {selectedFields.includes("responsavel") && <TableCell>{row.responsavel}</TableCell>}
                          {selectedFields.includes("cnpj") && <TableCell className="font-mono text-sm">{row.cnpj}</TableCell>}
                          {selectedFields.includes("endereco") && <TableCell className="max-w-[200px] truncate">{row.endereco}</TableCell>}
                          {selectedFields.includes("situacao") && <TableCell><StatusBadge status={row.situacao as any} size="sm" /></TableCell>}
                          {selectedFields.includes("contratos") && <TableCell>{row.contratos}</TableCell>}
                          {selectedFields.includes("documentos") && <TableCell>{row.documentos}</TableCell>}
                          {selectedFields.includes("dataCadastro") && <TableCell>{row.dataCadastro}</TableCell>}
                        </TableRow>
                      ))
                    )}
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
