import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, RefreshCw, Send, Search } from "lucide-react";
import { toast } from "sonner";

interface Recipient {
  id: string;
  name: string | null;
  contact: string;
  status: string;
  error: string | null;
  sent_at: string | null;
  variables: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  channel: "whatsapp" | "email";
  onReuseSent: (rows: { name?: string; contact: string; variables?: any }[]) => void;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  queued: { label: "Na fila", className: "bg-blue-500/15 text-blue-400" },
  sent: { label: "Enviado", className: "bg-emerald-500/15 text-emerald-400" },
  failed: { label: "Falhou", className: "bg-red-500/15 text-red-400" },
  replied: { label: "Respondeu", className: "bg-purple-500/15 text-purple-400" },
};

function toCsv(rows: Recipient[]): string {
  const header = ["nome", "contato", "status", "enviado_em", "erro"];
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map(r => [r.name || "", r.contact, r.status, r.sent_at || "", r.error || ""].map(escape).join(","));
  return [header.join(","), ...lines].join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function CampaignDetailsDialog({ open, onClose, campaignId, campaignName, channel, onReuseSent }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Recipient[]>([]);
  const [tab, setTab] = useState<"all" | "sent" | "failed">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mass_campaign_recipients" as any)
      .select("id,name,contact,status,error,sent_at,variables")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open && campaignId) load(); /* eslint-disable-next-line */ }, [open, campaignId]);

  // Realtime updates
  useEffect(() => {
    if (!open || !campaignId) return;
    const ch = supabase
      .channel(`camp-rec-${campaignId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mass_campaign_recipients", filter: `campaign_id=eq.${campaignId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [open, campaignId]);

  const counts = useMemo(() => ({
    all: rows.length,
    sent: rows.filter(r => r.status === "sent" || r.status === "replied").length,
    failed: rows.filter(r => r.status === "failed").length,
  }), [rows]);

  const visible = useMemo(() => {
    let r = rows;
    if (tab === "sent") r = r.filter(x => x.status === "sent" || x.status === "replied");
    else if (tab === "failed") r = r.filter(x => x.status === "failed");
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => (x.name || "").toLowerCase().includes(q) || (x.contact || "").toLowerCase().includes(q));
    }
    return r;
  }, [rows, tab, search]);

  const handleDownload = (which: "all" | "sent" | "failed") => {
    const source = which === "all" ? rows : which === "sent" ? rows.filter(r => r.status === "sent" || r.status === "replied") : rows.filter(r => r.status === "failed");
    if (source.length === 0) { toast.error("Nenhum registro para exportar"); return; }
    download(`${campaignName.replace(/[^a-z0-9-_]+/gi, "_")}_${which}.csv`, toCsv(source));
  };

  const handleReuseSent = () => {
    const sent = rows.filter(r => r.status === "sent" || r.status === "replied");
    if (sent.length === 0) { toast.error("Nenhum contato enviado com sucesso para reutilizar"); return; }
    onReuseSent(sent.map(r => ({ name: r.name || undefined, contact: r.contact, variables: r.variables || {} })));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {campaignName} · Destinatários
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="sent">Enviados ({counts.sent})</TabsTrigger>
              <TabsTrigger value="failed">Falhas ({counts.failed})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome/contato..." className="pl-9 h-9" />
          </div>
        </div>

        <div className="border border-border rounded-lg max-h-[420px] overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Nenhum destinatário nesta visão.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">{channel === "email" ? "E-mail" : "Telefone"}</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Enviado em</th>
                  <th className="text-left px-3 py-2">Erro</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const s = statusBadge[r.status] || statusBadge.pending;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 truncate max-w-[180px]">{r.name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.contact}</td>
                      <td className="px-3 py-2"><Badge className={s.className}>{s.label}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString("pt-BR") : "—"}</td>
                      <td className="px-3 py-2 text-red-400 text-xs truncate max-w-[220px]" title={r.error || ""}>{r.error || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownload("all")} className="gap-2">
              <Download className="w-4 h-4" /> CSV completo
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload("sent")} className="gap-2">
              <Download className="w-4 h-4" /> Apenas enviados
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload("failed")} className="gap-2">
              <Download className="w-4 h-4" /> Apenas falhas
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="w-4 h-4" /> Atualizar</Button>
            <Button size="sm" onClick={handleReuseSent} className="gap-2">
              <Send className="w-4 h-4" /> Nova campanha com enviados ({counts.sent})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
