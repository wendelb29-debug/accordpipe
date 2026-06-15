import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "./useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  meeting_url: string | null;
  event_type: string;
  going: number;
  maybe: number;
  not_going: number;
  attendees: { user_id: string; status: string }[];
  my_status: "going" | "maybe" | "not_going" | null;
}

export function useFeedEvents() {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-events", companyId, user?.id],
    enabled: !!companyId,
    queryFn: async (): Promise<FeedEvent[]> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("tenant_events")
        .select("id, title, description, start_at, end_at, location, meeting_url, event_type")
        .eq("tenant_id", companyId!)
        .gte("start_at", since)
        .order("start_at", { ascending: true })
        .limit(5);
      if (error) throw error;

      const events = (data || []) as any[];
      if (events.length === 0) return [];

      const eventIds = events.map(e => e.id);
      const { data: confs } = await supabase
        .from("tenant_event_confirmations")
        .select("event_id, user_id, status")
        .in("event_id", eventIds);

      const byEvent: Record<string, { going: number; maybe: number; not_going: number; attendees: any[]; my_status: any }> = {};
      eventIds.forEach(id => { byEvent[id] = { going: 0, maybe: 0, not_going: 0, attendees: [], my_status: null }; });
      ((confs as any[]) || []).forEach(c => {
        const b = byEvent[c.event_id];
        if (!b) return;
        if (c.status === "going" || c.status === "confirmed") b.going++;
        else if (c.status === "maybe") b.maybe++;
        else if (c.status === "not_going" || c.status === "declined") b.not_going++;
        b.attendees.push({ user_id: c.user_id, status: c.status });
        if (c.user_id === user?.id) b.my_status = c.status === "confirmed" ? "going" : c.status;
      });

      return events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_at: e.start_at,
        end_at: e.end_at,
        location: e.location,
        meeting_url: e.meeting_url,
        event_type: e.event_type,
        ...byEvent[e.id],
      }));
    },
    staleTime: 30_000,
  });
}
