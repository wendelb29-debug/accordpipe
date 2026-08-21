import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveSignedUrl } from "@/hooks/useSignedUrl";

export interface FeedProfile {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

export function useFeedProfiles(userIds: string[], tenantId: string | null) {
  return useQuery({
    queryKey: ["feed-profiles", tenantId, [...new Set(userIds)].sort()],
    enabled: !!tenantId && userIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const uniqueIds = [...new Set(userIds)].filter(Boolean);
      if (uniqueIds.length === 0) return {};

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", uniqueIds);

      if (error) throw error;

      const profilesMap: Record<string, FeedProfile> = {};
      
      await Promise.all((data || []).map(async (p) => {
        let resolvedUrl = p.avatar_url;
        if (p.avatar_url && !p.avatar_url.startsWith("http")) {
          try {
            resolvedUrl = await resolveSignedUrl(p.avatar_url);
          } catch (e) {
            console.error(`Error resolving avatar for ${p.user_id}:`, e);
          }
        }
        profilesMap[p.user_id] = {
          user_id: p.user_id,
          name: p.name,
          avatar_url: resolvedUrl
        };
      }));

      return profilesMap;
    },
  });
}
