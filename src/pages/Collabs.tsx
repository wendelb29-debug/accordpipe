import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Phone,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Smile,
  AtSign,
  Send,
  Mic,
  Download,
  FileText,
  FileSpreadsheet,
  Pin,
  Monitor,
  HardDrive,
  Loader2,
  File as FileIcon,
  PenSquare,
  Users,
  Sparkles,
  Megaphone,
  Handshake,
  Video,
  UserPlus,
  Info,
  Reply,
  SmilePlus,
  ExternalLink,
  X,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HexAvatar, hexGradientFor } from "@/components/collabs/HexAvatar";
import { CollabInfoPanel } from "@/components/collabs/CollabInfoPanel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ConstellationCanvas } from "@/components/ui/constellation-canvas";


/* ──────────────────────────  TYPES  ────────────────────────── */

type ConvKind = "group" | "channel" | "collab" | "copilot" | "video" | "direct";

interface Conversation {
  id: string;
  servidor_id: string;
  kind: ConvKind;
  name: string;
  emoji: string | null;
  color: string | null;
  created_by: string;
  is_pinned: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
}

type FileAttachment = {
  kind: "pdf" | "xls" | "image" | "file" | "doc";
  name: string;
  size: string;
  url?: string;
};

interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  attachments: FileAttachment[];
  reply_to_id: string | null;
  is_system: boolean;
  created_at: string;
}

interface DbReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface MemberRow {
  user_id: string;
  role: "owner" | "admin" | "member";
  last_read_at: string | null;
}

/* ──────────────────────────  CONSTANTS  ────────────────────────── */

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "💡"];

const FILE_THEME: Record<FileAttachment["kind"], { from: string; to: string; iconBg: string; iconColor: string; label: string }> = {
  pdf:   { from: "#FFF3EE", to: "#FFE2D4", iconBg: "#FFD6BF", iconColor: "#D85A30", label: "PDF" },
  xls:   { from: "#EEFBE2", to: "#DCF3C1", iconBg: "#C7E8A2", iconColor: "#3B6D11", label: "XLSX" },
  doc:   { from: "#E8F1FF", to: "#D2E3FF", iconBg: "#BCD3FF", iconColor: "#2563EB", label: "DOC" },
  image: { from: "#F3EBFF", to: "#E4D3FF", iconBg: "#D5BBFF", iconColor: "#7C3AED", label: "IMG" },
  file:  { from: "#F1F3F8", to: "#E4E8F1", iconBg: "#D1D7E3", iconColor: "#475569", label: "FILE" },
};

const KIND_META: Record<ConvKind, { color: string; Icon: typeof Users; label: string }> = {
  group:   { color: "#6366f1", Icon: Users,     label: "Grupo" },
  channel: { color: "#f59e0b", Icon: Megaphone, label: "Canal" },
  collab:  { color: "#10b981", Icon: Handshake, label: "Collab" },
  copilot: { color: "#a855f7", Icon: Sparkles,  label: "CoPilot" },
  video:   { color: "#ef4444", Icon: Video,     label: "Vídeo" },
  direct:  { color: "#6366f1", Icon: MessageSquare, label: "Direto" },
};

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys e pessoas",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬"],
  },
  {
    label: "Gestos e corpo",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","💪"],
  },
  {
    label: "Corações e símbolos",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","✅","❌","⭕","🛑","⛔","💯","💢","♨️","❗","❕","❓","❔","‼️","⁉️"],
  },
];

const EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

const STICKERS: string[] = [
  "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif",
  "https://media.giphy.com/media/26gsspfbsXrnXLwfu/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
  "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
];

/* ──────────────────────────  HELPERS  ────────────────────────── */

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function classifyFile(name: string, mime?: string): FileAttachment["kind"] {
  const lower = name.toLowerCase();
  if ((mime || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(xls|xlsx|csv)$/i.test(lower)) return "xls";
  if (/\.(docx?|gdoc|odt|txt|md)$/i.test(lower)) return "doc";
  return "file";
}

function avatarColorFor(id: string) {
  const palette = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#0ea5e9", "#ec4899", "#14b8a6"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ──────────────────────────  COMPONENT  ────────────────────────── */

export default function Collabs() {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [reactions, setReactions] = useState<DbReaction[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [pickerTab, setPickerTab] = useState<"emoji" | "stickers">("emoji");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Create + invite dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<ConvKind>("group");
  const [newName, setNewName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<"colab" | "guest">("colab");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  // Tenant users (for mentions and member selection)
  type MentionUser = { id: string; name: string; handle: string; avatar_url: string | null; department: string };
  const [tenantUsers, setTenantUsers] = useState<MentionUser[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const userMap = useMemo(() => {
    const m = new Map<string, MentionUser>();
    tenantUsers.forEach((u) => m.set(u.id, u));
    return m;
  }, [tenantUsers]);

  const slug = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "user";

  /* ────── Load tenant users (for mentions + add members) ────── */
  useEffect(() => {
    if (!companyId) { setTenantUsers([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, name, avatar_url, is_active, status, tags")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("status", "ativo")
        .order("name", { ascending: true });
      if (cancelled) return;
      const list: MentionUser[] = (data || [])
        .filter((p: any) => p.name && p.user_id)
        .map((p: any) => ({
          id: p.user_id as string,
          name: p.name as string,
          handle: slug((p.name as string).split(" ")[0] || p.name),
          avatar_url: p.avatar_url || null,
          department: (Array.isArray(p.tags) && p.tags[0]) || "Equipe",
        }));
      setTenantUsers(list);
    };
    load();
    return () => { cancelled = true; };
  }, [companyId]);

  /* ────── Presence: online users + typing indicator ────── */
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!companyId || !user) return;
    const ch = supabase.channel(`collab-presence-${companyId}`, { config: { presence: { key: user.id } } });
    presenceRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ typing_in?: string | null }>>;
      const online = new Set<string>(Object.keys(state));
      const typing = new Set<string>();
      for (const [uid, metas] of Object.entries(state)) {
        if (uid === user.id) continue;
        if (metas?.some((m) => m.typing_in)) typing.add(uid);
      }
      setOnlineIds(online);
      setTypingIds(typing);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ typing_in: null });
    });
    return () => { supabase.removeChannel(ch); presenceRef.current = null; };
  }, [companyId, user?.id]);

  useEffect(() => {
    const ch = presenceRef.current;
    if (!ch || !activeId) return;
    const isTyping = input.trim().length > 0;
    const t = setTimeout(() => {
      ch.track({ typing_in: isTyping ? activeId : null }).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [input, activeId]);

  /* ────── Group users by department for right panel ────── */
  const usersByDept = useMemo(() => {
    const m = new Map<string, MentionUser[]>();
    for (const u of tenantUsers) {
      const arr = m.get(u.department) || [];
      arr.push(u);
      m.set(u.department, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tenantUsers]);

  const typingUsersInActive = useMemo(() => {
    if (!activeId) return [] as MentionUser[];
    return Array.from(typingIds).map((id) => userMap.get(id)).filter(Boolean) as MentionUser[];
  }, [typingIds, activeId, userMap]);

  /* ────── Load conversations + realtime ────── */
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const load = async () => {
      setLoadingConvs(true);
      const { data, error } = await supabase
        .from("collab_conversations")
        .select("*")
        .eq("servidor_id", companyId)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (!error) {
        setConversations((data as Conversation[]) || []);
        setActiveId((cur) => cur ?? (data && data[0]?.id) ?? null);
      }
      setLoadingConvs(false);
    };
    load();

    const ch = supabase
      .channel(`collab-list-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_conversations", filter: `servidor_id=eq.${companyId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_members" }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [companyId]);

  /* ────── Load messages + members for active conversation + realtime ────── */
  useEffect(() => {
    if (!activeId) { setMessages([]); setReactions([]); setMembers([]); setMemberCount(0); return; }
    let cancelled = false;

    const load = async () => {
      setLoadingMsgs(true);
      const [{ data: msgs }, { data: mems }] = await Promise.all([
        supabase
          .from("collab_messages")
          .select("*")
          .eq("conversation_id", activeId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(500),
        supabase
          .from("collab_members")
          .select("user_id, role, last_read_at")
          .eq("conversation_id", activeId),
      ]);
      if (cancelled) return;
      const cleanMsgs: DbMessage[] = (msgs || []).map((m: any) => ({
        ...m,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
      }));
      setMessages(cleanMsgs);
      setMembers((mems as MemberRow[]) || []);
      setMemberCount((mems || []).length);

      const ids = cleanMsgs.map((m) => m.id);
      if (ids.length > 0) {
        const { data: rxs } = await supabase
          .from("collab_reactions")
          .select("*")
          .in("message_id", ids);
        if (!cancelled) setReactions((rxs as DbReaction[]) || []);
      } else {
        setReactions([]);
      }
      setLoadingMsgs(false);

      // Mark as read
      if (user) {
        supabase
          .from("collab_members")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", activeId)
          .eq("user_id", user.id)
          .then(() => {});
      }
    };
    load();

    const ch = supabase
      .channel(`collab-conv-${activeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const m = payload.new as any;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] }]);
        } else if (payload.eventType === "DELETE") {
          setMessages((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
        } else if (payload.eventType === "UPDATE") {
          const m = payload.new as any;
          setMessages((prev) => prev.map((x) => x.id === m.id ? { ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] } : x));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_reactions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as DbReaction;
          setReactions((prev) => prev.some((x) => x.id === r.id) ? prev : [...prev, r]);
        } else if (payload.eventType === "DELETE") {
          setReactions((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeId, user?.id]);

  /* ────── Derived ────── */
  const active = conversations.find((c) => c.id === activeId) || null;

  const filtered = useMemo(
    () => conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [conversations, search]
  );

  const reactionsByMsg = useMemo(() => {
    const map = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
    for (const r of reactions) {
      const arr = map.get(r.message_id) || [];
      const found = arr.find((x) => x.emoji === r.emoji);
      if (found) {
        found.count++;
        if (r.user_id === user?.id) found.mine = true;
      } else {
        arr.push({ emoji: r.emoji, count: 1, mine: r.user_id === user?.id });
      }
      map.set(r.message_id, arr);
    }
    return map;
  }, [reactions, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages.length]);

  /* ────── Actions ────── */

  const openCreate = (kind: ConvKind) => {
    setCreateKind(kind);
    setNewName("");
    setSelectedMemberIds([]);
    setMemberSearch("");
    setCreateOpen(true);
  };

  const toggleMemberSel = (id: string) =>
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submitCreate = async () => {
    if (!newName.trim() || !companyId || !user) return;
    setCreating(true);
    try {
      const meta = KIND_META[createKind];
      const name = createKind === "channel" ? newName.trim().replace(/^#\s*/, "") : newName.trim();
      const { data: conv, error } = await supabase
        .from("collab_conversations")
        .insert({
          servidor_id: companyId,
          kind: createKind,
          name,
          color: meta.color,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Add creator as owner + selected members
      const memberRows = [
        { conversation_id: conv.id, user_id: user.id, role: "owner" as const },
        ...selectedMemberIds.filter((id) => id !== user.id).map((id) => ({ conversation_id: conv.id, user_id: id, role: "member" as const })),
      ];
      const { error: memErr } = await supabase.from("collab_members").insert(memberRows);
      if (memErr) throw memErr;
      // System message
      await supabase.from("collab_messages").insert({
        conversation_id: conv.id,
        servidor_id: companyId,
        sender_id: user.id,
        content: `${name} foi criado.`,
        is_system: true,
        attachments: [],
      });
      setCreateOpen(false);
      setActiveId(conv.id);
      toast({ title: "Conversa criada", description: name });
    } catch (e: any) {
      toast({ title: "Erro ao criar conversa", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const inviteLink = activeId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/collabs/convite/${activeId}`
    : "";

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 1800);
    } catch {}
  };

  const addExistingMember = async (userId: string) => {
    if (!activeId) return;
    const { error } = await supabase.from("collab_members").insert({ conversation_id: activeId, user_id: userId, role: "member" });
    if (error) {
      toast({ title: "Não foi possível adicionar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Adicionado à conversa" });
    }
  };

  const messagePlainText = (m: DbMessage): string => {
    if (m.content) return m.content;
    if (m.attachments?.length) return `📎 ${m.attachments.length} arquivo(s)`;
    return "Mensagem";
  };

  const startReply = (m: DbMessage) => {
    const senderName = m.sender_id === user?.id ? "Você" : (userMap.get(m.sender_id || "")?.name || "Mensagem");
    setReplyTo({ id: m.id, name: senderName, text: messagePlainText(m).slice(0, 120) });
    inputRef.current?.focus();
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.message_id === msgId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("collab_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("collab_reactions").insert({ message_id: msgId, user_id: user.id, emoji });
    }
    setReactPickerFor(null);
  };

  const sendText = async () => {
    const t = input.trim();
    if (!t || !activeId || !user || !companyId) return;
    setInput("");
    const replyId = replyTo?.id || null;
    setReplyTo(null);
    setShowEmoji(false);
    setShowMentions(false);
    const { error } = await supabase.from("collab_messages").insert({
      conversation_id: activeId,
      servidor_id: companyId,
      sender_id: user.id,
      content: t,
      reply_to_id: replyId,
      attachments: [],
    });
    if (error) toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
  };

  const sendSticker = async (url: string) => {
    if (!activeId || !user || !companyId) return;
    setShowEmoji(false);
    await supabase.from("collab_messages").insert({
      conversation_id: activeId,
      servidor_id: companyId,
      sender_id: user.id,
      content: null,
      attachments: [{ kind: "image", name: "sticker.gif", size: "", url }],
    });
  };

  const handleFiles = async (files: FileList | null, asImage: boolean) => {
    if (!files || !activeId || !user || !companyId) return;
    const arr = Array.from(files);
    const uploaded: FileAttachment[] = [];
    for (const f of arr) {
      const path = `collabs/${companyId}/${activeId}/${crypto.randomUUID()}-${f.name}`;
      const { data, error } = await supabase.storage.from("documents").upload(path, f, { upsert: false, contentType: f.type || undefined });
      if (error) {
        toast({ title: "Falha no upload", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(data.path, 60 * 60 * 24 * 7);
      uploaded.push({
        kind: asImage || f.type.startsWith("image/") ? "image" : classifyFile(f.name, f.type),
        name: f.name,
        size: formatBytes(f.size),
        url: signed?.signedUrl,
      });
    }
    if (uploaded.length === 0) return;
    const replyId = replyTo?.id || null;
    setReplyTo(null);
    await supabase.from("collab_messages").insert({
      conversation_id: activeId,
      servidor_id: companyId,
      sender_id: user.id,
      content: null,
      attachments: uploaded,
      reply_to_id: replyId,
    });
  };

  const insertAtCursor = (text: string) => {
    const el = inputRef.current;
    if (!el) { setInput((v) => v + text); return; }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + text + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  /* ────── Render ────── */

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden" style={{ background: "linear-gradient(180deg, #faf9ff 0%, #f4f1fb 100%)" }}>
      {/* SIDEBAR — dark purple */}
      <aside
        className="w-[320px] min-w-[320px] flex flex-col shrink-0 text-white"
        style={{ background: "linear-gradient(180deg, #1a0f3d 0%, #2a1758 55%, #1e1145 100%)" }}
      >
        <div className="h-[60px] flex items-center gap-2 px-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2 bg-white/8 hover:bg-white/12 transition rounded-full px-3 py-2 flex-1 min-w-0 border border-white/8">
            <Search className="h-4 w-4 text-white/60 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa…"
              className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-white/40"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>

              <button
                className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-white shadow-[0_4px_14px_-2px_rgba(99,102,241,0.55)] hover:shadow-[0_6px_18px_-2px_rgba(99,102,241,0.7)] transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" }}
                title="Criar"
              >
                <PenSquare className="h-[18px] w-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-[320px] p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,243,255,0.98) 100%)" }}
            >
              {([
                { kind: "group" as const,   icon: Users,     title: "Bate-papo em grupo",      desc: "Discussões em grupo",                       color: "#6366f1" },
                { kind: "copilot" as const, icon: Sparkles,  title: "Conversar com o CoPilot", desc: "Resolução de problemas assistida por IA",   color: "#a855f7" },
                { kind: "channel" as const, icon: Megaphone, title: "Canal",                   desc: "Notícias, comunicados, comentários",        color: "#f59e0b" },
                { kind: "collab" as const,  icon: Handshake, title: "Collab",                  desc: "Colabore com equipes externas e convidados",color: "#10b981" },
                { kind: "video" as const,   icon: Video,     title: "Videoconferência",        desc: "Organize videoconferências com convidados", color: "#ef4444" },
              ]).map((opt) => (
                <DropdownMenuItem
                  key={opt.title}
                  onSelect={(e) => { e.preventDefault(); openCreate(opt.kind); }}
                  className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-violet-50/80 data-[highlighted]:bg-violet-50/80 gap-3"
                >
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${opt.color}15`, color: opt.color }}>
                    <opt.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-gray-900 leading-tight">{opt.title}</span>
                    <span className="text-[11.5px] text-gray-500 leading-tight mt-0.5 truncate">{opt.desc}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setInviteTab("colab"); setInviteOpen(true); }}
                className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-blue-50/80 data-[highlighted]:bg-blue-50/80 gap-3 mt-1"
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600">
                  <UserPlus className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-blue-600 leading-tight">Convidar usuários</span>
                  <span className="text-[11.5px] text-gray-500 leading-tight mt-0.5 truncate">Adicionar membros à conversa atual</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-1.5 scrollbar-thin">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-10 text-white/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center px-6 py-12 text-sm text-white/55">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Nenhuma conversa ainda.<br />
              Clique no <PenSquare className="inline h-3.5 w-3.5 mx-0.5" /> para criar a primeira.
            </div>
          ) : filtered.map((c) => {
            const isActive = c.id === activeId;
            const meta = KIND_META[c.kind];
            const Icon = meta.Icon;
            const color = c.color || meta.color;
            const prefix = c.kind === "channel" ? "# " : "";
            return (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 my-0.5 rounded-2xl cursor-pointer transition-all h-[64px]",
                  isActive
                    ? "bg-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_8px_24px_-12px_rgba(124,58,237,0.6)]"
                    : "hover:bg-white/6",
                )}
              >
                <HexAvatar
                  size={44}
                  background={c.color ? `linear-gradient(135deg, ${c.color} 0%, ${c.color}cc 100%)` : hexGradientFor(c.id)}
                  src={(c as any).avatar_url || null}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </HexAvatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {c.is_pinned && <Pin className="h-3 w-3 shrink-0 text-white/55" />}
                      <span className="text-[13.5px] font-medium truncate text-white">
                        {prefix}{c.name}
                      </span>
                    </div>
                    <span className="text-[11px] shrink-0 text-white/50">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs truncate text-white/55">
                      {c.last_message_preview || "Sem mensagens ainda"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>


      {/* CHAT MAIN */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!active ? (
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 overflow-hidden" style={{ background: "linear-gradient(180deg, #fdfcff 0%, #f5f0fb 100%)" }}>
            <ConstellationCanvas />
            <div className="relative z-10 flex flex-col items-center">
              <MessageSquare className="h-14 w-14 mb-4 text-violet-300" />
              <div className="text-base font-semibold text-gray-800">Selecione uma conversa</div>
              <p className="text-sm mt-1 max-w-sm text-gray-500">Suas conversas, canais e collabs do tenant aparecem aqui em tempo real.</p>
            </div>
          </div>

        ) : (
          <>
            <header className="h-[64px] flex items-center gap-3 px-5 shrink-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/70">
              <HexAvatar
                size={40}
                background={active.color ? `linear-gradient(135deg, ${active.color} 0%, ${active.color}cc 100%)` : hexGradientFor(active.id)}
                src={(active as any).avatar_url || null}
              >
                {(() => { const I = KIND_META[active.kind].Icon; return <I className="h-[18px] w-[18px]" />; })()}
              </HexAvatar>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-gray-900 leading-tight truncate">
                  {active.kind === "channel" ? "# " : ""}{active.name}
                </div>
                <div className="text-[11.5px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {onlineIds.size} online
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{memberCount} {memberCount === 1 ? "membro" : "membros"}</span>
                  <span className="opacity-40">·</span>
                  <span>{KIND_META[active.kind].label}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setInviteTab("colab"); setInviteOpen(true); }} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors" title="Adicionar membros">
                  <UserPlus className="h-[17px] w-[17px]" />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                  <MoreVertical className="h-[17px] w-[17px]" />
                </button>
              </div>
            </header>

            <div
              className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 relative"
              style={{
                background: "linear-gradient(180deg, #fdfcff 0%, #f7f4fc 100%)",
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0), linear-gradient(180deg, #fdfcff 0%, #f7f4fc 100%)`,
                backgroundSize: "22px 22px, auto",
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(900px 500px at 85% -10%, rgba(124,58,237,0.08), transparent 60%), radial-gradient(700px 400px at -10% 110%, rgba(99,102,241,0.07), transparent 60%)" }} />


              <div className="relative z-10 flex flex-col gap-1">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center my-10">
                    <span className="text-[12px] text-gray-500 bg-white/80 border border-violet-100 px-4 py-1.5 rounded-full inline-block shadow-sm backdrop-blur">
                      Nenhuma mensagem ainda. Diga olá 👋
                    </span>
                  </div>
                ) : (
                  messages.map((m) => {
                    if (m.is_system) {
                      return (
                        <div key={m.id} className="text-center my-2">
                          <span className="text-[11.5px] text-gray-500 bg-white/80 border border-gray-200 px-3.5 py-1 rounded-full inline-block leading-snug shadow-sm backdrop-blur">
                            {m.content}
                          </span>
                        </div>
                      );
                    }

                    const isSent = m.sender_id === user?.id;
                    const sender = userMap.get(m.sender_id || "");
                    const senderName = sender?.name || "Usuário";
                    const senderInitials = initialsOf(senderName);
                    const senderColor = avatarColorFor(m.sender_id || "x");
                    const allFiles = m.attachments || [];
                    const hasBubble = !!m.content || !!m.reply_to_id;
                    const quote = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
                    const reacts = reactionsByMsg.get(m.id) || [];
                    const time = formatTime(m.created_at);

                    return (
                      <div key={m.id} className={cn("group/msg flex gap-2 mb-2", isSent && "flex-row-reverse")}>
                        {!isSent && (
                          sender?.avatar_url ? (
                            <img src={sender.avatar_url} alt={senderName} className="w-8 h-8 min-w-8 rounded-full object-cover self-end shadow-sm" />
                          ) : (
                            <div className="w-8 h-8 min-w-8 rounded-full flex items-center justify-center text-[11px] font-medium text-white self-end shadow-sm" style={{ background: senderColor }}>
                              {senderInitials}
                            </div>
                          )
                        )}
                        <div className={cn("flex flex-col gap-1 max-w-[68%] min-w-0", isSent && "items-end")}>
                          {!isSent && (
                            <div className="text-[11.5px] font-medium pl-0.5" style={{ color: senderColor }}>
                              {senderName}
                            </div>
                          )}

                          <div className={cn("relative flex items-center gap-1.5", isSent && "flex-row-reverse")}>
                            <div className={cn(
                              "opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/95 backdrop-blur rounded-full shadow-md border border-black/5 px-1 py-0.5 z-10",
                              isSent ? "mr-1" : "ml-1",
                            )}>
                              <button onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)} title="Reagir" className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-violet-600">
                                <SmilePlus className="h-[15px] w-[15px]" />
                              </button>
                              <button onClick={() => startReply(m)} title="Responder" className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-violet-600">
                                <Reply className="h-[15px] w-[15px]" />
                              </button>
                            </div>

                            <div className={cn("flex flex-col gap-1.5 min-w-0", isSent && "items-end")}>
                              {hasBubble && (
                                <div
                                  className={cn(
                                    "px-4 py-2.5 text-[13.5px] leading-snug break-words relative",
                                    isSent
                                      ? "text-white rounded-[22px] rounded-br-md shadow-[0_8px_24px_-10px_rgba(124,58,237,0.55)]"
                                      : "bg-white/95 text-[#1a1a2e] rounded-[22px] rounded-bl-md backdrop-blur-sm shadow-[0_4px_16px_-6px_rgba(15,23,42,0.10),inset_0_0_0_1px_rgba(124,58,237,0.06)]"
                                  )}
                                  style={isSent ? { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" } : undefined}
                                >
                                  {quote && (
                                    <div className="border-l-[3px] pl-2 mb-1.5 rounded-r-md py-0.5" style={{ borderColor: isSent ? "rgba(255,255,255,0.7)" : "#7c3aed", background: isSent ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.06)" }}>
                                      <div className="text-[11px] font-medium" style={{ color: isSent ? "rgba(255,255,255,0.95)" : "#7c3aed" }}>
                                        {quote.sender_id === user?.id ? "Você" : (userMap.get(quote.sender_id || "")?.name || "Mensagem")}
                                      </div>
                                      <div className={cn("text-xs truncate", isSent ? "text-white/75" : "text-gray-500")}>
                                        {messagePlainText(quote)}
                                      </div>
                                    </div>
                                  )}
                                  {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                                  <span className={cn("block text-right text-[10px] mt-1", isSent ? "text-white/70" : "text-gray-400")}>{time}</span>
                                </div>
                              )}


                              {allFiles.map((f, idx) => {
                                if (f.kind === "image" && f.url) {
                                  return (
                                    <a key={idx} href={f.url} target="_blank" rel="noreferrer" className="block max-w-[280px]">
                                      <img src={f.url} alt={f.name} className="rounded-2xl max-h-[280px] object-cover shadow-md" loading="lazy" />
                                    </a>
                                  );
                                }
                                const theme = FILE_THEME[f.kind];
                                const Icon = f.kind === "pdf" ? FileText : f.kind === "xls" ? FileSpreadsheet : f.kind === "doc" ? FileText : FileIcon;
                                return (
                                  <div key={idx} className="group/file flex items-center gap-3 rounded-2xl px-3 py-2.5 min-w-[260px] max-w-[320px] border border-white/60 shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.28)] transition-all"
                                    style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: theme.iconBg, color: theme.iconColor }}>
                                      <Icon className="h-[19px] w-[19px]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[12.5px] font-semibold text-[#1a1a2e] truncate">{f.name}</div>
                                      <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                        <span className="font-medium tracking-wide" style={{ color: theme.iconColor }}>{theme.label}</span>
                                        {f.size && <><span className="opacity-50">·</span><span>{f.size}</span></>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-70 group-hover/file:opacity-100 transition">
                                      {f.url && <a href={f.url} target="_blank" rel="noreferrer" title="Abrir" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white/70"><ExternalLink className="h-4 w-4" /></a>}
                                      {f.url && <a href={f.url} download={f.name} title="Baixar" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white/70"><Download className="h-4 w-4" /></a>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {reactPickerFor === m.id && (
                              <div className={cn("absolute z-20 bottom-full mb-1.5 flex items-center gap-0.5 bg-white rounded-full shadow-xl border border-black/5 px-1.5 py-1", isSent ? "right-0" : "left-0")}>
                                {QUICK_REACTIONS.map((e) => (
                                  <button key={e} onClick={() => toggleReaction(m.id, e)} className="w-8 h-8 rounded-full hover:bg-gray-100 text-[17px] flex items-center justify-center transition hover:scale-125">{e}</button>
                                ))}
                              </div>
                            )}
                          </div>

                          {reacts.length > 0 && (
                            <div className={cn("flex gap-1 flex-wrap", isSent && "justify-end")}>
                              {reacts.map((r, i) => (
                                <button key={i} onClick={() => toggleReaction(m.id, r.emoji)} className={cn("rounded-full px-2 py-0.5 text-[11.5px] flex items-center gap-1 shadow-sm cursor-pointer border transition", r.mine ? "bg-violet-100 border-violet-300 text-violet-800" : "bg-white/90 hover:bg-white text-gray-700 border-black/5")}>
                                  <span>{r.emoji}</span>
                                  <span className="font-medium">{r.count}</span>
                                </button>
                              ))}
                              <button onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)} className="rounded-full w-6 h-6 flex items-center justify-center bg-white/70 hover:bg-white text-gray-500 border border-black/5" title="Adicionar reação">
                                <SmilePlus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {typingUsersInActive.length > 0 && (
                  <div className="flex items-center gap-2 pl-2 pt-1">
                    <div className="flex -space-x-2">
                      {typingUsersInActive.slice(0, 3).map((u) => (
                        u.avatar_url ? (
                          <img key={u.id} src={u.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div key={u.id} className="h-6 w-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-semibold text-white" style={{ background: avatarColorFor(u.id) }}>
                            {initialsOf(u.name)}
                          </div>
                        )
                      ))}
                    </div>
                    <div className="bg-white/90 backdrop-blur rounded-full px-3 py-1.5 shadow-sm border border-violet-100 flex items-center gap-1.5">
                      <span className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                      <span className="text-[11px] text-gray-600">
                        {typingUsersInActive.length === 1
                          ? `${typingUsersInActive[0].name.split(" ")[0]} está digitando`
                          : `${typingUsersInActive.length} pessoas digitando`}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 shrink-0 relative bg-white/85 backdrop-blur-xl border-t border-gray-200/70">

              {replyTo && (
                <div className="mb-2 flex items-center gap-2 bg-violet-50/80 rounded-2xl px-3 py-2 shadow-sm border-l-[3px] border-violet-500">
                  <Reply className="h-4 w-4 shrink-0 text-violet-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium text-violet-700">Respondendo a {replyTo.name}</div>
                    <div className="text-xs text-gray-600 truncate">{replyTo.text}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}


              {showEmoji && (
                <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl z-20 border border-black/5 w-[380px] flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3 max-h-[360px]">
                    {pickerTab === "emoji" ? (
                      EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.label} className="mb-3 last:mb-0">
                          <div className="text-[11px] font-medium text-gray-500 px-1 mb-1.5 sticky top-0 bg-white">{cat.label}</div>
                          <div className="grid grid-cols-8 gap-1">
                            {cat.emojis.map((e, i) => (
                              <button key={`${cat.label}-${i}-${e}`} onClick={() => { insertAtCursor(e); setShowEmoji(false); }} className="w-9 h-9 rounded-lg hover:bg-gray-100 text-xl flex items-center justify-center">{e}</button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div>
                        <div className="text-[11px] font-medium text-gray-500 px-1 mb-1.5">Adesivos animados</div>
                        <div className="grid grid-cols-4 gap-2">
                          {STICKERS.map((url, i) => (
                            <button key={`${url}-${i}`} onClick={() => sendSticker(url)} className="aspect-square rounded-xl hover:bg-gray-100 p-1 flex items-center justify-center transition">
                              <img src={url} alt="sticker" className="w-full h-full object-contain" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 p-2 border-t border-gray-100 bg-gray-50/60">
                    <button onClick={() => setPickerTab("emoji")} className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition ${pickerTab === "emoji" ? "bg-blue-500 text-white shadow" : "text-gray-600 hover:bg-gray-200"}`}>Emoji</button>
                    <button onClick={() => setPickerTab("stickers")} className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition ${pickerTab === "stickers" ? "bg-blue-500 text-white shadow" : "text-gray-600 hover:bg-gray-200"}`}>Adesivos</button>
                  </div>
                </div>
              )}

              {showMentions && (
                <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl py-1.5 z-20 border border-black/5 min-w-[240px] max-h-[280px] overflow-y-auto">
                  {tenantUsers.length === 0 ? (
                    <div className="px-3 py-3 text-[12px] text-gray-400">Nenhum usuário cadastrado</div>
                  ) : tenantUsers.map((u) => (
                    <button key={u.id} onClick={() => { insertAtCursor(`@${u.handle} `); setShowMentions(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100 text-left">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{initialsOf(u.name)}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-gray-800 truncate leading-tight">{u.name}</div>
                        <div className="text-[11px] text-gray-500 truncate leading-tight">@{u.handle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files, false); e.target.value = ""; }} />
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files, true); e.target.value = ""; }} />

              <div className="flex items-center gap-1.5 bg-white rounded-[24px] pl-3.5 pr-2 py-1.5 shadow-[0_8px_24px_-12px_rgba(124,58,237,0.35),inset_0_0_0_1px_rgba(124,58,237,0.08)]">
                <div className="flex gap-0.5">
                  <button onClick={() => fileInputRef.current?.click()} title="Anexar" className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
                    <Paperclip className="h-[17px] w-[17px]" />
                  </button>
                  <button onClick={() => imageInputRef.current?.click()} title="Enviar imagem" className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition">
                    <ImageIcon className="h-[17px] w-[17px]" />
                  </button>
                  <button onClick={() => { setShowEmoji((v) => !v); setShowMentions(false); }} title="Emojis" className={cn("w-[32px] h-[32px] rounded-full flex items-center justify-center transition", showEmoji ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-violet-50 hover:text-violet-600")}>
                    <Smile className="h-[17px] w-[17px]" />
                  </button>
                  <button onClick={() => { setShowMentions((v) => !v); setShowEmoji(false); }} title="Mencionar" className={cn("w-[32px] h-[32px] rounded-full flex items-center justify-center transition", showMentions ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-violet-50 hover:text-violet-600")}>
                    <AtSign className="h-[17px] w-[17px]" />
                  </button>
                </div>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
                    if (e.key === "Escape") { setShowEmoji(false); setShowMentions(false); }
                  }}
                  placeholder={`Mensagem ${active.name}...`}
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-[#1a1a2e] placeholder:text-gray-400 min-w-0"
                />
                <button
                  onClick={sendText}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={input.trim()
                    ? { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)", color: "#fff", boxShadow: "0 8px 20px -8px rgba(124,58,237,0.6)" }
                    : { background: "transparent", color: "#888" }}
                >
                  {input.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* RIGHT PANEL — online by department */}
      <aside className="hidden lg:flex w-[280px] min-w-[280px] shrink-0 flex-col bg-white/70 backdrop-blur-xl border-l border-gray-200/70">
        <div className="h-[64px] flex items-center gap-2 px-5 border-b border-gray-200/70 shrink-0">
          <Users className="h-4 w-4 text-violet-600" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-gray-900 leading-tight">Equipe online</div>
            <div className="text-[11px] text-gray-500">{onlineIds.size} de {tenantUsers.length} ativos agora</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {usersByDept.length === 0 ? (
            <div className="text-center text-[12px] text-gray-400 py-8">Sem colaboradores ativos.</div>
          ) : usersByDept.map(([dept, list]) => {
            const onlineList = list.filter((u) => onlineIds.has(u.id));
            const offlineList = list.filter((u) => !onlineIds.has(u.id));
            const ordered = [...onlineList, ...offlineList];
            return (
              <div key={dept}>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[10.5px] font-semibold tracking-wider text-gray-500 uppercase">{dept}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">{onlineList.length}/{list.length}</span>
                </div>
                <div className="space-y-0.5">
                  {ordered.map((u) => {
                    const isOnline = onlineIds.has(u.id);
                    const isTyping = typingIds.has(u.id);
                    const status = isTyping ? "Digitando…" : isOnline ? "Online" : "Offline";
                    const dotColor = isOnline ? "bg-emerald-500" : "bg-gray-300";
                    return (
                      <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-violet-50/60 transition cursor-pointer">
                        <div className="relative shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className={cn("h-8 w-8 rounded-full object-cover", !isOnline && "grayscale opacity-70")} />
                          ) : (
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white", !isOnline && "opacity-60")} style={{ background: avatarColorFor(u.id) }}>
                              {initialsOf(u.name)}
                            </div>
                          )}
                          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", dotColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[12.5px] font-medium truncate", isOnline ? "text-gray-900" : "text-gray-500")}>{u.name}</div>
                          <div className={cn("text-[10.5px] truncate", isTyping ? "text-violet-600 font-medium" : isOnline ? "text-emerald-600" : "text-gray-400")}>{status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>


      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 100%)" }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: `${KIND_META[createKind].color}18`, color: KIND_META[createKind].color }}>
                {(() => { const I = KIND_META[createKind].Icon; return <I className="h-5 w-5" />; })()}
              </div>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-gray-900">Nova conversa · {KIND_META[createKind].label}</DialogTitle>
                <p className="text-[12px] text-gray-500 mt-0.5">Convide membros do tenant para começar a conversar.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4 bg-white">
            <div>
              <label className="text-[12px] font-medium text-gray-700 mb-1.5 block">Nome</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={createKind === "channel" ? "ex: anuncios-gerais" : "ex: Time de Produto"}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-gray-700">Participantes</label>
                <span className="text-[11px] text-gray-500">{selectedMemberIds.length} selecionado(s)</span>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Buscar usuários do tenant..." className="w-full rounded-xl bg-gray-50 border border-transparent pl-9 pr-3 py-2 text-sm outline-none focus:border-violet-300 focus:bg-white" />
              </div>
              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                {tenantUsers.length === 0 && <div className="text-center text-[12px] text-gray-400 py-6">Nenhum usuário encontrado.</div>}
                {tenantUsers.filter((u) => u.id !== user?.id && u.name.toLowerCase().includes(memberSearch.toLowerCase())).map((u) => {
                  const checked = selectedMemberIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleMemberSel(u.id)} className={cn("w-full flex items-center gap-3 px-3 py-2 text-left transition-colors", checked ? "bg-violet-50/70" : "hover:bg-gray-50")}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-medium flex items-center justify-center">{initialsOf(u.name)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-gray-900 truncate">{u.name}</div>
                        <div className="text-[11px] text-gray-500 truncate">@{u.handle}</div>
                      </div>
                      <div className={cn("h-4 w-4 rounded border flex items-center justify-center", checked ? "bg-violet-600 border-violet-600" : "border-gray-300")}>
                        {checked && <span className="text-white text-[10px] leading-none">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <button onClick={() => setCreateOpen(false)} className="px-3.5 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button onClick={submitCreate} disabled={!newName.trim() || creating} className="px-4 py-2 rounded-lg text-[13px] font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" }}>
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* INVITE DIALOG */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="px-6 pt-6 pb-4 bg-white">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">Adicionar à conversa</DialogTitle>
            <div className="mt-4 grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
              {([{ id: "colab", label: "Colaboradores" }, { id: "guest", label: "Convite por link" }] as const).map((t) => (
                <button key={t.id} onClick={() => setInviteTab(t.id)} className={cn("py-2 text-[12.5px] font-medium rounded-lg transition-all", inviteTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>{t.label}</button>
              ))}
            </div>
          </div>

          {inviteTab === "colab" ? (
            <div className="px-6 pb-5 space-y-3 bg-white">
              <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                {tenantUsers.length === 0 && <div className="text-center text-[12px] text-gray-400 py-6">Nenhum usuário disponível.</div>}
                {tenantUsers.filter((u) => !members.some((mm) => mm.user_id === u.id)).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-medium flex items-center justify-center">{initialsOf(u.name)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-gray-900 truncate">{u.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">@{u.handle}</div>
                    </div>
                    <button onClick={() => addExistingMember(u.id)} className="text-[11.5px] text-blue-600 font-medium hover:underline">Adicionar</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-6 pb-5 bg-white">
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-[12px] font-medium text-gray-700 mb-2">Link de convite</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 truncate text-[11.5px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{inviteLink}</div>
                  <button onClick={copyInviteLink} className="px-3 py-2 rounded-lg text-[12px] font-medium text-white shadow-sm whitespace-nowrap" style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}>
                    {inviteLinkCopied ? "Copiado!" : "Copiar link"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-3">Envie este link a um colega para que ele entre nesta conversa.</p>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <button onClick={() => setInviteOpen(false)} className="px-3.5 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100">Fechar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
