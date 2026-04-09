import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, MoreVertical, Eye, Download, Trash2,
  FileText, Clock, CheckCircle2, AlertCircle, FileSignature,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const statusConfig: Record<string, { label: string; color: string }> = {
  gerado: { label: "Gerado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  enviado: { label: "Enviado", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  assinado: { label: "Assinado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const tipoLabels: Record<string, string> = {
  contrato: "Contrato",
  proposta: "Proposta",
  termo: "Termo",
  aditivo: "Aditivo",
};

interface Template {
  id: string;
  nome: string;
  tipo: string;
  arquivo_url: string | null;
}

interface GeneratedDoc {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  pdf_url: string | null;
  created_by_name: string | null;
  created_at: string;
  template_id: string | null;
  proposal_id: string | null;
  document_templates?: { nome: string } | null;
}

interface Props {
  lead: CrmLead;
  addActivity?: (data: any) => Promise<any>;
}

/** Map of template variables to lead data */
function buildVariableMap(lead: CrmLead) {
  const now = new Date();
  return {
    "{{nome_completo}}": lead.contact_name || lead.company_name || "",
    "{{cpf}}": lead.documento || "",
    "{{cnpj}}": lead.documento || "",
    "{{razao_social}}": lead.company_name || "",
    "{{email}}": lead.email || "",
    "{{telefone}}": lead.phone || "",
    "{{whatsapp}}": lead.phone || "",
    "{{endereco}}": lead.endereco || "",
    "{{numero}}": lead.numero || "",
    "{{bairro}}": lead.bairro || "",
    "{{cidade}}": lead.cidade || "",
    "{{estado}}": lead.estado || "",
    "{{cep}}": lead.cep || "",
    "{{nome_empresa}}": lead.company_name || "",
    "{{data_atual}}": now.toLocaleDateString("pt-BR"),
    "{{valor_proposta}}": lead.value_mrr?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00",
  };
}

export function LeadDocumentosTab({ lead, addActivity }: Props) {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();

  const [documents, setDocuments] = useState<GeneratedDoc[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [docName, setDocName] = useState("");
  const [generating, setGenerating] = useState(false);

  // View
  const [viewDoc, setViewDoc] = useState<GeneratedDoc | null>(null);

  const servidorId = companyId || lead.servidor_id;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_documents")
      .select("*, document_templates(nome)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setDocuments((data as any) || []);
    setLoading(false);
  }, [lead.id]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("servidor_id", servidorId)
      .eq("ativo", true)
      .order("nome");
    setTemplates((data as any) || []);
  }, [servidorId]);

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, [fetchDocuments, fetchTemplates]);

  const handleGenerate = async () => {
    if (!selectedTemplate) return toast.error("Selecione um modelo");
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    setGenerating(true);

    // Build filled HTML content from lead data
    const vars = buildVariableMap(lead);
    let htmlContent = `<h1>${template.nome}</h1><p>Documento gerado automaticamente.</p>`;
    // If template has content, replace variables
    Object.entries(vars).forEach(([key, val]) => {
      htmlContent = htmlContent.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
    });

    const finalName = docName.trim() || `${template.nome} - ${lead.company_name}`;

    const { error } = await supabase.from("generated_documents").insert({
      servidor_id: servidorId,
      lead_id: lead.id,
      template_id: template.id,
      nome: finalName,
      tipo: template.tipo,
      status: "gerado",
      html_content: htmlContent,
      pdf_url: template.arquivo_url,
      created_by_user_id: profile?.user_id,
      created_by_name: profile?.name,
    });

    setGenerating(false);
    if (error) return toast.error("Erro ao gerar documento");
    toast.success("Documento gerado!");
    setGenerateOpen(false);
    setSelectedTemplate("");
    setDocName("");
    fetchDocuments();
    addActivity?.({ type: "document", title: `Documento "${finalName}" gerado` });
  };

  const handleDelete = async (doc: GeneratedDoc) => {
    const { error } = await supabase.from("generated_documents").delete().eq("id", doc.id);
    if (error) return toast.error("Erro ao excluir documento");
    toast.success("Documento excluído");
    fetchDocuments();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Documentos Gerados</h3>
          <p className="text-xs text-muted-foreground">{documents.length} documento(s)</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setGenerateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Gerar Documento
        </Button>
      </div>

      {/* List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum documento</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Gere um documento a partir de um modelo do Tenant</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const cfg = statusConfig[doc.status] || statusConfig.gerado;
            return (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileSignature className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{doc.nome}</span>
                        <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.color)}>
                          {cfg.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {tipoLabels[doc.tipo] || doc.tipo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtDate(doc.created_at)}
                        </span>
                        {doc.created_by_name && <span>por {doc.created_by_name}</span>}
                        {doc.document_templates && (
                          <span className="text-muted-foreground/60">
                            Modelo: {(doc.document_templates as any).nome}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {doc.pdf_url && (
                          <>
                            <DropdownMenuItem onClick={() => setViewDoc(doc)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(doc.pdf_url!, "_blank")}>
                              <Download className="h-3.5 w-3.5 mr-2" /> Baixar PDF
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Gerar Documento
            </DialogTitle>
            <DialogDescription>Selecione um modelo e gere o documento preenchido com os dados do lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo de Documento *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mx-auto mb-2 text-muted-foreground/40" />
                      Nenhum modelo cadastrado no Tenant
                    </div>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome} ({tipoLabels[t.tipo] || t.tipo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do documento (opcional)</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Deixe vazio para usar o nome do modelo" />
            </div>
            {selectedTemplate && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis preenchidas automaticamente:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {Object.entries(buildVariableMap(lead)).map(([key, val]) => (
                    val ? (
                      <div key={key} className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate">{key.replace(/\{\{|\}\}/g, "")}: {val}</span>
                      </div>
                    ) : null
                  )).filter(Boolean).slice(0, 10)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating || !selectedTemplate}>
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Gerar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base">{viewDoc?.nome}</DialogTitle>
          </DialogHeader>
          {viewDoc?.pdf_url && (
            <div className="rounded-lg border overflow-hidden bg-muted/20" style={{ height: "600px" }}>
              <iframe
                src={`${viewDoc.pdf_url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full h-full"
                title="Visualização do documento"
                style={{ border: "none" }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
