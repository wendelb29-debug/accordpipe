import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { XCircle, Loader2 } from "lucide-react";
import type { CrmLead } from "@/hooks/useCrmLeads";

const REASONS = [
  "Optou pela concorrência",
  "Preço alto",
  "Não tinha necessidade",
  "Sem orçamento",
  "Timing ruim",
  "Não respondeu mais",
  "Outro",
];

interface Props {
  open: boolean;
  lead: CrmLead | null;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function LostReasonDialog({ open, lead, onOpenChange, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);

  const final = reason === "Outro" ? other.trim() : reason;

  const handleConfirm = async () => {
    if (!final) return;
    setSaving(true);
    try {
      await onConfirm(final);
      setReason("");
      setOther("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div>Por que perdeu este lead?</div>
              <div className="text-[11px] font-normal text-muted-foreground">
                {lead?.contact_name || lead?.company_name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-3 py-2 rounded-lg border-2 text-[12.5px] font-medium transition ${
                reason === r
                  ? "border-orange-400 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              {r}
            </button>
          ))}

          {reason === "Outro" && (
            <textarea
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={2}
              className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-card text-[12.5px] outline-none focus:border-orange-400"
            />
          )}
        </div>

        <DialogFooter className="mt-3">
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg text-[12px] font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!final || saving}
            className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Marcar como perdido
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
