import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import type { CrmLead } from "@/hooks/useCrmLeads";

interface Props {
  open: boolean;
  lead: CrmLead | null;
  currentWorkspaceId?: string | null;
  onOpenChange: (o: boolean) => void;
  onTransfer: (newWorkspaceId: string) => Promise<void>;
}

export function TransferWorkspaceDialog({
  open,
  lead,
  currentWorkspaceId,
  onOpenChange,
  onTransfer,
}: Props) {
  const { workspaces, loading } = useWorkspaces();
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const available = (workspaces || []).filter((w) => w.id !== currentWorkspaceId);

  const handleTransfer = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onTransfer(selected);
      setSelected("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <div>
              <div>Transferir card</div>
              <div className="text-[11px] font-normal text-muted-foreground">
                {lead?.contact_name || lead?.company_name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Mover para o workspace:
          </label>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto my-6 text-muted-foreground" />
          ) : available.length === 0 ? (
            <div className="text-[12px] text-muted-foreground text-center py-4">
              Nenhum outro workspace disponível.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {available.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelected(ws.id)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition text-left ${
                    selected === ws.id
                      ? "border-blue-400 bg-blue-500/10"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[12px] shrink-0"
                    style={{
                      background: ws.color
                        ? `linear-gradient(135deg, ${ws.color}, ${ws.color}cc)`
                        : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    }}
                  >
                    {(ws.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-foreground truncate">{ws.name}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">
                      {ws.is_default ? "Workspace padrão" : "Workspace"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
            onClick={handleTransfer}
            disabled={!selected || saving}
            className="h-9 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            Transferir
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
