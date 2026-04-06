import { useState, useCallback, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Save, Send,
  FileSignature, Type, Calendar, Mail, CheckSquare, PenTool, Trash2, Loader2,
  Grid3X3, Undo2, Menu, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PdfRenderer } from "./PdfRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
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

const SNAP_SIZE = 10;

function snapToGrid(value: number): number {
  return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contractId: string;
  pdfUrl: string;
  signers: PdfContractSigner[];
  onComplete: () => void;
}

export function SignatureBuilderDialog({ open, onOpenChange, contractId, pdfUrl, signers, onComplete }: Props) {
  const isMobile = useIsMobile();
  const [fields, setFields] = useState<BuilderField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(isMobile ? 0.8 : 1.2);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [undoStack, setUndoStack] = useState<BuilderField[][]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!open || fields.length === 0) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveFieldsSilent();
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [fields, open]);

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-20), fields.map(f => ({ ...f }))]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setFields(prev);
  };

  const addField = (type: string) => {
    pushUndo();
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
    if (isMobile) setSidebarOpen(false);
  };

  const updateField = (id: string, updates: Partial<BuilderField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    pushUndo();
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

  const saveFieldsSilent = async () => {
    try {
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
        await supabase.from("pdf_contract_fields").insert(records as any);
      }
    } catch {}
  };

  const saveFields = async () => {
    setSaving(true);
    try {
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
    if (fields.length === 0) {
      toast.error("Adicione pelo menos um campo antes de enviar.");
      return;
    }
    const fieldsWithoutSigner = fields.filter(f => !f.signer_id);
    if (fieldsWithoutSigner.length > 0) {
      toast.error("Todos os campos devem ter um responsável atribuído.");
      return;
    }
    await saveFields();
    toast.success("Contrato pronto para assinatura! Copie os links dos contratantes.");
    onComplete();
    onOpenChange(false);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const signedSignersCount = signers.filter(s => s.status === "assinado").length;
  const totalSigners = signers.length;

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Progress */}
      {totalSigners > 0 && (
        <div className="p-3 space-y-2 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progresso</p>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${totalSigners > 0 ? (signedSignersCount / totalSigners) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{signedSignersCount} de {totalSigners} assinatura(s)</p>
        </div>
      )}

      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Campos</p>
        {FIELD_TYPES.map(ft => (
          <button
            key={ft.type}
            onClick={() => addField(ft.type)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-md hover:bg-accent transition-colors text-foreground group"
          >
            <ft.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            {ft.label}
          </button>
        ))}
      </div>

      <Separator />

      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contratantes</p>
        {signers.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-accent/50 transition-colors">
            <div className="w-3 h-3 rounded-full shrink-0 ring-2 ring-background shadow-sm" style={{ backgroundColor: signerColorMap[s.id] }} />
            <div className="min-w-0 flex-1">
              <span className="truncate text-foreground block text-xs font-medium">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">Ordem: {idx + 1} • {s.status === "assinado" ? "✅ Assinado" : "⏳ Pendente"}</span>
            </div>
          </div>
        ))}
      </div>

      <Separator />

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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] p-0 gap-0 rounded-none border-none [&>button]:hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top toolbar */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b bg-card shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0">
                    <SidebarContent />
                  </SheetContent>
                </Sheet>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0">
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-sm font-semibold text-foreground truncate hidden sm:block">Editor de Assinatura</h2>
              <Badge variant="outline" className="text-xs shrink-0">
                {fields.length} campo(s)
              </Badge>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant={snapEnabled ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setSnapEnabled(!snapEnabled)}
                title="Snap Grid"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={undoStack.length === 0} title="Desfazer">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center hidden sm:inline">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={saveFields} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline ml-1">Salvar</span>
              </Button>
              <Button size="sm" className="h-8 gap-1" onClick={handleSendForSigning} disabled={saving}>
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">Enviar</span>
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left sidebar - Desktop only */}
            {!isMobile && (
              <div className="w-56 border-r bg-card shrink-0">
                <SidebarContent />
              </div>
            )}

            {/* PDF canvas area */}
            <div
              className="flex-1 bg-muted/30 overflow-auto flex justify-center p-2 sm:p-6"
              ref={containerRef}
              onClick={() => setSelectedFieldId(null)}
            >
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
                    className="z-10"
                    enableResizing
                  >
                    <div
                      className={cn(
                        "w-full h-full rounded-md border-2 flex items-center justify-center text-xs font-semibold cursor-move transition-all select-none relative group",
                        selectedFieldId === field.id
                          ? "ring-2 ring-offset-2 shadow-xl border-solid scale-[1.02]"
                          : "border-dashed hover:ring-1 hover:shadow-lg hover:scale-[1.01]"
                      )}
                      style={{
                        borderColor: field.signer_color,
                        backgroundColor: `${field.signer_color}15`,
                        color: field.signer_color,
                        // @ts-ignore - ring color via CSS var
                        '--tw-ring-color': field.signer_color,
                      } as React.CSSProperties}
                      onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                    >
                      {field.field_type === "signature" ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <FileSignature className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Assine Aqui</span>
                        </div>
                      ) : (
                        <span>{field.label}</span>
                      )}
                      {/* Signer indicator dot */}
                      <div
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: field.signer_color }}
                      />
                      {/* Delete on hover */}
                      <button
                        className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </Rnd>
                ))}
              </div>
            </div>

            {/* Right - Mini pages (desktop only) */}
            {!isMobile && (
              <div className="w-20 border-l bg-card overflow-y-auto p-2 space-y-2 shrink-0">
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
            )}
          </div>

          {/* Bottom pagination */}
          <div className="flex items-center justify-center gap-3 py-2 border-t bg-card shrink-0">
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
