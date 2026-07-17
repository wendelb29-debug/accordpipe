import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalTemplate } from "./types";
import { FileText, LayoutTemplate } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  servidorId: string;
  onConfirm: (mode: "blank" | "template", template?: ProposalTemplate) => void;
}

export function NewProposalModal({ open, onOpenChange, servidorId, onConfirm }: Props) {
  const [mode, setMode] = useState<"blank" | "template">("blank");
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    supabase.from("proposal_templates")
      .select("*")
      .eq("servidor_id", servidorId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setTemplates((data as any) || []));
  }, [open, servidorId]);

  const handleConfirm = () => {
    if (mode === "template") {
      const t = templates.find(t => t.id === selectedId);
      if (!t) return;
      onConfirm("template", t);
    } else {
      onConfirm("blank");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Proposta</DialogTitle>
        </DialogHeader>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-2">
          <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${mode === "blank" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
            <RadioGroupItem value="blank" />
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Proposta Padrão</p>
              <p className="text-xs text-muted-foreground">Começar do zero, sem template visual</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${mode === "template" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
            <RadioGroupItem value="template" disabled={templates.length === 0} />
            <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Usar Template</p>
              <p className="text-xs text-muted-foreground">
                {templates.length === 0 ? "Nenhum template cadastrado" : "Pré-preenche introdução e observações"}
              </p>
            </div>
          </label>
          {mode === "template" && templates.length > 0 && (
            <div className="space-y-1 pl-1">
              <Label className="text-xs">Template</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={mode === "template" && !selectedId}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
