import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, FileText, UserPlus, TrendingUp } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  type: string;
  created_by_name: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Activity> = {
  note: FileText,
  call: TrendingUp,
  meeting: UserPlus,
};

export function ActivityFeed() {
  const { profile, isMaster, activeCompanyId } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const companyId = isMaster ? activeCompanyId : profile?.company_id;
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("crm_lead_activities")
        .select("id,title,type,created_by_name,created_at")
        .eq("servidor_id", companyId)
        .order("created_at", { ascending: false })
        .limit(15);
      setItems((data as FeedItem[]) || []);
    })();
  }, [profile?.company_id, activeCompanyId]);

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Atividades Recentes</h3>
      </div>
      <ScrollArea className="flex-1 px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma atividade recente</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = typeIcons[item.type] || Activity;
              const initials = (item.created_by_name || "?").slice(0, 2).toUpperCase();
              return (
                <div key={item.id} className="flex gap-3 items-start">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {item.created_by_name || "Sistema"} · {format(new Date(item.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
