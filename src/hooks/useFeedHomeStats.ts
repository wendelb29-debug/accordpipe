import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "./useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";

export function useHeroStats() {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: ["feed-hero-stats", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const [postsRes, eventsRes, leadsRes] = await Promise.all([
        supabase.from("feed_posts").select("id", { count: "exact", head: true })
          .eq("servidor_id", companyId!)
          .gte("created_at", todayStart.toISOString()),
        supabase.from("tenant_events").select("id", { count: "exact", head: true })
          .eq("tenant_id", companyId!)
          .gte("start_at", now.toISOString())
          .lte("start_at", weekEnd.toISOString()),
        supabase.from("crm_leads").select("value_mrr")
          .eq("servidor_id", companyId!)
          .eq("lead_status", "ganho")
          .gte("updated_at", weekStart.toISOString()),
      ]);

      const weekRevenue = ((leadsRes.data || []) as any[]).reduce(
        (s, l) => s + (Number(l.value_mrr) || 0), 0
      );

      return {
        postsToday: postsRes.count || 0,
        eventsWeek: eventsRes.count || 0,
        weekRevenue,
      };
    },
    staleTime: 60_000,
  });
}

export function useMyWeekStats() {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feed-my-week", companyId, user?.id],
    enabled: !!companyId && !!user?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [postsRes, reactsRes, commentsRes] = await Promise.all([
        supabase.from("feed_posts").select("id", { count: "exact", head: true })
          .eq("servidor_id", companyId!).eq("author_id", user!.id)
          .gte("created_at", since),
        (supabase as any).from("feed_post_reactions").select("id", { count: "exact", head: true })
          .eq("user_id", user!.id).gte("created_at", since),
        (supabase as any).from("feed_post_comments").select("id", { count: "exact", head: true })
          .eq("user_id", user!.id).gte("created_at", since),
      ]);
      return {
        posts: postsRes.count || 0,
        reactions: reactsRes.count || 0,
        comments: commentsRes.count || 0,
        shares: 0,
      };
    },
    staleTime: 60_000,
  });
}

export function useSuggestedColleagues() {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feed-suggested", companyId, user?.id],
    enabled: !!companyId && !!user?.id,
    queryFn: async () => {
      // Get profiles in same tenant, exclude self & those already followed
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .neq("user_id", user!.id)
        .limit(20);

      const all = (profs || []) as any[];
      if (all.length === 0) return [];

      const { data: follows } = await (supabase as any)
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      const followingSet = new Set(((follows as any[]) || []).map(f => f.following_id));

      return all.filter(p => !followingSet.has(p.user_id)).slice(0, 4);
    },
    staleTime: 60_000,
  });
}
