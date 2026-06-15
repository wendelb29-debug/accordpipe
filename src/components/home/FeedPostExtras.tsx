import { useState } from "react";
import { Megaphone, ThumbsUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { FeedPost } from "@/hooks/useFeedPosts";

const APPRECIATION_LABEL: Record<string, string> = {
  obrigado: "Obrigado 🙏",
  parabens: "Parabéns 🎉",
  excelente: "Excelente trabalho ⭐",
  inovacao: "Inovação 💡",
};

export function PostTypeBadge({ post }: { post: FeedPost }) {
  if (post.post_type === "anuncio") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
        style={{ background: "hsl(0 80% 55% / 0.15)", color: "hsl(0 90% 65%)" }}>
        <Megaphone size={10} /> ANÚNCIO
      </span>
    );
  }
  if (post.post_type === "enquete") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
        style={{ background: "hsl(217 91% 60% / 0.15)", color: "hsl(217 91% 70%)" }}>
        <BarChart3 size={10} /> ENQUETE
      </span>
    );
  }
  if (post.post_type === "apreciacao") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
        style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 60%)" }}>
        <ThumbsUp size={10} /> APRECIAÇÃO
      </span>
    );
  }
  return null;
}

export function FeedPostExtras({ post, currentUserId }: { post: FeedPost; currentUserId?: string }) {
  const qc = useQueryClient();
  const [voting, setVoting] = useState(false);

  async function handleVote(optionId: string) {
    if (!post.poll || !currentUserId || voting) return;
    setVoting(true);
    try {
      const poll = post.poll;
      const myCurrentVote = poll.options.find(o => o.voted_by_me);

      if (!poll.allow_multiple && myCurrentVote && myCurrentVote.id !== optionId) {
        await (supabase as any).from("feed_poll_votes")
          .delete()
          .eq("poll_id", poll.id)
          .eq("user_id", currentUserId);
      } else if (myCurrentVote && myCurrentVote.id === optionId) {
        await (supabase as any).from("feed_poll_votes")
          .delete()
          .eq("poll_id", poll.id)
          .eq("option_id", optionId)
          .eq("user_id", currentUserId);
        qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
        return;
      }

      const { error } = await (supabase as any).from("feed_poll_votes").insert({
        poll_id: poll.id,
        option_id: optionId,
        user_id: currentUserId,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["feed-posts-v2"] });
    } catch (e: any) {
      toast({ title: "Erro ao votar", description: e.message, variant: "destructive" });
    } finally {
      setVoting(false);
    }
  }

  if (post.post_type === "apreciacao" && post.appreciation_target) {
    return (
      <div className="mx-4 mb-3 rounded-xl border p-3 flex items-center gap-3"
        style={{ borderColor: "hsl(38 92% 50% / 0.4)", background: "hsl(38 92% 50% / 0.08)" }}>
        <div className="text-3xl">👍</div>
        <div className="flex-1 text-sm">
          <div>
            <strong className="text-foreground">{post.author.name || "Alguém"}</strong>
            <span className="text-muted-foreground"> reconheceu </span>
            <strong className="text-foreground">{post.appreciation_target.name || "um colega"}</strong>
          </div>
          {post.appreciation_kind && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                style={{ background: "hsl(38 92% 50% / 0.2)", color: "hsl(38 92% 60%)" }}>
                {APPRECIATION_LABEL[post.appreciation_kind] || post.appreciation_kind}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (post.post_type === "enquete" && post.poll) {
    const poll = post.poll;
    const hasVoted = poll.options.some(o => o.voted_by_me);
    return (
      <div className="mx-4 mb-3 rounded-xl border p-3 space-y-2"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}>
        <div className="font-semibold text-sm text-foreground">{poll.question}</div>
        <div className="space-y-1.5">
          {poll.options.map((opt) => {
            const pct = poll.total_votes > 0 ? Math.round((opt.votes / poll.total_votes) * 100) : 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVote(opt.id)}
                disabled={voting}
                className="w-full text-left relative overflow-hidden rounded-lg border px-3 py-2 text-sm transition text-foreground hover:border-primary disabled:opacity-70 disabled:text-muted-foreground"
                style={{
                  borderColor: opt.voted_by_me ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              >
                <div className="absolute inset-y-0 left-0 transition-all"
                  style={{
                    width: hasVoted ? `${pct}%` : "0%",
                    background: opt.voted_by_me ? "hsl(var(--primary) / 0.2)" : "hsl(var(--muted))",
                  }} />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {opt.voted_by_me && "✓ "}{opt.text}
                  </span>
                  {hasVoted && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {pct}% · {opt.votes}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {poll.total_votes} {poll.total_votes === 1 ? "voto" : "votos"}
          {poll.allow_multiple && " · múltipla escolha"}
        </div>
      </div>
    );
  }

  return null;
}
