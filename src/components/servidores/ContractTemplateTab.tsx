import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Trash2, Loader2, Plus, Eye, AlertCircle,
  CheckCircle2, Tag, Star, StarOff, Edit, FileCode,
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
import { ContractEditorDialog } from "./ContractEditorDialog";

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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [companyBranding, setCompanyBranding] = useState<{
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    tenantName?: string;
    tenantCnpj?: string;
  }>({});

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");

  const fetchTemplates = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const [tplRes, companyRes] = await Promise.all([
      supabase.from("document_templates").select("*").eq("servidor_id", companyId).order("created_at", { ascending: false }),
      supabase.from("companies").select("brand_logo_url, brand_primary_color, brand_secondary_color, nome_fantasia, razao_social, cnpj").eq("id", companyId).maybeSingle(),
    ]);
    setTemplates((tplRes.data as any) || []);
    if (companyRes.data) {
      setCompanyBranding({
        logoUrl: companyRes.data.brand_logo_url,
        primaryColor: companyRes.data.brand_primary_color || "#1E2952",
        secondaryColor: companyRes.data.brand_secondary_color || "#4F46E5",
        tenantName: companyRes.data.nome_fantasia || companyRes.data.razao_social,
        tenantCnpj: companyRes.data.cnpj,
      });
    }
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

  const handleCreateNew = async () => {
    const ok = await ensureCompanyExists();
    if (!ok) {
      toast.error("Não foi possível preparar o tenant");
      return;
    }
    setEditingTemplate(null);
    setEditorMode("create");
    setEditorOpen(true);
  };

  const handleEdit = (tpl: Template) => {
    setEditingTemplate(tpl);
    setEditorMode("edit");
    setEditorOpen(true);
  };

  const handleSaveTemplate = async (name: string, htmlContent: string) => {
    if (!companyId) return;

    const placeholders = detectPlaceholders(htmlContent);
    const unsupported = placeholders.filter(p => !SUPPORTED_VARS.includes(p));

    if (editorMode === "create") {
      const { error } = await supabase.from("document_templates").insert({
        servidor_id: companyId,
        nome: name,
        tipo: "contrato",
        content_template: htmlContent,
        placeholders_json: placeholders as any,
        ativo: true,
      });
      if (error) {
        toast.error("Erro ao criar modelo: " + error.message);
        throw error;
      }
      toast.success(`Modelo "${name}" criado com sucesso!`);
    } else if (editingTemplate) {
      const { error } = await supabase.from("document_templates").update({
        nome: name,
        content_template: htmlContent,
        placeholders_json: placeholders as any,
      }).eq("id", editingTemplate.id);
      if (error) {
        toast.error("Erro ao atualizar modelo: " + error.message);
        throw error;
      }
      toast.success(`Modelo "${name}" atualizado com sucesso!`);
    }

    if (unsupported.length > 0) {
      toast.warning(`Variáveis não reconhecidas: ${unsupported.map(v => `{{${v}}}`).join(", ")}`);
    }

    await fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    try {
      if (template.arquivo_path) {
        await supabase.storage.from("contract-pdfs").remove([template.arquivo_path]);
      }
      await supabase.from("document_templates").delete().eq("id", id);
      toast.success("Modelo removido!");
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
      {/* Create new template */}
      <Card className="border-dashed border-2 border-border">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Criar Modelo de Contrato
          </h4>
          <p className="text-xs text-muted-foreground">
            Crie um modelo com editor rico estilo Word. Insira variáveis dinâmicas que serão substituídas automaticamente ao gerar o documento.
          </p>
          <Button onClick={handleCreateNew} size="sm" className="gap-2">
            <FileCode className="h-4 w-4" />
            Criar Novo Modelo
          </Button>
        </CardContent>
      </Card>

      {/* Templates list */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Modelos Cadastrados ({templates.length})</h4>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum modelo de contrato cadastrado</p>
            <p className="text-xs mt-1">Crie um modelo acima para começar a gerar documentos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(tpl => {
              const placeholders = (tpl.placeholders_json as any as string[]) || [];
              const unsupported = placeholders.filter(p => !SUPPORTED_VARS.includes(p));
              const isHtmlTemplate = !!tpl.content_template && !tpl.arquivo_url;
              const isPdfTemplate = !!tpl.arquivo_url;

              return (
                <Card key={tpl.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {isHtmlTemplate ? (
                            <FileCode className="h-5 w-5 text-primary" />
                          ) : (
                            <FileText className="h-5 w-5 text-primary" />
                          )}
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
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {isHtmlTemplate ? "Editor Rico" : "PDF"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {tpl.arquivo_nome || "Modelo HTML"} · {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
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

                        {/* Edit button for HTML templates */}
                        {isHtmlTemplate && (
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-8"
                            onClick={() => handleEdit(tpl)}>
                            <Edit className="h-3.5 w-3.5" /> Editar
                          </Button>
                        )}

                        {/* View PDF for legacy templates */}
                        {isPdfTemplate && tpl.arquivo_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => window.open(tpl.arquivo_url!, "_blank")} title="Visualizar PDF">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}

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

      <ContractEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        templateName={editingTemplate?.nome || ""}
        initialContent={editingTemplate?.content_template || ""}
        onSave={handleSaveTemplate}
        mode={editorMode}
        branding={companyBranding}
      />

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Os modelos cadastrados aqui aparecerão em "Gerar Documento" dentro dos cards de oportunidade. Use variáveis no formato {"{{variavel}}"} para preenchimento automático.
      </p>
    </div>
  );
}
