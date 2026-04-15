import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { type TenantEvent } from "@/hooks/useEvents";

/**
 * Allows a user to add a tenant event to their personal agenda
 * by creating a crm_lead_activities record with event metadata.
 */
export function useEventAgenda() {
  const tenantId = useActiveCompanyId();
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  // Check which events the user already added to their agenda
  const addedQuery = useQuery({
    queryKey: ["event-agenda-added", tenantId, user?.id],
    enabled: !!tenantId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_lead_activities")
        .select("id, metadata")
        .eq("servidor_id", tenantId!)
        .eq("created_by_user_id", user!.id)
        .eq("type", "meeting");

      if (error) throw error;
      // Extract event_ids from metadata
      const eventIds = new Set<string>();
      for (const act of data ?? []) {
        const meta = act.metadata as any;
        if (meta?.source === "tenant_event" && meta?.event_id) {
          eventIds.add(meta.event_id);
        }
      }
      return eventIds;
    },
  });

  const addToAgenda = useMutation({
    mutationFn: async ({ event, reminderMinutes }: { event: TenantEvent; reminderMinutes: number }) => {
      if (!user?.id || !tenantId) throw new Error("Não autenticado");

      // Check if already added
      if (addedQuery.data?.has(event.id)) {
        throw new Error("Evento já adicionado à sua agenda");
      }

      const { error } = await supabase.from("crm_lead_activities").insert({
        servidor_id: tenantId,
        lead_id: null as any, // No lead linked — this is a personal agenda item
        title: `📅 ${event.title}`,
        description: event.description || `Evento: ${event.event_type}`,
        type: "meeting",
        status: "planned",
        created_by_user_id: user.id,
        created_by_name: profile?.name || "Usuário",
        metadata: {
          source: "tenant_event",
          event_id: event.id,
          event_type: event.event_type,
          scheduled_at: event.start_at,
          end_at: event.end_at,
          location: event.location,
          meeting_url: event.meeting_url,
          reminder: String(reminderMinutes),
          activity_status: "planejada",
        },
      } as any);

      if (error) throw error;

      // Also schedule an in-app notification
      if (reminderMinutes > 0) {
        const eventDate = new Date(event.start_at);
        const reminderDate = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);

        // Only create notification if reminder is in the future
        if (reminderDate > new Date()) {
          await supabase.from("notifications").insert({
            user_id: user.id,
            title: "Lembrete de Evento ⏰",
            message: `O evento "${event.title}" começa em ${reminderMinutes} minutos.`,
            type: "event_reminder",
            link: "/eventos",
            servidor_id: tenantId,
            metadata: { event_id: event.id, remind_at: reminderDate.toISOString() } as any,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-agenda-added"] });
      toast.success("Evento adicionado à sua agenda");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeFromAgenda = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id || !tenantId) throw new Error("Não autenticado");

      // Find the activity with this event_id in metadata
      const { data } = await supabase
        .from("crm_lead_activities")
        .select("id, metadata")
        .eq("servidor_id", tenantId)
        .eq("created_by_user_id", user.id)
        .eq("type", "meeting");

      const activityToRemove = data?.find((a) => {
        const meta = a.metadata as any;
        return meta?.source === "tenant_event" && meta?.event_id === eventId;
      });

      if (!activityToRemove) throw new Error("Atividade não encontrada");

      const { error } = await supabase
        .from("crm_lead_activities")
        .delete()
        .eq("id", activityToRemove.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-agenda-added"] });
      toast.success("Evento removido da sua agenda");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    isAdded: (eventId: string) => addedQuery.data?.has(eventId) ?? false,
    addToAgenda,
    removeFromAgenda,
    isLoading: addedQuery.isLoading,
  };
}
