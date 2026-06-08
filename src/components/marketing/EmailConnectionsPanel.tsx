import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, ArrowRight, AlertCircle } from "lucide-react";

interface EmailAccount {
  id: string;
  provider: string;
  email_address: string;
  display_name: string;
  status: string;
}

export function EmailConnectionsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("email_accounts")
        .select("id, provider, email_address, display_name, status")
        .eq("user_id", user.id)
        .in("provider", ["gmail", "outlook"])
        .order("created_at", { ascending: false });
      setAccounts((data || []) as EmailAccount[]);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando contas conectadas…
      </div>
    );
  }

  const active = accounts.filter(a => a.status === "active" || a.status === "connected");

  if (active.length === 0) {
    return (
      <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Nenhum e-mail conectado</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Para disparar campanhas, primeiro conecte um Gmail ou Outlook na aba <b>E-mail</b>.
              As contas conectadas ali ficam disponíveis aqui automaticamente.
            </p>
          </div>
          <Button onClick={() => navigate("/email")} className="gap-2">
            Ir para aba E-mail <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.length} {active.length === 1 ? "conta disponível" : "contas disponíveis"} para disparo. Gerencie suas conexões na aba <b>E-mail</b>.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/email")} className="gap-2">
          Gerenciar <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-2">
        {active.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${a.provider === "gmail" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{a.email_address}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{a.provider}</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" variant="outline">Pronta</Badge>
                </div>
                {a.display_name && (
                  <div className="text-xs text-muted-foreground mt-1">{a.display_name}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
