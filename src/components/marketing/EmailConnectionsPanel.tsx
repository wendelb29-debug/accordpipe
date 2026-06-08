import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, ArrowRight, AlertCircle } from "lucide-react";

const GmailLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
    <path fill="#34A853" d="M5.455 21.003V11.73L12 16.64l6.545-4.91v9.273H5.455z"/>
    <path fill="#FBBC05" d="M5.455 4.64v7.09L0 7.421V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64z"/>
    <path fill="#EA4335" d="M5.455 11.73 0 7.421v11.945c0 .904.732 1.636 1.636 1.636h3.819V11.73z"/>
    <path fill="#C5221F" d="M24 7.421v11.945c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L24 7.421z"/>
    <path fill="#C5221F" d="M24 5.457v1.964l-5.455 4.309V4.64l1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
  </svg>
);

const OutlookLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#0072C6" d="M14.5 3v2.4h6.7c.6 0 1 .4 1 1v11.2c0 .6-.4 1-1 1h-6.7V21L1 18.6V5.4L14.5 3zm0 4.4v2.2h2v1.5h-2v1.8h2v1.5h-2v1.8h2v1.5h-2v1.6h6.2V7.4h-6.2zM17 9.6h2.7v1.5H17V9.6zm0 3.3h2.7v1.5H17v-1.5zm0 3.3h2.7v1.5H17v-1.5zM7.7 8.3c-2.2 0-3.6 1.7-3.6 3.9 0 2.2 1.4 3.9 3.5 3.9 2.2 0 3.6-1.6 3.6-3.9 0-2.3-1.3-3.9-3.5-3.9zm0 6.3c-1.2 0-1.9-1.1-1.9-2.4 0-1.3.7-2.4 1.9-2.4s1.9 1.1 1.9 2.4c0 1.3-.7 2.4-1.9 2.4z"/>
  </svg>
);

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
