import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Mail,
  Plus,
  Pin,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { EmailProviderDialog } from "@/components/email/EmailProviderDialog";
import { GmailLogo, OutlookLogo } from "@/components/email/ProviderLogos";

interface EmailAccount {
  id: string;
  provider: string;
  display_name: string;
  email_address: string;
  status: "pending" | "connected" | "error" | "disconnected";
  status_message: string | null;
  last_synced_at: string | null;
  created_at: string;
}

const PROVIDERS = [
  { id: "gmail",   name: "Gmail",   Logo: GmailLogo },
  { id: "outlook", name: "Outlook", Logo: OutlookLogo },
];

export default function Email() {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogProvider, setDialogProvider] = useState<string | null>(null);

  const loadAccounts = async () => {
    if (!companyId || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from("email_accounts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts(((data || []) as unknown) as EmailAccount[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
    const ch = supabase
      .channel(`email_accounts:${companyId}:${user?.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_accounts" }, () => loadAccounts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user?.id]);

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      toast.success("Conta Gmail conectada!", { description: "Sincronizando suas mensagens..." });
      setSearchParams({});
      setTimeout(() => navigate(`/email/${connected}`), 800);
    } else if (error) {
      toast.error("Erro ao conectar", { description: decodeURIComponent(error) });
      setSearchParams({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleDisconnect = async (id: string) => {
    if (!confirm("Desconectar essa conta de e-mail?")) return;
    const { error } = await supabase.from("email_accounts" as any).delete().eq("id", id);
    if (error) toast.error("Erro ao desconectar", { description: error.message });
    else toast.success("Conta desconectada");
  };

  const handleOpen = (id: string) => navigate(`/email/${id}`);

  const hasAccounts = accounts.length > 0;

  return (
    <div
      className="relative min-h-full"
      style={{
        background:
          "radial-gradient(900px 500px at 85% -10%, rgba(59,130,246,0.10), transparent 60%), " +
          "radial-gradient(700px 400px at -5% 100%, rgba(99,102,241,0.08), transparent 60%), " +
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.3) 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-2">
                Integração da Caixa de Correio
                <Pin className="w-4 h-4 text-muted-foreground/50" />
              </h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Conecte suas contas de e-mail e gerencie tudo dentro do Accord.
              </p>
            </div>
          </div>
          {hasAccounts && (
            <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-sm">
              <Plus className="w-4 h-4" />
              Conectar várias caixas
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : hasAccounts ? (
          <div className="mb-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Suas contas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accounts.map((acc) => {
                const prov = PROVIDERS.find(p => p.id === acc.provider);
                return (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:shadow-md transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      {prov?.Logo ? <prov.Logo className="w-7 h-7" /> : <Mail className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground truncate">
                        {acc.display_name || prov?.name || "Conta de e-mail"}
                        {acc.status === "connected" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {acc.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate">{acc.email_address}</div>
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {acc.status === "connected"
                          ? acc.last_synced_at
                            ? `Sincronizado ${new Date(acc.last_synced_at).toLocaleString("pt-BR")}`
                            : "Conectado · aguardando sincronização"
                          : acc.status === "pending"
                            ? "Aguardando primeira conexão"
                            : acc.status === "error"
                              ? acc.status_message || "Erro na conexão"
                              : "Desconectado"}
                      </div>
                    </div>
                    {acc.status === "connected" && acc.provider === "gmail" && (
                      <button
                        onClick={() => handleOpen(acc.id)}
                        className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition"
                        title="Abrir caixa de entrada"
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        Abrir
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition"
                      title="Desconectar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <h2 className="text-center text-[22px] font-semibold text-foreground mb-2">
            Use e gerencie sua caixa de correio no Accord
          </h2>
          <p className="text-center text-[13px] text-muted-foreground mb-8">
            Escolha um provedor abaixo para conectar sua conta
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setDialogProvider(p.id)}
                className="group rounded-2xl border border-border bg-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition p-5 flex flex-col items-center text-center"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-3 group-hover:scale-105 transition"
                  style={{ background: p.iconBg }}
                >
                  {p.name.slice(0, 1)}
                </div>
                <div className="text-[14px] font-semibold text-foreground">{p.name}</div>
                {p.subtitle && <div className="text-[10.5px] text-muted-foreground mt-0.5">{p.subtitle}</div>}
                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                  Conectar <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {dialogProvider && (
          <EmailProviderDialog
            open={!!dialogProvider}
            onOpenChange={(o) => !o && setDialogProvider(null)}
            providerId={dialogProvider}
            providerName={PROVIDERS.find(p => p.id === dialogProvider)?.name || ""}
            companyId={companyId}
            userId={user?.id || null}
            onSuccess={() => { setDialogProvider(null); loadAccounts(); }}
          />
        )}
      </div>
    </div>
  );
}
