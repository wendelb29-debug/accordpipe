import { useState, useCallback, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Save, Send,
  FileSignature, Type, Calendar, Mail, CheckSquare, PenTool, Trash2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PdfRenderer } from "./PdfRenderer";
import { supabase } from "@/integrations/supabase/client";
import type { PdfContractSigner } from "@/hooks/usePdfContracts";

export interface BuilderField {
  id: string;
  field_type: string;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  page: number;
  signer_id: string | null;
  signer_color: string;
  required: boolean;
}

const FIELD_TYPES = [
  { type: "signature", label: "Assinatura", icon: FileSignature },
  { type: "name", label: "Nome", icon: Type },
  { type: "date", label: "Data", icon: Calendar },
  { type: "email", label: "Email", icon: Mail },
  { type: "text", label: "Texto", icon: PenTool },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
];

const SIGNER_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contractId: string;
  pdfUrl: string;
  signers: PdfContractSigner[];
  onComplete: () => void;
}

export function SignatureBuilderDialog({ open, onOpenChange, contractId, pdfUrl, signers, onComplete }: Props) {
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Assign colors to signers
  const signerColorMap = signers.reduce((acc, s, i) => {
    acc[s.id] = SIGNER_COLORS[i % SIGNER_COLORS.length];
    return acc;
  }, {} as Record<string, string>);

  // Load existing fields
  useEffect(() => {
    if (!open || !contractId) return;
    const load = async () => {
      const { data } = await supabase
        .from("pdf_contract_fields")
        .select("*")
        .eq("contract_id", contractId);
      if (data && data.length > 0) {
        setFields(data.map((d: any) => ({
          id: d.id,
          field_type: d.field_type,
          label: d.label || d.field_type,
          pos_x: d.pos_x,
          pos_y: d.pos_y,
          width: d.width,
          height: d.height,
          page: d.page,
          signer_id: d.signer_id,
          signer_color: d.signer_color || "#3b82f6",
          required: d.required,
        })));
      }
    };
    load();
  }, [open, contractId]);

  const addField = (type: string) => {
    const defaultSigner = signers.length > 0 ? signers[0].id : null;
    const newField: BuilderField = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      field_type: type,
      label: FIELD_TYPES.find(f => f.type === type)?.label || type,
      pos_x: 50,
      pos_y: 50,
      width: type === "checkbox" ? 30 : 200,
      height: type === "checkbox" ? 30 : 40,
      page: currentPage,
      signer_id: defaultSigner,
      signer_color: defaultSigner ? signerColorMap[defaultSigner] : "#3b82f6",
      required: true,
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<BuilderField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const assignSigner = (fieldId: string, signerId: string) => {
    const color = signerColorMap[signerId] || "#3b82f6";
    updateField(fieldId, { signer_id: signerId, signer_color: color });
  };

  const pageFields = fields.filter(f => f.page === currentPage);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setCanvasSize({ width: canvas.width, height: canvas.height });
  }, []);

  const saveFields = async () => {
    setSaving(true);
    try {
      // Delete existing fields for this contract
      await supabase.from("pdf_contract_fields").delete().eq("contract_id", contractId);

      if (fields.length > 0) {
        const records = fields.map(f => ({
          contract_id: contractId,
          field_type: f.field_type,
          label: f.label,
          pos_x: f.pos_x,
          pos_y: f.pos_y,
          width: f.width,
          height: f.height,
          page: f.page,
          signer_id: f.signer_id,
          signer_color: f.signer_color,
          required: f.required,
        }));
        const { error } = await supabase.from("pdf_contract_fields").insert(records as any);
        if (error) throw error;
      }

      toast.success("Campos salvos com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar campos: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendForSigning = async () => {
    await saveFields();
    toast.success("Contrato pronto para assinatura! Copie os links dos contratantes.");
    onComplete();
    onOpenChange(false);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 rounded-none border-none [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Top toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-sm font-semibold text-foreground">Editor de Assinatura</h2>
              <Badge variant="outline" className="text-xs">
                {fields.length} campo(s)
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="outline" size="sm" onClick={saveFields} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="ml-1.5">Salvar</span>
              </Button>
              <Button size="sm" onClick={handleSendForSigning} disabled={saving}>
                <Send className="h-4 w-4" />
                <span className="ml-1.5">Enviar</span>
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar - Field types */}
            <div className="w-56 border-r bg-card flex flex-col overflow-y-auto">
              <div className="p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Campos</p>
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => addField(ft.type)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-foreground"
                  >
                    <ft.icon className="h-4 w-4 text-primary" />
                    {ft.label}
                  </button>
                ))}
              </div>

              <Separator />

              {/* Signers legend */}
              <div className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contratantes</p>
                {signers.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: signerColorMap[s.id] }} />
                    <span className="truncate text-foreground">{s.name}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Selected field properties */}
              {selectedField && (
                <div className="p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propriedades</p>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <p className="text-sm font-medium text-foreground">{selectedField.label}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Responsável</label>
                    <Select
                      value={selectedField.signer_id || "none"}
                      onValueChange={(v) => assignSigner(selectedField.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {signers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: signerColorMap[s.id] }} />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Página: {selectedField.page}</p>
                    <p>Pos: {Math.round(selectedField.pos_x)}, {Math.round(selectedField.pos_y)}</p>
                    <p>Tam: {Math.round(selectedField.width)} × {Math.round(selectedField.height)}</p>
                  </div>
                  <Button variant="destructive" size="sm" className="w-full gap-1" onClick={() => deleteField(selectedField.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              )}
            </div>

            {/* PDF canvas area */}
            <div className="flex-1 bg-muted/30 overflow-auto flex justify-center p-6" ref={containerRef}>
              <div className="relative" style={{ width: canvasSize.width || "auto", height: canvasSize.height || "auto" }}>
                <PdfRenderer
                  pdfUrl={pdfUrl}
                  currentPage={currentPage}
                  onTotalPages={setTotalPages}
                  scale={scale}
                  onCanvasReady={handleCanvasReady}
                />

                {/* Draggable fields overlay */}
                {pageFields.map(field => (
                  <Rnd
                    key={field.id}
                    size={{ width: field.width, height: field.height }}
                    position={{ x: field.pos_x, y: field.pos_y }}
                    onDragStop={(_, d) => updateField(field.id, { pos_x: d.x, pos_y: d.y })}
                    onResizeStop={(_, __, ref, ___, pos) => {
                      updateField(field.id, {
                        width: parseFloat(ref.style.width),
                        height: parseFloat(ref.style.height),
                        pos_x: pos.x,
                        pos_y: pos.y,
                      });
                    }}
                    bounds="parent"
                    minWidth={30}
                    minHeight={20}
                    className="z-10"
                    enableResizing
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <div
                      className={cn(
                        "w-full h-full rounded border-2 border-dashed flex items-center justify-center text-xs font-medium cursor-move transition-all",
                        selectedFieldId === field.id ? "ring-2 ring-offset-1" : "hover:ring-1"
                      )}
                      style={{
                        borderColor: field.signer_color,
                        backgroundColor: `${field.signer_color}20`,
                        color: field.signer_color,
                        // ring color set via border
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                    >
                      {field.label}
                    </div>
                  </Rnd>
                ))}
              </div>
            </div>

            {/* Right - Mini pages */}
            <div className="w-20 border-l bg-card overflow-y-auto p-2 space-y-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-full aspect-[3/4] rounded border text-xs flex items-center justify-center transition-all",
                    currentPage === page
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom pagination */}
          <div className="flex items-center justify-center gap-3 py-2 border-t bg-card">
            <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
