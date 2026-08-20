import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, Loader2,
  Users, Tag, CreditCard, AlertCircle, UserCheck, Layout, ListChecks
} from "lucide-react";
import * as XLSX from "xlsx";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";


interface ParsedLead {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  documento: string;
  valor_ps: number;
  valor_mrr: number;
  tags: string;
}

interface DistributionResult {
  total: number;
  perOperator: { name: string; count: number }[];
}

type DistributionMethod = "round-robin" | "tags" | "cpf-cnpj" | "no-distribution";

export function ImportarPlanilha() {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [distribMethod, setDistribMethod] = useState<DistributionMethod>("no-distribution");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [targetStage, setTargetStage] = useState<string>("novos");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const { columns: kanbanStages } = useKanbanColumns(selectedWorkspaceId);

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<DistributionResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!companyId) return;
      const { data } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("servidor_id", companyId)
        .order("name");
      if (data) setWorkspaces(data);
    };
    fetchWorkspaces();
  }, [companyId]);

  const downloadTemplate = (format: "csv" | "xlsx") => {
    const defaultHeaders = ["Nome", "Empresa", "E-mail", "Telefone", "CPF/CNPJ", "Valor P&S", "Valor MRR", "Tags"];
    const sampleRow = ["João Silva", "Empresa Exemplo", "joao@email.com", "(11) 99999-0000", "123.456.789-00", "500", "150", "tag1, tag2"];

    if (format === "csv") {
      const csv = [defaultHeaders.join(";"), sampleRow.join(";")].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo_importacao_leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([defaultHeaders, sampleRow]);
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

        if (rows.length < 1) {
          toast.error("Planilha vazia ou sem dados.");
          return;
        }

        const rawHeaders = rows[0].map(h => String(h || "").trim());
        setHeaders(rawHeaders);

        const leads = rows.slice(1).filter(r => r.some(c => c)).map((row) => {
          const leadObj: any = {};
          rawHeaders.forEach((header, index) => {
            leadObj[header] = row[index];
          });
          return leadObj;
        });

        setParsedData(leads);
        toast.success(`${leads.length} leads encontrados na planilha.`);
      } catch (err) {
        console.error("Error parsing file:", err);
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
    if (!companyId || parsedData.length === 0) return;
    setImporting(true);

    try {
      // Fetch operators with tags and last_assigned_at, ordered for round-robin
      const { data: operators } = await supabase
        .from("profiles")
        .select("user_id, name, tags, last_assigned_at")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("last_assigned_at", { ascending: true, nullsFirst: true });

      const operatorList = (operators || []) as { user_id: string; name: string; tags: string[] | null; last_assigned_at: string | null }[];

      // For CPF/CNPJ mode: fetch existing leads with documento to find their operator
      let existingDocMap = new Map<string, { user_id: string; name: string }>();
      if (distribMethod === "cpf-cnpj") {
        const docs = parsedData.map(l => l.documento).filter(Boolean);
        if (docs.length > 0) {
          const { data: existingLeads } = await supabase
            .from("crm_leads")
            .select("documento, created_by_user_id, created_by_name")
            .eq("servidor_id", companyId)
            .not("documento", "is", null);
          
          if (existingLeads) {
            for (const el of existingLeads) {
              const doc = (el as any).documento;
              if (doc && (el as any).created_by_user_id) {
                existingDocMap.set(doc.replace(/\D/g, ""), {
                  user_id: (el as any).created_by_user_id,
                  name: (el as any).created_by_name || "",
                });
              }
            }
          }
        }
      }

      // Track distribution counts
      const distributionCount = new Map<string, { name: string; count: number }>();
      let rrIndex = 0;

      const assignLead = (lead: any): { userId: string; userName: string } => {
        const fallback = { userId: profile.user_id, userName: profile.name };
        if (operatorList.length === 0) return fallback;

        // Round Robin
        if (distribMethod === "round-robin") {
          const op = operatorList[rrIndex % operatorList.length];
          rrIndex++;
          return { userId: op.user_id, userName: op.name };
        }

        // By Tags
        if (distribMethod === "tags") {
          const leadTags = lead["Tags"]
            ? String(lead["Tags"]).split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
            : [];
          if (leadTags.length > 0) {
            const matched = operatorList.find(op =>
              (op.tags || []).some(opTag => leadTags.includes(opTag.toLowerCase()))
            );
            if (matched) return { userId: matched.user_id, userName: matched.name };
          }
          // Fallback to round-robin if no tag match
          const op = operatorList[rrIndex % operatorList.length];
          rrIndex++;
          return { userId: op.user_id, userName: op.name };
        }

        // By CPF/CNPJ
        if (distribMethod === "cpf-cnpj" && lead["CPF/CNPJ"]) {
          const cleanDoc = String(lead["CPF/CNPJ"]).replace(/\D/g, "");
          const existing = existingDocMap.get(cleanDoc);
          if (existing) return { userId: existing.user_id, userName: existing.name };
          // Fallback to round-robin if doc not found
          const op = operatorList[rrIndex % operatorList.length];
          rrIndex++;
          return { userId: op.user_id, userName: op.name };
        }

        if (distribMethod === "no-distribution") return fallback;
        return fallback;
      };

      const leadsToInsert = parsedData.map((lead) => {
        const { userId, userName } = assignLead(lead);

        // Track per-operator count
        const existing = distributionCount.get(userId);
        if (existing) {
          existing.count++;
        } else {
          distributionCount.set(userId, { name: userName, count: 1 });
        }

        return {
          servidor_id: companyId,
          workspace_id: selectedWorkspaceId || null,
          company_name: lead["Empresa"] || "Lead via Planilha",
          contact_name: lead["Nome"] || null,
          email: lead["E-mail"] || null,
          phone: lead["Telefone"] || null,
          documento: lead["CPF/CNPJ"] || null,
          value_ps: Number(lead["Valor P&S"]) || 0,
          value_mrr: Number(lead["Valor MRR"]) || 0,
          stage: targetStage || "novos",
          source: "Planilha",
          lead_status: "open",
          tags: lead["Tags"] ? String(lead["Tags"]).split(",").map(t => t.trim()).filter(Boolean) : [],
          created_by_user_id: userId,
          created_by_name: userName,
        };
      });


      // Insert in batches of 50
      let imported = 0;
      for (let i = 0; i < leadsToInsert.length; i += 50) {
        const batch = leadsToInsert.slice(i, i + 50);
        const { error } = await supabase.from("crm_leads").insert(batch as any);
        if (error) {
          console.error("Batch insert error:", error);
          toast.error(`Erro ao importar lote ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          imported += batch.length;
        }
      }

      // Update last_assigned_at for operators who received leads (round-robin)
      if (distribMethod === "round-robin") {
        for (const [userId] of distributionCount) {
          await supabase
            .from("profiles")
            .update({ last_assigned_at: new Date().toISOString() } as any)
            .eq("user_id", userId);
        }
      }

      const perOperator = Array.from(distributionCount.values()).sort((a, b) => b.count - a.count);
      setResult({ total: imported, perOperator });
      setParsedData([]);
      setFileName("");
      toast.success(`${imported} leads importados com sucesso!`);
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
        <h2 className="text-lg font-bold text-foreground">Importar Leads</h2>
        <p className="text-sm text-muted-foreground">
          Importe leads em massa via planilha CSV ou XLSX para este workspace
        </p>
      </div>

      {/* Download Template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Baixar Planilha Modelo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Colunas: Nome, Empresa, E-mail, Telefone, CPF/CNPJ, Valor P&S, Valor MRR, Tags
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
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Arraste e solte sua planilha aqui</p>
            <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar (CSV, XLSX)</p>
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

      {/* Distribution & Preview */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuração da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Layout className="h-3 w-3" /> Destino (Workspace)
                </Label>
                <Select value={selectedWorkspaceId || "none"} onValueChange={(v) => setSelectedWorkspaceId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem Workspace (Geral)</SelectItem>
                    {workspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ListChecks className="h-3 w-3" /> Etapa do Funil (Card)
                </Label>
                <Select value={targetStage} onValueChange={setTargetStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Default stages if no dynamic ones */}
                    {kanbanStages.length === 0 ? (
                      <>
                        <SelectItem value="novos">Novos</SelectItem>
                        <SelectItem value="primeiro-contato">Primeiro Contato</SelectItem>
                        <SelectItem value="call-negocio">Call de Negócio</SelectItem>
                        <SelectItem value="follow-up-1">Follow-up 1</SelectItem>
                        <SelectItem value="follow-up-2">Follow-up 2</SelectItem>
                        <SelectItem value="contrato-fechado">Ganhos</SelectItem>
                        <SelectItem value="lost">Perdidos</SelectItem>
                      </>
                    ) : (
                      kanbanStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Como distribuir os leads entre operadores?</Label>

              <Select value={distribMethod} onValueChange={(v) => setDistribMethod(v as DistributionMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-distribution">
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Apenas Subir (Sem Distribuição)</span>
                  </SelectItem>
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

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {distribMethod === "no-distribution" && "Os leads serão importados para o workspace atual sem serem distribuídos individualmente."}
              {distribMethod === "round-robin" && "Distribui sequencialmente entre operadores ativos, priorizando quem recebeu leads há mais tempo."}
              {distribMethod === "tags" && "Cruza as tags da planilha com as tags dos operadores. Sem correspondência = fallback round-robin."}
              {distribMethod === "cpf-cnpj" && "Se o CPF/CNPJ já existe na base, atribui ao operador original. Novo documento = fallback round-robin."}
            </div>

            {/* Preview */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização ({Math.min(parsedData.length, 20)} de {parsedData.length})</p>
              <div className="max-h-52 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header} className="text-xs whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 20).map((lead, i) => (
                      <TableRow key={i}>
                        {headers.map((header) => (
                          <TableCell key={`${i}-${header}`} className="text-xs whitespace-nowrap">
                            {lead[header] !== undefined && lead[header] !== null ? String(lead[header]) : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 20 && (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    ... e mais {parsedData.length - 20} leads
                  </p>
                )}
              </div>
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
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-foreground">Importação concluída!</p>
                <p className="text-sm text-muted-foreground">
                  {result.total} leads importados com sucesso.
                </p>
              </div>
            </div>

            {result.perOperator.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Distribuição por operador
                </p>
                <div className="space-y-1.5">
                  {result.perOperator.map((op, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-background rounded-lg px-3 py-2 border border-border">
                      <span className="font-medium text-foreground">{op.name}</span>
                      <Badge variant="secondary">{op.count} lead{op.count > 1 ? "s" : ""}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
