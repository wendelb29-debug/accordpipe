import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Mail,
  Loader2,
  ShieldCheck,
  X,
  Check,
  ArrowRight,
  Lock,
  ExternalLink,
  ChevronDown,
  Users,
  Calendar,
  Tag,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  GmailLogo,
  OutlookLogo,
  MicrosoftLogo,
  GoogleLogo,
} from "./ProviderLogos";

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

const OAUTH_GOOGLE   = new Set(["gmail"]);
const OAUTH_MICROSOFT = new Set(["outlook", "office365", "exchange"]);
const OAUTH_OTHER    = new Set(["icloud", "yahoo", "aol"]);

function getProviderMeta(providerId: string) {
  if (providerId === "gmail") {
    return {
      Logo: GmailLogo,
      provider: "Google",
      ProviderMark: GoogleLogo,
      accentFrom: "#7c3aed",
      accentTo: "#4f46e5",
      glowFrom: "rgba(99,102,241,.5)",
      glowTo: "rgba(59,130,246,.4)",
      revokeUrl: "https://myaccount.google.com/permissions",
      revokeLabel: "myaccount.google.com",
      authButton: "Autorizar no Google",
      perms: [
        "Ler seus e-mails",
        "Enviar e-mails em seu nome",
        "Marcar como lido, mover entre pastas",
      ],
    };
  }
  if (OAUTH_MICROSOFT.has(providerId)) {
    return {
      Logo: OutlookLogo,
      provider: "Microsoft",
      ProviderMark: MicrosoftLogo,
      accentFrom: "#0078D4",
      accentTo: "#2563eb",
      glowFrom: "rgba(0,120,212,.5)",
      glowTo: "rgba(37,99,235,.4)",
      revokeUrl: "https://account.microsoft.com/privacy/app-access",
      revokeLabel: "account.microsoft.com",
      authButton: "Autorizar na Microsoft",
      perms: [
        "Ler seus e-mails (Mail.Read)",
        "Enviar e-mails em seu nome (Mail.Send)",
        "Marcar como lido, mover entre pastas (Mail.ReadWrite)",
        "Acessar offline (offline_access)",
      ],
    };
  }
  return null;
}

export function EmailProviderDialog({
  open, onOpenChange, providerId, providerName, companyId, userId, onSuccess,
}: EmailProviderDialogProps) {
  const isGoogleOAuth = OAUTH_GOOGLE.has(providerId);
  const isMicrosoftOAuth = OAUTH_MICROSOFT.has(providerId);
  const isOAuth = isGoogleOAuth || isMicrosoftOAuth;
  const isOtherOAuth = OAUTH_OTHER.has(providerId);
  const isImap = providerId === "imap_smtp";

  const meta = getProviderMeta(providerId);

  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [importSince, setImportSince] = useState("1week");
  const [crmIntegration, setCrmIntegration] = useState(true);
  const [calendarIntegration, setCalendarIntegration] = useState(false);
  const [sharedSender, setSharedSender] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Campos IMAP/SMTP
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
    setAdvancedOpen(false);
  };

  const buildDraft = () => ({
    servidor_id: companyId,
    display_name: displayName.trim() || providerName,
    email_address: emailAddress.trim() || null,
    shared_sender: sharedSender,
    sender_name: sharedSender ? senderName.trim() || null : null,
    daily_limit: dailyLimit ? Number(dailyLimit) : null,
    import_since: importSince,
    crm_integration: crmIntegration,
    calendar_integration: calendarIntegration,
  });

  const handleConnect = async () => {
    if (!companyId || !userId) { toast.error("Sessão inválida"); return; }

    // IMAP exige campos manuais
    if (isImap && (!emailAddress.trim() || !imapHost || !imapUser || !imapPass)) {
      toast.error("Preencha host, e-mail, usuário e senha do IMAP");
      return;
    }
    if (isOtherOAuth && !emailAddress.trim()) {
      toast.error("Informe o endereço de e-mail");
      return;
    }

    setBusy(true);
    try {
      // ============ GMAIL (OAuth Google) ============
      if (isGoogleOAuth) {
        const { data, error } = await supabase.functions.invoke("email-oauth-start", {
          body: { account_draft: buildDraft() },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("URL de autorização não recebida");
      }

      // ============ OUTLOOK / OFFICE 365 / EXCHANGE (OAuth Microsoft) ============
      if (isMicrosoftOAuth) {
        const { data, error } = await supabase.functions.invoke("email-oauth-start-microsoft", {
          body: { provider: providerId, account_draft: buildDraft() },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("URL de autorização não recebida");
      }

      // ============ IMAP/SMTP genérico ============
      const { error } = await supabase.from("email_accounts").insert({
        servidor_id: companyId,
        user_id: userId,
        provider: providerId,
        display_name: displayName.trim() || providerName,
        email_address: emailAddress.trim(),
        status: "pending",
        status_message: "Configuração IMAP salva — sincronização será habilitada em breve",
        shared_sender: sharedSender,
        sender_name: sharedSender ? senderName.trim() || null : null,
        daily_limit: dailyLimit ? Number(dailyLimit) : null,
        import_since: importSince,
        imap_config: isImap ? {
          host: imapHost,
          port: Number(imapPort),
          secure: Number(imapPort) === 993 || Number(imapPort) === 465,
          username: imapUser,
          encrypted_password: imapPass, // TODO: criptografar via Edge Function antes
        } : null,
        crm_integration: crmIntegration,
        calendar_integration: calendarIntegration,
      });
      if (error) throw error;

      toast.success("Conta de e-mail cadastrada!");
      reset();
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao iniciar conexão", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="max-w-[560px] p-0 overflow-hidden rounded-2xl border-border max-h-[92vh] flex flex-col gap-0"
      >
        {/* ============================================================
            HERO COM PAR DE LOGOS (Accord → Provedor)
        ============================================================ */}
        <div className="relative px-7 pt-6 pb-5 overflow-hidden">
          {/* glow bg */}
          {meta && (
            <>
              <div
                className="pointer-events-none absolute -left-8 -top-12 w-44 h-44 rounded-full blur-3xl opacity-50"
                style={{ background: `radial-gradient(circle, ${meta.glowFrom}, transparent 70%)` }}
              />
              <div
                className="pointer-events-none absolute -right-10 -bottom-14 w-44 h-44 rounded-full blur-3xl opacity-50"
                style={{ background: `radial-gradient(circle, ${meta.glowTo}, transparent 70%)` }}
              />
            </>
          )}

          {/* close */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="relative flex items-center gap-4">
            {/* par de logos */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-card border border-border shadow-sm">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.3), 0 6px 16px -4px rgba(99,102,241,.5)",
                }}
              >
                <Mail className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white p-1.5 border border-border/50">
                {meta?.Logo ? <meta.Logo className="w-full h-full" /> : <Mail className="w-5 h-5 text-muted-foreground" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-bold text-foreground tracking-tight leading-tight">
                Conectar {providerName}
              </div>
              <div className="text-[12px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>Caixa de Correio</span>
                {isOAuth && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    OAUTH 2.0
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            TRUST BAR
        ============================================================ */}
        {isOAuth && meta && (
          <div className="flex items-center gap-3.5 px-7 py-3.5 bg-gradient-to-r from-emerald-500/[0.06] via-blue-500/[0.04] to-transparent border-y border-border">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-foreground">
                Conexão segura via {meta.provider} OAuth 2.0
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                O Accord nunca tem acesso à sua senha. Revogue a qualquer momento em{" "}
                <a
                  href={meta.revokeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  {meta.revokeLabel}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                .
              </div>
            </div>
          </div>
        )}

        {/* IMAP warning */}
        {isImap && (
          <div className="flex items-center gap-3 px-7 py-3.5 bg-amber-500/[0.07] border-y border-border">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-[11.5px] text-amber-700 dark:text-amber-300 leading-snug">
              Use <b>senha de aplicativo</b> em vez da senha principal da conta.{" "}
              <a className="underline inline-flex items-center gap-0.5" href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer">
                como gerar <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}

        {/* Other OAuth (iCloud/Yahoo/AOL) — sem implementação ainda */}
        {isOtherOAuth && (
          <div className="flex items-center gap-3 px-7 py-3.5 bg-blue-500/[0.07] border-y border-border">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-[11.5px] text-blue-700 dark:text-blue-300 leading-snug">
              OAuth para {providerName} requer configuração adicional. Por enquanto a conta fica como rascunho — a conexão real será habilitada em breve.
            </div>
          </div>
        )}

        {/* ============================================================
            BODY
        ============================================================ */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {/* IDENTIFICAÇÃO */}
          <Section title="Identificação">
            <div className="space-y-3">
              <Field label="Apelido">
                <input
                  autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={`Ex: ${providerName} Comercial`}
                  className="h-11 w-full px-3.5 rounded-xl border-[1.5px] border-border bg-background text-foreground text-[13.5px] outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition placeholder:text-muted-foreground/60"
                />
              </Field>

              {/* E-mail só aparece pra IMAP e OAuth-Other (Gmail e Microsoft pegam do provedor) */}
              {(isImap || isOtherOAuth) && (
                <Field label="E-mail">
                  <input
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    type="email"
                    placeholder="voce@dominio.com"
                    className="h-11 w-full px-3.5 rounded-xl border-[1.5px] border-border bg-background text-foreground text-[13.5px] outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition placeholder:text-muted-foreground/60"
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* IMAP fields */}
          {isImap && (
            <Section title="Servidor IMAP">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <Field label="Host" small>
                    <input
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="imap.dominio.com"
                      className="h-10 w-full px-3 rounded-lg border-[1.5px] border-border bg-background text-[13px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                    />
                  </Field>
                </div>
                <Field label="Porta" small>
                  <input
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    placeholder="993"
                    className="h-10 w-full px-3 rounded-lg border-[1.5px] border-border bg-background text-[13px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                <Field label="Usuário" small>
                  <input
                    value={imapUser}
                    onChange={(e) => setImapUser(e.target.value)}
                    placeholder="voce@dominio.com"
                    className="h-10 w-full px-3 rounded-lg border-[1.5px] border-border bg-background text-[13px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                  />
                </Field>
                <Field label="Senha de app" small>
                  <input
                    type="password"
                    value={imapPass}
                    onChange={(e) => setImapPass(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full px-3 rounded-lg border-[1.5px] border-border bg-background text-[13px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                  />
                </Field>
              </div>
            </Section>
          )}

          {/* IMPORTAR DE — segmented control */}
          <Section title="Importar e-mails de">
            <div className="flex bg-muted rounded-xl p-1 gap-0.5">
              {IMPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setImportSince(opt.id)}
                  className={`flex-1 h-9 px-2 rounded-lg text-[12.5px] font-semibold transition ${
                    importSince === opt.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* INTEGRAÇÕES — switches em cards */}
          <Section title="Integrações">
            <div className="space-y-2.5">
              <ToggleCard
                Icon={Users}
                title="Vincular ao CRM"
                desc="Liga e-mails a leads do Accord Sales automaticamente"
                active={crmIntegration}
                onChange={setCrmIntegration}
              />
              <ToggleCard
                Icon={Calendar}
                title="Sincronizar Calendário"
                desc="Importa convites e eventos pro Accord"
                active={calendarIntegration}
                onChange={setCalendarIntegration}
              />
            </div>
          </Section>

          {/* CONFIGURAÇÕES AVANÇADAS — colapsável */}
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition"
          >
            Configurações avançadas
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>

          {advancedOpen && (
            <div className="space-y-2.5 -mt-2">
              <ToggleCard
                Icon={Tag}
                title="Usar mesmo nome de remetente"
                desc="Substitui o remetente real por um nome fixo"
                active={sharedSender}
                onChange={setSharedSender}
              />
              {sharedSender && (
                <input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ex: Equipe Comercial Accord"
                  className="h-10 w-full px-3.5 rounded-xl border-[1.5px] border-border bg-background text-foreground text-[13px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 -mt-1"
                />
              )}
              <ToggleCard
                Icon={Building2}
                title="Definir limite diário"
                desc="Bloqueia envios após o limite"
                active={!!dailyLimit}
                onChange={(v) => setDailyLimit(v ? "100" : "")}
              />
              {!!dailyLimit && (
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="100"
                  className="h-10 w-full px-3.5 rounded-xl border-[1.5px] border-border bg-background text-foreground text-[13px] outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 -mt-1"
                />
              )}
            </div>
          )}

          {/* PREVIEW DE PERMISSÕES */}
          {isOAuth && meta && (
            <div className="rounded-xl border-[1.5px] border-border bg-gradient-to-br from-muted/40 to-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground/80 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                No próximo passo, a {meta.provider} pedirá permissão para:
              </div>
              <ul className="space-y-1.5">
                {meta.perms.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[12px] text-foreground/75">
                    <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ============================================================
            FOOTER
        ============================================================ */}
        <div className="flex items-center gap-3 px-7 py-4 border-t border-border bg-gradient-to-b from-transparent to-muted/30">
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 px-5 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            Cancelar
          </button>
          <div className="flex-1" />
          <button
            onClick={handleConnect}
            disabled={busy}
            className="h-11 px-5 rounded-xl text-[13px] font-semibold text-white inline-flex items-center gap-2 transition disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0"
            style={
              meta
                ? {
                    background: `linear-gradient(135deg, ${meta.accentFrom}, ${meta.accentTo})`,
                    boxShadow: `0 4px 14px -2px ${meta.accentFrom}66, inset 0 1px 0 rgba(255,255,255,.2)`,
                  }
                : {
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    boxShadow: "0 4px 14px -2px rgba(16,185,129,.4), inset 0 1px 0 rgba(255,255,255,.2)",
                  }
            }
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {meta?.ProviderMark && !busy && (
              <span className="w-4 h-4 bg-white rounded p-0.5 flex items-center justify-center">
                <meta.ProviderMark className="w-full h-full" />
              </span>
            )}
            {meta ? meta.authButton : "Conectar"}
            {isOAuth && !busy && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Sub-componentes
============================================================ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="block w-3 h-px bg-border" />
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, small }: { label: string; children: React.ReactNode; small?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className={`block ${small ? "text-[11px]" : "text-[11.5px]"} font-semibold text-foreground/70`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleCard({
  Icon, title, desc, active, onChange,
}: {
  Icon: React.ComponentType<{ className?: string; size?: string | number }>;
  title: string;
  desc: string;
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border-[1.5px] transition text-left ${
        active
          ? "border-violet-400 dark:border-violet-500 bg-violet-500/5"
          : "border-border bg-muted/30 hover:bg-card hover:border-border"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition ${
          active
            ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-foreground">{title}</div>
        <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{desc}</div>
      </div>
      <div className={`relative w-[38px] h-[22px] rounded-full transition shrink-0 ${active ? "bg-violet-500" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${active ? "left-[18px]" : "left-[2px]"}`} />
      </div>
    </button>
  );
}
