import { useEffect, useState } from "react";
import { Cloud, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Provider = "google" | "microsoft";

interface CloudAccount {
  id: string;
  provider: Provider | string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

interface EmailAccountHint {
  id: string;
  provider: string;
  email_address: string | null;
  display_name: string | null;
}

const providerFromEmail = (p: string): Provider | null => {
  if (p === "gmail" || p === "google") return "google";
  if (p === "outlook" || p === "microsoft" || p === "office365") return "microsoft";
  return null;
};

export function CloudStorageTab() {
  const { profile, activeCompanyId } = useAuth();
  const userId = profile?.user_id;
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [emailHints, setEmailHints] = useState<EmailAccountHint[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("google");
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchAccounts = async () => {
    if (!userId || !activeCompanyId) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from("cloud_drive_accounts")
        .select("id, provider, email, display_name, created_at")
        .eq("user_id", userId)
        .eq("servidor_id", activeCompanyId)
        .order("created_at", { ascending: false });
      if (error) {
        // table may not exist yet — treat as empty
        setAccounts([]);
      } else {
        setAccounts((data || []) as CloudAccount[]);
      }
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeCompanyId]);

  const handleConnect = async () => {
    if (!userId || !activeCompanyId) {
      toast.error("Sessão inválida");
      return;
    }
    setBusy(true);
    try {
      const fn =
        provider === "google"
          ? "drive-oauth-start"
          : "drive-oauth-start-microsoft";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { user_id: userId, servidor_id: activeCompanyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("URL de autorização não recebida");
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (
        msg.includes("Function not found") ||
        msg.includes("404") ||
        msg.toLowerCase().includes("not found")
      ) {
        toast.info("Integração em configuração");
      } else {
        toast.info("Integração em configuração");
      }
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const providerLabel = (p: string) =>
    p === "google"
      ? "Google Drive"
      : p === "microsoft"
        ? "Microsoft OneDrive / SharePoint"
        : p;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Armazenamento em nuvem
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Conecte sua conta pessoal do Google Drive ou Microsoft OneDrive /
            SharePoint para acessar e anexar arquivos diretamente. Cada usuário
            conecta as próprias contas — elas não são compartilhadas com a
            equipe.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Conectar o armazenamento em nuvem
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Cloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Nenhuma conta conectada
              </p>
              <p className="text-sm text-muted-foreground">
                Conecte seu Google Drive ou OneDrive para começar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {acc.display_name || acc.email || providerLabel(acc.provider)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {providerLabel(acc.provider)}
                    {acc.email ? ` • ${acc.email}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    try {
                      await (supabase as any)
                        .from("cloud_drive_accounts")
                        .delete()
                        .eq("id", acc.id);
                      toast.success("Conta desconectada");
                      fetchAccounts();
                    } catch {
                      toast.error("Não foi possível desconectar");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar o armazenamento em nuvem</DialogTitle>
            <DialogDescription>
              Escolha o provedor que você deseja conectar à sua conta.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as Provider)}
            className="gap-3 py-2"
          >
            <label
              htmlFor="prov-google"
              className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent"
            >
              <RadioGroupItem value="google" id="prov-google" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Google Drive</p>
                <p className="text-xs text-muted-foreground">
                  Conecte sua conta Google pessoal
                </p>
              </div>
            </label>
            <label
              htmlFor="prov-ms"
              className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent"
            >
              <RadioGroupItem value="microsoft" id="prov-ms" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Microsoft OneDrive ou SharePoint
                </p>
                <p className="text-xs text-muted-foreground">
                  Conecte sua conta Microsoft 365
                </p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConnect}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Próximo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
