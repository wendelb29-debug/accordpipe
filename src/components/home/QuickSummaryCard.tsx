import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useEvents } from "@/hooks/useEvents";
import { Calendar, MessageSquare, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Card "Resumo rápido" inspirado no Bitrix24:
 * - métricas condensadas (posts hoje, online, eventos da semana)
 * - lista compacta de próximos eventos
 */
export function QuickSummaryCard() {
  const tenantId = useActiveCompanyId();
  const { events } = useEvents();

  const todayPostsQ = useQuery({
    queryKey: ["feed-posts-today", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .eq("servidor_id", tenantId!)
        .gte("created_at", since.toISOString());
      return count ?? 0;
    },
  });

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = (events ?? [])
    .filter((e) => {
      const d = new Date(e.start_at);
      return d >= now && d <= weekEnd;
    })
    .slice(0, 4);

  const metrics = [
    { icon: MessageSquare, label: "Posts hoje", value: todayPostsQ.data ?? 0, color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: Users, label: "Equipe", value: "Online", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: TrendingUp, label: "Eventos/semana", value: upcoming.length, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="rounded-xl bg-white dark:bg-card border-[0.5px] border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-semibold tracking-tight">Resumo rápido</h3>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 divide-x divide-border/60">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-3 text-center">
            <div className={`mx-auto h-7 w-7 rounded-md ${m.bg} flex items-center justify-center mb-1.5`}>
              <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
            </div>
            <p className="text-sm font-semibold leading-none">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Próximos eventos */}
      <div className="px-4 py-3 border-t border-border/60">
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Próximos eventos</p>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum evento esta semana</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 group">
                <div className="shrink-0 w-9 text-center rounded-md bg-secondary border border-border py-1">
                  <div className="text-[9px] font-bold text-rose-500 leading-none uppercase">
                    {format(new Date(e.start_at), "MMM", { locale: ptBR })}
                  </div>
                  <div className="text-sm font-bold leading-none mt-0.5">
                    {format(new Date(e.start_at), "dd")}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{e.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(e.start_at), "HH:mm", { locale: ptBR })}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
