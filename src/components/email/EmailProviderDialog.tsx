import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mail, Loader2, Lock, Info, ExternalLink, Shield } from "lucide-react";

interface EmailProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  companyId: string | null;
  userId: string | null;
  onSuccess: () => void;
}

const IMPORT_OPTIONS = [
  { id: "3days",   label: "3 dias" },
  { id: "1week",   label: "1 semana" },
  { id: "1month",  label: "1 mês" },
  { id: "3months", label: "3 meses" },
  { id: "all",     label: "Tudo" },
];

const OAUTH_PROVIDERS = new Set(["gmail", "outlook", "office365", "icloud", "yahoo", "aol", "exchange"]);
const FULLY_IMPLEMENTED_OAUTH = new Set(["gmail"]);

export function EmailProviderDialog({
  open, onOpenChange, providerId, providerName, companyId, userId, onSuccess,
}: EmailProviderDialogProps) {
  const isOAuth = OAUTH_PROVIDERS.has(providerId);
  const isImap  = providerId === "imap_smtp";
  const isGmailReal = providerId === "gmail";

  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [importSince, setImportSince] = useState("1week");
  const [crmIntegration, setCrmIntegration] = useState(true);
  const [calendarIntegration, setCalendarIntegration] = useState(false);
  const [sharedSender, setSharedSender] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");

  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");

  const [busy, setBusy] = useState(false);

  const reset = () => {
    setDisplayName(""); setEmailAddress(""); setImportSince("1week");
    setCrmIntegration(true); setCalendarIntegration(false);
    setSharedSender(false); setSenderName(""); setDailyLimit("");
    setImapHost(""); setImapPort("993"); setImapUser(""); setImapPass("");
  };

  const handleConnect = async () => {
    if (!companyId || !userId) { toast.error("Sessão inválida"); return; }

    // Gmail OAuth real flow
    if (isGmailReal) {
      setBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke("email-oauth-start", {
          body: {
            provider: "gmail",
            displayName: displayName || "Gmail",
            importSince,
            sharedSender,
            senderName: senderName.trim(),
            dailyLimit: dailyLimit ? Number(dailyLimit) : null,
            crmIntegration,
            calendarIntegration,
          },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("URL de autorização não recebida");
        window.location.href = data.url;
      } catch (err: any) {
        toast.error("Erro ao iniciar autorização Google", { description: err?.message });
        setBusy(false);
      }
      return;
    }

    // Other providers — store pending account (legacy)
    if (!emailAddress.trim()) { toast.error("Informe o endereço de e-mail"); return; }
    if (isImap && (!imapHost || !imapUser || !imapPass)) {
      toast.error("Preencha host, usuário e senha do IMAP");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("email_accounts" as any).insert({
        servidor_id: companyId,
        user_id: userId,
        provider: providerId,
        display_name: displayName || providerName,
        email_address: emailAddress.trim(),
        status: "pending",
        status_message: isOAuth
          ? "OAuth deste provedor ainda em construção — Gmail já está 100% funcional"
          : "Configuração IMAP salva — sincronização será habilitada em breve",
        shared_sender: sharedSender,
        sender_name: sharedSender ? senderName.trim() || null : null,
        daily_limit: dailyLimit ? Number(dailyLimit) : null,
        import_since: importSince,
        imap_config: isImap ? {
          host: imapHost,
          port: Number(imapPort),
          secure: Number(imapPort) === 993 || Number(imapPort) === 465,
          username: imapUser,
          encrypted_password: imapPass,
        } : null,
        crm_integration: crmIntegration,
        calendar_integration: calendarIntegration,
      });

      if (error) throw error;

      toast.success("Conta cadastrada");
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao cadastrar conta", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[16px] font-semibold">Conectar {providerName}</div>
              <div className="text-[11px] text-muted-foreground font-normal">Integração da Caixa de Correio</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isGmailReal && (
          <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-500/10 p-3 flex gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Você será redirecionado ao <b>Google</b> para autorizar o Accord a ler, enviar e gerenciar seus e-mails. Após autorizar, voltamos automaticamente e sincronizamos sua caixa.
            </div>
          </div>
        )}

        {isOAuth && !isGmailReal && (
          <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 p-3 flex gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-amber-700 dark:text-amber-300 leading-relaxed">
              OAuth de <b>{providerName}</b> ainda em construção. Por enquanto, apenas o <b>Gmail</b> está 100% funcional com envio e recebimento real. Você pode cadastrar a conta aqui para já preparar o ambiente.
            </div>
          </div>
        )}

        {isImap && (
          <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 p-3 flex gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Use <b>senha de aplicativo</b> em vez da senha principal.
              {" "}
              <a className="underline inline-flex items-center gap-0.5" href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer">
                como gerar <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-4">
          <div className={isGmailReal ? "" : "grid grid-cols-2 gap-3"}>
            <div className={isGmailReal ? "col-span-2" : ""}>
              <label className="text-[11.5px] font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block">
                Apelido
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={`Ex: ${providerName} Comercial`}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-[13.5px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition"
              />
            </div>
            {!isGmailReal && (
              <div>
                <label className="text-[11.5px] font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block">
                  E-mail
                </label>
                <input
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  type="email"
                  placeholder="voce@dominio.com"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-[13.5px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition"
                />
              </div>
            )}
          </div>

          {isImap && (
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
              <div className="text-[11.5px] font-semibold text-foreground/80 uppercase tracking-wider">Servidor IMAP</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[11px] text-muted-foreground mb-1 block">Host</label>
                  <input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.dominio.com"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Porta</label>
                  <input value={imapPort} onChange={(e) => setImapPort(e.target.value)} placeholder="993"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Usuário</label>
                <input value={imapUser} onChange={(e) => setImapUser(e.target.value)} placeholder="voce@dominio.com"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Senha do aplicativo</label>
                <input value={imapPass} onChange={(e) => setImapPass(e.target.value)} type="password" placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] outline-none focus:border-emerald-400" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11.5px] font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block">
              Importar e-mails de
            </label>
            <div className="flex flex-wrap gap-1.5">
              {IMPORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setImportSince(opt.id)}
                  className={`h-8 px-3 rounded-full text-[12px] font-medium transition border ${
                    importSince === opt.id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "border-border bg-card text-foreground/70 hover:bg-muted/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2.5">
            <Toggle label="Usar mesmo nome de remetente" sub="Substitui o remetente real por um nome fixo"
              checked={sharedSender} onChange={setSharedSender} />
            {sharedSender && (
              <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Ex: Equipe Comercial"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-[13.5px] outline-none focus:border-emerald-400" />
            )}
            <Toggle label="Limite diário de e-mails" sub="Bloqueia envios após o limite"
              checked={!!dailyLimit} onChange={(v) => setDailyLimit(v ? "100" : "")} />
            {!!dailyLimit && (
              <input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} type="number" placeholder="100"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-[13.5px] outline-none focus:border-emerald-400" />
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2.5">
            <Toggle label="Integração com o CRM" sub="Vincula e-mails a leads automaticamente"
              checked={crmIntegration} onChange={setCrmIntegration} />
            <Toggle label="Integração com Calendário" sub="Sincroniza convites e eventos"
              checked={calendarIntegration} onChange={setCalendarIntegration} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <button onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg text-[13px] font-medium text-foreground/70 hover:bg-muted transition">
            Cancelar
          </button>
          <button onClick={handleConnect} disabled={busy}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-1.5 transition">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isGmailReal ? "Autorizar no Google" : "Salvar conta"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, sub, checked, onChange }:
  { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {sub && <div className="text-[11.5px] text-muted-foreground">{sub}</div>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-[38px] h-[22px] rounded-full transition shrink-0 ${checked ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-[2px]"}`} />
      </button>
    </div>
  );
}
