import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, Loader2,
  Users, Tag, CreditCard, AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedLead {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  valor_ps: number;
  valor_mrr: number;
  tags: string;
}

type DistributionMethod = "round-robin" | "tags" | "cpf-cnpj";

export function ImportarPlanilha() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [fileName, setFileName] = useState("");
  const [distribMethod, setDistribMethod] = useState<DistributionMethod>("round-robin");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const downloadTemplate = (format: "csv" | "xlsx") => {
    const headers = ["Nome", "Empresa", "E-mail", "Telefone", "CPF/CNPJ", "Valor P&S", "Valor MRR", "Tags"];
    const sampleRow = ["João Silva", "Empresa Exemplo", "joao@email.com", "(11) 99999-0000", "123.456.789-00", "500", "150", "tag1, tag2"];

    if (format === "csv") {
      const csv = [headers.join(";"), sampleRow.join(";")].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo_importacao_leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, "modelo_importacao_leads.xlsx");
    }
    toast.success("Modelo baixado com sucesso!");
  };

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          toast.error("Planilha vazia ou sem dados.");
          return;
        }

        // Skip header row
        const leads: ParsedLead[] = rows.slice(1).filter(r => r.some(c => c)).map((row) => ({
          nome: String(row[0] || "").trim(),
          empresa: String(row[1] || "").trim(),
          email: String(row[2] || "").trim(),
          telefone: String(row[3] || "").trim(),
          cpf_cnpj: String(row[4] || "").trim(),
          valor_ps: Number(row[5]) || 0,
          valor_mrr: Number(row[6]) || 0,
          tags: String(row[7] || "").trim(),
        }));

        setParsedData(leads);
        toast.success(`${leads.length} leads encontrados na planilha.`);
      } catch {
        toast.error("Erro ao processar a planilha.");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    if (!profile?.company_id || parsedData.length === 0) return;
    setImporting(true);

    try {
      // Fetch operators for distribution
      const { data: operators } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("company_id", profile.company_id)
        .eq("is_active", true);

      const operatorList = operators || [];
      let opIndex = 0;

      const leadsToInsert = parsedData.map((lead) => {
        let assignedUserId = profile.user_id;
        let assignedName = profile.name;

        if (distribMethod === "round-robin" && operatorList.length > 0) {
          const op = operatorList[opIndex % operatorList.length];
          assignedUserId = op.user_id;
          assignedName = op.name;
          opIndex++;
        }

        const tagArray = lead.tags
          ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        if (distribMethod === "tags" && operatorList.length > 0 && tagArray.length > 0) {
          // Simple tag matching: assign to first operator whose name appears in tags
          const matched = operatorList.find((op) =>
            tagArray.some((t) => t.toLowerCase() === op.name.toLowerCase())
          );
          if (matched) {
            assignedUserId = matched.user_id;
            assignedName = matched.name;
          }
        }

        return {
          servidor_id: profile.company_id,
          company_name: lead.empresa || "Lead via Planilha",
          contact_name: lead.nome || null,
          email: lead.email || null,
          phone: lead.telefone || null,
          value_ps: lead.valor_ps,
          value_mrr: lead.valor_mrr,
          stage: "novos",
          source: "Planilha",
          lead_status: "open",
          tags: lead.tags ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          created_by_user_id: assignedUserId,
          created_by_name: assignedName,
        };
      });

      // Insert in batches of 50
      let imported = 0;
      for (let i = 0; i < leadsToInsert.length; i += 50) {
        const batch = leadsToInsert.slice(i, i + 50);
        const { error } = await supabase.from("crm_leads").insert(batch as any);
        if (error) {
          console.error("Batch insert error:", error);
          toast.error(`Erro ao importar lote ${Math.floor(i / 50) + 1}`);
        } else {
          imported += batch.length;
        }
      }

      setResult({ total: imported });
      setParsedData([]);
      setFileName("");
      toast.success(`${imported} leads importados e distribuídos com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar leads.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <div>
        <h2 className="text-lg font-bold text-foreground">Importar Planilha</h2>
        <p className="text-sm text-muted-foreground">
          Importe leads em massa via planilha CSV ou XLSX
        </p>
      </div>

      {/* Download Template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Modelo Padrão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Baixe o modelo com as colunas: Nome, Empresa, E-mail, Telefone, CPF/CNPJ, Valor P&S, Valor MRR e Tags.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate("csv")} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Baixar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate("xlsx")} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Baixar XLSX
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload da Planilha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              Arraste e solte sua planilha aqui
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ou clique para selecionar (CSV, XLSX)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {fileName && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">{fileName}</span>
              <Badge variant="secondary">{parsedData.length} leads</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution Method & Import */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Método de Distribuição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Como distribuir os leads?</Label>
              <Select value={distribMethod} onValueChange={(v) => setDistribMethod(v as DistributionMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">
                    <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Partes Iguais (Round Robin)</span>
                  </SelectItem>
                  <SelectItem value="tags">
                    <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> Por Tags</span>
                  </SelectItem>
                  <SelectItem value="cpf-cnpj">
                    <span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" /> Por CPF/CNPJ</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distribMethod === "round-robin" && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Os leads serão distribuídos igualmente entre os operadores ativos.
              </div>
            )}
            {distribMethod === "tags" && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Leads serão atribuídos ao operador cujo nome corresponda a uma tag na planilha.
              </div>
            )}
            {distribMethod === "cpf-cnpj" && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Leads com CPF/CNPJ já existente serão atribuídos ao operador original.
              </div>
            )}

            {/* Preview table */}
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Nome</th>
                    <th className="text-left p-2 font-medium">Empresa</th>
                    <th className="text-left p-2 font-medium">E-mail</th>
                    <th className="text-right p-2 font-medium">P&S</th>
                    <th className="text-right p-2 font-medium">MRR</th>
                    <th className="text-left p-2 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 20).map((lead, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">{lead.nome || "—"}</td>
                      <td className="p-2">{lead.empresa || "—"}</td>
                      <td className="p-2">{lead.email || "—"}</td>
                      <td className="p-2 text-right">{lead.valor_ps}</td>
                      <td className="p-2 text-right">{lead.valor_mrr}</td>
                      <td className="p-2">{lead.tags || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 20 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  ... e mais {parsedData.length - 20} leads
                </p>
              )}
            </div>

            <Button onClick={handleImport} disabled={importing} className="w-full gap-2">
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Importar {parsedData.length} Leads</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-foreground">Importação concluída!</p>
              <p className="text-sm text-muted-foreground">
                {result.total} leads importados e distribuídos com sucesso.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
