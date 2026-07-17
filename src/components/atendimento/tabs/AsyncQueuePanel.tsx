import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, AlertTriangle, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Props {
  tenantId: string | null;
}

interface QueueStatus {
  status?: string;                    // idle/queued/processing/waiting_connection/resetting
  pending?: number;
  processingNow?: number;
  acceptingNewMessages?: boolean;
  sessionReady?: boolean;
  resetting?: boolean;
  msg_delay_min?: number;
  msg_delay_max?: number;
  raw?: any;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  processing: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  queued: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  waiting_connection: "bg-destructive/15 text-destructive border-destructive/40",
  resetting: "bg-destructive/15 text-destructive border-destructive/40",
};

export function AsyncQueuePanel({ tenantId }: Props) {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savingDelay, setSavingDelay] = useState(false);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delayMin, setDelayMin] = useState<number>(3);
  const [delayMax, setDelayMax] = useState<number>(6);
  const prevPending = useRef<number | null>(null);
  const [stuckHint, setStuckHint] = useState(false);

  const invoke = async (fn: string, body: any = {}) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess.session?.access_token;
    const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey ?? "",
        Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${anonKey ?? ""}`,
      },
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    });
    const raw = await res.text();
    let payload: any = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { raw }; }
    if (!res.ok) {
      const msg = payload?.error || payload?.message || payload?.raw || `HTTP ${res.status}`;
      throw new Error(`${fn}: ${msg}`);
    }
    return payload;
  };

  const fetchStatus = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await invoke("uazapi-async-queue-status");
      const s: QueueStatus = data ?? {};
      setStatus(s);
      if (typeof s.msg_delay_min === "number") setDelayMin(s.msg_delay_min);
      if (typeof s.msg_delay_max === "number") setDelayMax(s.msg_delay_max);
      // Stuck heuristic: same high pending in two consecutive checks
      const pending = s.pending ?? 0;
      if (prevPending.current !== null && pending > 0 && pending === prevPending.current) {
        setStuckHint(true);
      } else {
        setStuckHint(false);
      }
      prevPending.current = pending;
    } catch (e: any) {
      toast.error(e.message, { duration: 10000 });
    } finally {
      setLoading(false);
    }
  };

  const clearQueue = async () => {
    if (!tenantId) return;
    setClearing(true);
    try {
      await invoke("uazapi-async-queue-clear");
      toast.success("Fila assíncrona limpa");
      setConfirmOpen(false);
      prevPending.current = null;
      setStuckHint(false);
      await fetchStatus();
    } catch (e: any) {
      toast.error(e.message, { duration: 12000 });
    } finally {
      setClearing(false);
    }
  };

  const saveDelay = async () => {
    if (delayMax < delayMin) {
      toast.error("Atraso máximo não pode ser menor que o mínimo");
      return;
    }
    setSavingDelay(true);
    try {
      await invoke("uazapi-async-queue-config", {
        msg_delay_min: delayMin,
        msg_delay_max: delayMax,
      });
      toast.success("Intervalo salvo");
    } catch (e: any) {
      toast.error(e.message, { duration: 12000 });
    } finally {
      setSavingDelay(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const statusKey = (status?.status || "idle").toLowerCase();
  const badgeClass = STATUS_COLORS[statusKey] || "bg-muted text-muted-foreground border-border";

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary">
            Fila de envio assíncrono
          </CardTitle>
          <CardDescription>
            Monitora a fila interna de mensagens enviadas com <code>async=true</code>. Não afeta campanhas em massa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" onClick={fetchStatus} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Atualizar
            </Button>
            {status && (
              <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-md border uppercase tracking-wider", badgeClass)}>
                {statusKey}
              </span>
            )}
            {status && (
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>Pendentes: <b className="text-foreground">{status.pending ?? 0}</b></span>
                <span>Processando agora: <b className="text-foreground">{status.processingNow ?? 0}</b></span>
                <span>Sessão pronta: <b className={status.sessionReady ? "text-emerald-500" : "text-destructive"}>
                  {status.sessionReady ? "Sim" : "Não"}
                </b></span>
              </div>
            )}
          </div>

          {stuckHint && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-amber-500">Fila pode estar travada</div>
                <div className="text-[11px] text-muted-foreground">
                  A contagem de pendentes não diminuiu entre checagens. Se necessário, limpe a fila —
                  todas as mensagens ainda não enviadas serão canceladas.
                </div>
              </div>
              <Button
                size="sm" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={clearing}
              >
                <Trash2 size={14} className="mr-1" /> Limpar fila
              </Button>
            </div>
          )}

          {!stuckHint && status && (status.pending ?? 0) > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm" variant="outline" onClick={() => setConfirmOpen(true)} disabled={clearing}
              >
                <Trash2 size={14} className="mr-1" /> Limpar fila…
              </Button>
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Clock size={13} className="text-muted-foreground" /> Intervalo entre envios assíncronos
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Atraso mínimo (s)</label>
                <input
                  type="number" min={0} value={delayMin}
                  onChange={(e) => setDelayMin(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 px-2 py-1.5 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Atraso máximo (s)</label>
                <input
                  type="number" min={0} value={delayMax}
                  onChange={(e) => setDelayMax(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 px-2 py-1.5 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button size="sm" onClick={saveDelay} disabled={savingDelay}>
                {savingDelay && <Loader2 size={14} className="mr-1 animate-spin" />}
                Salvar
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Só afeta mensagens enviadas com <code>async=true</code>. Não afeta campanhas em massa.
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar fila assíncrona?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai cancelar TODAS as mensagens assíncronas ainda não enviadas dessa instância.
              Mensagens já enviadas com sucesso não são afetadas. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); clearQueue(); }}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing && <Loader2 size={14} className="mr-1 animate-spin" />}
              Sim, limpar fila
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
