import { useState } from "react";
import { CheckCircle2, Ban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const MIN_CHARS = 25;

interface ActivityStatusModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string, createAnother: boolean) => void;
  type: "complete" | "no_show";
  activityTitle?: string;
}

export function ActivityStatusModal({ open, onClose, onConfirm, type, activityTitle }: ActivityStatusModalProps) {
  const [note, setNote] = useState("");
  const [createAnother, setCreateAnother] = useState(false);

  const isComplete = type === "complete";
  const title = isComplete ? "Observação de Conclusão" : "Observação de No-Show";
  const charCount = note.trim().length;
  const isValid = charCount >= MIN_CHARS;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(note.trim(), createAnother);
    setNote("");
    setCreateAnother(false);
  };

  const handleClose = () => {
    setNote("");
    setCreateAnother(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {title}
          </DialogTitle>
          {activityTitle && (
            <DialogDescription className="text-center text-sm">
              {activityTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Textarea
              className="min-h-[140px] text-sm"
              placeholder={isComplete
                ? "Descreva o resultado da atividade..."
                : "Descreva o motivo do no-show..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${charCount >= MIN_CHARS ? "text-muted-foreground" : "text-destructive"}`}>
                {charCount}/{MIN_CHARS} caracteres mínimos
              </span>
              {charCount > 0 && charCount < MIN_CHARS && (
                <span className="text-xs text-destructive">
                  Faltam {MIN_CHARS - charCount} caracteres
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <Checkbox
              id="create-another"
              checked={createAnother}
              onCheckedChange={(v) => setCreateAnother(!!v)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="create-another" className="text-sm font-medium cursor-pointer">
                Criar outra atividade
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Abrir formulário com mesmo título, tipo e descrição
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              className="gap-1.5 px-6"
              onClick={handleClose}
            >
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button
              className={`gap-1.5 px-6 ${isComplete
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
              onClick={handleConfirm}
              disabled={!isValid}
            >
              {isComplete
                ? <><CheckCircle2 className="h-4 w-4" /> Confirmar Conclusão</>
                : <><Ban className="h-4 w-4" /> Confirmar No-Show</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
