import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, MessageSquare, Mail, Activity, CheckCircle2, XCircle, Pause, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { NewCampaignDialog } from "@/components/marketing/NewCampaignDialog";
import { EmailConnectionsPanel } from "@/components/marketing/EmailConnectionsPanel";
import { EmailTemplateManager } from "@/components/marketing/EmailTemplateManager";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  channel: "whatsapp" | "email";
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  email_provider: string | null;
}

const statusMeta: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Pause },
  queued: { label: "Na fila", color: "bg-blue-500/15 text-blue-400", icon: Loader2 },
  running: { label: "Enviando", color: "bg-emerald-500/15 text-emerald-400", icon: Activity },
  paused: { label: "Pausada", color: "bg-amber-500/15 text-amber-400", icon: Pause },
  completed: { label: "Concluída", color: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "bg-red-500/15 text-red-400", icon: XCircle },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: XCircle },
};

export default function Marketing() {
  const { user } = useAuth();
  const companyId = useActiveCompanyId();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"campaigns" | "connections">("campaigns");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "email">("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [newChannel, setNewChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const loadCampaigns = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .select("id,name,channel,status,total_recipients,sent_count,failed_count,created_at,email_provider")
      .eq("servidor_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar campanhas: " + error.message);
      return;
    }
    setCampaigns((data || []) as Campaign[]);
  };

  useEffect(() => { loadCampaigns(); }, [companyId]);

  // Realtime updates
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel("marketing-campaigns-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_campaigns", filter: `servidor_id=eq.${companyId}` }, () => {
        loadCampaigns();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  const filtered = useMemo(() => {
    return campaigns.filter(c => channelFilter === "all" || c.channel === channelFilter);
  }, [campaigns, channelFilter]);

  const openNewCampaign = (channel: "whatsapp" | "email") => {
    setNewChannel(channel);
    setOpenNew(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Accord Marketing"
        description="Campanhas de disparo em massa por WhatsApp e e-mail"
        icon={Megaphone}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="connections">Conexões de E-mail</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-3 py-2">
            <button
              onClick={() => openNewCampaign("email")}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-blue-500 hover:bg-blue-600 transition shadow-sm shadow-blue-500/20"
            >
              <Mail className="w-4 h-4" />
              Campanha de e-mail
            </button>
            <button
              onClick={() => openNewCampaign("whatsapp")}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              Campanha WhatsApp
            </button>
          </div>


          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhuma campanha ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filtered.map(c => {
                const meta = statusMeta[c.status] || statusMeta.draft;
                const progress = c.total_recipients > 0
                  ? Math.round(((c.sent_count + c.failed_count) / c.total_recipients) * 100)
                  : 0;
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/marketing/${c.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.channel === "whatsapp" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                        {c.channel === "whatsapp" ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{c.name}</span>
                          <Badge className={meta.color} variant="outline">
                            {meta.label}
                          </Badge>
                          {c.email_provider && (
                            <Badge variant="outline" className="text-[10px] uppercase">{c.email_provider}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                          <span>{c.total_recipients} destinatários</span>
                          <span className="text-emerald-400">{c.sent_count} enviados</span>
                          {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} falhas</span>}
                          <span>· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                        {c.status === "running" && (
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="mt-4">
          <EmailConnectionsPanel />
        </TabsContent>
      </Tabs>

      <NewCampaignDialog
        open={openNew}
        onOpenChange={setOpenNew}
        defaultChannel={newChannel}
        onCreated={(id) => {
          setOpenNew(false);
          navigate(`/marketing/${id}`);
        }}
      />
    </PageContainer>
  );
}
