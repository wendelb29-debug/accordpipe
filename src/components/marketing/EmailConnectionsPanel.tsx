import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Conn {
  id: string;
  provider: "gmail" | "outlook";
  email_address: string;
  is_active: boolean;
  daily_send_limit: number;
  sent_today: number;
}

export function EmailConnectionsPanel() {
  const { user } = useAuth();
  const [conns, setConns] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<"gmail" | "outlook" | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("marketing_email_connections")
      .select("id, provider, email_address, is_active, daily_send_limit, sent_today")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setConns((data || []) as Conn[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const startOAuth = async (provider: "gmail" | "outlook") => {
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-oauth-start", {
        body: { provider, redirect_uri: window.location.origin + "/marketing" },
      });
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("URL de autorização não retornada");
      }
    } catch (e: any) {
      toast.error("Erro ao iniciar OAuth: " + (e.message || e));
      setConnecting(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta conexão?")) return;
    const { error } = await supabase.from("marketing_email_connections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Conexão removida");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => startOAuth("gmail")} disabled={!!connecting} variant="outline">
          {connecting === "gmail" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Conectar Gmail
        </Button>
        <Button onClick={() => startOAuth("outlook")} disabled={!!connecting} variant="outline">
          {connecting === "outlook" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Conectar Outlook
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : conns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma conta conectada. Conecte um Gmail ou Outlook acima para disparar campanhas de e-mail em seu nome.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {conns.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.provider === "gmail" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{c.email_address}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{c.provider}</Badge>
                    {c.is_active ? <Badge className="bg-emerald-500/15 text-emerald-400" variant="outline">Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {c.sent_today} / {c.daily_send_limit} envios hoje
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
