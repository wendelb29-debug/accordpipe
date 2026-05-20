import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ImportRow = {
  empresa?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  observacoes?: string;
  motivo_perda?: string;
  cidade?: string;
  estado?: string;
  valor_mrr?: number | string;
};

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  empresa: ["empresa", "company", "company_name", "razao_social", "razão social"],
  contato: ["contato", "nome", "contact_name", "responsavel", "responsável", "name"],
  telefone: ["telefone", "phone", "whatsapp", "celular", "tel"],
  email: ["email", "e-mail", "e_mail"],
  origem: ["origem", "source", "fonte"],
  observacoes: ["observacoes", "observações", "notes", "obs"],
  motivo_perda: ["motivo_perda", "motivo", "lost_reason", "motivo de perda"],
  cidade: ["cidade", "city"],
  estado: ["estado", "uf", "state"],
  valor_mrr: ["valor_mrr", "mrr", "valor", "value"],
};

function normalizeHeader(h: string): keyof ImportRow | null {
  const k = (h || "").toLowerCase().trim();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(k)) return field as keyof ImportRow;
  }
  return null;
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let p = String(raw).replace(/\D/g, "");
  if (p.length === 11 || p.length === 10) p = "55" + p;
  return p;
}

interface Props {
  companyId: string | null;
  campaigns: Array<{ id: string; name: string }>;
  selectedCampaignId: string;
  onImported: () => void;
}

export default function PulseImportTab({ companyId, campaigns, selectedCampaignId, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [targetCampaign, setTargetCampaign] = useState(selectedCampaignId);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed: ImportRow[] = json.map((row) => {
        const out: ImportRow = {};
        for (const [key, val] of Object.entries(row)) {
          const field = normalizeHeader(key);
          if (field) (out as any)[field] = val;
        }
        return out;
      });
      setRows(parsed);
      toast.success(`${parsed.length} linhas carregadas. Confira o preview e importe.`);
    } catch (err: any) {
      toast.error("Erro lendo planilha: " + err.message);
    }
  };

  const doImport = async () => {
    if (!companyId) { toast.error("Empresa não identificada"); return; }
    if (!targetCampaign) { toast.error("Selecione uma campanha de destino"); return; }
    if (!rows.length) { toast.error("Nenhuma linha para importar"); return; }
    setImporting(true);
    let created = 0, skipped = 0, errors = 0;

    for (const r of rows) {
      const phone = normalizePhone(r.telefone);
      if (!phone) { skipped++; continue; }
      try {
        // find or create crm_lead
        const { data: existingLead } = await supabase
          .from("crm_leads")
          .select("id")
          .eq("servidor_id", companyId)
          .eq("phone", phone)
          .maybeSingle();

        let leadId = existingLead?.id;
        if (!leadId) {
          const { data: newLead, error: leadErr } = await supabase
            .from("crm_leads")
            .insert({
              servidor_id: companyId,
              company_name: r.empresa || r.contato || phone,
              contact_name: r.contato || null,
              phone,
              email: r.email || null,
              source: "Accord Pulse Import",
              stage: "novos",
              notes: r.observacoes || null,
              lost_reason: r.motivo_perda || null,
              cidade: r.cidade || null,
              estado: r.estado || null,
              value_mrr: r.valor_mrr ? Number(String(r.valor_mrr).replace(/[^\d.,]/g, "").replace(",", ".")) || null : null,
              tags: ["Pulse Import"],
            } as any)
            .select("id").single();
          if (leadErr) throw leadErr;
          leadId = newLead.id;
        }

        // upsert pulse_outbound_leads
        const { data: existingPulse } = await supabase
          .from("pulse_outbound_leads" as any)
          .select("id")
          .eq("campaign_id", targetCampaign)
          .eq("crm_lead_id", leadId)
          .maybeSingle();
        if (!existingPulse) {
          const { error: pulseErr } = await supabase.from("pulse_outbound_leads" as any).insert({
            campaign_id: targetCampaign,
            crm_lead_id: leadId,
            status: "aguardando_inicio",
            stage: "abertura",
            temperature: 15,
            auto_enabled: true,
          } as any);
          if (pulseErr) throw pulseErr;
        }

        // ensure whatsapp contact when possible
        const { data: existingContact } = await supabase
          .from("whatsapp_contacts")
          .select("id")
          .eq("company_id", companyId)
          .eq("phone", phone)
          .maybeSingle();
        if (!existingContact) {
          await supabase.from("whatsapp_contacts").insert({
            company_id: companyId,
            phone,
            name: r.contato || r.empresa || phone,
            lead_id: leadId,
            labels: ["pulse", "outbound"],
            conversation_status: "fila",
          } as any);
        }
        created++;
      } catch (e) {
        console.error("[pulse import]", e);
        errors++;
      }
    }

    setImporting(false);
    setResult({ created, skipped, errors });
    toast.success(`Importação concluída: ${created} criados, ${skipped} ignorados, ${errors} erros`);
    onImported();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importar leads (Excel/CSV)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Arquivo (.xlsx, .xls, .csv)</Label>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="cursor-pointer" />
              {fileName && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> {fileName}
                </div>
              )}
            </div>
            <div>
              <Label>Campanha de destino</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={targetCampaign}
                onChange={(e) => setTargetCampaign(e.target.value)}
              >
                <option value="">Selecione...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Colunas reconhecidas: empresa, contato, telefone (obrigatório), email, origem, observacoes, motivo_perda, cidade, estado, valor_mrr. Aceita variações (Phone, Nome, Razão Social...).
          </div>

          {!!rows.length && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Badge variant="secondary">{rows.length} linhas</Badge>{" "}
                  <Badge variant="outline">{rows.filter((r) => !normalizePhone(r.telefone)).length} sem telefone</Badge>
                </div>
                <Button onClick={doImport} disabled={importing || !targetCampaign}>
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Importar para campanha
                </Button>
              </div>
              <div className="overflow-x-auto rounded border border-border/40 max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Empresa</th>
                      <th className="p-2 text-left">Contato</th>
                      <th className="p-2 text-left">Telefone</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Cidade/UF</th>
                      <th className="p-2 text-left">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => {
                      const valid = !!normalizePhone(r.telefone);
                      return (
                        <tr key={i} className={`border-t border-border/40 ${!valid ? "opacity-50" : ""}`}>
                          <td className="p-2">{r.empresa || "—"}</td>
                          <td className="p-2">{r.contato || "—"}</td>
                          <td className="p-2 font-mono">{r.telefone || <span className="text-destructive">— (faltando)</span>}</td>
                          <td className="p-2">{r.email || "—"}</td>
                          <td className="p-2">{[r.cidade, r.estado].filter(Boolean).join("/") || "—"}</td>
                          <td className="p-2 truncate max-w-[260px]">{r.observacoes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && (
                <div className="text-xs text-muted-foreground text-center">
                  Mostrando primeiras 50 de {rows.length} linhas
                </div>
              )}
            </>
          )}

          {result && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <ResultCard label="Importados" value={result.created} icon={CheckCircle2} color="emerald" />
              <ResultCard label="Ignorados" value={result.skipped} icon={AlertCircle} color="amber" />
              <ResultCard label="Erros" value={result.errors} icon={AlertCircle} color="rose" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-500",
    amber: "bg-amber-500/15 text-amber-500",
    rose: "bg-rose-500/15 text-rose-500",
  };
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
