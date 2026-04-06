import { useState, useEffect, useCallback, useRef } from "react";
import { Rnd } from "react-rnd";
import {
  Upload, FileText, Trash2, Save, Loader2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Grid3X3, Undo2, DollarSign, FileSignature, Type,
  Calendar, PenTool, Hash, AlertCircle, Building2, MapPin, Phone, Mail,
  User, CreditCard, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PdfRenderer } from "@/components/contratos/PdfRenderer";

const TEMPLATE_FIELD_TYPES = [
  // Campos do Contrato
  { type: "valor", label: "Valor", icon: DollarSign, defaultW: 180, defaultH: 36, group: "contrato" },
  { type: "clausula", label: "Cláusula", icon: FileText, defaultW: 400, defaultH: 80, group: "contrato" },
  { type: "assinatura", label: "Assinatura", icon: FileSignature, defaultW: 200, defaultH: 60, group: "contrato" },
  { type: "data", label: "Data", icon: Calendar, defaultW: 140, defaultH: 36, group: "contrato" },
  { type: "plano", label: "Plano", icon: PenTool, defaultW: 200, defaultH: 36, group: "contrato" },
  // Campos do Servidor (Empresa)
  { type: "servidor_razao", label: "Razão Social Servidor", icon: Building2, defaultW: 260, defaultH: 36, group: "servidor" },
  { type: "servidor_fantasia", label: "Nome Fantasia Servidor", icon: Building2, defaultW: 240, defaultH: 36, group: "servidor" },
  { type: "servidor_cnpj", label: "CNPJ Servidor", icon: CreditCard, defaultW: 200, defaultH: 36, group: "servidor" },
  { type: "servidor_endereco", label: "Endereço Servidor", icon: MapPin, defaultW: 320, defaultH: 36, group: "servidor" },
  { type: "servidor_cidade_uf", label: "Cidade/UF Servidor", icon: Home, defaultW: 200, defaultH: 36, group: "servidor" },
  { type: "servidor_cep", label: "CEP Servidor", icon: MapPin, defaultW: 140, defaultH: 36, group: "servidor" },
  { type: "servidor_telefone", label: "Telefone Servidor", icon: Phone, defaultW: 180, defaultH: 36, group: "servidor" },
  { type: "servidor_email", label: "E-mail Servidor", icon: Mail, defaultW: 220, defaultH: 36, group: "servidor" },
  { type: "servidor_responsavel", label: "Responsável Servidor", icon: User, defaultW: 200, defaultH: 36, group: "servidor" },
  // Campos do Cliente (Lead)
  { type: "nome_cliente", label: "Nome Cliente", icon: Type, defaultW: 200, defaultH: 36, group: "cliente" },
  { type: "cpf_cnpj", label: "CPF/CNPJ Cliente", icon: Hash, defaultW: 180, defaultH: 36, group: "cliente" },
  { type: "cliente_email", label: "E-mail Cliente", icon: Mail, defaultW: 220, defaultH: 36, group: "cliente" },
  { type: "cliente_telefone", label: "Telefone Cliente", icon: Phone, defaultW: 180, defaultH: 36, group: "cliente" },
  { type: "cliente_endereco", label: "Endereço Cliente", icon: MapPin, defaultW: 320, defaultH: 36, group: "cliente" },
  { type: "cliente_cidade_uf", label: "Cidade/UF Cliente", icon: Home, defaultW: 200, defaultH: 36, group: "cliente" },
  { type: "cliente_cep", label: "CEP Cliente", icon: MapPin, defaultW: 140, defaultH: 36, group: "cliente" },
  { type: "cliente_contato", label: "Contato Cliente", icon: User, defaultW: 200, defaultH: 36, group: "cliente" },
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
}

export function ContractTemplateTab({ companyId }: Props) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Contrato Padrão");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [undoStack, setUndoStack] = useState<TemplateField[][]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

        const { data: fieldData } = await supabase
          .from("company_contract_template_fields")
          .select("*")
          .eq("template_id", t.id);

        if (fieldData) {
          setFields(fieldData.map((f: any) => ({
            id: f.id,
            field_type: f.field_type,
            label: f.label || f.field_type,
            pos_x: Number(f.pos_x),
            pos_y: Number(f.pos_y),
            width: Number(f.width),
            height: Number(f.height),
            page: f.page,
            required: f.required,
          })));
        }
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }

    setUploading(true);
    try {
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

      // Delete old template if exists
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
        } as any)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      setTemplateId((newTemplate as any).id);
      setPdfUrl(urlData.publicUrl);
      setPdfPath(filePath);
      setFields([]);
      setCurrentPage(1);
      toast.success("PDF do contrato enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar PDF: " + (err.message || ""));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    if (!templateId) return;
    setSaving(true);
    try {
      // Update template name
      await supabase.from("company_contract_templates").update({ name: templateName } as any).eq("id", templateId);

      // Replace fields
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
      toast.success("Template de contrato salvo com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const pageFields = fields.filter(f => f.page === currentPage);
  const selectedField = fields.find(f => f.id === selectedFieldId);

  const FIELD_COLORS: Record<string, string> = {
    valor: "#f59e0b",
    clausula: "#8b5cf6",
    assinatura: "#3b82f6",
    nome_cliente: "#22c55e",
    cpf_cnpj: "#ec4899",
    data: "#06b6d4",
    plano: "#f97316",
    servidor_razao: "#14b8a6",
    servidor_fantasia: "#14b8a6",
    servidor_cnpj: "#14b8a6",
    servidor_endereco: "#14b8a6",
    servidor_cidade_uf: "#14b8a6",
    servidor_cep: "#14b8a6",
    servidor_telefone: "#14b8a6",
    servidor_email: "#14b8a6",
    servidor_responsavel: "#14b8a6",
    cliente_email: "#22c55e",
    cliente_telefone: "#22c55e",
    cliente_endereco: "#22c55e",
    cliente_cidade_uf: "#22c55e",
    cliente_cep: "#22c55e",
    cliente_contato: "#22c55e",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-40 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Salve o servidor primeiro para configurar o contrato padrão.</p>
      </div>
    );
  }

  // Upload step
  if (!pdfUrl) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do Template</Label>
          <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Contrato de Adesão" />
        </div>
        <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Faça upload do PDF do contrato modelo</p>
            <p className="text-xs text-muted-foreground mt-1">Este PDF será usado como base para todos os contratos gerados após finalizar vendas</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Selecionar PDF"}
          </Button>
        </div>
      </div>
    );
  }

  // Builder step
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input value={templateName} onChange={e => setTemplateName(e.target.value)} className="text-sm" />
        </div>
        <Badge variant="outline" className="shrink-0">{fields.length} campo(s)</Badge>
        <Button variant="outline" size="sm" onClick={() => { setPdfUrl(null); setPdfPath(null); setFields([]); setTemplateId(null); }} className="gap-1 text-xs">
          <Trash2 className="h-3.5 w-3.5" /> Trocar PDF
        </Button>
        <Button size="sm" onClick={saveFields} disabled={saving} className="gap-1 text-xs">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </Button>
      </div>

      {/* Field palette */}
      <div className="space-y-2">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Contrato</span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_FIELD_TYPES.filter(ft => ft.group === "contrato").map(ft => (
              <Button key={ft.type} variant="outline" size="sm" onClick={() => addField(ft.type)} className="gap-1.5 text-xs h-8" style={{ borderColor: FIELD_COLORS[ft.type] + "80" }}>
                <ft.icon className="h-3.5 w-3.5" style={{ color: FIELD_COLORS[ft.type] }} />
                {ft.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Servidor</span>
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Cliente</span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_FIELD_TYPES.filter(ft => ft.group === "cliente").map(ft => (
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
                      const Icon = TEMPLATE_FIELD_TYPES.find(f => f.type === field.field_type)?.icon || Type;
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
        Ao gerar proposta no CRM, os valores reais serão preenchidos automaticamente.
      </p>
    </div>
  );
}
