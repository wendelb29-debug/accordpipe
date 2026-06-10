import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PhoneCall, PhoneOff, PhoneIncoming, Voicemail, Clock, MessageSquareText, Loader2 } from "lucide-react";

const OUTCOMES = [
  { id: "Atendeu",       label: "Atendeu",       Icon: PhoneIncoming, color: "emerald" },
  { id: "Não atendeu",   label: "Não atendeu",   Icon: PhoneOff,      color: "amber" },
  { id: "Caixa postal",  label: "Caixa postal",  Icon: Voicemail,     color: "blue" },
  { id: "Pediu retorno", label: "Pediu retorno", Icon: Clock,         color: "violet" },
  { id: "Número errado", label: "Número errado", Icon: PhoneOff,      color: "red" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadName: string;
  onSave: (data: { outcome: string; duration: number | null; notes: string }) => Promise<void>;
}

export function NewCallDialog({ open, onOpenChange, leadName, onSave }: Props) {
  const [outcome, setOutcome] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!outcome) return;
    setSaving(true);
    try {
      await onSave({
        outcome,
        duration: duration ? parseInt(duration, 10) : null,
        notes: notes.trim(),
      });
      setOutcome(""); setDuration(""); setNotes("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-white" />
            </div>
            <div>
              <div>Registrar ligação</div>
              <div className="text-[11px] font-normal text-muted-foreground">{leadName}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Resultado *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => {
                const active = outcome === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setOutcome(o.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-[12px] font-medium transition text-left ${
                      active
                        ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                        : "border-border bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <o.Icon className="w-3.5 h-3.5" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Duração (minutos)
            </label>
            <input
              type="number"
              min="0"
              max="999"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="Ex: 5"
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <MessageSquareText className="w-3 h-3" />
              Anotações da ligação
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="O que foi conversado, próximos passos..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!outcome || saving}
            className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-bold inline-flex items-center gap-2 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
            Salvar ligação
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
