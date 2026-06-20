import { useState } from "react";
import {
  ArrowLeft,
  X,
  Info,
  BellRing,
  Mail,
  Calendar,
  Eye,
  TrendingUp,
  MessageSquare,
  AtSign,
  UserCheck,
  MessageCircle,
  Package,
  Trophy,
  XCircle,
  DollarSign,
  Users,
  ChevronDown,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandIcon } from "@/components/ui/brand-icon";
import { useNotificationPrefs, type NotifTypeKey } from "@/hooks/useNotificationPrefs";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

interface TypeRow {
  key: NotifTypeKey;
  label: string;
  desc: string;
  icon: any;
  tone: any;
}

const TYPES: TypeRow[] = [
  { key: "email_tracking", label: "Rastreamento de e-mail", desc: "Aberturas, cliques e respostas em campanhas e e-mails enviados.", icon: Mail, tone: "red" },
  { key: "activity_reminders", label: "Lembretes de atividades", desc: "Lembretes de tarefas, reuniões e ligações agendadas.", icon: Calendar, tone: "amber" },
  { key: "following_updates", label: "Atualizações sobre o que eu sigo", desc: "Movimentações em leads, contratos e cards que você segue.", icon: Eye, tone: "sky" },
  { key: "insights", label: "Análises e dicas personalizadas", desc: "Insights gerados pela Accord IA sobre performance.", icon: TrendingUp, tone: "violet" },
  { key: "comments", label: "Comentários", desc: "Comentários em posts do feed, leads e contratos.", icon: MessageSquare, tone: "blue" },
  { key: "mentions", label: "Menções", desc: "Quando alguém mencionar você com @ em qualquer lugar.", icon: AtSign, tone: "indigo" },
  { key: "assigned_to_you", label: "Atribuído a você", desc: "Leads, atividades ou contratos atribuídos a você.", icon: UserCheck, tone: "emerald" },
  { key: "whatsapp_messages", label: "Mensagens do WhatsApp", desc: "Novas mensagens recebidas no Inbox e Accord Stack.", icon: MessageCircle, tone: "whatsapp" },
  { key: "product_updates", label: "Atualizações de produtos", desc: "Novidades, releases e melhorias do Accord.", icon: Package, tone: "purple" },
  { key: "leads_won", label: "Ganhos", desc: "Quando um lead for marcado como ganho.", icon: Trophy, tone: "emerald" },
  { key: "leads_lost", label: "Perdas", desc: "Quando um lead for marcado como perdido.", icon: XCircle, tone: "rose" },
  { key: "financial", label: "Financeiro", desc: "Pagamentos, faturas, MRR e cobranças.", icon: DollarSign, tone: "green" },
  { key: "internal_chat", label: "Mensagens internas (Collabs)", desc: "Mensagens em conversas de times.", icon: Users, tone: "fuchsia" },
];

function formatPausedUntil(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function NotificationSettingsPanel({ onBack, onClose }: Props) {
  const { prefs, update, setType, pauseUntilMidnight, resumeNow, isPaused } = useNotificationPrefs();
  const [openType, setOpenType] = useState<NotifTypeKey | null>(null);

  const handlePause = () => {
    if (isPaused) {
      resumeNow();
      toast.success("Alertas retomados");
    } else {
      pauseUntilMidnight();
      toast.success(`Alertas pausados até as 00:00`);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 h-12">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition">
          <ArrowLeft className="h-4 w-4" />
          Voltar às notificações
        </button>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="h-[560px]">
        <div className="px-4 py-4 space-y-5">
          <h3 className="text-base font-bold text-foreground">Configurações</h3>

          {/* Acompanhamento do progresso */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Acompanhamento do progresso</span>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Switch
                checked={prefs.progressTracking}
                onCheckedChange={(v) => update({ progressTracking: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acompanhe seu progresso diário e mensal em direção à conquista de seus objetivos.
            </p>
          </div>

          <div className="border-t" />

          {/* Gerenciar notificações */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3">Gerenciar notificações</h4>

            {/* Ativar alertas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">Ativar alertas</span>
                <Switch
                  checked={prefs.alertsEnabled && !isPaused}
                  onCheckedChange={(v) => update({ alertsEnabled: v })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Receba notificações sobre novas atividades no feed como alertas no canto superior direito da sua tela.
              </p>
              <button
                onClick={handlePause}
                className={`flex items-center justify-center gap-1.5 w-full text-[11px] font-medium py-1.5 rounded-lg border transition ${
                  isPaused
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                    : "border-border bg-card hover:bg-muted/50 text-foreground"
                }`}
              >
                {isPaused ? (
                  <><PlayCircle className="h-3.5 w-3.5" /> Retomar alertas (pausado até {formatPausedUntil(prefs.pausedUntil)})</>
                ) : (
                  <><PauseCircle className="h-3.5 w-3.5" /> Pausar alertas para hoje</>
                )}
              </button>
            </div>
          </div>

          {/* E-mails de notificação */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">Receba e-mails de notificação</span>
              <Switch
                checked={prefs.emailDigestEnabled}
                onCheckedChange={(v) => update({ emailDigestEnabled: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Receba e-mails em tempo real sobre atividades selecionadas e um resumo diário da atividade da sua conta por e-mail em um horário predefinido.
            </p>
            <div className="relative">
              <select
                value={prefs.emailDigestTime}
                disabled={!prefs.emailDigestEnabled}
                onChange={(e) => update({ emailDigestTime: e.target.value })}
                className="w-full h-9 text-xs rounded-lg border border-border bg-card px-3 pr-8 appearance-none disabled:opacity-50"
              >
                {Array.from({ length: 24 }).map((_, h) => {
                  const v = `${String(h).padStart(2, "0")}:00`;
                  return <option key={v} value={v}>Às {v}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="border-t" />

          {/* Tipos de notificação */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-2">Tipos de notificação</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Escolha os tipos de notificações que deseja receber.{" "}
              <span className="font-medium text-foreground">Sempre o notificaremos sobre informações importantes relacionadas à sua conta.</span>
            </p>

            <div className="space-y-1.5">
              {TYPES.map((t) => {
                const expanded = openType === t.key;
                const checked = prefs.types[t.key];
                return (
                  <div key={t.key} className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="flex items-center gap-2.5 px-2.5 py-2">
                      <button
                        onClick={() => setOpenType(expanded ? null : t.key)}
                        className="text-muted-foreground hover:text-foreground transition"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`} />
                      </button>
                      <BrandIcon icon={t.icon} tone={t.tone} size="xs" />
                      <span className="flex-1 text-xs font-semibold text-foreground">{t.label}</span>
                      <Switch
                        checked={checked}
                        onCheckedChange={(v) => setType(t.key, v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    {expanded && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed px-3 pb-2.5 pt-0.5">
                        {t.desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
