import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Users, Zap, Settings, Send,
  FolderKanban, Tag, MessageCircle, Clock, Plus,
  ShieldCheck, FileText, MessageSquareText, CalendarClock,
  Sticker, Coffee, GitBranch, CalendarDays, LinkIcon, Mail, Sparkles, BookOpen,
} from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DistribuicaoPanel } from "@/components/atendimento-config/DistribuicaoPanel";
import { RecursosChatPanel } from "@/components/atendimento-config/RecursosChatPanel";
import { TransferenciaPanel } from "@/components/atendimento-config/TransferenciaPanel";
import { MensagensHorarioPanel } from "@/components/atendimento-config/MensagensHorarioPanel";
import { DepartamentosPanel } from "@/components/atendimento-config/DepartamentosPanel";
import { ClassificacoesPanel } from "@/components/atendimento-config/ClassificacoesPanel";
import { TagsPanel } from "@/components/atendimento-config/TagsPanel";
import { FeriadosPanel } from "@/components/atendimento-config/FeriadosPanel";
import { PausasPanel } from "@/components/atendimento-config/PausasPanel";

type TabId = "atendimento" | "equipe" | "automacao" | "sistema";

const TABS: { id: TabId; label: string; icon: any; isNew?: boolean }[] = [
  { id: "atendimento", label: "Atendimento", icon: MessageSquare, isNew: true },
  { id: "equipe", label: "Equipe e Recursos", icon: Users, isNew: true },
  { id: "automacao", label: "Automação e Comunicação", icon: Zap },
  { id: "sistema", label: "Sistema", icon: Settings },
];

interface CardAction { label: string; onClick: () => void; icon?: any; variant?: "primary" | "outline"; }
interface CardItem {
  id: string;
  icon: any;
  title: string;
  description: string;
  isNew?: boolean;
  action?: CardAction;
  secondaryAction?: CardAction;
  render?: () => React.ReactNode;
  href?: string;
}

export default function ConfiguracoesAtendimento() {
  const [tab, setTab] = useState<TabId>("atendimento");
  const navigate = useNavigate();

  const atendimentoCards: CardItem[] = [
    { id: "distribuicao", icon: Settings, title: "Configurações Gerais de Atendimento", description: "Configure as opções gerais de comportamento do atendimento", render: () => <DistribuicaoPanel /> },
    { id: "recursos", icon: MessageCircle, title: "Recursos do chat", description: "Ative áudio, emojis, figurinhas, arquivos e exportação de PDF", render: () => <RecursosChatPanel /> },
    { id: "transferencias", icon: Send, title: "Transferências e fluxo", description: "Regras de retenção de histórico, obrigatoriedade de notas e bloqueio offline", render: () => <TransferenciaPanel /> },
    { id: "mensagens", icon: MessageSquareText, title: "Mensagens automáticas e horário de atendimento", description: "Saudação, encerramento e agenda comercial completa", render: () => <MensagensHorarioPanel /> },
    { id: "departamentos", icon: FolderKanban, title: "Gerenciar departamentos", description: "Defina as regras de distribuição de protocolos para seu departamento", render: () => <DepartamentosPanel /> },
    { id: "classificacoes", icon: MessageCircle, title: "Gerenciar classificações", description: "Crie classificações para seus atendimentos", render: () => <ClassificacoesPanel /> },
    { id: "tags", icon: Tag, title: "Gerenciar tags", description: "Defina as regras de distribuição de protocolos para suas tags", render: () => <TagsPanel /> },
    { id: "feriados", icon: CalendarClock, title: "Feriados e datas especiais", description: "Configure feriados nacionais e datas específicas do tenant", render: () => <FeriadosPanel /> },
  ];

  const equipeCards: CardItem[] = [
    {
      id: "equipe", icon: Users, title: "Gerenciar equipe",
      description: "Gerencie os membros da equipe e seus acessos",
      action: { label: "Adicionar usuário", icon: Plus, onClick: () => navigate("/configuracoes/usuarios") },
      secondaryAction: { label: "Convites enviados", icon: BookOpen, onClick: () => navigate("/configuracoes/usuarios") },
    },
    {
      id: "permissoes", icon: ShieldCheck, title: "Gerenciar permissões", isNew: true,
      description: "Crie permissões e controle o que cada grupo de usuários pode ver e fazer no sistema",
      action: { label: "Nova permissão", icon: Plus, onClick: () => navigate("/configuracoes/usuarios") },
    },
    {
      id: "templates", icon: FileText, title: "Templates dos atendentes",
      description: "Libere acesso à templates de mensagens aos atendentes",
      action: { label: "Vincular template", icon: Plus, onClick: () => navigate("/atendimento") },
    },
    {
      id: "atalhos", icon: MessageSquareText, title: "Gerenciar mensagens rápidas (Atalhos do chat)",
      description: "Defina mensagens rápidas para maior agilidade durante o atendimento no chat",
      action: { label: "Criar mensagem", icon: Plus, onClick: () => navigate("/atendimento") },
    },
    {
      id: "horario-acesso", icon: Clock, title: "Customizar horário de acesso",
      description: "Configure os dias e horários nos quais os atendentes podem se logar no sistema",
      action: { label: "Adicionar horário", icon: Plus, onClick: () => navigate("/configuracoes/usuarios") },
    },
    {
      id: "figurinhas", icon: Sticker, title: "Gerenciar figurinhas",
      description: "Gerencie as figurinhas disponíveis para os atendentes",
      action: { label: "Criar figurinha", icon: Plus, onClick: () => navigate("/atendimento") },
    },
    {
      id: "pausas", icon: Coffee, title: "Gerenciar pausas",
      description: "Configure tipos de pausa disponíveis para a equipe de atendimento",
      action: { label: "Criar pausa", icon: Plus, onClick: () => navigate("/atendimento") },
    },
  ];

  const automacaoCards: CardItem[] = [
    { id: "flow", icon: GitBranch, title: "Configurações do Flow Builder", description: "Configure o comportamento do editor de fluxos" },
    { id: "agendadas", icon: CalendarDays, title: "Mensagens agendadas", description: "Agende mensagens para serem enviadas automaticamente" },
    { id: "link", icon: LinkIcon, title: "Criar Link de Atendimento", description: "Gere links diretos para iniciar conversas ou atendimentos" },
  ];

  const sistemaCards: CardItem[] = [
    { id: "convites", icon: Mail, title: "Convites e onboarding", description: "Gerencie convites enviados e reenvio para membros pendentes", action: { label: "Convites enviados", onClick: () => navigate("/configuracoes/usuarios") } },
    { id: "logs", icon: FileText, title: "Logs e auditoria", description: "Consulte o histórico completo de eventos administrativos", action: { label: "Abrir auditoria", onClick: () => navigate("/configuracoes/logs") } },
  ];

  const cardsByTab: Record<TabId, CardItem[]> = {
    atendimento: atendimentoCards,
    equipe: equipeCards,
    automacao: automacaoCards,
    sistema: sistemaCards,
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize atendimento, equipe, automação e ajustes do sistema — tudo isolado por tenant.
          </p>
        </div>

        {/* Pill tabs */}
        <div className="rounded-2xl border border-border bg-card p-1.5 flex flex-wrap gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center min-w-[140px]",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {t.isNew && (
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 border-0",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary",
                    )}
                  >
                    NEW
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Content cards (EZ-Chat style expandable rows) */}
        <Accordion type="multiple" className="space-y-3">
          {cardsByTab[tab].map((item) => {
            const Icon = item.icon;
            const expandable = !!item.render;
            return (
              <AccordionItem
                key={item.id}
                value={item.id}
                className={cn(
                  "border border-border rounded-2xl bg-card overflow-hidden",
                  "data-[state=open]:border-primary/40 data-[state=open]:shadow-sm transition-all",
                )}
              >
                <div className="flex items-center gap-3 px-5">
                  <AccordionTrigger
                    disabled={!expandable}
                    className={cn(
                      "flex-1 hover:no-underline py-5 pr-2",
                      !expandable && "cursor-default [&>svg]:hidden",
                    )}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {item.title}
                          {item.isNew && (
                            <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 bg-primary/15 text-primary">NEW</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  {item.secondaryAction && (() => {
                    const SIcon = item.secondaryAction.icon;
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); item.secondaryAction!.onClick(); }}
                        className="shrink-0 gap-1.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        {SIcon && <SIcon className="h-3.5 w-3.5" />}
                        {item.secondaryAction.label}
                      </Button>
                    );
                  })()}

                  {item.action && (() => {
                    const AIcon = item.action.icon;
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); item.action!.onClick(); }}
                        className="shrink-0 gap-1.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        {AIcon && <AIcon className="h-3.5 w-3.5" />}
                        {item.action.label}
                      </Button>
                    );
                  })()}
                </div>

                {expandable && (
                  <AccordionContent className="px-5 pb-5 pt-2 border-t border-border/50">
                    {item.render!()}
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
