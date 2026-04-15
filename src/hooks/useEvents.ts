import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  meeting_url: string | null;
  banner_url: string | null;
  thumbnail_url: string | null;
  highlight_on_home: boolean;
  target_mode: string;
  is_mandatory: boolean;
  status: string;
  reminder_minutes: number[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventConfirmation {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EventFormData = {
  title: string;
  description?: string;
  event_type: string;
  start_at: string;
  end_at?: string;
  location?: string;
  meeting_url?: string;
  banner_url?: string;
  thumbnail_url?: string;
  highlight_on_home?: boolean;
  target_mode?: string;
  is_mandatory?: boolean;
  reminder_minutes?: number[];
};

export const EVENT_TYPES = [
  { value: "reunião", label: "Reunião" },
  { value: "treinamento", label: "Treinamento" },
  { value: "comunicado", label: "Comunicado" },
  { value: "webinar", label: "Webinar" },
  { value: "campanha", label: "Campanha" },
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
];

export function useEvents() {
  const tenantId = useActiveCompanyId();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["tenant-events", tenantId];

  const eventsQuery = useQuery({
    queryKey: key,
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_events")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as TenantEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (form: EventFormData) => {
      const { data, error } = await supabase
        .from("tenant_events")
        .insert({
          tenant_id: tenantId!,
          created_by: user?.id,
          ...form,
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (form.target_mode === "all" || !form.target_mode) {
        await notifyTenantUsers(
          data.id,
          "tenant_event_created",
          `Novo evento: ${form.title}`,
          `${form.event_type} — ${new Date(form.start_at).toLocaleDateString("pt-BR")}`
        );
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Evento criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...form }: EventFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("tenant_events")
        .update(form as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await notifyTenantUsers(
        id,
        "tenant_event_updated",
        `Evento atualizado: ${form.title}`,
        `${form.event_type} — ${new Date(form.start_at).toLocaleDateString("pt-BR")}`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Evento atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelEvent = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("tenant_events")
        .update({ status: "cancelled" } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await notifyTenantUsers(
        id,
        "tenant_event_cancelled",
        `Evento cancelado: ${(data as any).title}`,
        "Este evento foi cancelado."
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Evento cancelado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Evento excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function notifyTenantUsers(eventId: string, type: string, title: string, message: string) {
    try {
      const { data: users } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", tenantId!)
        .eq("is_active", true)
        .eq("status", "ativo");

      if (!users?.length) return;

      const notifications = users
        .filter((u) => u.user_id !== user?.id)
        .map((u) => ({
          user_id: u.user_id,
          title,
          message,
          type,
          link: "/eventos",
          servidor_id: tenantId!,
          metadata: { event_id: eventId } as any,
        }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    } catch (e) {
      console.error("Failed to send event notifications", e);
    }
  }

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    createEvent,
    updateEvent,
    cancelEvent,
    deleteEvent,
  };
}

export function useEventConfirmations(eventId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["event-confirmations", eventId];

  const query = useQuery({
    queryKey: key,
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_event_confirmations")
        .select("*")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data as EventConfirmation[];
    },
  });

  const respond = useMutation({
    mutationFn: async (status: "confirmed" | "declined") => {
      const { error } = await supabase
        .from("tenant_event_confirmations")
        .upsert(
          {
            event_id: eventId!,
            user_id: user!.id,
            status,
            confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
          } as any,
          { onConflict: "event_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Resposta registrada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const myStatus = query.data?.find((c) => c.user_id === user?.id)?.status ?? "pending";
  const confirmed = query.data?.filter((c) => c.status === "confirmed").length ?? 0;
  const declined = query.data?.filter((c) => c.status === "declined").length ?? 0;
  const pending = query.data?.filter((c) => c.status === "pending").length ?? 0;

  return { confirmations: query.data ?? [], myStatus, confirmed, declined, pending, respond, isLoading: query.isLoading };
}
