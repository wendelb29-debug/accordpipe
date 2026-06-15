import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "./useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { resolveSignedUrl } from "./useSignedUrl";

export type FeedFilter = "all" | "posts" | "events" | "milestones" | "announcements";

export interface FeedAuthor {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

export interface FeedReactionSummary {
  emoji: string;
  count: number;
  byMe: boolean;
}

export interface FeedPollOption {
  id: string;
  text: string;
  position: number;
  votes: number;
  voted_by_me: boolean;
}

export interface FeedPoll {
  id: string;
  question: string;
  allow_multiple: boolean;
  options: FeedPollOption[];
  total_votes: number;
}

export interface FeedAppreciationTarget {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

export interface FeedPost {
  id: string;
  content: string;
  image_url: string | null;
  tags: string[];
  pinned: boolean;
  created_at: string;
  post_type: "mensagem" | "enquete" | "anuncio" | "apreciacao";
  expires_at: string | null;
  appreciation_to: string | null;
  appreciation_kind: string | null;
  appreciation_target?: FeedAppreciationTarget | null;
  poll?: FeedPoll | null;
  author: FeedAuthor;
  reactions: FeedReactionSummary[];
  total_reactions: number;
  comments_count: number;
  saved_by_me: boolean;
}

export function useFeedPosts() {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-posts-v2", companyId, user?.id],
    enabled: !!companyId,
    queryFn: async (): Promise<FeedPost[]> => {
      const { data: rows, error } = await supabase
        .from("feed_posts")
        .select("id,content,image_url,tags,author_id,created_at,servidor_id,pinned")
        .eq("servidor_id", companyId!)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const posts = (rows ?? []) as any[];
      if (posts.length === 0) return [];

      const postIds = posts.map(p => p.id);
      const authorIds = Array.from(new Set(posts.map(p => p.author_id).filter(Boolean)));

      // Authors
      const authorMap: Record<string, FeedAuthor> = {};
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,name,avatar_url")
          .in("user_id", authorIds);
        await Promise.all(((profs ?? []) as any[]).map(async (p) => {
          const url = p.avatar_url
            ? await resolveSignedUrl(p.avatar_url).catch(() => p.avatar_url)
            : null;
          authorMap[p.user_id] = { user_id: p.user_id, name: p.name, avatar_url: url };
        }));
      }

      // Reactions
      const { data: reacts } = await (supabase as any)
        .from("feed_post_reactions")
        .select("post_id, emoji, user_id")
        .in("post_id", postIds);
      const reactionsByPost: Record<string, Record<string, { count: number; byMe: boolean }>> = {};
      const totalByPost: Record<string, number> = {};
      ((reacts as any[]) || []).forEach((r) => {
        if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = {};
        const emoji = r.emoji || "❤️";
        if (!reactionsByPost[r.post_id][emoji]) reactionsByPost[r.post_id][emoji] = { count: 0, byMe: false };
        reactionsByPost[r.post_id][emoji].count++;
        totalByPost[r.post_id] = (totalByPost[r.post_id] || 0) + 1;
        if (r.user_id === user?.id) reactionsByPost[r.post_id][emoji].byMe = true;
      });

      // Comments count
      const { data: comments } = await (supabase as any)
        .from("feed_post_comments")
        .select("post_id")
        .in("post_id", postIds);
      const commentsByPost: Record<string, number> = {};
      ((comments as any[]) || []).forEach((c) => {
        commentsByPost[c.post_id] = (commentsByPost[c.post_id] || 0) + 1;
      });

      // Saves
      let savedSet = new Set<string>();
      if (user?.id) {
        const { data: saves } = await (supabase as any)
          .from("feed_post_saves")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        savedSet = new Set(((saves as any[]) || []).map((s) => s.post_id));
      }

      return posts.map(p => ({
        id: p.id,
        content: p.content,
        image_url: p.image_url,
        tags: p.tags || [],
        pinned: p.pinned || false,
        created_at: p.created_at,
        author: authorMap[p.author_id] || { user_id: p.author_id, name: null, avatar_url: null },
        reactions: Object.entries(reactionsByPost[p.id] || {})
          .sort(([, a], [, b]) => b.count - a.count)
          .map(([emoji, v]) => ({ emoji, count: v.count, byMe: v.byMe })),
        total_reactions: totalByPost[p.id] || 0,
        comments_count: commentsByPost[p.id] || 0,
        saved_by_me: savedSet.has(p.id),
      }));
    },
    staleTime: 30_000,
  });
}
