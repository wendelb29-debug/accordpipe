import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, Check, Users, Lock, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PollOption { id: string; text: string; }
interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  multi: boolean;
  anonymous: boolean;
  closed: boolean;
  closed_at: string | null;
  closes_at: string | null;
  created_by: string;
  servidor_id: string;
}
interface Vote {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
}

interface PollCardProps {
  pollId: string;
  currentUserId: string;
  tenantUsers: Array<{ id: string; name: string }>;
  mine?: boolean;
}

export function PollCard({ pollId, currentUserId, tenantUsers, mine }: PollCardProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showVoters, setShowVoters] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from("collab_polls" as any).select("*").eq("id", pollId).maybeSingle(),
        supabase.from("collab_poll_votes" as any).select("*").eq("poll_id", pollId),
      ]);
      if (cancelled) return;
      if (p) setPoll(p as unknown as Poll);
      if (v) setVotes(v as unknown as Vote[]);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`poll:${pollId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_poll_votes", filter: `poll_id=eq.${pollId}` }, async () => {
        const { data } = await supabase.from("collab_poll_votes" as any).select("*").eq("poll_id", pollId);
        if (data) setVotes(data as unknown as Vote[]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "collab_polls", filter: `id=eq.${pollId}` }, (payload) => {
        setPoll(payload.new as unknown as Poll);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [pollId]);

  const myVotes = useMemo(
    () => new Set(votes.filter((v) => v.user_id === currentUserId).map((v) => v.option_id)),
    [votes, currentUserId],
  );
  const totalsByOption = useMemo(() => {
    const map: Record<string, Vote[]> = {};
    for (const v of votes) (map[v.option_id] ||= []).push(v);
    return map;
  }, [votes]);
  const totalVoters = useMemo(() => new Set(votes.map((v) => v.user_id)).size, [votes]);
  const closed = !!poll?.closed || !!poll?.closed_at || (poll?.closes_at ? new Date(poll.closes_at) < new Date() : false);

  const handleVote = async (optionId: string) => {
    if (!poll || busy || closed) return;
    setBusy(true);
    try {
      const already = myVotes.has(optionId);
      if (already) {
        await supabase.from("collab_poll_votes" as any).delete().eq("poll_id", pollId).eq("user_id", currentUserId).eq("option_id", optionId);
      } else {
        if (!poll.multi && myVotes.size > 0) {
          await supabase.from("collab_poll_votes" as any).delete().eq("poll_id", pollId).eq("user_id", currentUserId);
        }
        await supabase.from("collab_poll_votes" as any).insert({
          poll_id: pollId,
          user_id: currentUserId,
          option_id: optionId,
          servidor_id: poll.servidor_id,
        });
      }
    } catch (e: any) {
      toast.error("Não foi possível registrar o voto", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!poll || poll.created_by !== currentUserId) return;
    await supabase.from("collab_polls" as any).update({ closed: true, closed_at: new Date().toISOString() }).eq("id", pollId);
    toast.success("Enquete encerrada");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 min-w-[280px]">
        <div className="flex items-center gap-2 text-gray-400 text-[12.5px]">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando enquete…
        </div>
      </div>
    );
  }
  if (!poll) return null;

  const isOwner = poll.created_by === currentUserId;
  const opts: PollOption[] = Array.isArray(poll.options) ? (poll.options as any) : [];

  return (
    <div className={`rounded-2xl overflow-hidden border min-w-[280px] max-w-[400px] shadow-sm ${mine ? "bg-white border-emerald-100" : "bg-white border-gray-200"}`}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            Enquete
            {poll.multi && <span className="text-gray-400 normal-case font-medium">· múltipla escolha</span>}
            {poll.anonymous && <span className="text-gray-400 normal-case font-medium inline-flex items-center gap-0.5">· <EyeOff className="w-3 h-3" /> anônima</span>}
          </div>
          <div className="text-[14px] font-semibold text-gray-900 leading-tight mt-0.5 truncate">{poll.question}</div>
        </div>
        {closed && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            <Lock className="w-3 h-3" /> ENCERRADA
          </span>
        )}
      </div>

      <div className="px-3 py-3 space-y-1.5">
        {opts.map((opt) => {
          const count = totalsByOption[opt.id]?.length || 0;
          const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const isMine = myVotes.has(opt.id);
          return (
            <button
              key={opt.id}
              disabled={closed || busy}
              onClick={() => handleVote(opt.id)}
              className={`relative w-full text-left rounded-lg overflow-hidden border transition group ${isMine ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/40"} ${closed ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className={`absolute inset-y-0 left-0 ${isMine ? "bg-emerald-100/70" : "bg-gray-100/70"}`} style={{ width: `${pct}%`, transition: "width .35s ease" }} />
              <div className="relative flex items-center gap-2.5 px-3 py-2.5">
                <div className={`w-5 h-5 ${poll.multi ? "rounded-md" : "rounded-full"} border-2 flex items-center justify-center shrink-0 transition ${isMine ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white group-hover:border-emerald-400"}`}>
                  {isMine && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={`flex-1 text-[13.5px] truncate ${isMine ? "font-semibold text-emerald-700" : "text-gray-800"}`}>{opt.text}</span>
                <span className={`text-[11.5px] font-medium shrink-0 ${isMine ? "text-emerald-600" : "text-gray-500"}`}>{count} · {pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1 border-t border-gray-100">
        <button
          onClick={() => !poll.anonymous && totalVoters > 0 && setShowVoters("__all__")}
          disabled={poll.anonymous || totalVoters === 0}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-500 hover:text-emerald-600 transition disabled:text-gray-400 disabled:cursor-default"
        >
          <Users className="w-3.5 h-3.5" />
          {totalVoters} {totalVoters === 1 ? "voto" : "votos"}
          {!poll.anonymous && totalVoters > 0 && <span className="underline">· ver quem votou</span>}
          {poll.anonymous && <span className="text-gray-400 inline-flex items-center gap-0.5">· <EyeOff className="w-3 h-3" /> anônima</span>}
        </button>
        {isOwner && !closed && (
          <button onClick={handleClose} className="text-[11.5px] font-medium text-red-500 hover:text-red-600 transition">Encerrar</button>
        )}
      </div>

      <Dialog open={!!showVoters} onOpenChange={(open) => !open && setShowVoters(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Quem votou
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {opts.map((opt) => {
              const optVotes = totalsByOption[opt.id] || [];
              if (optVotes.length === 0) return null;
              return (
                <div key={opt.id}>
                  <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    <span className="block w-1 h-3 rounded bg-emerald-500" />
                    {opt.text}
                    <span className="text-gray-400 font-normal normal-case">· {optVotes.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {optVotes.map((v) => {
                      const u = tenantUsers.find((x) => x.id === v.user_id);
                      const initials = (u?.name || "?").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
                      return (
                        <div key={v.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{initials}</div>
                          <span className="text-[13px] text-gray-800">{u?.name || "Usuário"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PollByMessage({ messageId, ...rest }: { messageId: string } & Omit<React.ComponentProps<typeof PollCard>, "pollId">) {
  const [pollId, setPollId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.from("collab_polls" as any).select("id").eq("message_id", messageId).maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setPollId((data as any).id); });
    return () => { cancelled = true; };
  }, [messageId]);
  if (!pollId) return null;
  return <PollCard pollId={pollId} {...rest} />;
}
