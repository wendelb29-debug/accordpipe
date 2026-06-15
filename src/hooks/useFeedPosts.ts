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
  followed_by_me: boolean;
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
        .select("id,content,image_url,tags,author_id,created_at,servidor_id,pinned,post_type,expires_at,appreciation_to,appreciation_kind")
        .eq("servidor_id", companyId!)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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

      // Polls
      const { data: pollsRows } = await (supabase as any)
        .from("feed_polls")
        .select("id, post_id, question, allow_multiple")
        .in("post_id", postIds);
      const pollsByPost: Record<string, FeedPoll> = {};
      const pollIdToPostId: Record<string, string> = {};
      ((pollsRows as any[]) || []).forEach((pr) => {
        pollIdToPostId[pr.id] = pr.post_id;
        pollsByPost[pr.post_id] = {
          id: pr.id,
          question: pr.question,
          allow_multiple: !!pr.allow_multiple,
          options: [],
          total_votes: 0,
        };
      });
      const pollIds = Object.keys(pollIdToPostId);
      if (pollIds.length > 0) {
        const { data: opts } = await (supabase as any)
          .from("feed_poll_options")
          .select("id, poll_id, text, position")
          .in("poll_id", pollIds)
          .order("position", { ascending: true });
        const { data: votes } = await (supabase as any)
          .from("feed_poll_votes")
          .select("poll_id, option_id, user_id")
          .in("poll_id", pollIds);
        const voteCountByOption: Record<string, number> = {};
        const myVoteByOption: Record<string, boolean> = {};
        const totalByPoll: Record<string, number> = {};
        ((votes as any[]) || []).forEach((v) => {
          voteCountByOption[v.option_id] = (voteCountByOption[v.option_id] || 0) + 1;
          totalByPoll[v.poll_id] = (totalByPoll[v.poll_id] || 0) + 1;
          if (v.user_id === user?.id) myVoteByOption[v.option_id] = true;
        });
        ((opts as any[]) || []).forEach((o) => {
          const postId = pollIdToPostId[o.poll_id];
          if (!postId || !pollsByPost[postId]) return;
          pollsByPost[postId].options.push({
            id: o.id,
            text: o.text,
            position: o.position,
            votes: voteCountByOption[o.id] || 0,
            voted_by_me: !!myVoteByOption[o.id],
          });
          pollsByPost[postId].total_votes = totalByPoll[o.poll_id] || 0;
        });
      }

      // Appreciation targets
      const apprIds = Array.from(new Set(posts.map(p => p.appreciation_to).filter(Boolean)));
      const apprMap: Record<string, FeedAppreciationTarget> = {};
      if (apprIds.length > 0) {
        const { data: aProfs } = await supabase
          .from("profiles")
          .select("user_id,name,avatar_url")
          .in("user_id", apprIds);
        await Promise.all(((aProfs ?? []) as any[]).map(async (p) => {
          const url = p.avatar_url
            ? await resolveSignedUrl(p.avatar_url).catch(() => p.avatar_url)
            : null;
          apprMap[p.user_id] = { user_id: p.user_id, name: p.name, avatar_url: url };
        }));
      }

      return posts.map((p): FeedPost => ({
        id: p.id,
        content: p.content,
        image_url: p.image_url,
        tags: p.tags || [],
        pinned: p.pinned || false,
        created_at: p.created_at,
        post_type: (p.post_type || "mensagem") as FeedPost["post_type"],
        expires_at: p.expires_at || null,
        appreciation_to: p.appreciation_to || null,
        appreciation_kind: p.appreciation_kind || null,
        appreciation_target: p.appreciation_to ? (apprMap[p.appreciation_to] || null) : null,
        poll: pollsByPost[p.id] || null,
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
