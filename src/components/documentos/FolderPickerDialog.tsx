import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, Home, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/hooks/useDriveFiles";

interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  confirmLabel: string;
  excludeIds?: string[];
  fetchAllFolders: () => Promise<DriveFile[]>;
  onConfirm: (targetParentId: string | null) => void | Promise<void>;
}

export function FolderPickerDialog({
  open, onOpenChange, title, confirmLabel, excludeIds = [], fetchAllFolders, onConfirm,
}: FolderPickerDialogProps) {
  const [allFolders, setAllFolders] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [stack, setStack] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Documentos" }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStack([{ id: null, name: "Documentos" }]);
    setLoading(true);
    fetchAllFolders().then((f) => { setAllFolders(f); setLoading(false); });
  }, [open, fetchAllFolders]);

  const currentId = stack[stack.length - 1].id;
  const visible = allFolders.filter((f) => f.parent_id === currentId && !excludeIds.includes(f.id));

  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(currentId); onOpenChange(false); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

        <div className="flex items-center gap-1 text-sm flex-wrap">
          {stack.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <button
                onClick={() => setStack((prev) => prev.slice(0, i + 1))}
                className={cn("hover:text-primary", i === stack.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground")}
              >
                {i === 0 ? <Home className="h-4 w-4 inline" /> : s.name}
              </button>
            </span>
          ))}
        </div>

        <div className="border border-border rounded-lg max-h-[300px] overflow-y-auto divide-y">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma subpasta aqui</p>
          ) : (
            visible.map((f) => (
              <button
                key={f.id}
                onClick={() => setStack((prev) => [...prev, { id: f.id, name: f.name }])}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition text-sm"
              >
                <Folder className="h-4 w-4 text-primary" fill="currentColor" fillOpacity={0.15} />
                <span className="flex-1 truncate">{f.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Destino: <strong className="text-foreground">{stack.map((s) => s.name).join(" / ")}</strong>
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
