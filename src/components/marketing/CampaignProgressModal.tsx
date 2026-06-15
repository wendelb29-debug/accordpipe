import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Download, Mail } from "lucide-react";

interface Props {
  campaignId: string;
  total: number;
  onClose: () => void;
}

interface Recipient {
  id: string;
  contact: string;
  name: string | null;
  status: string;
  error_message: string | null;
}

export function CampaignProgressModal({ campaignId, total, onClose }: Props) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showFailures, setShowFailures] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("marketing_campaign_recipients")
      .select("id, contact, name, status, error_message")
      .eq("campaign_id", campaignId)
      .order("created_at");
    setRecipients((data as Recipient[]) || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`campaign-progress-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_campaign_recipients", filter: `campaign_id=eq.${campaignId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const sentCount = recipients.filter((r) => r.status === "sent").length;
  const failedCount = recipients.filter((r) => r.status === "failed").length;
  const pendingCount = recipients.filter((r) => r.status === "pending" || r.status === "sending").length;
  const denominator = total || recipients.length || 1;
  const progressPct = Math.round(((sentCount + failedCount) / denominator) * 100);
  const isDone = pendingCount === 0 && recipients.length > 0;
  const failures = recipients.filter((r) => r.status === "failed");

  const exportFailuresCSV = () => {
    const rows = [
      ["Email", "Nome", "Motivo do erro"].join(","),
      ...failures.map((f) =>
        [f.contact, f.name || "", (f.error_message || "").replace(/[,\n\r]/g, " ")].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `falhas-campanha-${campaignId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDone
                  ? failedCount === 0
                    ? "bg-emerald-500"
                    : "bg-gradient-to-br from-emerald-500 to-amber-500"
                  : "bg-gradient-to-br from-violet-600 to-fuchsia-600"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-bold">{isDone ? "Envio concluído!" : "Enviando e-mails..."}</h2>
              <p className="text-[11px] text-muted-foreground">
                {isDone
                  ? `${sentCount} de ${denominator} enviados com sucesso`
                  : `${sentCount + failedCount} de ${denominator} processados`}
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="text-[20px] font-bold text-foreground">{sentCount}</div>
              <div className="text-[10.5px] text-muted-foreground">Enviados</div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <div className="text-[20px] font-bold text-foreground">{failedCount}</div>
              <div className="text-[10.5px] text-muted-foreground">Falharam</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <Loader2
                className={`w-5 h-5 text-amber-500 mx-auto mb-1 ${!isDone && pendingCount > 0 ? "animate-spin" : ""}`}
              />
              <div className="text-[20px] font-bold text-foreground">{pendingCount}</div>
              <div className="text-[10.5px] text-muted-foreground">Pendentes</div>
            </div>
          </div>

          {failedCount > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="w-full px-4 py-3 flex items-center gap-2 border-b border-border">
                <XCircle className="w-4 h-4 text-red-500" />
                <button
                  onClick={() => setShowFailures((s) => !s)}
                  className="text-[12.5px] font-semibold text-foreground flex-1 text-left hover:text-violet-500 transition"
                >
                  {showFailures ? "Ocultar" : "Ver"} detalhes das {failedCount} falhas
                </button>
                <button
                  onClick={exportFailuresCSV}
                  className="text-[10.5px] font-semibold text-violet-500 inline-flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3 h-3" /> Baixar CSV
                </button>
              </div>
              {showFailures && (
                <div className="max-h-64 overflow-y-auto">
                  {failures.map((f) => (
                    <div key={f.id} className="px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-[12px] font-mono text-foreground flex-1 truncate">{f.contact}</span>
                        {f.name && <span className="text-[10.5px] text-muted-foreground">{f.name}</span>}
                      </div>
                      <p className="text-[10.5px] text-red-500 mt-1 ml-5">{f.error_message || "Erro desconhecido"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {isDone ? (
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[13px] font-bold hover:opacity-90 transition"
              >
                Fechar
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Fechar (continua em background)
                </button>
                <div className="flex-1 text-[10.5px] text-muted-foreground text-right">
                  ⏱️ Você pode fechar — o envio continua no servidor
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
