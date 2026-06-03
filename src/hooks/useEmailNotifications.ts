import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { createElement } from "react";

/**
 * Escuta novas mensagens de email em tempo real (todas as contas do usuário
 * no tenant ativo) e:
 *   1. Mostra toast estilo "novo e-mail"
 *   2. Toca um "ding" sutil (Web Audio API — sem arquivo externo)
 *
 * IMPORTANTE: deve ser montado UMA VEZ globalmente (AppLayout), não em
 * cada página, senão dispara múltiplos toasts.
 *
 * A notificação no sininho (NotificationBell) é criada automaticamente
 * via trigger SQL — não precisa fazer aqui.
 */
export function useEmailNotifications() {
  const { user } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const navigate = useNavigate();
  const accountIdsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user?.id || !activeCompanyId) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // 1) Pega ids das contas do usuário no tenant ativo
      const { data: accounts } = await supabase
        .from("email_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("servidor_id", activeCompanyId);

      if (cancelled) return;

      accountIdsRef.current = new Set((accounts || []).map((a: any) => a.id));
      if (accountIdsRef.current.size === 0) return;

      // 2) Subscribe em email_messages INSERT
      channel = supabase
        .channel(`email-notifications:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "email_messages" },
          (payload) => {
            const msg = payload.new as any;

            // Só notifica se for de uma conta deste usuário
            if (!accountIdsRef.current.has(msg.account_id)) return;
            // Só notifica não lidos da INBOX
            if (msg.is_read === true) return;
            if (msg.folder && msg.folder.toLowerCase() !== "inbox") return;
            // Ignora mensagens "antigas" (sync inicial pode puxar histórico)
            const receivedAt = new Date(msg.received_at || msg.created_at).getTime();
            if (receivedAt < startedAtRef.current - 60 * 60 * 1000) return; // mais de 1h antes da sessão começar

            const senderName = msg.from_name || msg.from_email || "Desconhecido";
            const subject = msg.subject || "(sem assunto)";

            // Toca som
            playDing();

            // Toast com call to action
            toast.custom(
              (id) => createElement(EmailToast, {
                toastId: id as string,
                senderName,
                subject,
                snippet: msg.snippet,
                onOpen: () => {
                  toast.dismiss(id);
                  navigate(`/email/${msg.account_id}`);
                },
              }),
              { duration: 7000 }
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "email_accounts", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const acc = payload.new as any;
            if (acc.servidor_id === activeCompanyId) {
              accountIdsRef.current.add(acc.id);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "email_accounts" },
          (payload) => {
            const acc = payload.old as any;
            accountIdsRef.current.delete(acc.id);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id, activeCompanyId, navigate]);
}

/* ─────────────────── UI do toast ─────────────────── */

function EmailToast({
  toastId,
  senderName,
  subject,
  snippet,
  onOpen,
}: {
  toastId: string;
  senderName: string;
  subject: string;
  snippet?: string;
  onOpen: () => void;
}) {
  return createElement(
    "div",
    {
      className:
        "flex items-start gap-3 p-3 pr-4 rounded-2xl shadow-xl bg-card border border-border min-w-[320px] max-w-[420px]",
    },
    createElement(
      "div",
      {
        className:
          "w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md",
      },
      createElement(Mail, { className: "w-5 h-5 text-white" })
    ),
    createElement(
      "div",
      { className: "flex-1 min-w-0" },
      createElement(
        "div",
        { className: "text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5" },
        "Novo e-mail"
      ),
      createElement(
        "div",
        { className: "text-[13.5px] font-semibold text-foreground truncate" },
        `${senderName}: ${subject}`
      ),
      snippet
        ? createElement(
            "div",
            { className: "text-[12px] text-muted-foreground truncate mt-0.5" },
            snippet
          )
        : null,
      createElement(
        "div",
        { className: "flex items-center gap-1.5 mt-2" },
        createElement(
          "button",
          {
            onClick: onOpen,
            className:
              "h-7 px-3 rounded-lg text-[11.5px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition",
          },
          "Abrir"
        ),
        createElement(
          "button",
          {
            onClick: () => toast.dismiss(toastId),
            className:
              "h-7 px-3 rounded-lg text-[11.5px] font-medium text-muted-foreground hover:bg-muted transition",
          },
          "Dispensar"
        )
      )
    )
  );
}

/* ─────────────────── Som "ding" via Web Audio ─────────────────── */

let audioCtx: AudioContext | null = null;

function playDing() {
  try {
    // Lazy init para respeitar políticas de autoplay
    if (!audioCtx) {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    const ctx = audioCtx;
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dois osciladores pra dar um "ding" agradável (frequência alta + complementar)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.18);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now); // E6 — harmônico
    osc2.frequency.exponentialRampToValueAtTime(990, now + 0.18);

    // Envelope: ataque rápido, decaimento médio
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (_e) {
    // Som é "nice to have" — não falha o toast se algo der errado
  }
}