import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Trash2, Loader2, Plus, Eye, AlertCircle,
  CheckCircle2, Tag, Star, StarOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Known supported variables
const SUPPORTED_VARS = [
  "tenant_nome","tenant_cnpj","tenant_razao_social","tenant_email","tenant_telefone",
  "tenant_endereco","tenant_cidade","tenant_estado",
  "nome_completo","cpf","cnpj","razao_social","documento_contratante","email","telefone",
  "whatsapp","data_nascimento","endereco","numero","bairro","cidade","estado","cep","nome_empresa",
  "nome_item","descricao_item","valor_proposta","valor_total","servicos_contratados",
  "nome_vendedor","email_vendedor","telefone_vendedor","data_nascimento_vendedor",
  "data_assinatura_cliente","hora_assinatura_cliente","geolocalizacao_cliente","selfie_cliente",
  "data_assinatura_vendedor","hora_assinatura_vendedor","geolocalizacao_vendedor","selfie_vendedor",
  "data_atual",
];

interface Template {
  id: string;
  nome: string;
  tipo: string;
  arquivo_url: string | null;
  arquivo_path: string | null;
  arquivo_nome: string | null;
  ativo: boolean;
  is_default: boolean;
  content_template: string | null;
  placeholders_json: string[] | null;
  created_at: string;
}

interface Props {
  companyId: string | null;
  onEnsureCompany?: () => Promise<boolean>;
}

async function extractTextFromPdf(url: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const doc = await pdfjsLib.getDocument(url).promise;
  let fullText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

function detectPlaceholders(text: string): string[] {
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const found = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export function ContractTemplateTab({ companyId, onEnsureCompany }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [extractingVars, setExtractingVars] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("servidor_id", companyId)
      .order("created_at", { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [companyId]);

  const ensureCompanyExists = async () => {
    if (!companyId) return false;
    const { data } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
    if (data) return true;
    if (onEnsureCompany) return await onEnsureCompany();
    return false;
  };

  const extractAndSaveVars = async (templateId: string, pdfUrl: string) => {
    setExtractingVars(true);
    try {
      const text = await extractTextFromPdf(pdfUrl);
      const placeholders = detectPlaceholders(text);
      const unsupported = placeholders.filter(p => !SUPPORTED_VARS.includes(p));

      await supabase
        .from("document_templates")
        .update({
          content_template: text,
          placeholders_json: placeholders as any,
        } as any)
        .eq("id", templateId);

      if (unsupported.length > 0) {
        toast.warning(`Variáveis não reconhecidas: ${unsupported.map(v => `{{${v}}}`).join(", ")}`);
      }
      if (placeholders.length > 0) {
        toast.success(`${placeholders.length} variável(is) detectada(s) no modelo`);
      } else {
        toast.info("Nenhuma variável {{...}} encontrada no PDF");
      }
    } catch (err: any) {
      console.error("Error extracting PDF text:", err);
      toast.error("Não foi possível extrair variáveis do PDF");
    }
    setExtractingVars(false);
  };

  const handleNewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }
    if (!newName.trim()) {
      toast.error("Defina o nome do template antes de fazer upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90));
    }, 300);

    try {
      const ok = await ensureCompanyExists();
      if (!ok) throw new Error("Não foi possível preparar o tenant");

      const sanitizedName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");
      const filePath = `templates/${companyId}/${Date.now()}_${sanitizedName}`;
      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);

      const { data: inserted, error: insertErr } = await supabase
        .from("document_templates")
        .insert({
          servidor_id: companyId,
          nome: newName.trim(),
          tipo: "contrato",
          arquivo_url: urlData.publicUrl,
          arquivo_path: filePath,
          arquivo_nome: file.name,
          ativo: true,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      setUploadProgress(100);
      toast.success(`Template "${newName.trim()}" criado com sucesso!`);
      setNewName("");
      await fetchTemplates();

      // Extract variables in background
      if (inserted) {
        extractAndSaveVars(inserted.id, urlData.publicUrl);
      }
    } catch (err: any) {
      toast.error("Erro ao enviar PDF: " + (err.message || ""));
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReplacePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingId || !companyId) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }

    const template = templates.find(t => t.id === replacingId);
    if (!template) return;

    setUploading(true);
    try {
      if (template.arquivo_path) {
        await supabase.storage.from("contract-pdfs").remove([template.arquivo_path]);
      }

      const sanitizedName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");
      const filePath = `templates/${companyId}/${Date.now()}_${sanitizedName}`;
      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);

      await supabase
        .from("document_templates")
        .update({
          arquivo_url: urlData.publicUrl,
          arquivo_path: filePath,
          arquivo_nome: file.name,
        })
        .eq("id", replacingId);

      toast.success("PDF substituído com sucesso!");
      await fetchTemplates();

      // Re-extract variables
      extractAndSaveVars(replacingId, urlData.publicUrl);
    } catch (err: any) {
      toast.error("Erro ao substituir PDF: " + (err.message || ""));
    } finally {
      setUploading(false);
      setReplacingId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    try {
      if (template.arquivo_path) {
        await supabase.storage.from("contract-pdfs").remove([template.arquivo_path]);
      }
      await supabase.from("document_templates").delete().eq("id", id);
      toast.success("Template removido!");
      await fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao remover: " + (err.message || ""));
    }
    setConfirmDelete(null);
  };

  const toggleActive = async (tpl: Template) => {
    await supabase.from("document_templates").update({ ativo: !tpl.ativo }).eq("id", tpl.id);
    fetchTemplates();
  };

  const toggleDefault = async (tpl: Template) => {
    if (!tpl.is_default && companyId) {
      // Remove default from others
      await supabase.from("document_templates").update({ is_default: false } as any).eq("servidor_id", companyId);
    }
    await supabase.from("document_templates").update({ is_default: !tpl.is_default } as any).eq("id", tpl.id);
    fetchTemplates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new template */}
      <Card className="border-dashed border-2 border-border">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar Novo Modelo de Contrato
          </h4>

          <div className="space-y-2">
            <Label>Nome do Modelo</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: Contrato de Adesão, Termo de Parceria..."
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleNewUpload}
            className="hidden"
          />

          {uploading && !replacingId && (
            <div className="w-full space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          )}

          <Button
            onClick={() => {
              if (!newName.trim()) {
                toast.error("Defina o nome do modelo primeiro");
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            size="sm"
            className="gap-2"
          >
            {uploading && !replacingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading && !replacingId ? "Enviando..." : "Selecionar PDF e Criar"}
          </Button>
        </CardContent>
      </Card>

      {extractingVars && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analisando variáveis do PDF...
        </div>
      )}

      {/* Templates list */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Modelos Cadastrados ({templates.length})</h4>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum modelo de contrato cadastrado</p>
            <p className="text-xs mt-1">Adicione um modelo acima para começar a gerar documentos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(tpl => {
              const placeholders = (tpl.placeholders_json as any as string[]) || [];
              const unsupported = placeholders.filter(p => !SUPPORTED_VARS.includes(p));
              return (
                <Card key={tpl.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{tpl.nome}</p>
                            {tpl.is_default && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">Padrão</Badge>
                            )}
                            {!tpl.ativo && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {tpl.arquivo_nome || "—"} · {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => toggleDefault(tpl)}
                          title={tpl.is_default ? "Remover como padrão" : "Definir como padrão"}
                        >
                          {tpl.is_default ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : <StarOff className="h-4 w-4" />}
                        </Button>
                        {tpl.arquivo_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => window.open(tpl.arquivo_url!, "_blank")} title="Visualizar PDF">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline" size="sm" className="gap-1 text-xs h-8"
                          onClick={() => { setReplacingId(tpl.id); setTimeout(() => replaceInputRef.current?.click(), 50); }}
                          disabled={uploading}
                        >
                          <Upload className="h-3.5 w-3.5" /> Trocar PDF
                        </Button>
                        <div className="flex items-center gap-1">
                          <Switch checked={tpl.ativo} onCheckedChange={() => toggleActive(tpl)} className="scale-75" />
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(tpl.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Detected variables */}
                    {placeholders.length > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />
                          {placeholders.length} variável(is) detectada(s)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {placeholders.map(v => {
                            const supported = SUPPORTED_VARS.includes(v);
                            return (
                              <Badge
                                key={v}
                                variant={supported ? "secondary" : "outline"}
                                className={`text-[10px] ${!supported ? "border-amber-400 text-amber-600 dark:text-amber-400" : ""}`}
                              >
                                {supported && <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-green-500" />}
                                {!supported && <AlertCircle className="h-2.5 w-2.5 mr-1 text-amber-500" />}
                                {`{{${v}}}`}
                              </Badge>
                            );
                          })}
                        </div>
                        {unsupported.length > 0 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                            ⚠ Variáveis não reconhecidas serão deixadas em branco na geração
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <input ref={replaceInputRef} type="file" accept="application/pdf" onChange={handleReplacePdf} className="hidden" />

      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo de contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Os modelos cadastrados aqui aparecerão em "Gerar Documento" dentro dos cards de oportunidade. Use variáveis no formato {"{{variavel}}"} no seu PDF para preenchimento automático.
      </p>
    </div>
  );
}
