import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Phone, Clock, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueueNotifications, QueueItem as QItem } from "@/hooks/useQueueNotifications";
import { useContactStatus } from "@/hooks/useContactStatus";

interface Props {
  onOpenContact?: (contactId: string) => void;
}

export function QueueTab({ onOpenContact }: Props) {
  const { user } = useAuth();

  const { data: departmentIds, isLoading: loadingDepts } = useQuery({
    queryKey: ["my-department-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_departments")
        .select("department_id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return (data || []).map((d: any) => d.department_id);
    },
    enabled: !!user?.id,
  });

  const { queueItems, unreadCount } = useQueueNotifications(departmentIds || []);

  if (loadingDepts) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!departmentIds || departmentIds.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Você não está atribuído a nenhum departamento.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Inbox className="h-4 w-4" /> Fila de Atendimento
        </h3>
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white animate-pulse">
            {unreadCount}
          </Badge>
        )}
      </div>

      {queueItems.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
          ✅ Nenhum atendimento na fila
        </div>
      ) : (
        <div className="space-y-2">
          {queueItems.map((item) => (
            <QueueItemCard key={item.contact_id} item={item} onOpen={onOpenContact} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItemCard({ item, onOpen }: { item: QItem; onOpen?: (id: string) => void }) {
  const { assumeMutation } = useContactStatus(item.contact_id);

  const { data: contact } = useQuery({
    queryKey: ["queue-contact", item.contact_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_contacts")
        .select("id, name, phone, avatar_url")
        .eq("id", item.contact_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: dept } = useQuery({
    queryKey: ["queue-dept", item.department_id],
    queryFn: async () => {
      if (!item.department_id) return null;
      const { data } = await supabase
        .from("tenant_departments")
        .select("name, icon")
        .eq("id", item.department_id)
        .maybeSingle();
      return data;
    },
    enabled: !!item.department_id,
  });

  const waitMin = Math.max(0, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000));

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/40 transition">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{contact?.name || contact?.phone || "Contato"}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
          {dept && (
            <span className="flex items-center gap-1">
              <span>{dept.icon}</span> {dept.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {waitMin} min
          </span>
        </div>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await assumeMutation.mutateAsync().catch(() => {});
          onOpen?.(item.contact_id);
        }}
        disabled={assumeMutation.isPending}
        className="gap-1.5 h-8"
      >
        <Phone className="h-3.5 w-3.5" /> Assumir
      </Button>
    </div>
  );
}
