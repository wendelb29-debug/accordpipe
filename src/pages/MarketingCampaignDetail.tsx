import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Play, Pause, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function MarketingCampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const [c, r] = await Promise.all([
      supabase.from("marketing_campaigns").select("*").eq("id", id).maybeSingle(),
      supabase.from("marketing_campaign_recipients").select("*").eq("campaign_id", id).order("created_at").limit(500),
    ]);
    setCampaign(c.data);
    setRecipients(r.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase
      .channel(`mkt-campaign-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_campaigns", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_campaign_recipients", filter: `campaign_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("marketing_campaigns").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Status atualizado");
  };

  if (loading) return <PageContainer><div className="flex items-center gap-2 p-10"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div></PageContainer>;
  if (!campaign) return <PageContainer><div className="p-10 text-muted-foreground">Campanha não encontrada</div></PageContainer>;

  const progress = campaign.total_recipients > 0
    ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
    : 0;

  return (
    <PageContainer>
      <PageHeader
        title={campaign.name}
        description={`Campanha ${campaign.channel === "whatsapp" ? "WhatsApp" : "E-mail"} · ${campaign.total_recipients} destinatários`}
        icon={Megaphone}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{campaign.total_recipients}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Enviados</div><div className="text-2xl font-bold text-emerald-400">{campaign.sent_count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Falhas</div><div className="text-2xl font-bold text-red-400">{campaign.failed_count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Progresso</div><div className="text-2xl font-bold">{progress}%</div></CardContent></Card>
      </div>

      <div className="mt-4 flex gap-2 items-center">
        <Badge variant="outline" className="capitalize">{campaign.status}</Badge>
        {campaign.status === "running" && (
          <Button size="sm" variant="outline" onClick={() => updateStatus("paused")}><Pause className="h-4 w-4 mr-1" />Pausar</Button>
        )}
        {(campaign.status === "paused" || campaign.status === "queued") && (
          <Button size="sm" onClick={() => updateStatus("running")}><Play className="h-4 w-4 mr-1" />Iniciar / Retomar</Button>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Destinatários ({recipients.length})</h3>
        <div className="rounded-md border border-border divide-y divide-border max-h-[500px] overflow-y-auto">
          {recipients.map(r => (
            <div key={r.id} className="p-3 flex items-center gap-3 text-sm">
              {r.status === "sent" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
               r.status === "failed" ? <XCircle className="h-4 w-4 text-red-400" /> :
               <Clock className="h-4 w-4 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="truncate">{r.name || r.contact}</div>
                <div className="text-xs text-muted-foreground truncate">{r.contact}{r.error_message && ` · ${r.error_message}`}</div>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
