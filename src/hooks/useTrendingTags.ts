import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "./useActiveCompanyId";

export interface TrendingTag {
  tag: string;
  count: number;
}

export function useTrendingTags(daysWindow = 7) {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: ["trending-tags", companyId, daysWindow],
    enabled: !!companyId,
    queryFn: async (): Promise<TrendingTag[]> => {
      const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("feed_posts")
        .select("tags, created_at")
        .eq("servidor_id", companyId!)
        .gte("created_at", since);

      const counts: Record<string, number> = {};
      ((data || []) as any[]).forEach((p) => {
        (p.tags || []).forEach((t: string) => {
          if (!t) return;
          counts[t] = (counts[t] || 0) + 1;
        });
      });

      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([tag, count]) => ({ tag, count }));
    },
    staleTime: 60_000,
  });
}
