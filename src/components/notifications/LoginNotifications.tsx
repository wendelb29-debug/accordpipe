import { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Mail, MessageCircle, Users, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

/**
 * Mostra balões (toasts) de boas-vindas após login com contagens de:
 *  - E-mails não lidos
 *  - Mensagens no Accord Stack (WhatsApp)
 *  - Mensagens em Collabs
 *  - Atividades agendadas para hoje
 * Exibido apenas uma vez por sessão por usuário.
 */
export function LoginNotifications() {
  const { profile } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const navigate = useNavigate();

  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId || !activeCompanyId) return;

    const key = `login-balloons:${userId}:${activeCompanyId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    let cancelled = false;

    const run = async () => {
      // 1) E-mails não lidos
      let emailCount = 0;
      try {
        const { data: accounts } = await supabase
          .from("email_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("servidor_id", activeCompanyId);
        const ids = (accounts || []).map((a: any) => a.id);
        if (ids.length) {
          const { count } = await supabase
            .from("email_messages")
            .select("id", { count: "exact", head: true })
            .in("account_id", ids)
            .eq("is_read", false)
            .or("folder.eq.inbox,folder.is.null");
          emailCount = count || 0;
        }
      } catch {}

      // 2) Accord Stack — WhatsApp inbound não lidos
      let stackCount = 0;
      try {
        const { count } = await supabase
          .from("whatsapp_messages")
          .select("id", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("direction", "inbound")
          .is("read_at", null);
        stackCount = count || 0;
      } catch {}

      // 3) Collabs — mensagens novas desde último read em conversas do usuário
      let collabCount = 0;
      try {
        const { data: members } = await supabase
          .from("collab_members")
          .select("conversation_id,last_read_at")
          .eq("user_id", userId);
        if (members && members.length) {
          let total = 0;
          for (const m of members) {
            const q = supabase
              .from("collab_messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", m.conversation_id)
              .neq("sender_id", userId);
            const { count } = m.last_read_at
              ? await q.gt("created_at", m.last_read_at)
              : await q;
            total += count || 0;
          }
          collabCount = total;
        }
      } catch {}

      // 4) Atividades agendadas para HOJE
      let todayCount = 0;
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const { data } = await supabase
          .from("crm_lead_activities")
          .select("id, metadata")
          .eq("created_by_user_id", userId)
          .eq("servidor_id", activeCompanyId);
        todayCount = (data || []).filter((a: any) => {
          const meta = a.metadata || {};
          const status = meta.status || meta.activity_status || "planejada";
          if (status === "concluida" || status === "no_show") return false;
          const s = meta.scheduled_at || meta.scheduled_date;
          if (!s) return false;
          const d = new Date(s);
          return d >= start && d < end;
        }).length;
      } catch {}

      if (cancelled) return;

      const fire = (
        title: string,
        desc: string,
        icon: React.ReactNode,
        path: string,
        delay: number
      ) => {
        setTimeout(() => {
          toast(title, {
            description: desc,
            icon,
            duration: 8000,
            action: {
              label: "Visualizar",
              onClick: () => navigate(path),
            },
          });
        }, delay);
      };

      if (emailCount > 0) {
        fire(
          "E-mail",
          `Novos e-mails: ${emailCount}`,
          <Mail className="h-4 w-4 text-blue-400" />,
          "/email",
          200
        );
      }
      if (stackCount > 0) {
        fire(
          "Accord Stack",
          `Mensagens não lidas: ${stackCount}`,
          <MessageCircle className="h-4 w-4 text-emerald-400" />,
          "/accord-stack",
          700
        );
      }
      if (collabCount > 0) {
        fire(
          "Collabs",
          `Novas mensagens: ${collabCount}`,
          <Users className="h-4 w-4 text-purple-400" />,
          "/collabs",
          1200
        );
      }
      if (todayCount > 0) {
        fire(
          "Atividades de hoje",
          `Você tem ${todayCount} atividade${todayCount > 1 ? "s" : ""} agendada${todayCount > 1 ? "s" : ""} para hoje`,
          <CalendarClock className="h-4 w-4 text-amber-400" />,
          "/atividades",
          1700
        );
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [profile?.user_id, activeCompanyId, navigate]);

  return null;
}
