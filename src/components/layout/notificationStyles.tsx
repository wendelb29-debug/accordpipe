import {
  Bell, Megaphone, CalendarClock, CalendarDays, CalendarPlus,
  CheckSquare, AlertCircle, Trophy, Target, UserCheck,
  UserPlus, Check, XCircle, Mail, FileText,
  MessagesSquare, AtSign, Reply, BarChart3,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Sistema de estilos por tipo de notificação.
 *
 * Cada tipo retorna:
 * - Icon: componente de ícone (lucide ou custom SVG)
 * - color: cor primária (texto/ícone) — tailwind class
 * - bg: cor de fundo do badge — tailwind class
 * - bar: cor da barra lateral do card — tailwind class
 * - label: texto curto do badge (3-7 letras, MAIÚSCULO)
 * - source: nome do módulo/produto de origem (ex: "Accord Sales")
 */
export interface NotificationStyle {
  Icon: ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  bar: string;
  label: string;
  source: string;
}

/* ────────────────────────────────────────────────────
   Logos / ícones específicos (SVG inline)
   ──────────────────────────────────────────────────── */

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22 5.46v13.08c0 .7-.46 1.16-1.16 1.16h-3.06V10.5l-5.78 4.16L6.22 10.5v9.2H3.16C2.46 19.7 2 19.24 2 18.54V5.46c0-.35.12-.65.35-.88s.53-.35.81-.35h.99l6.85 5.13L17.85 4.23h.99c.35 0 .65.12.81.35.23.23.35.53.35.88z" fill="#4285F4"/>
      <path d="M22 5.46c0-.35-.12-.65-.35-.88-.16-.23-.46-.35-.81-.35h-.99l-6.85 5.13L6.15 4.23h-.99c-.28 0-.58.12-.81.35-.23.23-.35.53-.35.88l.06.93L11 11.04l6.94-4.65.06-.93z" fill="#EA4335"/>
      <path d="M2 5.46v13.08c0 .7.46 1.16 1.16 1.16h3.06V10.5L2 7.34V5.46z" fill="#34A853"/>
      <path d="M22 5.46v1.88L17.78 10.5v9.2h3.06c.7 0 1.16-.46 1.16-1.16V5.46z" fill="#FBBC04"/>
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M21.6 4H10.4c-.22 0-.4.18-.4.4v2.4H4.4c-.22 0-.4.18-.4.4v12.8c0 .22.18.4.4.4h17.2c.22 0 .4-.18.4-.4V4.4c0-.22-.18-.4-.4-.4z" fill="#0078D4"/>
      <path d="M9.5 8.4c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3-1.5-3.3-3.3-3.3zm0 5.3c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="#fff"/>
      <path d="M14 7v9.7c0 .3.2.5.4.6l5.6 1.7c.4.1.8-.2.8-.6V7.4c0-.4-.3-.7-.7-.7H14z" fill="#28A8EA"/>
    </svg>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.91l-1.05 3.84 3.93-1.03a7.93 7.93 0 0 0 3.79.96h.01a7.95 7.95 0 0 0 7.93-7.93 7.88 7.88 0 0 0-2.18-5.43zM12.05 18.34h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.34.61.62-2.28-.16-.25a6.6 6.6 0 0 1-1.01-3.51 6.6 6.6 0 0 1 6.6-6.6 6.55 6.55 0 0 1 4.67 1.93 6.55 6.55 0 0 1 1.93 4.67 6.6 6.6 0 0 1-6.6 6.6zm3.62-4.94c-.2-.1-1.17-.58-1.36-.65-.18-.07-.31-.1-.45.1-.13.2-.51.65-.62.78-.11.13-.23.15-.43.05-.2-.1-.84-.31-1.6-.99-.59-.53-.99-1.18-1.1-1.38-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.45-1.08-.61-1.48-.16-.39-.33-.34-.45-.34l-.39-.01a.74.74 0 0 0-.53.25c-.18.2-.7.68-.7 1.66 0 .98.72 1.92.81 2.05.1.13 1.4 2.14 3.4 3 .47.2.85.32 1.14.42.48.15.91.13 1.26.08.38-.06 1.17-.48 1.34-.94.17-.46.17-.86.12-.94-.05-.08-.18-.13-.38-.23z"/>
    </svg>
  );
}

const STYLES: Record<string, NotificationStyle> = {
  // ─── E-MAIL ─────────────────────────────────────────
  email_gmail: {
    Icon: GmailIcon,
    color: "text-red-600 dark:text-red-400",
    bg:    "bg-red-500/12 dark:bg-red-500/15",
    bar:   "bg-gradient-to-b from-[#EA4335] via-[#FBBC04] to-[#34A853]",
    label: "GMAIL",
    source: "Gmail",
  },
  email_outlook: {
    Icon: OutlookIcon,
    color: "text-[#0078D4] dark:text-[#50D9FF]",
    bg:    "bg-[#0078D4]/10 dark:bg-[#0078D4]/15",
    bar:   "bg-[#0078D4]",
    label: "OUTLOOK",
    source: "Outlook",
  },
  email: {
    Icon: Mail,
    color: "text-blue-600 dark:text-blue-400",
    bg:    "bg-blue-500/12",
    bar:   "bg-blue-500",
    label: "E-MAIL",
    source: "Caixa de Correio",
  },

  // ─── WHATSAPP ───────────────────────────────────────
  whatsapp_message: {
    Icon: WhatsappIcon,
    color: "text-[#25D366]",
    bg:    "bg-[#25D366]/12",
    bar:   "bg-[#25D366]",
    label: "WHATSAPP",
    source: "WhatsApp",
  },

  // ─── CRM (Accord Sales) ─────────────────────────────
  crm_lead_new: {
    Icon: Target,
    color: "text-violet-600 dark:text-violet-400",
    bg:    "bg-violet-500/12",
    bar:   "bg-violet-500",
    label: "NOVO LEAD",
    source: "Accord Sales",
  },
  crm_lead_assigned: {
    Icon: UserCheck,
    color: "text-indigo-600 dark:text-indigo-400",
    bg:    "bg-indigo-500/12",
    bar:   "bg-indigo-500",
    label: "ATRIBUÍDO",
    source: "Accord Sales",
  },
  crm_lead_won: {
    Icon: Trophy,
    color: "text-amber-600 dark:text-amber-400",
    bg:    "bg-amber-500/12",
    bar:   "bg-gradient-to-b from-amber-400 to-amber-600",
    label: "GANHO",
    source: "Accord Sales",
  },
  crm_lead_lost: {
    Icon: XCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg:    "bg-rose-500/12",
    bar:   "bg-rose-500",
    label: "PERDIDO",
    source: "Accord Sales",
  },
  crm_proposal: {
    Icon: FileText,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg:    "bg-fuchsia-500/12",
    bar:   "bg-fuchsia-500",
    label: "PROPOSTA",
    source: "Accord Sales",
  },

  // ─── ATIVIDADES / TAREFAS ───────────────────────────
  task_assigned: {
    Icon: CheckSquare,
    color: "text-sky-600 dark:text-sky-400",
    bg:    "bg-sky-500/12",
    bar:   "bg-sky-500",
    label: "TAREFA",
    source: "Atividades",
  },
  task_due: {
    Icon: CalendarClock,
    color: "text-orange-600 dark:text-orange-400",
    bg:    "bg-orange-500/12",
    bar:   "bg-orange-500",
    label: "VENCE HOJE",
    source: "Atividades",
  },
  task_overdue: {
    Icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bg:    "bg-red-500/12",
    bar:   "bg-red-500",
    label: "ATRASADA",
    source: "Atividades",
  },
  task_completed: {
    Icon: Check,
    color: "text-emerald-600 dark:text-emerald-400",
    bg:    "bg-emerald-500/12",
    bar:   "bg-emerald-500",
    label: "CONCLUÍDA",
    source: "Atividades",
  },

  // ─── EVENTOS / CALENDÁRIO ───────────────────────────
  event_reminder: {
    Icon: CalendarDays,
    color: "text-yellow-600 dark:text-yellow-400",
    bg:    "bg-yellow-500/12",
    bar:   "bg-yellow-500",
    label: "EVENTO",
    source: "Calendário",
  },
  event_invitation: {
    Icon: CalendarPlus,
    color: "text-indigo-600 dark:text-indigo-400",
    bg:    "bg-indigo-500/12",
    bar:   "bg-indigo-500",
    label: "CONVITE",
    source: "Calendário",
  },

  // ─── COLLABS (chat interno) ─────────────────────────
  collab_message: {
    Icon: MessagesSquare,
    color: "text-cyan-600 dark:text-cyan-400",
    bg:    "bg-cyan-500/12",
    bar:   "bg-cyan-500",
    label: "COLLABS",
    source: "Collabs · Chat interno",
  },
  collab_mention: {
    Icon: AtSign,
    color: "text-pink-600 dark:text-pink-400",
    bg:    "bg-pink-500/12",
    bar:   "bg-pink-500",
    label: "@MENÇÃO",
    source: "Collabs · Você foi citado",
  },
  collab_reply: {
    Icon: Reply,
    color: "text-teal-600 dark:text-teal-400",
    bg:    "bg-teal-500/12",
    bar:   "bg-teal-500",
    label: "RESPOSTA",
    source: "Collabs · Resposta à sua mensagem",
  },
  collab_poll: {
    Icon: BarChart3,
    color: "text-violet-500 dark:text-violet-300",
    bg:    "bg-violet-400/12",
    bar:   "bg-violet-400",
    label: "ENQUETE",
    source: "Collabs · Nova enquete",
  },

  // ─── SISTEMA ────────────────────────────────────────
  user_pending: {
    Icon: UserPlus,
    color: "text-amber-600 dark:text-amber-400",
    bg:    "bg-amber-500/12",
    bar:   "bg-amber-500",
    label: "USUÁRIO",
    source: "Administração",
  },
  user_approved: {
    Icon: Check,
    color: "text-emerald-600 dark:text-emerald-400",
    bg:    "bg-emerald-500/12",
    bar:   "bg-emerald-500",
    label: "APROVADO",
    source: "Administração",
  },
  announcement: {
    Icon: Megaphone,
    color: "text-violet-600 dark:text-violet-400",
    bg:    "bg-violet-500/12",
    bar:   "bg-violet-500",
    label: "AVISO",
    source: "Anúncio",
  },
  reminder: {
    Icon: CalendarClock,
    color: "text-red-600 dark:text-red-400",
    bg:    "bg-red-500/12",
    bar:   "bg-red-500",
    label: "LEMBRETE",
    source: "Lembrete",
  },
};

/**
 * Retorna o estilo da notificação considerando o type principal e
 * metadata.provider (pra subdividir e-mail entre Gmail e Outlook).
 */
export function getNotificationStyle(
  type: string,
  metadata?: { provider?: string } | null,
): NotificationStyle {
  if (type === "email" && metadata?.provider) {
    const sub = `email_${metadata.provider}`;
    if (STYLES[sub]) return STYLES[sub];
  }

  return STYLES[type] || {
    Icon: Bell,
    color: "text-muted-foreground",
    bg:    "bg-muted",
    bar:   "bg-muted-foreground/40",
    label: "AVISO",
    source: "Accord",
  };
}
