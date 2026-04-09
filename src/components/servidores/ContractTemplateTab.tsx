import { useState, useEffect, useCallback, useRef } from "react";
import { Rnd } from "react-rnd";
import {
  Upload, FileText, Trash2, Save, Loader2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Grid3X3, Undo2, DollarSign, FileSignature,
  Hash, AlertCircle, MapPin, Building2, ImageIcon, Mail, ClipboardList,
  Eye, Tags, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PdfRenderer } from "@/components/contratos/PdfRenderer";

const TEMPLATE_FIELD_TYPES = [
  { type: "servidor_logo", label: "Logo Servidor", icon: ImageIcon, defaultW: 120, defaultH: 60, group: "servidor" },
  { type: "empresa", label: "Empresa (Contratante)", icon: Building2, defaultW: 480, defaultH: 60, group: "servidor" },
  { type: "servidor_cnpj", label: "Bloco Dados Servidor", icon: Hash, defaultW: 480, defaultH: 60, group: "servidor" },
  { type: "servidor_endereco", label: "Endereço Servidor", icon: MapPin, defaultW: 300, defaultH: 36, group: "servidor" },
  { type: "servidor_email", label: "E-mail Servidor", icon: Mail, defaultW: 240, defaultH: 36, group: "servidor" },
  { type: "campo_proposta", label: "Campo Proposta", icon: ClipboardList, defaultW: 400, defaultH: 120, group: "proposta" },
  { type: "valor_mrr", label: "Valor MRR", icon: DollarSign, defaultW: 140, defaultH: 36, group: "proposta" },
  { type: "assinatura", label: "Assinatura", icon: FileSignature, defaultW: 200, defaultH: 60, group: "proposta" },
];

const DYNAMIC_TAGS = [
  { tag: "{{nome_cliente}}", label: "Nome do Cliente", mock: "João da Silva" },
  { tag: "{{cpf_cnpj}}", label: "CPF/CNPJ", mock: "123.456.789-00" },
  { tag: "{{email}}", label: "E-mail Cliente", mock: "joao@email.com" },
  { tag: "{{telefone}}", label: "Telefone", mock: "(11) 99999-9999" },
  { tag: "{{endereco}}", label: "Endereço Completo", mock: "Rua das Flores, 123 - Centro, São Paulo/SP" },
  { tag: "{{cep}}", label: "CEP", mock: "01234-567" },
  { tag: "{{valor_mrr}}", label: "Valor MRR", mock: "R$ 199,90" },
  { tag: "{{valor_ps}}", label: "Valor P&S", mock: "R$ 500,00" },
  { tag: "{{plano}}", label: "Plano Contratado", mock: "Plano Premium" },
  { tag: "{{data_atual}}", label: "Data Atual", mock: new Date().toLocaleDateString("pt-BR") },
  { tag: "{{servidor_razao}}", label: "Razão Social Servidor", mock: "Accord Tecnologia Ltda" },
  { tag: "{{servidor_cnpj}}", label: "CNPJ Servidor", mock: "12.345.678/0001-90" },
  { tag: "{{servidor_endereco}}", label: "Endereço Servidor", mock: "Av. Paulista, 1000 - Bela Vista, São Paulo/SP" },
];

const SNAP_SIZE = 10;
const snapToGrid = (v: number) => Math.round(v / SNAP_SIZE) * SNAP_SIZE;

interface TemplateField {
  id: string;
  field_type: string;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
}

interface Props {
  companyId: string | null;
  onEnsureCompany?: () => Promise<boolean>;
}

export function ContractTemplateTab({ companyId, onEnsureCompany }: Props) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Contrato Padrão");
  const [contractContent, setContractContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Builder state
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [undoStack, setUndoStack] = useState<TemplateField[][]>([]);
  const [editorMode, setEditorMode] = useState<"upload" | "editor">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing template
  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data: templates } = await supabase
        .from("company_contract_templates")
        .select("*")
        .eq("company_id", companyId)
        .limit(1);

      if (templates && templates.length > 0) {
        const t = templates[0] as any;
        setTemplateId(t.id);
        setPdfUrl(t.pdf_url);
        setPdfPath(t.pdf_path);
        setTemplateName(t.name);
        setContractContent(t.contract_content || "");

        const { data: fieldData } = await supabase
          .from("company_contract_template_fields")
          .select("*")
          .eq("template_id", t.id);

        if (fieldData) {
          setFields(fieldData.map((f: any) => {
            const normalizedType = f.field_type === "servidor_empresa" ? "empresa" : f.field_type;
            const typeDef = TEMPLATE_FIELD_TYPES.find(t => t.type === normalizedType);
            return {
              id: f.id,
              field_type: normalizedType,
              label: f.label || typeDef?.label || normalizedType,
              pos_x: Number(f.pos_x),
              pos_y: Number(f.pos_y),
              width: Number(f.width),
              height: Number(f.height),
              page: f.page,
              required: f.required,
            };
          }));
        }
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const ensureCompanyExists = async () => {
    if (!companyId) return false;
    const { data } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
    if (data) return true;
    if (onEnsureCompany) {
      return await onEnsureCompany();
    }
    return false;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setSelectedFileName(file.name);

    // Simulate progress
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

      if (templateId) {
        await supabase.from("company_contract_template_fields").delete().eq("template_id", templateId);
        await supabase.from("company_contract_templates").delete().eq("id", templateId);
        if (pdfPath) {
          await supabase.storage.from("contract-pdfs").remove([pdfPath]);
        }
      }

      const { data: newTemplate, error: insertErr } = await supabase
        .from("company_contract_templates")
        .insert({
          company_id: companyId,
          name: templateName,
          pdf_url: urlData.publicUrl,
          pdf_path: filePath,
          contract_content: contractContent || null,
        } as any)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      setTemplateId((newTemplate as any).id);
      setPdfUrl(urlData.publicUrl);
      setPdfPath(filePath);
      setFields([]);
      setCurrentPage(1);
      setUploadProgress(100);
      toast.success("PDF do contrato enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar PDF: " + (err.message || ""));
      setSelectedFileName(null);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePdf = async () => {
    if (pdfPath) {
      await supabase.storage.from("contract-pdfs").remove([pdfPath]);
    }
    if (templateId) {
      await supabase.from("company_contract_template_fields").delete().eq("template_id", templateId);
      await supabase.from("company_contract_templates").delete().eq("id", templateId);
    }
    setPdfUrl(null);
    setPdfPath(null);
    setTemplateId(null);
    setSelectedFileName(null);
    setFields([]);
    toast.success("PDF removido");
  };

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-20), fields.map(f => ({ ...f }))]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setFields(undoStack[undoStack.length - 1]);
    setUndoStack(s => s.slice(0, -1));
  };

  const addField = (type: string) => {
    pushUndo();
    const meta = TEMPLATE_FIELD_TYPES.find(f => f.type === type);
    const newField: TemplateField = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      field_type: type,
      label: meta?.label || type,
      pos_x: 50,
      pos_y: 50,
      width: meta?.defaultW || 200,
      height: meta?.defaultH || 40,
      page: currentPage,
      required: true,
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    pushUndo();
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setCanvasSize({ width: canvas.width, height: canvas.height });
  }, []);

  const saveFields = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const ok = await ensureCompanyExists();
      if (!ok) throw new Error("Não foi possível preparar o tenant");

      if (templateId) {
        await supabase.from("company_contract_templates").update({
          name: templateName,
          contract_content: contractContent || null,
        } as any).eq("id", templateId);

        await supabase.from("company_contract_template_fields").delete().eq("template_id", templateId);
        if (fields.length > 0) {
          const records = fields.map(f => ({
            template_id: templateId,
            field_type: f.field_type,
            label: f.label,
            pos_x: f.pos_x,
            pos_y: f.pos_y,
            width: f.width,
            height: f.height,
            page: f.page,
            required: f.required,
          }));
          const { error } = await supabase.from("company_contract_template_fields").insert(records as any);
          if (error) throw error;
        }
      } else {
        // Create template without PDF (text-only mode)
        const { data: newTemplate, error: insertErr } = await supabase
          .from("company_contract_templates")
          .insert({
            company_id: companyId,
            name: templateName,
            pdf_url: pdfUrl || "",
            pdf_path: pdfPath || "",
            contract_content: contractContent || null,
          } as any)
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        setTemplateId((newTemplate as any).id);
      }
      toast.success("Template de contrato salvo com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContractContent(prev => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = contractContent.substring(0, start);
    const after = contractContent.substring(end);
    setContractContent(before + tag + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success("Tag copiada!");
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const getPreviewContent = () => {
    let content = contractContent;
    DYNAMIC_TAGS.forEach(t => {
      content = content.split(t.tag).join(t.mock);
    });
    return content;
  };

  const pageFields = fields.filter(f => f.page === currentPage);
  const selectedField = fields.find(f => f.id === selectedFieldId);

  const FIELD_COLORS: Record<string, string> = {
    servidor_logo: "#a855f7",
    empresa: "#8b5cf6",
    servidor_cnpj: "#ec4899",
    servidor_endereco: "#14b8a6",
    servidor_email: "#06b6d4",
    campo_proposta: "#f97316",
    valor_mrr: "#f59e0b",
    assinatura: "#3b82f6",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do Template</Label>
        <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Contrato de Adesão" />
      </div>

      <Tabs value={editorMode} onValueChange={v => setEditorMode(v as "upload" | "editor")} className="w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              PDF Base
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2">
              <FileText className="h-4 w-4" />
              Editor de Texto
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="gap-2" disabled={!contractContent && !pdfUrl}>
              <Eye className="h-4 w-4" />
              Visualizar Contrato
            </Button>
            <Button size="sm" onClick={saveFields} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* PDF Upload Tab */}
        <TabsContent value="upload" className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="hidden"
          />

          {!pdfUrl ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-4 text-center">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Faça upload do PDF do contrato modelo</p>
                <p className="text-xs text-muted-foreground mt-1">Este PDF será usado como base para todos os contratos gerados após finalizar vendas</p>
              </div>

              {uploading && (
                <div className="w-full max-w-xs space-y-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedFileName} — {Math.round(uploadProgress)}%</p>
                </div>
              )}

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Enviando..." : "Selecionar PDF"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Uploaded file info */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFileName || pdfPath?.split("/").pop() || "Contrato PDF"}</p>
                  <p className="text-xs text-muted-foreground">PDF enviado com sucesso</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1 text-xs shrink-0">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Trocar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemovePdf} className="gap-1 text-xs text-destructive hover:text-destructive shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </div>

              {/* Field palette */}
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Dados do Servidor (Contratada)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_FIELD_TYPES.filter(ft => ft.group === "servidor").map(ft => (
                      <Button key={ft.type} variant="outline" size="sm" onClick={() => addField(ft.type)} className="gap-1.5 text-xs h-8" style={{ borderColor: FIELD_COLORS[ft.type] + "80" }}>
                        <ft.icon className="h-3.5 w-3.5" style={{ color: FIELD_COLORS[ft.type] }} />
                        {ft.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Detalhes da Proposta</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_FIELD_TYPES.filter(ft => ft.group === "proposta").map(ft => (
                      <Button key={ft.type} variant="outline" size="sm" onClick={() => addField(ft.type)} className="gap-1.5 text-xs h-8" style={{ borderColor: FIELD_COLORS[ft.type] + "80" }}>
                        <ft.icon className="h-3.5 w-3.5" style={{ color: FIELD_COLORS[ft.type] }} />
                        {ft.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.15))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(2, s + 0.15))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button variant={snapEnabled ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setSnapEnabled(!snapEnabled)}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={undoStack.length === 0}>
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* PDF + overlay */}
              <div className="border border-border rounded-lg overflow-auto bg-muted/30 max-h-[50vh]" onClick={() => setSelectedFieldId(null)}>
                <div className="flex justify-center p-4">
                  <div className="relative" style={{ width: canvasSize.width || "auto", height: canvasSize.height || "auto" }}>
                    <PdfRenderer
                      pdfUrl={pdfUrl}
                      currentPage={currentPage}
                      onTotalPages={setTotalPages}
                      scale={scale}
                      onCanvasReady={handleCanvasReady}
                    />

                    {pageFields.map(field => {
                      const color = FIELD_COLORS[field.field_type] || "#3b82f6";
                      return (
                        <Rnd
                          key={field.id}
                          size={{ width: field.width, height: field.height }}
                          position={{ x: field.pos_x, y: field.pos_y }}
                          onDragStart={() => pushUndo()}
                          onDragStop={(_, d) => {
                            const x = snapEnabled ? snapToGrid(d.x) : d.x;
                            const y = snapEnabled ? snapToGrid(d.y) : d.y;
                            updateField(field.id, { pos_x: x, pos_y: y });
                          }}
                          onResizeStart={() => pushUndo()}
                          onResizeStop={(_, __, ref, ___, pos) => {
                            const w = parseFloat(ref.style.width);
                            const h = parseFloat(ref.style.height);
                            updateField(field.id, {
                              width: snapEnabled ? snapToGrid(w) : w,
                              height: snapEnabled ? snapToGrid(h) : h,
                              pos_x: snapEnabled ? snapToGrid(pos.x) : pos.x,
                              pos_y: snapEnabled ? snapToGrid(pos.y) : pos.y,
                            });
                          }}
                          bounds="parent"
                          minWidth={30}
                          minHeight={20}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                          style={{ zIndex: selectedFieldId === field.id ? 50 : 10 }}
                        >
                          <div
                            className={`w-full h-full rounded border-2 flex items-center justify-center gap-1 text-xs font-medium cursor-move transition-shadow ${
                              selectedFieldId === field.id ? "shadow-lg ring-2 ring-primary" : "shadow-sm"
                            }`}
                            style={{
                              borderColor: color,
                              backgroundColor: color + "20",
                              color: color,
                            }}
                          >
                            {(() => {
                              const Icon = TEMPLATE_FIELD_TYPES.find(f => f.type === field.field_type)?.icon || FileText;
                              return <Icon className="h-3.5 w-3.5 shrink-0" />;
                            })()}
                            <span className="truncate">{field.label}</span>
                            {selectedFieldId === field.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </Rnd>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected field info */}
              {selectedField && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-xs">
                  <Badge style={{ backgroundColor: FIELD_COLORS[selectedField.field_type] + "20", color: FIELD_COLORS[selectedField.field_type], borderColor: FIELD_COLORS[selectedField.field_type] }}>
                    {selectedField.label}
                  </Badge>
                  <span className="text-muted-foreground">Pág {selectedField.page} • Pos ({Math.round(selectedField.pos_x)}, {Math.round(selectedField.pos_y)}) • {Math.round(selectedField.width)}×{Math.round(selectedField.height)}</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteField(selectedField.id)}>
                    <Trash2 className="h-3 w-3" /> Remover
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                💡 Arraste e redimensione os campos para definir onde cada informação aparecerá no contrato final.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Text Editor Tab */}
        <TabsContent value="editor" className="mt-4 space-y-4">
          {/* Dynamic Tags Palette */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags Dinâmicas</span>
            </div>
            <p className="text-xs text-muted-foreground">Clique para inserir no cursor ou copie para usar manualmente</p>
            <div className="flex flex-wrap gap-1.5">
              {DYNAMIC_TAGS.map(t => (
                <div key={t.tag} className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => insertTag(t.tag)}
                    className="gap-1 text-xs h-7 rounded-r-none border-r-0"
                    title={`Inserir ${t.label}`}
                  >
                    {t.label}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyTag(t.tag)}
                    className="h-7 w-7 p-0 rounded-l-none"
                    title="Copiar tag"
                  >
                    {copiedTag === t.tag ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Text Editor */}
          <div className="space-y-2">
            <Label>Conteúdo do Contrato</Label>
            <textarea
              ref={textareaRef}
              value={contractContent}
              onChange={e => setContractContent(e.target.value)}
              placeholder={"CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nPelo presente instrumento particular, de um lado {{servidor_razao}}, inscrita no CNPJ nº {{servidor_cnpj}}, com sede em {{servidor_endereco}}, doravante denominada CONTRATADA...\n\nE de outro lado, {{nome_cliente}}, inscrito no CPF/CNPJ nº {{cpf_cnpj}}, residente em {{endereco}}, CEP {{cep}}, telefone {{telefone}}, e-mail {{email}}, doravante denominado CONTRATANTE...\n\nCLÁUSULA PRIMEIRA - DO OBJETO\n\nO presente contrato tem por objeto a prestação de serviços do plano {{plano}}, pelo valor mensal de {{valor_mrr}}..."}
              className="w-full min-h-[300px] rounded-lg border border-border bg-background p-4 text-sm font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              💡 Use as tags dinâmicas acima para inserir dados que serão preenchidos automaticamente. Ex: {"{{nome_cliente}}"} será substituído pelo nome real do cliente.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Pré-visualização do Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {contractContent ? (
              <div className="bg-white text-black rounded-lg p-8 shadow-inner border border-border min-h-[400px]">
                <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                  {getPreviewContent()}
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p className="text-sm">O preview de texto não está disponível. O contrato usa um PDF base com campos posicionados.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p className="text-sm">Nenhum conteúdo de contrato configurado.</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Esta é uma pré-visualização com dados fictícios. Os valores reais serão preenchidos automaticamente ao gerar o contrato.
            </p>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
