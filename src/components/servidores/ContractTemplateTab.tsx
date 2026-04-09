import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Trash2, Save, Loader2, Plus, Eye, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  pdf_url: string;
  pdf_path: string;
  contract_content: string | null;
  created_at: string;
}

interface Props {
  companyId: string | null;
  onEnsureCompany?: () => Promise<boolean>;
}

export function ContractTemplateTab({ companyId, onEnsureCompany }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("company_contract_templates")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [companyId]);

  const ensureCompanyExists = async () => {
    if (!companyId) return false;
    const { data } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
    if (data) return true;
    if (onEnsureCompany) return await onEnsureCompany();
    return false;
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

      const { error: insertErr } = await supabase
        .from("company_contract_templates")
        .insert({
          company_id: companyId,
          name: newName.trim(),
          pdf_url: urlData.publicUrl,
          pdf_path: filePath,
        } as any);
      if (insertErr) throw insertErr;

      setUploadProgress(100);
      toast.success(`Template "${newName.trim()}" criado com sucesso!`);
      setNewName("");
      await fetchTemplates();
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
      // Remove old file
      if (template.pdf_path) {
        await supabase.storage.from("contract-pdfs").remove([template.pdf_path]);
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
        .from("company_contract_templates")
        .update({ pdf_url: urlData.publicUrl, pdf_path: filePath } as any)
        .eq("id", replacingId);

      toast.success("PDF substituído com sucesso!");
      await fetchTemplates();
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
      if (template.pdf_path) {
        await supabase.storage.from("contract-pdfs").remove([template.pdf_path]);
      }
      await supabase.from("company_contract_template_fields").delete().eq("template_id", id);
      await supabase.from("company_contract_templates").delete().eq("id", id);
      toast.success("Template removido!");
      await fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao remover: " + (err.message || ""));
    }
    setConfirmDelete(null);
  };

  const handleViewPdf = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
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
            <Plus className="h-4 w-4" /> Adicionar Novo Template
          </h4>

          <div className="space-y-2">
            <Label>Nome do Template</Label>
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
                toast.error("Defina o nome do template primeiro");
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

      {/* Templates list */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Templates Cadastrados ({templates.length})</h4>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum template de contrato cadastrado</p>
            <p className="text-xs mt-1">Adicione um template acima para começar a gerar documentos no pipeline de vendas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(tpl => (
              <Card key={tpl.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tpl.pdf_path?.split("/").pop() || "—"} • {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewPdf(tpl.pdf_url)} title="Visualizar PDF">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-8"
                        onClick={() => {
                          setReplacingId(tpl.id);
                          setTimeout(() => replaceInputRef.current?.click(), 50);
                        }}
                        disabled={uploading}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Trocar PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(tpl.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Hidden replace input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleReplacePdf}
        className="hidden"
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template de contrato? Esta ação não pode ser desfeita.
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
        Os templates cadastrados aqui aparecerão no menu "Gerar Documento" dentro dos cards de oportunidade no pipeline de vendas.
      </p>
    </div>
  );
}
