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
  PanelRight,
  CheckSquare,
  Calendar,
  Clock,
  FilePen,
  BarChart3,
  Maximize2,
  Minimize2,
  Star,
  Filter as FilterIcon,
  Check as CheckIcon,
  CheckCheck,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HexAvatar, hexGradientFor } from "@/components/collabs/HexAvatar";
import { CollabInfoPanel } from "@/components/collabs/CollabInfoPanel";
import { CollabFilesPanel } from "@/components/collabs/CollabFilesPanel";
import { CollabMessagesPanel } from "@/components/collabs/CollabMessagesPanel";
import { PollByMessage } from "@/components/collabs/polls/PollCard";
import { MessageActionsMenu } from "@/components/collabs/MessageActionsMenu";
import { ForwardMessageDialog } from "@/components/collabs/ForwardMessageDialog";
import { QuickTaskDialog } from "@/components/collabs/QuickTaskDialog";
import { CreatePollDialog } from "@/components/collabs/polls/CreatePollDialog";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ConstellationCanvas } from "@/components/ui/constellation-canvas";
import { useDriveFiles } from "@/hooks/useDriveFiles";
import { Plus, Trash2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { RecordingBar } from "@/components/collabs/RecordingBar";
import { VoiceMessageBubble } from "@/components/collabs/VoiceMessageBubble";


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
  avatar_url?: string | null;
  invite_token?: string | null;
}

type FileAttachment = {
  kind: "pdf" | "xls" | "image" | "file" | "doc" | "poll" | "audio";
  name: string;
  size: string;
  url?: string;
  // Poll fields (when kind === "poll")
  poll_id?: string;
  question?: string;
  options?: Array<{ id: string; text: string }>;
  show_voters?: boolean;
  deadline?: string | null;
  // Audio fields (when kind === "audio")
  duration?: number;
  levels?: number[];
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
  poll:  { from: "#F3EBFF", to: "#E4D3FF", iconBg: "#D5BBFF", iconColor: "#7C3AED", label: "ENQUETE" },
  audio: { from: "#ECFDF5", to: "#D1FAE5", iconBg: "#A7F3D0", iconColor: "#059669", label: "ÁUDIO" },
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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const recorder = useAudioRecorder();
  const [sendingAudio, setSendingAudio] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<DbMessage | null>(null);
  const [taskForMsg, setTaskForMsg] = useState<DbMessage | null>(null);
  const [copilotMode, setCopilotMode] = useState(false);
  const [askingCopilot, setAskingCopilot] = useState(false);

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
  const [convFilter, setConvFilter] = useState<"all" | "unread">("all");
  const [userLastRead, setUserLastRead] = useState<Map<string, string | null>>(new Map());
  const [infoOpen, setInfoOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const [openingDirectFor, setOpeningDirectFor] = useState<string | null>(null);
  const [chatView, setChatView] = useState<"chat" | "files" | "favorites" | "links">("chat");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<"list" | "agenda">("agenda");
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const navigate = useNavigate();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [pickerTab, setPickerTab] = useState<"emoji" | "stickers">("emoji");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; preview: string } | null>(null);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);

  // Quick actions (attach menu)
  type QuickAction = null | "drive" | "task" | "event" | "slots" | "sign" | "poll";
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

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
  const [pollDialogOpen, setPollDialogOpen] = useState(false);

  // Tenant users (for mentions and member selection)
  type MentionUser = { id: string; name: string; handle: string; avatar_url: string | null; department: string };
  const [tenantUsers, setTenantUsers] = useState<MentionUser[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const [memberProfiles, setMemberProfiles] = useState<Map<string, MentionUser>>(new Map());
  const userMap = useMemo(() => {
    const m = new Map<string, MentionUser>();
    tenantUsers.forEach((u) => m.set(u.id, u));
    // Member profiles override/fill missing entries so avatars always show
    memberProfiles.forEach((u, id) => { if (!m.has(id) || !m.get(id)?.avatar_url) m.set(id, u); });
    return m;
  }, [tenantUsers, memberProfiles]);

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

  /* ────── Load current user's last_read_at across all conversations (for unread filter) ────── */
  useEffect(() => {
    if (!user?.id || conversations.length === 0) { setUserLastRead(new Map()); return; }
    let cancelled = false;
    const ids = conversations.map((c) => c.id);
    (async () => {
      const { data } = await supabase
        .from("collab_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)
        .in("conversation_id", ids);
      if (cancelled) return;
      const map = new Map<string, string | null>();
      (data || []).forEach((r: any) => map.set(r.conversation_id, r.last_read_at));
      setUserLastRead(map);
    })();
    return () => { cancelled = true; };
  }, [user?.id, conversations]);

  const markAllAsRead = async () => {
    if (!user?.id || conversations.length === 0) return;
    const now = new Date().toISOString();
    const ids = conversations.map((c) => c.id);
    const { error } = await supabase
      .from("collab_members")
      .update({ last_read_at: now })
      .eq("user_id", user.id)
      .in("conversation_id", ids);
    if (error) {
      sonnerToast.error("Não foi possível marcar como lido");
      return;
    }
    const next = new Map(userLastRead);
    ids.forEach((id) => next.set(id, now));
    setUserLastRead(next);
    sonnerToast.success("Tudo marcado como lido");
  };



  /* ────── Load messages + members for active conversation + realtime ────── */
  useEffect(() => {
    setChatView("chat");
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
      const memList = (mems as MemberRow[]) || [];
      setMembers(memList);
      setMemberCount(memList.length);

      // Always fetch profile photos for ALL members (regardless of active/status/tenant)
      const memberIds = memList.map((mm) => mm.user_id).filter(Boolean);
      if (memberIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, tags")
          .in("user_id", memberIds);
        if (!cancelled) {
          const map = new Map<string, MentionUser>();
          (profs || []).forEach((p: any) => {
            if (!p.user_id) return;
            map.set(p.user_id, {
              id: p.user_id,
              name: p.name || "Usuário",
              handle: slug((p.name || "user").split(" ")[0] || p.name || "user"),
              avatar_url: p.avatar_url || null,
              department: (Array.isArray(p.tags) && p.tags[0]) || "Equipe",
            });
          });
          setMemberProfiles(map);
        }
      } else {
        setMemberProfiles(new Map());
      }

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

  /* ────── Favorites (per-user, per-conversation) ────── */
  useEffect(() => {
    setFavoriteIds(new Set());
    if (!activeId || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("collab_message_favorites")
        .select("message_id")
        .eq("user_id", user.id)
        .eq("conversation_id", activeId);
      if (cancelled) return;
      setFavoriteIds(new Set((data || []).map((r: any) => r.message_id)));
    })();
    const ch = supabase
      .channel(`collab-fav-${activeId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collab_message_favorites", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === "INSERT" && payload.new?.conversation_id === activeId) {
            setFavoriteIds((prev) => { const n = new Set(prev); n.add(payload.new.message_id); return n; });
          } else if (payload.eventType === "DELETE") {
            const mid = payload.old?.message_id;
            if (mid) setFavoriteIds((prev) => { const n = new Set(prev); n.delete(mid); return n; });
          }
        }
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeId, user?.id]);

  const toggleFavorite = async (messageId: string) => {
    if (!user || !activeId || !companyId) return;
    const isFav = favoriteIds.has(messageId);
    // optimistic
    setFavoriteIds((prev) => { const n = new Set(prev); isFav ? n.delete(messageId) : n.add(messageId); return n; });
    if (isFav) {
      await supabase
        .from("collab_message_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("message_id", messageId);
    } else {
      await supabase.from("collab_message_favorites").insert({
        user_id: user.id,
        message_id: messageId,
        conversation_id: activeId,
        servidor_id: companyId,
      });
    }
  };


  /* ────── Derived ────── */
  const active = conversations.find((c) => c.id === activeId) || null;

  const isUnread = (c: Conversation) => {
    if (!c.last_message_at) return false;
    const lr = userLastRead.get(c.id);
    if (!lr) return true;
    return new Date(c.last_message_at).getTime() > new Date(lr).getTime();
  };

  const filtered = useMemo(
    () => conversations
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => convFilter === "all" ? true : isUnread(c)),
    [conversations, search, convFilter, userLastRead]
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

  const [rotatingInvite, setRotatingInvite] = useState(false);
  const inviteLink = active && active.invite_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/collabs/convite/${active.invite_token}`
    : activeId
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

  const rotateInviteLink = async () => {
    if (!activeId || !user || !companyId || rotatingInvite) return;
    setRotatingInvite(true);
    try {
      const newToken = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/-/g, "");
      const { error } = await supabase
        .from("collab_conversations")
        .update({ invite_token: newToken } as any)
        .eq("id", activeId);
      if (error) {
        sonnerToast.error("Não foi possível atualizar o link", { description: error.message });
        return;
      }
      // Optimistically reflect locally so the link in the dialog updates instantly
      setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, invite_token: newToken } : c));
      // System message in the group informing about the rotation
      const myName = userMap.get(user.id)?.name || "Um administrador";
      await supabase.from("collab_messages").insert({
        conversation_id: activeId,
        servidor_id: companyId,
        sender_id: user.id,
        content: `${myName} atualizou o link de convite. Agora o link anterior é inválido.`,
        is_system: true,
        attachments: [],
      });
      sonnerToast.success("Link de convite atualizado");
    } finally {
      setRotatingInvite(false);
    }
  };


  /* ────── Conversation actions: pin / edit / hide / delete ────── */
  const togglePinConversation = async () => {
    if (!active) return;
    const next = !active.is_pinned;
    const { error } = await supabase
      .from("collab_conversations")
      .update({ is_pinned: next })
      .eq("id", active.id);
    if (error) {
      sonnerToast.error("Não foi possível " + (next ? "fixar" : "desafixar"), { description: error.message });
      return;
    }
    setConversations((prev) => prev.map((c) => c.id === active.id ? { ...c, is_pinned: next } : c));
    sonnerToast.success(next ? "Conversa fixada" : "Conversa desafixada");
  };

  const renameConversation = async () => {
    if (!active) return;
    const newName = window.prompt("Novo nome da conversa", active.name);
    if (!newName || !newName.trim() || newName.trim() === active.name) return;
    const { error } = await supabase
      .from("collab_conversations")
      .update({ name: newName.trim() })
      .eq("id", active.id);
    if (error) {
      sonnerToast.error("Erro ao renomear", { description: error.message });
      return;
    }
    setConversations((prev) => prev.map((c) => c.id === active.id ? { ...c, name: newName.trim() } : c));
    sonnerToast.success("Conversa renomeada");
  };

  const hideConversation = async () => {
    if (!active || !user) return;
    const { error } = await supabase
      .from("collab_members")
      .update({ is_hidden: true } as any)
      .eq("conversation_id", active.id)
      .eq("user_id", user.id);
    if (error) {
      // Fallback: just remove locally if column doesn't exist
      setConversations((prev) => prev.filter((c) => c.id !== active.id));
      setActiveId(null);
      sonnerToast.success("Conversa ocultada");
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== active.id));
    setActiveId(null);
    sonnerToast.success("Conversa ocultada");
  };

  const deleteConversation = async () => {
    if (!active) return;
    if (!window.confirm(`Excluir a conversa "${active.name}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase
      .from("collab_conversations")
      .delete()
      .eq("id", active.id);
    if (error) {
      sonnerToast.error("Erro ao excluir", { description: error.message });
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== active.id));
    setActiveId(null);
    sonnerToast.success("Conversa excluída");
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

  const openDirectWith = async (otherId: string) => {
    if (!user || !companyId || otherId === user.id) return;
    setOpeningDirectFor(otherId);
    try {
      const { data: directConvs } = await supabase
        .from("collab_conversations")
        .select("id")
        .eq("servidor_id", companyId)
        .eq("kind", "direct");
      const ids = (directConvs || []).map((c: any) => c.id);
      let found: string | null = null;
      if (ids.length) {
        const { data: mems } = await supabase
          .from("collab_members")
          .select("conversation_id, user_id")
          .in("conversation_id", ids);
        const byConv = new Map<string, Set<string>>();
        (mems || []).forEach((m: any) => {
          if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, new Set());
          byConv.get(m.conversation_id)!.add(m.user_id);
        });
        for (const [cid, s] of byConv) {
          if (s.size === 2 && s.has(user.id) && s.has(otherId)) { found = cid; break; }
        }
      }
      if (found) {
        setActiveId(found);
        setMembersOpen(false);
        return;
      }
      const other = userMap.get(otherId);
      const { data: conv, error } = await supabase
        .from("collab_conversations")
        .insert({
          servidor_id: companyId,
          kind: "direct",
          name: other?.name || "Conversa direta",
          color: KIND_META.direct.color,
          created_by: user.id,
        })
        .select()
        .single();
      if (error || !conv) throw error || new Error("Falha ao criar conversa");
      const { error: memErr } = await supabase.from("collab_members").insert([
        { conversation_id: conv.id, user_id: user.id, role: "owner" },
        { conversation_id: conv.id, user_id: otherId, role: "member" },
      ]);
      if (memErr) throw memErr;
      await supabase.from("collab_messages").insert({
        conversation_id: conv.id,
        servidor_id: companyId,
        sender_id: user.id,
        content: `Conversa iniciada com ${other?.name || "membro"}.`,
        is_system: true,
        attachments: [],
      });
      setActiveId(conv.id);
      setMembersOpen(false);
      toast({ title: "Conversa iniciada", description: other?.name });
    } catch (e: any) {
      toast({ title: "Erro ao abrir conversa", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setOpeningDirectFor(null);
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
    setEditingMsg(null);
    inputRef.current?.focus();
  };

  const startEdit = (m: DbMessage) => {
    if (!m.content) return;
    setEditingMsg({ id: m.id, preview: messagePlainText(m).slice(0, 120) });
    setReplyTo(null);
    setCopilotMode(false);
    setInput(m.content);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInput("");
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

    // Edit mode: update existing message instead of inserting a new one
    if (editingMsg) {
      const editId = editingMsg.id;
      setInput("");
      setEditingMsg(null);
      const { error } = await supabase
        .from("collab_messages")
        .update({ content: t } as any)
        .eq("id", editId);
      if (error) {
        toast({ title: "Erro ao editar", description: error.message, variant: "destructive" });
        return;
      }
      setMessages((prev) => prev.map((m) => m.id === editId ? { ...m, content: t } : m));
      sonnerToast.success("Mensagem editada");
      return;
    }

    setInput("");
    const replyId = replyTo?.id || null;
    const quotedText = replyTo?.text || "";
    const wasCopilot = copilotMode;
    setReplyTo(null);
    setCopilotMode(false);
    setShowEmoji(false);
    setShowMentions(false);
    const { error } = await supabase.from("collab_messages").insert({
      conversation_id: activeId,
      servidor_id: companyId,
      sender_id: user.id,
      content: wasCopilot ? `✨ ${t}` : t,
      reply_to_id: replyId,
      attachments: [],
    });
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    if (wasCopilot) {
      setAskingCopilot(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("accord-ai-chat", {
          body: {
            messages: [
              ...(quotedText ? [{ role: "user", content: `Contexto da mensagem: "${quotedText}"` }] : []),
              { role: "user", content: t },
            ],
          },
        });
        let replyText = "";
        if (fnError) {
          replyText = "Não consegui responder agora. Tente novamente em instantes.";
        } else if (typeof data === "string") {
          // SSE stream — extract content chunks
          const chunks = data.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6));
          for (const c of chunks) {
            if (c === "[DONE]") continue;
            try {
              const j = JSON.parse(c);
              const delta = j?.choices?.[0]?.delta?.content || j?.choices?.[0]?.message?.content || "";
              replyText += delta;
            } catch {}
          }
        } else if (data?.choices) {
          replyText = data.choices[0]?.message?.content || "";
        }
        if (!replyText) replyText = "Sem resposta da IA no momento.";
        await supabase.from("collab_messages").insert({
          conversation_id: activeId,
          servidor_id: companyId,
          sender_id: user.id,
          content: `🤖 **CoPilot:** ${replyText}`,
          attachments: [],
        });
      } catch (e: any) {
        toast({ title: "CoPilot indisponível", description: e?.message || "Erro", variant: "destructive" });
      } finally {
        setAskingCopilot(false);
      }
    }
  };

  const sendCardMessage = async (content: string, attachments: FileAttachment[] = []) => {
    if (!activeId || !user || !companyId) return;
    const { error } = await supabase.from("collab_messages").insert({
      conversation_id: activeId,
      servidor_id: companyId,
      sender_id: user.id,
      content: content || null,
      attachments,
    });
    if (error) {
      sonnerToast.error("Erro ao publicar no chat");
    } else {
      sonnerToast.success("Publicado no chat");
    }
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

  const sendVoiceNote = async () => {
    if (!activeId || !user || !companyId || !recorder.isRecording) return;
    setSendingAudio(true);
    try {
      const result = await recorder.stop();
      if (!result || result.duration < 0.4) {
        setSendingAudio(false);
        return;
      }
      const ext = result.mime.includes("mp4") ? "m4a" : result.mime.includes("ogg") ? "ogg" : "webm";
      const fileName = `voz-${Date.now()}.${ext}`;
      const path = `collabs/${companyId}/${activeId}/${user.id}/${Date.now()}-${fileName}`;
      const file = new File([result.blob], fileName, { type: result.mime });
      const { data, error } = await supabase.storage.from("documents").upload(path, file, {
        upsert: false,
        contentType: result.mime,
      });
      if (error) {
        toast({ title: "Erro ao enviar áudio", description: error.message, variant: "destructive" });
        setSendingAudio(false);
        return;
      }
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(data.path, 60 * 60 * 24 * 7);

      const attachment: FileAttachment = {
        kind: "audio",
        name: fileName,
        size: `${Math.round(result.blob.size / 1024)} KB`,
        url: signed?.signedUrl,
        duration: Math.round(result.duration * 10) / 10,
        levels: result.levels.slice(-200),
      };

      await supabase.from("collab_messages").insert({
        conversation_id: activeId,
        servidor_id: companyId,
        sender_id: user.id,
        content: null,
        attachments: [attachment],
      });
    } catch (err: any) {
      toast({ title: "Erro ao enviar áudio", description: err?.message, variant: "destructive" });
    } finally {
      setSendingAudio(false);
    }
  };

  const startRecording = async () => {
    const ok = await recorder.start();
    if (!ok && recorder.error) {
      toast({ title: "Microfone", description: recorder.error, variant: "destructive" });
    }
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
    <div className="flex h-full overflow-hidden" style={{ background: "linear-gradient(180deg, #faf9ff 0%, #f4f1fb 100%)" }}>
      {/* SIDEBAR — dark purple */}
      <aside className="w-[320px] min-w-[320px] flex flex-col shrink-0 bg-white border-r border-gray-200">
        <div className="h-[60px] flex items-center gap-2 px-3 border-b border-gray-200 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Filtrar"
                className={cn(
                  "shrink-0 h-9 w-9 rounded-full flex items-center justify-center border transition",
                  convFilter === "unread"
                    ? "bg-violet-50 border-violet-200 text-violet-600"
                    : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500"
                )}
              >
                <FilterIcon className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-[220px] p-1 rounded-xl">
              <DropdownMenuItem
                onClick={() => setConvFilter("all")}
                className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] cursor-pointer"
              >
                <span>Todos</span>
                {convFilter === "all" && <CheckIcon className="h-4 w-4 text-violet-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConvFilter("unread")}
                className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] cursor-pointer"
              >
                <span>Não lido</span>
                {convFilter === "unread" && <CheckIcon className="h-4 w-4 text-violet-600" />}
              </DropdownMenuItem>
              <div className="my-1 h-px bg-gray-100" />
              <DropdownMenuItem
                onClick={markAllAsRead}
                className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] cursor-pointer"
              >
                <span>Marcar tudo como lido</span>
                <CheckCheck className="h-4 w-4 text-gray-400" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition rounded-full px-3 py-2 flex-1 min-w-0 border border-gray-200">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa…"
              className="flex-1 bg-transparent outline-none text-[13px] text-gray-700 placeholder:text-gray-400"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>

              <button
                className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-white shadow-[0_4px_14px_-2px_rgba(16,185,129,0.55)] hover:shadow-[0_6px_18px_-2px_rgba(16,185,129,0.7)] transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
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
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center px-6 py-12 text-sm text-gray-500">
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
                  "flex items-center gap-3 px-2.5 py-2 my-0.5 rounded-xl cursor-pointer transition-all h-[64px]",
                  isActive
                    ? "bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.30)]"
                    : "hover:bg-gray-50",
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
                      {c.is_pinned && <Pin className="h-3 w-3 shrink-0 text-gray-400" />}
                      <span className="text-[13.5px] font-medium truncate text-gray-900">
                        {prefix}{c.name}
                      </span>
                    </div>
                    <span className="text-[11px] shrink-0 text-gray-400">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs truncate text-gray-500">
                      {c.last_message_preview === "[[poll]]" ? "📊 Enquete" : (c.last_message_preview || "Sem mensagens ainda")}
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
                  <button
                    onClick={() => setMembersOpen(true)}
                    className="hover:text-violet-600 hover:underline underline-offset-2 transition-colors"
                    title="Ver membros"
                  >
                    {memberCount} {memberCount === 1 ? "membro" : "membros"}
                  </button>
                  <span className="opacity-40">·</span>
                  <span>{KIND_META[active.kind].label}</span>
                </div>
              </div>
              <div className={cn("hidden md:flex items-center mr-1", infoOpen ? "gap-0.5" : "")}>
                <button
                  onClick={() => { setCalendarView("list"); setCalendarOpen(true); }}
                  className={cn(
                    "text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center",
                    infoOpen
                      ? "w-9 h-9 rounded-xl hover:bg-gray-100"
                      : "px-3 py-1.5 border-r border-gray-200 gap-1.5",
                  )}
                  title="Tarefas"
                >
                  <CheckSquare className="h-[17px] w-[17px]" />
                  {!infoOpen && <span>Tarefas</span>}
                </button>
                <button
                  onClick={() => setChatView("files")}
                  className={cn(
                    "text-[13px] font-medium transition-colors flex items-center justify-center",
                    infoOpen
                      ? cn("w-9 h-9 rounded-xl hover:bg-gray-100", chatView === "files" ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "text-gray-600")
                      : cn("px-3 py-1.5 border-r border-gray-200 gap-1.5", chatView === "files" ? "text-emerald-600 font-semibold" : "text-gray-600 hover:text-gray-900"),
                  )}
                  title="Arquivos"
                >
                  <FileText className="h-[17px] w-[17px]" />
                  {!infoOpen && <span>Arquivos</span>}
                </button>
                <button
                  onClick={() => { setCalendarView("agenda"); setCalendarOpen(true); }}
                  className={cn(
                    "text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center",
                    infoOpen
                      ? "w-9 h-9 rounded-xl hover:bg-gray-100"
                      : "px-3 py-1.5 gap-1.5",
                  )}
                  title="Calendário"
                >
                  <Calendar className="h-[17px] w-[17px]" />
                  {!infoOpen && <span>Calendário</span>}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setInviteTab("colab"); setInviteOpen(true); }} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors" title="Adicionar membros">
                  <UserPlus className="h-[17px] w-[17px]" />
                </button>
                <button
                  onClick={() => setInfoOpen((v) => !v)}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                    infoOpen
                      ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                      : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-600",
                  )}
                  title={infoOpen ? "Esconder painel" : "Mostrar painel"}
                >
                  <PanelRight className="h-[17px] w-[17px]" />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                  <MoreVertical className="h-[17px] w-[17px]" />
                </button>
              </div>
            </header>

            {chatView === "files" ? (
              <CollabFilesPanel
                collab={{
                  id: active.id,
                  name: active.name,
                  color: active.color,
                  avatar_url: (active as any).avatar_url ?? null,
                }}
                messages={messages.map((m) => ({
                  id: m.id,
                  sender_id: m.sender_id,
                  created_at: m.created_at,
                  attachments: (m.attachments as any) ?? [],
                }))}
                tenantUsers={tenantUsers.map((u) => ({ id: u.id, name: u.name }))}
                onUploadClick={() => fileInputRef.current?.click()}
                onBack={() => setChatView("chat")}
              />
            ) : chatView === "favorites" || chatView === "links" ? (
              <CollabMessagesPanel
                mode={chatView}
                collab={{
                  id: active.id,
                  name: active.name,
                  color: active.color,
                  avatar_url: (active as any).avatar_url ?? null,
                }}
                messages={messages.map((m) => ({
                  id: m.id,
                  sender_id: m.sender_id,
                  content: m.content,
                  created_at: m.created_at,
                  attachments: (m.attachments as any) ?? [],
                }))}
                tenantUsers={tenantUsers.map((u) => ({ id: u.id, name: u.name, avatar_url: u.avatar_url }))}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onBack={() => setChatView("chat")}
              />
            ) : (
              <>
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 relative"
              style={{
                background: "linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%)",
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(4,120,87,0.18) 1.2px, transparent 0), linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%)`,
                backgroundSize: "26px 26px, auto",
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(900px 500px at 85% -10%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(700px 400px at -10% 110%, rgba(20,184,166,0.08), transparent 60%)" }} />


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
                              "flex items-center gap-0.5 bg-white/95 dark:bg-zinc-900/90 backdrop-blur rounded-full shadow-md border border-black/5 dark:border-white/10 px-1 py-0.5 z-10 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity",
                              isSent ? "mr-1" : "ml-1",
                            )}>
                              <button onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)} title="Reagir" className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-violet-600">
                                <SmilePlus className="h-[15px] w-[15px]" />
                              </button>
                              <button onClick={() => startReply(m)} title="Responder" className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-violet-600">
                                <Reply className="h-[15px] w-[15px]" />
                              </button>
                              <button
                                onClick={() => toggleFavorite(m.id)}
                                title={favoriteIds.has(m.id) ? "Remover dos favoritos" : "Favoritar"}
                                className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center transition",
                                  favoriteIds.has(m.id)
                                    ? "text-amber-500 hover:bg-amber-50"
                                    : "text-gray-500 hover:bg-gray-100 hover:text-amber-500"
                                )}
                              >
                                <Star className={cn("h-[15px] w-[15px]", favoriteIds.has(m.id) && "fill-amber-400 stroke-amber-500")} />
                              </button>
                              <MessageActionsMenu
                                message={{
                                  id: m.id,
                                  sender_id: m.sender_id,
                                  content: m.content,
                                  attachments: (m.attachments as any) || [],
                                  is_pinned: (m as any).is_pinned ?? false,
                                }}
                                currentUserId={user?.id || ""}
                                isOwn={m.sender_id === user?.id}
                                tone={isSent ? "mine" : "other"}
                                onReply={() => startReply(m)}
                                onCreateTask={() => setTaskForMsg(m)}
                                onForward={() => setForwardMsg(m)}
                                onSelect={() => sonnerToast.info("Seleção múltipla — em breve")}
                                onAskCopilot={() => { startReply(m); setCopilotMode(true); }}
                                onStartEdit={() => startEdit(m)}
                              />
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
                                  {m.content === "[[poll]]" ? (
                                    <PollByMessage
                                      messageId={m.id}
                                      currentUserId={user?.id || ""}
                                      tenantUsers={tenantUsers}
                                      mine={isSent}
                                    />
                                  ) : (
                                    m.content && <div className="whitespace-pre-wrap">{m.content}</div>
                                  )}
                                  <span className={cn("block text-right text-[10px] mt-1", isSent ? "text-white/70" : "text-gray-400")}>{time}</span>
                                </div>
                              )}


                              {allFiles.map((f, idx) => {
                                if (f.kind === "poll" && f.poll_id) {
                                  return (
                                    <PollCard
                                      key={idx}
                                      pollId={f.poll_id}
                                      fallbackQuestion={f.question || f.name}
                                      fallbackOptions={f.options || []}
                                      fallbackShowVoters={f.show_voters !== false}
                                      fallbackDeadline={f.deadline ?? null}
                                      currentUserId={user?.id ?? null}
                                      userMap={userMap}
                                      isSent={isSent}
                                    />
                                  );
                                }
                                if (f.kind === "audio" && f.url) {
                                  return (
                                    <VoiceMessageBubble
                                      key={idx}
                                      url={f.url}
                                      duration={f.duration}
                                      levels={f.levels}
                                      tone={isSent ? "mine" : "other"}
                                    />
                                  );
                                }
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

              {editingMsg && (
                <div className="mb-2 flex items-center gap-2 bg-sky-50/80 rounded-2xl px-3 py-2 shadow-sm border-l-[3px] border-sky-500">
                  <Pencil className="h-4 w-4 shrink-0 text-sky-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium text-sky-700">Editar mensagem</div>
                    <div className="text-xs text-gray-600 truncate">{editingMsg.preview}</div>
                  </div>
                  <button onClick={cancelEdit} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}


              {replyTo && (
                <div className="mb-2 flex items-center gap-2 bg-violet-50/80 dark:bg-violet-500/10 rounded-2xl px-3 py-2 shadow-sm border-l-[3px] border-violet-500">
                  <Reply className="h-4 w-4 shrink-0 text-violet-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium text-violet-700 dark:text-violet-300">Respondendo a {replyTo.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{replyTo.text}</div>
                  </div>
                  <button onClick={() => { setReplyTo(null); setCopilotMode(false); }} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}

              {copilotMode && (
                <div className="mb-2 flex items-center gap-2 bg-gradient-to-r from-violet-50 to-sky-50 dark:from-violet-500/10 dark:to-sky-500/10 rounded-2xl px-3 py-2 border border-violet-200/60 dark:border-violet-500/20">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span className="text-[12.5px] font-medium text-violet-700 dark:text-violet-300 flex-1">
                    Pergunte ao <span className="font-semibold">CoPilot</span> sobre esta mensagem
                  </span>
                  {askingCopilot && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />}
                  <button onClick={() => setCopilotMode(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-violet-500 hover:bg-white/60 dark:hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
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

              {recorder.isRecording ? (
                <div className="flex items-center gap-1.5 bg-white rounded-[24px] pl-3.5 pr-2 py-1.5 shadow-[0_8px_24px_-12px_rgba(220,38,38,0.35),inset_0_0_0_1px_rgba(220,38,38,0.12)]">
                  <RecordingBar
                    duration={recorder.duration}
                    levels={recorder.levels}
                    sending={sendingAudio}
                    onCancel={() => recorder.cancel()}
                    onSend={sendVoiceNote}
                  />
                </div>
              ) : (
              <div className="flex items-center gap-1.5 bg-white rounded-[24px] pl-3.5 pr-2 py-1.5 shadow-[0_8px_24px_-12px_rgba(124,58,237,0.35),inset_0_0_0_1px_rgba(124,58,237,0.08)]">
                <div className="flex gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        title="Anexar"
                        className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition"
                      >
                        <Paperclip className="h-[17px] w-[17px]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      sideOffset={10}
                      className="w-[280px] p-1.5 rounded-2xl border border-gray-200 shadow-2xl bg-white"
                    >
                      {([
                        { icon: Monitor,    label: "Arquivo neste computador", onSelect: () => fileInputRef.current?.click() },
                        { icon: HardDrive,  label: "Arquivo no Accord",        onSelect: () => setQuickAction("drive") },
                        { icon: CheckSquare,label: "Tarefa",                   onSelect: () => setQuickAction("task") },
                        { icon: Calendar,   label: "Evento ou reunião",        onSelect: () => setQuickAction("event") },
                        { icon: Clock,      label: "Horários disponíveis",     onSelect: () => setQuickAction("slots") },
                        { icon: FilePen,    label: "Documento para assinatura",onSelect: () => setQuickAction("sign") },
                        { icon: BarChart3,  label: "Enquete",                  onSelect: () => setPollDialogOpen(true) },
                      ] as const).map((opt) => (
                        <DropdownMenuItem
                          key={opt.label}
                          onSelect={(e) => { e.preventDefault(); opt.onSelect(); }}
                          className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-emerald-50 data-[highlighted]:bg-emerald-50 gap-3"
                        >
                          <opt.icon className="h-[18px] w-[18px] text-gray-500 shrink-0" />
                          <span className="text-[13px] text-gray-800">{opt.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    if (e.key === "Escape") { setShowEmoji(false); setShowMentions(false); if (editingMsg) cancelEdit(); }
                  }}
                  placeholder={`Mensagem ${active.name}...`}
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-[#1a1a2e] placeholder:text-gray-400 min-w-0"
                />
                <button
                  onClick={input.trim() ? sendText : startRecording}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={input.trim()
                    ? { background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)", color: "#fff", boxShadow: "0 8px 20px -8px rgba(124,58,237,0.6)" }
                    : { background: "transparent", color: "#888" }}
                  title={input.trim() ? "Enviar" : "Gravar áudio"}
                >
                  {input.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
                </button>
              </div>
              )}
            </div>
              </>
            )}
          </>

        )}
      </main>

      {/* MEMBERS SIDEBAR — abre ao clicar em "X membros" no header */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[380px] p-0 flex flex-col bg-white">
          <SheetHeader className="px-5 py-4 border-b border-gray-200 shrink-0">
            <SheetTitle className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              Membros
              <span className="ml-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {members.length}
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {members.length === 0 ? (
              <div className="text-center text-[12.5px] text-gray-500 py-8">Nenhum membro nesta conversa.</div>
            ) : (
              members.map((mem) => {
                const u = userMap.get(mem.user_id);
                const name = u?.name || "Usuário";
                const isMe = mem.user_id === user?.id;
                const online = onlineIds.has(mem.user_id);
                const loadingThis = openingDirectFor === mem.user_id;
                return (
                  <div
                    key={mem.user_id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div className="relative shrink-0">
                      {u?.avatar_url ? (
                        <img src={u.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shadow-sm"
                          style={{ background: avatarColorFor(mem.user_id) }}
                        >
                          {initialsOf(name)}
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
                          online ? "bg-emerald-500" : "bg-gray-300",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate flex items-center gap-1.5">
                        {name}
                        {isMe && <span className="text-[10px] text-gray-500 font-normal">(você)</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {mem.role === "owner" ? "Proprietário" : mem.role === "admin" ? "Admin" : online ? "Online" : "Offline"}
                      </div>
                    </div>
                    {!isMe && (
                      <button
                        onClick={() => openDirectWith(mem.user_id)}
                        disabled={loadingThis}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-semibold text-white bg-gradient-to-br from-violet-500 to-violet-700 hover:from-violet-600 hover:to-violet-800 disabled:opacity-60 transition shadow-sm"
                        title={`Conversar com ${name}`}
                      >
                        {loadingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5" />
                        )}
                        Conversar
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>


      {/* RIGHT PANEL — online by department */}
      {infoOpen && (
        <aside className="hidden lg:flex w-[300px] min-w-[300px] shrink-0 flex-col bg-white border-l border-gray-200">
          {active ? (
            <CollabInfoPanel
              collab={{
                id: active.id,
                name: active.name,
                color: active.color,
                avatar_url: (active as any).avatar_url ?? null,
              }}
              onInvite={() => { setInviteTab("colab"); setInviteOpen(true); }}
              onClose={() => setInfoOpen(false)}
              canEditAvatar={!!user && active.created_by === user.id}
              onAvatarChange={async (file) => {
                if (!user || !companyId) return null;
                try {
                  const ext = (file.name.split(".").pop() || "png").toLowerCase();
                  const path = `collabs/${companyId}/${active.id}/avatar-${Date.now()}.${ext}`;
                  const { data: up, error: upErr } = await supabase.storage
                    .from("documents")
                    .upload(path, file, { upsert: true, contentType: file.type });
                  if (upErr) {
                    toast({ title: "Falha no upload", description: upErr.message, variant: "destructive" });
                    return null;
                  }
                  const { data: signed } = await supabase.storage
                    .from("documents")
                    .createSignedUrl(up.path, 60 * 60 * 24 * 365);
                  const url = signed?.signedUrl || null;
                  const { error: updErr } = await supabase
                    .from("collab_conversations")
                    .update({ avatar_url: url })
                    .eq("id", active.id);
                  if (updErr) {
                    toast({ title: "Erro ao salvar foto", description: updErr.message, variant: "destructive" });
                    return null;
                  }
                  setConversations((prev) => prev.map((c) => c.id === active.id ? { ...c, avatar_url: url } as Conversation : c));
                  toast({ title: "Foto do grupo atualizada" });
                  return url;
                } catch (err: any) {
                  toast({ title: "Erro", description: err?.message, variant: "destructive" });
                  return null;
                }
              }}
              counts={{
                pinned: favoriteIds.size,
                links: messages.reduce((acc, m) => acc + ((m.content || "").match(/(https?:\/\/[^\s<>"')]+)/gi)?.length ?? 0), 0),
                media: messages.reduce((acc, m) => acc + ((m.attachments as any[])?.filter((a) => a?.url && a?.kind !== "poll").length ?? 0), 0),
              }}
              onOpenFavorites={() => setChatView("favorites")}
              onOpenLinks={() => setChatView("links")}
              onOpenMedia={() => setChatView("files")}
            />
          ) : (
            <>
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
          </>
        )}
      </aside>
      )}


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
                  <button onClick={copyInviteLink} className="px-3 py-2 rounded-lg text-[12px] font-medium text-white shadow-sm whitespace-nowrap inline-flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    {inviteLinkCopied ? "Copiado!" : "Copiar link"}
                  </button>
                  <button
                    onClick={rotateInviteLink}
                    disabled={rotatingInvite}
                    title="Gerar novo link (invalida o anterior)"
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 transition"
                  >
                    <RefreshCw className={cn("h-4 w-4", rotatingInvite && "animate-spin")} />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-3">Envie este link a um colega para que ele entre nesta conversa. Toque no <RefreshCw className="inline h-3 w-3 -mt-0.5" /> para gerar um novo link e invalidar o anterior.</p>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <button onClick={() => setInviteOpen(false)} className="px-3.5 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100">Fechar</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar side panel (Agenda from Atividades) */}
      {calendarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => { setCalendarOpen(false); setCalendarExpanded(false); }}
          />
          <div
            className={cn(
              "fixed top-0 right-0 z-50 h-screen bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-[width] duration-300",
              calendarExpanded ? "w-screen" : "w-full sm:w-[520px] md:w-[640px] lg:w-[760px]"
            )}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
                <Calendar className="h-4 w-4 text-emerald-600" />
                {calendarView === "agenda" ? "Agenda" : "Atividades"}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/atividades?view=${calendarView}`)}
                  className="px-2.5 h-8 rounded-md text-[12px] font-medium text-gray-600 hover:bg-gray-200"
                  title="Abrir página de Atividades"
                >
                  <ExternalLink className="h-3.5 w-3.5 inline mr-1" />
                  Abrir
                </button>
                <button
                  onClick={() => setCalendarExpanded((v) => !v)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  title={calendarExpanded ? "Recolher" : "Expandir"}
                >
                  {calendarExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { setCalendarOpen(false); setCalendarExpanded(false); }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              key={calendarView}
              src={`/atividades?view=${calendarView}`}
              className="flex-1 w-full border-0 bg-white"
              title={calendarView === "agenda" ? "Agenda" : "Atividades"}
            />
          </div>
        </>
      )}

      {/* QUICK ACTIONS (Tarefa / Evento / Horários / Enquete / Drive / Assinatura) */}
      <QuickActionDialogs
        action={quickAction}
        onClose={() => setQuickAction(null)}
        onSendMessage={sendCardMessage}
        onNavigate={navigate}
        members={members}
        userMap={userMap}
        companyId={companyId}
        activeId={activeId}
        currentUserId={user?.id ?? null}
        currentUserName={profile?.name ?? user?.email ?? "Usuário"}
        conversationName={active?.name ?? "Collab"}
      />

      {activeId && companyId && user && (
        <CreatePollDialog
          open={pollDialogOpen}
          onOpenChange={setPollDialogOpen}
          conversationId={activeId}
          servidorId={companyId}
          userId={user.id}
        />
      )}

      <ForwardMessageDialog
        open={!!forwardMsg}
        onOpenChange={(o) => !o && setForwardMsg(null)}
        message={forwardMsg ? {
          id: forwardMsg.id,
          content: forwardMsg.content,
          attachments: (forwardMsg.attachments as any) || [],
        } : null}
        conversations={conversations.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          emoji: c.emoji,
          color: c.color,
          avatar_url: c.avatar_url,
        }))}
        currentUserId={user?.id || ""}
        companyId={companyId || ""}
      />

      <QuickTaskDialog
        open={!!taskForMsg}
        onOpenChange={(o) => !o && setTaskForMsg(null)}
        conversationName={active?.name || "Conversa"}
        senderName={taskForMsg ? (userMap.get(taskForMsg.sender_id || "")?.name || "Mensagem") : ""}
        messageText={taskForMsg ? messagePlainText(taskForMsg) : ""}
        members={members.map((m) => {
          const u = userMap.get(m.user_id);
          return { id: m.user_id, name: u?.name || "Usuário", avatar_url: u?.avatar_url };
        })}
        currentUserId={user?.id || ""}
        onCreate={async ({ title, assigneeId, dueAt, description }) => {
          if (!activeId || !user || !companyId || !taskForMsg) return;
          const assignee = userMap.get(assigneeId);
          const dueLabel = dueAt
            ? new Date(dueAt).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
            : "Sem prazo";
          const summary = [
            `📋 **Nova tarefa:** ${title}`,
            `👤 Responsável: ${assignee?.name || "—"}`,
            `🗓️ Prazo: ${dueLabel}`,
            description ? `\n> ${description.slice(0, 200)}` : "",
          ].filter(Boolean).join("\n");
          const { error } = await supabase.from("collab_messages").insert({
            conversation_id: activeId,
            servidor_id: companyId,
            sender_id: user.id,
            content: summary,
            reply_to_id: taskForMsg.id,
            attachments: [],
          });
          if (error) throw error;
          sonnerToast.success("Tarefa criada e publicada na conversa");
        }}
      />
    </div>
  );
}

/* ──────────────────────────  QUICK ACTION DIALOGS  ────────────────────────── */

interface QuickActionDialogsProps {
  action: null | "drive" | "task" | "event" | "slots" | "sign" | "poll";
  onClose: () => void;
  onSendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  onNavigate: (path: string) => void;
  members: MemberRow[];
  userMap: Map<string, any>;
  companyId: string | null;
  activeId: string | null;
  currentUserId: string | null;
  currentUserName: string;
  conversationName: string;
}

function QuickActionDialogs({ action, onClose, onSendMessage, onNavigate, members, userMap, companyId, activeId, currentUserId, currentUserName, conversationName }: QuickActionDialogsProps) {
  // Shared
  const close = () => onClose();

  // Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);

  // Event
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtStart, setEvtStart] = useState("");
  const [evtEnd, setEvtEnd] = useState("");
  const [evtLink, setEvtLink] = useState("");

  // Slots
  const [slotDate, setSlotDate] = useState("");
  const [slotTimes, setSlotTimes] = useState("09:00, 10:00, 14:00, 15:00");

  // Poll
  const [pollTitle, setPollTitle] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDeadline, setPollDeadline] = useState("");
  const [pollShowVoters, setPollShowVoters] = useState(true);

  // Sign — PDF upload
  const signFileInput = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setTaskTitle(""); setTaskDesc(""); setTaskDue(""); setTaskAssignees([]);
    setEvtTitle(""); setEvtDesc(""); setEvtStart(""); setEvtEnd(""); setEvtLink("");
    setSlotDate(""); setSlotTimes("09:00, 10:00, 14:00, 15:00");
    setPollTitle(""); setPollOptions(["", ""]); setPollDeadline("");
  };

  useEffect(() => { if (!action) resetAll(); }, [action]);

  const fmt = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const fmtDateOnly = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  // ─── TASK
  const submitTask = async () => {
    if (!taskTitle.trim()) { sonnerToast.error("Informe o título da tarefa"); return; }
    const assignedNames = taskAssignees.map((id) => userMap.get(id)?.name).filter(Boolean);
    const lines = [
      `📋 **Tarefa:** ${taskTitle.trim()}`,
      taskDesc.trim() ? taskDesc.trim() : null,
      taskDue ? `📅 Entrega: ${fmt(taskDue)}` : null,
      assignedNames.length ? `👤 Atribuído(s): ${assignedNames.join(", ")}` : null,
    ].filter(Boolean).join("\n");
    await onSendMessage(lines);
    close();
  };

  // ─── EVENT
  const submitEvent = async () => {
    if (!evtTitle.trim() || !evtStart) { sonnerToast.error("Título e início são obrigatórios"); return; }
    const startIso = new Date(evtStart).toISOString();
    const endIso = evtEnd ? new Date(evtEnd).toISOString() : null;
    const lines = [
      `📅 **Evento:** ${evtTitle.trim()}`,
      evtDesc.trim() ? evtDesc.trim() : null,
      `🕒 ${fmt(evtStart)}${evtEnd ? ` → ${fmt(evtEnd)}` : ""}`,
      evtLink.trim() ? `🔗 ${evtLink.trim()}` : null,
      `\n_Adicionado automaticamente à agenda dos participantes._`,
    ].filter(Boolean).join("\n");
    await onSendMessage(lines);

    // Add to each participant's agenda + send notification
    if (companyId && members.length > 0) {
      const eventRef = crypto.randomUUID();
      const agendaRows = members.map((m) => ({
        servidor_id: companyId,
        lead_id: null as any,
        title: `📅 ${evtTitle.trim()}`,
        description: evtDesc.trim() || `Evento do collab "${conversationName}"`,
        type: "meeting",
        status: "planned",
        created_by_user_id: currentUserId,
        created_by_name: currentUserName,
        metadata: {
          source: "collab_event",
          collab_event_id: eventRef,
          collab_conversation_id: activeId,
          scheduled_at: startIso,
          end_at: endIso,
          meeting_url: evtLink.trim() || null,
          activity_status: "planejada",
          for_user_id: m.user_id,
        } as any,
      }));
      const notifRows = members
        .filter((m) => m.user_id !== currentUserId)
        .map((m) => ({
          user_id: m.user_id,
          title: "Novo evento na sua agenda 📅",
          message: `${currentUserName} marcou "${evtTitle.trim()}" em ${fmt(evtStart)}${evtLink.trim() ? " (videoconferência)" : ""}.`,
          type: "event_invitation",
          link: "/atividades",
          servidor_id: companyId,
          metadata: {
            collab_event_id: eventRef,
            collab_conversation_id: activeId,
            scheduled_at: startIso,
            meeting_url: evtLink.trim() || null,
            play_sound: true,
          } as any,
        }));
      try {
        await Promise.all([
          supabase.from("crm_lead_activities").insert(agendaRows as any),
          notifRows.length ? supabase.from("notifications").insert(notifRows as any) : Promise.resolve(),
        ]);
        sonnerToast.success(`Evento adicionado à agenda de ${members.length} participante(s)`);
      } catch (e: any) {
        sonnerToast.error("Evento publicado, mas falhou ao notificar todos");
      }
    }
    close();
  };

  // ─── SLOTS
  const submitSlots = async () => {
    if (!slotDate) { sonnerToast.error("Escolha a data"); return; }
    const times = slotTimes.split(",").map((t) => t.trim()).filter(Boolean);
    if (times.length === 0) { sonnerToast.error("Adicione ao menos um horário"); return; }
    const lines = [
      `⏰ **Horários disponíveis** — ${fmtDateOnly(slotDate)}`,
      "Escolha um horário respondendo nesta conversa:",
      ...times.map((t) => `• ${t}`),
    ].join("\n");
    await onSendMessage(lines);
    close();
  };

  // ─── POLL (interactive)
  const submitPoll = async () => {
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollTitle.trim() || opts.length < 2) { sonnerToast.error("Título e ao menos 2 opções"); return; }
    if (!companyId || !activeId || !currentUserId) { sonnerToast.error("Sem conversa ativa"); return; }
    const optionObjs = opts.map((text) => ({ id: crypto.randomUUID(), text }));
    const { data: poll, error } = await supabase
      .from("collab_polls" as any)
      .insert({
        conversation_id: activeId,
        servidor_id: companyId,
        created_by: currentUserId,
        question: pollTitle.trim(),
        options: optionObjs,
        show_voters: pollShowVoters,
        deadline: pollDeadline ? new Date(pollDeadline).toISOString() : null,
      })
      .select()
      .single();
    if (error || !poll) { sonnerToast.error("Erro ao criar enquete"); return; }
    await onSendMessage("", [{
      kind: "poll",
      name: pollTitle.trim(),
      size: "",
      poll_id: (poll as any).id,
      question: pollTitle.trim(),
      options: optionObjs,
      show_voters: pollShowVoters,
      deadline: pollDeadline ? new Date(pollDeadline).toISOString() : null,
    }]);
    close();
  };

  // ─── SIGN
  const submitSign = async (file: File) => {
    // Upload PDF to documents bucket and post a card + redirect to /documentos
    const { user } = (await supabase.auth.getUser()).data;
    if (!user) return;
    const path = `assinatura/${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { data, error } = await supabase.storage.from("documents").upload(path, file, { contentType: "application/pdf" });
    if (error) { sonnerToast.error("Falha no upload do PDF"); return; }
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(data.path, 60 * 60 * 24 * 7);
    await onSendMessage(`✍️ **Documento para assinatura** enviado para configuração do fluxo de assinantes.`, [{
      kind: "pdf", name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, url: signed?.signedUrl,
    }]);
    close();
    sonnerToast.success("Configure os assinantes em Documentos");
    onNavigate("/documentos");
  };

  return (
    <>
      {/* ARQUIVO NO ACCORD (Drive picker) */}
      <DrivePickerDialog
        open={action === "drive"}
        onClose={close}
        onPick={async (file) => {
          await onSendMessage(null as any, [{
            kind: file.file_type?.includes("pdf") ? "pdf"
                : file.file_type?.includes("sheet") || /\.(xlsx?|csv)$/i.test(file.name) ? "xls"
                : file.file_type?.startsWith("image/") ? "image"
                : "file",
            name: file.name,
            size: file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "",
            url: file.file_url ?? undefined,
          }]);
          close();
        }}
      />

      {/* TAREFA */}
      <Dialog open={action === "task"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <CheckSquare className="h-4 w-4 text-emerald-600" /> Nova tarefa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Título *" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-emerald-500" />
            <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Descrição" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-emerald-500 resize-none" />
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Data de entrega</label>
              <input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Atribuir a</label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 p-1">
                {members.length === 0 && <div className="text-[12px] text-gray-400 px-2 py-2">Sem membros</div>}
                {members.map((m) => {
                  const u = userMap.get(m.user_id);
                  const checked = taskAssignees.includes(m.user_id);
                  return (
                    <label key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={(e) => setTaskAssignees((prev) => e.target.checked ? [...prev, m.user_id] : prev.filter((x) => x !== m.user_id))} />
                      <span className="text-[12.5px] text-gray-800">{u?.name || "Usuário"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={close} className="h-9 px-4 rounded-lg text-[12.5px] text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={submitTask} className="h-9 px-4 rounded-lg text-[12.5px] font-medium text-white bg-emerald-600 hover:bg-emerald-700">Criar tarefa</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EVENTO */}
      <Dialog open={action === "event"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Calendar className="h-4 w-4 text-violet-600" /> Novo evento / reunião
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="Título *" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-violet-500" />
            <textarea value={evtDesc} onChange={(e) => setEvtDesc(e.target.value)} placeholder="Descrição" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-violet-500 resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Início *</label>
                <input type="datetime-local" value={evtStart} onChange={(e) => setEvtStart(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Fim</label>
                <input type="datetime-local" value={evtEnd} onChange={(e) => setEvtEnd(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]" />
              </div>
            </div>
            <input value={evtLink} onChange={(e) => setEvtLink(e.target.value)} placeholder="Link da videoconferência (opcional)" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={close} className="h-9 px-4 rounded-lg text-[12.5px] text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={submitEvent} className="h-9 px-4 rounded-lg text-[12.5px] font-medium text-white bg-violet-600 hover:bg-violet-700">Publicar evento</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HORÁRIOS DISPONÍVEIS */}
      <Dialog open={action === "slots"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Clock className="h-4 w-4 text-amber-600" /> Horários disponíveis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Data</label>
              <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Horários (separados por vírgula)</label>
              <textarea value={slotTimes} onChange={(e) => setSlotTimes(e.target.value)} rows={2} placeholder="09:00, 10:30, 14:00" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={close} className="h-9 px-4 rounded-lg text-[12.5px] text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={submitSlots} className="h-9 px-4 rounded-lg text-[12.5px] font-medium text-white bg-amber-600 hover:bg-amber-700">Compartilhar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DOCUMENTO PARA ASSINATURA */}
      <Dialog open={action === "sign"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <FilePen className="h-4 w-4 text-sky-600" /> Documento para assinatura
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12.5px] text-gray-600">Envie o PDF do documento. Em seguida você será levado(a) ao módulo <strong>Documentos</strong> para configurar os assinantes e a ordem da assinatura.</p>
            <input ref={signFileInput} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) submitSign(f); e.currentTarget.value = ""; }} />
            <button onClick={() => signFileInput.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[13px] font-medium flex flex-col items-center justify-center gap-1">
              <FilePen className="h-5 w-5" />
              Selecionar PDF
            </button>
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => { close(); onNavigate("/documentos"); }} className="text-[12px] text-sky-700 hover:underline">Ir para Documentos →</button>
              <button onClick={close} className="h-9 px-4 rounded-lg text-[12.5px] text-gray-600 hover:bg-gray-100">Cancelar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ENQUETE */}
      <Dialog open={action === "poll"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <BarChart3 className="h-4 w-4 text-pink-600" /> Nova enquete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} placeholder="Pergunta *" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]" />
            <div className="space-y-1.5">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={opt} onChange={(e) => { const c = [...pollOptions]; c[i] = e.target.value; setPollOptions(c); }} placeholder={`Opção ${i + 1}`} className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-[13px]" />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="w-9 h-9 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-[12px] text-pink-600 font-medium hover:underline inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar opção
              </button>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">Prazo (opcional)</label>
              <input type="datetime-local" value={pollDeadline} onChange={(e) => setPollDeadline(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]" />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={pollShowVoters} onChange={(e) => setPollShowVoters(e.target.checked)} className="rounded" />
              Mostrar quem votou
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={close} className="h-9 px-4 rounded-lg text-[12.5px] text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={submitPoll} className="h-9 px-4 rounded-lg text-[12.5px] font-medium text-white bg-pink-600 hover:bg-pink-700">Publicar enquete</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────────────────────  DRIVE PICKER  ────────────────────────── */

function DrivePickerDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: any) => void }) {
  const [parentId, setParentId] = useState<string | null>(null);
  const { files, loading } = useDriveFiles(parentId);
  const folders = files.filter((f) => f.type === "folder");
  const docs = files.filter((f) => f.type === "file");

  useEffect(() => { if (!open) setParentId(null); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <HardDrive className="h-4 w-4 text-emerald-600" /> Selecionar do Accord Documentos
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {parentId && (
            <button onClick={() => setParentId(null)} className="w-full text-left px-3 py-2 text-[12px] text-gray-500 hover:bg-gray-50 rounded-lg">← Voltar à raiz</button>
          )}
          {loading && <div className="text-center text-[12px] text-gray-400 py-8">Carregando…</div>}
          {!loading && folders.length === 0 && docs.length === 0 && (
            <div className="text-center text-[12.5px] text-gray-400 py-10">Nenhum arquivo nesta pasta.</div>
          )}
          {folders.map((f) => (
            <button key={f.id} onClick={() => setParentId(f.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50 text-left">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-base">📁</div>
              <span className="flex-1 text-[13px] text-gray-800 truncate">{f.name}</span>
            </button>
          ))}
          {docs.map((f) => (
            <button key={f.id} onClick={() => onPick(f)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50 text-left">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center"><FileIcon className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-gray-800 truncate">{f.name}</div>
                <div className="text-[11px] text-gray-400">{f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────  POLL CARD (interactive)  ────────────────────────── */

interface PollCardProps {
  pollId: string;
  fallbackQuestion: string;
  fallbackOptions: Array<{ id: string; text: string }>;
  fallbackShowVoters: boolean;
  fallbackDeadline: string | null;
  currentUserId: string | null;
  userMap: Map<string, any>;
  isSent: boolean;
}

function PollCard({ pollId, fallbackQuestion, fallbackOptions, fallbackShowVoters, fallbackDeadline, currentUserId, userMap, isSent }: PollCardProps) {
  const [poll, setPoll] = useState<{
    question: string;
    options: Array<{ id: string; text: string }>;
    show_voters: boolean;
    deadline: string | null;
    closed_at: string | null;
    created_by: string;
  } | null>(null);
  const [votes, setVotes] = useState<Array<{ option_id: string; user_id: string }>>([]);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("collab_polls" as any).select("*").eq("id", pollId).maybeSingle();
      if (alive && data) {
        const p = data as any;
        setPoll({
          question: p.question,
          options: Array.isArray(p.options) ? p.options : [],
          show_voters: p.show_voters,
          deadline: p.deadline,
          closed_at: p.closed_at,
          created_by: p.created_by,
        });
      } else if (alive && !data) {
        setPoll({
          question: fallbackQuestion,
          options: fallbackOptions,
          show_voters: fallbackShowVoters,
          deadline: fallbackDeadline,
          closed_at: null,
          created_by: "",
        });
      }
      const { data: vs } = await supabase.from("collab_poll_votes" as any).select("option_id, user_id").eq("poll_id", pollId);
      if (alive && vs) setVotes(vs as any);
    })();

    const ch = supabase
      .channel(`poll-${pollId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_poll_votes", filter: `poll_id=eq.${pollId}` }, async () => {
        const { data: vs } = await supabase.from("collab_poll_votes" as any).select("option_id, user_id").eq("poll_id", pollId);
        if (vs) setVotes(vs as any);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "collab_polls", filter: `id=eq.${pollId}` }, (payload) => {
        const p = payload.new as any;
        setPoll((prev) => prev ? { ...prev, closed_at: p.closed_at, deadline: p.deadline } : prev);
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [pollId, fallbackQuestion, fallbackShowVoters]);

  const myVote = votes.find((v) => v.user_id === currentUserId)?.option_id || null;
  const total = votes.length;
  const deadlinePassed = poll?.deadline ? new Date(poll.deadline).getTime() < Date.now() : false;
  const closed = !!poll?.closed_at || deadlinePassed;

  const vote = async (optionId: string) => {
    if (!currentUserId || voting || closed) return;
    setVoting(true);
    if (myVote === optionId) {
      // unvote
      setVotes((prev) => prev.filter((v) => v.user_id !== currentUserId));
      await supabase.from("collab_poll_votes" as any).delete().eq("poll_id", pollId).eq("user_id", currentUserId);
    } else if (myVote) {
      setVotes((prev) => prev.map((v) => v.user_id === currentUserId ? { ...v, option_id: optionId } : v));
      await supabase.from("collab_poll_votes" as any).update({ option_id: optionId }).eq("poll_id", pollId).eq("user_id", currentUserId);
    } else {
      setVotes((prev) => [...prev, { option_id: optionId, user_id: currentUserId }]);
      await supabase.from("collab_poll_votes" as any).insert({ poll_id: pollId, option_id: optionId, user_id: currentUserId });
    }
    setVoting(false);
  };

  const closePoll = async () => {
    await supabase.from("collab_polls" as any).update({ closed_at: new Date().toISOString() }).eq("id", pollId);
  };

  if (!poll) {
    return (
      <div className="rounded-2xl px-4 py-3 min-w-[280px] max-w-[360px] bg-white/95 border border-violet-100 shadow-sm text-[12px] text-gray-500">
        Carregando enquete…
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl px-4 py-3.5 min-w-[280px] max-w-[360px] shadow-md border",
      isSent ? "bg-white/98 border-violet-200" : "bg-white/98 border-violet-100"
    )}>
      <div className="flex items-start gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
          <BarChart3 className="h-4 w-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-wide text-violet-600 font-semibold">Enquete{closed ? " · Encerrada" : ""}</div>
          <div className="text-[13.5px] font-semibold text-gray-900 leading-snug break-words">{poll.question}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const optVotes = votes.filter((v) => v.option_id === opt.id);
          const count = optVotes.length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const mine = myVote === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={closed || voting || !currentUserId}
              className={cn(
                "relative w-full text-left rounded-xl border px-3 py-2 overflow-hidden transition group",
                mine ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/40",
                closed && "cursor-default opacity-90",
              )}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all"
                style={{ width: `${pct}%`, background: mine ? "rgba(124,58,237,0.16)" : "rgba(124,58,237,0.07)" }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    mine ? "border-violet-600 bg-violet-600" : "border-gray-300"
                  )}>
                    {mine && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={cn("text-[13px] truncate", mine ? "text-violet-900 font-medium" : "text-gray-800")}>{opt.text}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-medium text-gray-500">{pct}%</span>
                  <span className="text-[11px] text-gray-400">·</span>
                  <span className="text-[11px] text-gray-500">{count}</span>
                </div>
              </div>
              {poll.show_voters && optVotes.length > 0 && (
                <div className="relative mt-1.5 flex flex-wrap gap-1">
                  {optVotes.slice(0, 6).map((v) => {
                    const u = userMap.get(v.user_id);
                    const name = u?.name || "Usuário";
                    return (
                      <span key={v.user_id} className="inline-flex items-center gap-1 text-[10.5px] bg-white/80 border border-violet-100 rounded-full pl-0.5 pr-1.5 py-0.5">
                        {u?.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-violet-200 flex items-center justify-center text-[8px] font-semibold text-violet-700">{(name[0] || "?").toUpperCase()}</span>
                        )}
                        <span className="text-gray-700">{name.split(" ")[0]}</span>
                      </span>
                    );
                  })}
                  {optVotes.length > 6 && <span className="text-[10.5px] text-gray-500">+{optVotes.length - 6}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-gray-500">
        <span>{total} {total === 1 ? "voto" : "votos"}{poll.deadline ? ` · Prazo ${new Date(poll.deadline).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        {!closed && currentUserId === poll.created_by && (
          <button onClick={closePoll} className="text-violet-600 hover:underline font-medium">Encerrar</button>
        )}
      </div>
    </div>
  );
}
