import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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


/* ──────────────────────────  MOCK DATA  ────────────────────────── */

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  color: string;
  time: string;
  preview: string;
  unread?: number;
  pinned?: boolean;
  members?: number;
  online?: number;
}

const conversations: Conversation[] = [
  { id: "geral", name: "# Geral", avatar: "#G", color: "bg-[hsl(var(--sidebar-primary))]", time: "10:23", preview: "Wendel: Bom dia, equipe! 👋", unread: 3, pinned: true, members: 48, online: 12 },
  { id: "projetos", name: "Projetos 🚀", avatar: "🚀", color: "bg-[#D85A30]", time: "09:58", preview: "Juliana: Update pronto.", unread: 2, members: 18, online: 6 },
  { id: "vendas", name: "Vendas 📈", avatar: "📈", color: "bg-[#1D9E75]", time: "09:45", preview: "Rodrigo: Diamante arrasado", unread: 1, members: 12, online: 4 },
  { id: "suporte", name: "Suporte 🎧", avatar: "🎧", color: "bg-[#378ADD]", time: "09:12", preview: "Patrícia: Cliente respondeu", members: 9, online: 3 },
  { id: "marketing", name: "Marketing 📣", avatar: "📣", color: "bg-[#D4537E]", time: "Ontem", preview: "Beatriz: Campanha aprovada", members: 7, online: 2 },
  { id: "produto", name: "Produto 💡", avatar: "💡", color: "bg-[#BA7517]", time: "Ontem", preview: "Mariana: Wireframe v2", members: 6, online: 1 },
  { id: "admin", name: "Administração ⚙️", avatar: "⚙️", color: "bg-[#888780]", time: "Seg", preview: "Thiago: Permissão atualizada", members: 5, online: 1 },
  { id: "privado", name: "Privado - Wendel 🔒", avatar: "🔒", color: "bg-[hsl(var(--sidebar-primary))]", time: "Seg", preview: "Você: Ok! 👊", members: 2, online: 2 },
];

type FileAttachment = { kind: "pdf" | "xls" | "image" | "file" | "doc"; name: string; size: string; url?: string };

interface MockMessage {
  id: string;
  sender?: { name: string; initials: string; color: string; nameColor?: string };
  sent?: boolean;
  text?: React.ReactNode;
  time: string;
  reactions?: { emoji: string; count: number }[];
  quote?: { name: string; text: string };
  file?: FileAttachment;
  files?: FileAttachment[];
  system?: React.ReactNode;
  status?: "sent" | "delivered" | "read";
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "💡"];

const FILE_THEME: Record<FileAttachment["kind"], { from: string; to: string; iconBg: string; iconColor: string; label: string }> = {
  pdf:   { from: "#FFF3EE", to: "#FFE2D4", iconBg: "#FFD6BF", iconColor: "#D85A30", label: "PDF" },
  xls:   { from: "#EEFBE2", to: "#DCF3C1", iconBg: "#C7E8A2", iconColor: "#3B6D11", label: "XLSX" },
  doc:   { from: "#E8F1FF", to: "#D2E3FF", iconBg: "#BCD3FF", iconColor: "#2563EB", label: "DOC" },
  image: { from: "#F3EBFF", to: "#E4D3FF", iconBg: "#D5BBFF", iconColor: "#7C3AED", label: "IMG" },
  file:  { from: "#F1F3F8", to: "#E4E8F1", iconBg: "#D1D7E3", iconColor: "#475569", label: "FILE" },
};

const initialMessages: Record<string, MockMessage[]> = {
  geral: [
    {
      id: "1", sent: true, time: "10:23",
      text: <>Bom dia, equipe! 👋<br />Vamos alinhar as prioridades de hoje.</>,
      reactions: [{ emoji: "👍", count: 7 }, { emoji: "🎉", count: 3 }, { emoji: "🔥", count: 2 }],
      status: "read",
    },
    {
      id: "2", time: "10:25",
      sender: { name: "Juliana Martins", initials: "JM", color: "bg-[#D4537E]", nameColor: "hsl(var(--sidebar-primary))" },
      quote: { name: "Wendel Silvério", text: "Vamos alinhar as prioridades de hoje." },
      text: "Perfeito! Já preparei o update do projeto.",
      file: { kind: "pdf", name: "Update_Projeto_Q2.pdf", size: "2.4 MB" },
      reactions: [{ emoji: "👍", count: 4 }, { emoji: "✅", count: 2 }],
    },
    {
      id: "3", time: "10:27",
      sender: { name: "Rodrigo Costa", initials: "RC", color: "bg-[#1D9E75]", nameColor: "#1D9E75" },
      text: <>Consegui ajustar os pontos levantados ontem.<br />Segue o documento com as alterações.</>,
      file: { kind: "xls", name: "Alteracoes_Escopo.xlsx", size: "1.1 MB" },
      reactions: [{ emoji: "👍", count: 3 }, { emoji: "💬", count: 1 }],
    },
    {
      id: "sys1", time: "",
      system: <>🔔 <b className="font-medium">Lembrete:</b> Reunião de alinhamento às 15:00 — Sala 3 - Accord.</>,
    },
    {
      id: "4", time: "10:32",
      sender: { name: "Beatriz Lima", initials: "BL", color: "bg-[#378ADD]", nameColor: "#378ADD" },
      text: <>Obrigada, <span style={{ color: "hsl(var(--sidebar-primary))", fontWeight: 500 }}>@rodrigo</span>! Ficou excelente. ❤️</>,
      reactions: [{ emoji: "❤️", count: 2 }],
    },
  ],
};

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys e pessoas",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨",
      "😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕",
      "🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁",
      "☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣",
      "😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹",
      "👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
    ],
  },
  {
    label: "Gestos e corpo",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
      "🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","💪",
      "🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁️","👅","👄","💋",
    ],
  },
  {
    label: "Corações e símbolos",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖",
      "💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈",
      "♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️",
      "📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹",
      "🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️",
      "🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️",
      "⚠️","🚸","🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀",
      "💤","🏧","🚾","♿","🅿️","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","🚻","🚮",
    ],
  },
  {
    label: "Animais e natureza",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈",
      "🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴",
      "🦄","🐝","🐛","🦋","🐌","🐞","🐜","🪲","🪳","🦟","🦗","🕷️","🕸️","🦂","🐢","🐍",
      "🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊",
      "🌲","🌳","🌴","🌵","🌾","🌿","☘️","🍀","🍁","🍂","🍃","🌺","🌻","🌹","🥀","🌷",
      "🌼","🌸","💐","🍄","🌰","🌍","🌎","🌏","🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘",
      "🌙","🌚","🌛","🌜","☀️","🌝","🌞","⭐","🌟","🌠","☁️","⛅","⛈️","🌤️","🌦️","🌧️",
      "🌩️","🌨️","❄️","☃️","⛄","🌬️","💨","💧","💦","☔","☂️","🌊","🌫️",
    ],
  },
  {
    label: "Comida e bebida",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🥐",
      "🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔",
      "🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🥟",
      "🍤","🍙","🍚","🍘","🍥","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮",
      "🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛","🍼","☕","🍵","🧃","🥤","🍶",
      "🍺","🍻","🥂","🍷","🥃","🍸","🍹","🍾","🧊","🥄","🍴","🍽️","🥣","🥡","🥢",
    ],
  },
  {
    label: "Atividades e objetos",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🥅","🏒","🏑",
      "🥍","🏏","🪃","🥊","🥋","⛳","⛸️","🎣","🤿","🎽","🛹","🛼","🛷","🥌","🎿","⛷️",
      "🏂","🏋️","🤼","🤸","🤺","⛹️","🤾","🏌️","🏇","🧘","🏄","🏊","🚣","🧗","🚵","🚴",
      "🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤹","🎭","🩰","🎨","🎬",
      "🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮",
      "🎰","🧩","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜",
      "🛵","🏍️","🛺","🚲","🛴","✈️","🚀","🛸","🚁","🛶","⛵","🚤","🛳️","⛴️","🛥️","🚢",
      "💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","💰","💳","💎","⚖️","🧰",
      "🔧","🔨","⚒️","🛠️","⛏️","🪓","🪚","🔩","⚙️","🪤","🧱","⛓️","🧲","🔫","💣","🧨",
      "🪃","🏹","🛡️","🪄","🔮","🧿","📿","💈","⚗️","🔭","🔬","🕳️","🩹","🩺","💊","💉",
      "🪒","🧴","🧷","🧹","🧺","🧻","🪣","🧼","🪥","🪞","🪟","🛏️","🛋️","🪑","🚽","🚿",
      "🛁","🪠","🧸","🪅","🪆","🖼️","🪞","🛍️","🛒","🎁","🎈","🎏","🎀","🎊","🎉","🎎",
      "🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷️","📪","📫","📬","📭",
      "📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒️","🗓️","📅","📆","🗑️","📇",
    ],
  },
];

const EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
const MENTIONS = ["wendel","juliana","rodrigo","beatriz","mariana","thiago","patricia"];

// Animated stickers (GIF/WebP from Giphy CDN)
const STICKERS: string[] = [
  "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif", // party popper
  "https://media.giphy.com/media/26gsspfbsXrnXLwfu/giphy.gif",  // thumbs up
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",  // clapping
  "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif", // heart
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",  // fire
  "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",  // rocket
  "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif", // 100
  "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif", // mind blown
  "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",  // celebration
  "https://media.giphy.com/media/l46Cy1rHbQ7qZHJ4I/giphy.gif",  // laughing
  "https://media.giphy.com/media/3o7TKsQ8gqVrxZw4xy/giphy.gif", // sad
  "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif", // wow
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",  // applause
  "https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif",  // love
  "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", // good job
  "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif", // approved
  "https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif",  // dancing
  "https://media.giphy.com/media/3o7abrH8o4HMgEAV9e/giphy.gif", // cat
  "https://media.giphy.com/media/3o7TKDEq04QY1qDmJq/giphy.gif", // dog
  "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif",  // ok
  "https://media.giphy.com/media/3o7TKLkE9w0EkAirL2/giphy.gif", // hi
  "https://media.giphy.com/media/3o6gE7y0c2pV3CV61i/giphy.gif", // bye
  "https://media.giphy.com/media/l0HlGRDhBkVlIyzC0/giphy.gif",  // coffee
  "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif", // pizza
];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/* ──────────────────────────  COMPONENT  ────────────────────────── */

export default function Collabs() {
  const [activeId, setActiveId] = useState("geral");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [allMessages, setAllMessages] = useState<Record<string, MockMessage[]>>(initialMessages);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [pickerTab, setPickerTab] = useState<"emoji" | "stickers">("emoji");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const companyId = useActiveCompanyId();
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const [accordOpen, setAccordOpen] = useState(false);
  const [accordLoading, setAccordLoading] = useState(false);
  type AccordEntry = { id: string; name: string; type: "file" | "folder"; file_url: string | null; file_size: number | null; file_type: string | null };
  const [accordEntries, setAccordEntries] = useState<AccordEntry[]>([]);
  const [accordSearch, setAccordSearch] = useState("");
  const [accordPath, setAccordPath] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Documentos" }]);

  // Create-collab + invite dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<"group" | "channel" | "collab" | "copilot" | "video">("group");
  const [newName, setNewName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<"colab" | "guest">("guest");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  // Dynamic mentions from registered users (tenant scoped)
  type MentionUser = { id: string; name: string; handle: string; avatar_url: string | null };
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);

  const slug = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "user";

  useEffect(() => {
    if (!companyId) { setMentionUsers([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, name, avatar_url, is_active, status")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("status", "ativo")
        .order("name", { ascending: true });
      if (cancelled) return;
      const list: MentionUser[] = (data || [])
        .filter((p: any) => p.name)
        .map((p: any) => ({
          id: p.user_id || p.id,
          name: p.name as string,
          handle: slug((p.name as string).split(" ")[0] || p.name),
          avatar_url: p.avatar_url || null,
        }));
      setMentionUsers(list);
    };
    load();
    const channel = supabase
      .channel(`collabs-mentions-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `company_id=eq.${companyId}` },
        () => load(),
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [companyId]);

  const loadAccordFolder = async (parentId: string | null) => {
    if (!companyId) return;
    setAccordLoading(true);
    let q = supabase
      .from("drive_files")
      .select("id,name,type,file_url,file_size,file_type")
      .eq("servidor_id", companyId)
      .order("type", { ascending: true })
      .order("name", { ascending: true });
    q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
    const { data, error } = await q;
    if (!error) setAccordEntries((data as any) || []);
    setAccordLoading(false);
  };

  const openAccordPicker = async () => {
    setAccordOpen(true);
    setAccordPath([{ id: null, name: "Documentos" }]);
    setAccordSearch("");
    await loadAccordFolder(null);
  };

  const enterFolder = async (f: AccordEntry) => {
    setAccordPath((p) => [...p, { id: f.id, name: f.name }]);
    setAccordSearch("");
    await loadAccordFolder(f.id);
  };

  const goToPathIndex = async (idx: number) => {
    const next = accordPath.slice(0, idx + 1);
    setAccordPath(next);
    setAccordSearch("");
    await loadAccordFolder(next[next.length - 1].id);
  };


  const pickAccordFile = (f: { id: string; name: string; file_url: string | null; file_size: number | null }) => {
    const lower = f.name.toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(lower);
    const kind: MockMessage["file"]["kind"] = isImage
      ? "image"
      : lower.endsWith(".pdf") ? "pdf"
      : /\.(xls|xlsx|csv)$/i.test(lower) ? "xls"
      : "file";
    pushMessage({
      id: crypto.randomUUID(),
      sent: true,
      time: nowTime(),
      text: isImage && f.file_url ? <img src={f.file_url} alt={f.name} className="rounded-lg max-w-[260px] max-h-[260px] object-cover" /> : undefined,
      file: isImage ? undefined : { kind, name: f.name, size: f.file_size ? formatBytes(f.file_size) : "—", url: f.file_url ?? undefined },
      status: "sent",
    });
    setAccordOpen(false);
  };


  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const messages = allMessages[activeId] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages.length]);

  const pushMessage = (msg: MockMessage) => {
    setAllMessages((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), msg] }));
  };

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/collabs/convite/${activeId}`;

  const createKindMeta = {
    group:   { title: "Novo bate-papo em grupo", desc: "Discussões em grupo",            color: "#6366f1", Icon: Users },
    channel: { title: "Novo canal",              desc: "Notícias e comunicados",          color: "#f59e0b", Icon: Megaphone },
    collab:  { title: "Nova Collab",             desc: "Colabore com equipes externas",   color: "#10b981", Icon: Handshake },
    copilot: { title: "Conversar com o CoPilot", desc: "Resolução assistida por IA",      color: "#a855f7", Icon: Sparkles },
    video:   { title: "Nova videoconferência",   desc: "Organize com convidados",         color: "#ef4444", Icon: Video },
  } as const;

  const openCreate = (kind: keyof typeof createKindMeta) => {
    setCreateKind(kind);
    setNewName("");
    setSelectedMemberIds([]);
    setMemberSearch("");
    setCreateOpen(true);
  };

  const toggleMember = (id: string) =>
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submitCreate = () => {
    if (!newName.trim()) return;
    const meta = createKindMeta[createKind];
    const id = crypto.randomUUID();
    const initial = newName.trim()[0]?.toUpperCase() ?? "C";
    const newConv: Conversation = {
      id,
      name: createKind === "channel" ? `# ${newName.trim()}` : newName.trim(),
      avatar: initial,
      color: "bg-[hsl(var(--sidebar-primary))]",
      time: nowTime(),
      preview: "Conversa criada agora",
      members: selectedMemberIds.length + 1,
      online: 1,
    };
    conversations.unshift(newConv);
    setAllMessages((prev) => ({
      ...prev,
      [id]: [{ id: "sys-create", time: "", system: <><meta.Icon className="inline h-3 w-3 mr-1" style={{ color: meta.color }} /><b className="font-medium">{newConv.name}</b> foi criado.</> }],
    }));
    setActiveId(id);
    setCreateOpen(false);
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 1800);
    } catch {}
  };


  const messagePlainText = (m: MockMessage): string => {
    if (typeof m.text === "string") return m.text;
    if (m.file) return `📎 ${m.file.name}`;
    if (m.files?.length) return `📎 ${m.files.length} arquivo(s)`;
    return "Mensagem";
  };

  const startReply = (m: MockMessage) => {
    const name = m.sent ? "Você" : m.sender?.name ?? "Mensagem";
    setReplyTo({ id: m.id, name, text: messagePlainText(m).slice(0, 120) });
    inputRef.current?.focus();
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setAllMessages((prev) => {
      const list = prev[activeId] ?? [];
      return {
        ...prev,
        [activeId]: list.map((m) => {
          if (m.id !== msgId) return m;
          const rx = [...(m.reactions ?? [])];
          const i = rx.findIndex((r) => r.emoji === emoji);
          if (i >= 0) {
            rx[i] = { ...rx[i], count: rx[i].count + 1 };
          } else {
            rx.push({ emoji, count: 1 });
          }
          return { ...m, reactions: rx };
        }),
      };
    });
    setReactPickerFor(null);
  };

  const sendText = () => {
    const t = input.trim();
    if (!t) return;
    pushMessage({
      id: crypto.randomUUID(),
      sent: true,
      time: nowTime(),
      text: t,
      status: "sent",
      quote: replyTo ? { name: replyTo.name, text: replyTo.text } : undefined,
    });
    setInput("");
    setReplyTo(null);
    setShowEmoji(false);
    setShowMentions(false);
  };

  const sendSticker = (url: string) => {
    pushMessage({
      id: crypto.randomUUID(),
      sent: true,
      time: nowTime(),
      text: <img src={url} alt="sticker" className="w-[160px] h-[160px] object-contain" loading="lazy" />,
      status: "sent",
    });
    setShowEmoji(false);
  };

  const handleFiles = (files: FileList | null, asImage: boolean) => {
    if (!files) return;
    const arr = Array.from(files);
    const attachments: FileAttachment[] = arr.map((f) => {
      const isImage = asImage || f.type.startsWith("image/");
      const url = URL.createObjectURL(f);
      const lower = f.name.toLowerCase();
      const kind: FileAttachment["kind"] = isImage
        ? "image"
        : lower.endsWith(".pdf") ? "pdf"
        : /\.(xls|xlsx|csv)$/i.test(lower) ? "xls"
        : /\.(docx?|gdoc|odt|txt|md)$/i.test(lower) ? "doc"
        : "file";
      return { kind, name: f.name, size: formatBytes(f.size), url };
    });
    pushMessage({
      id: crypto.randomUUID(),
      sent: true,
      time: nowTime(),
      files: attachments,
      status: "sent",
      quote: replyTo ? { name: replyTo.name, text: replyTo.text } : undefined,
    });
    setReplyTo(null);
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      {/* ──────────  LEFT SIDEBAR  ────────── */}
      <aside className="w-[320px] min-w-[320px] flex flex-col border-r border-border bg-background">
        {/* Search */}
        <div className="h-[60px] flex items-center gap-2 px-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Encontrar colaborador ou bate-papo"
              className="flex-1 bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-white shadow-[0_4px_14px_-2px_rgba(99,102,241,0.55)] hover:shadow-[0_6px_18px_-2px_rgba(99,102,241,0.7)] transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" }}
                title="Criar"
                aria-label="Criar novo"
              >
                <PenSquare className="h-[18px] w-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-[320px] p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,243,255,0.98) 100%)",
              }}
            >
              {([
                { kind: "group",   icon: Users,     title: "Bate-papo em grupo",        desc: "Discussões em grupo",                       color: "#6366f1" },
                { kind: "copilot", icon: Sparkles,  title: "Conversar com o CoPilot",   desc: "Resolução de problemas assistida por IA",   color: "#a855f7" },
                { kind: "channel", icon: Megaphone, title: "Canal",                     desc: "Notícias, comunicados, comentários",        color: "#f59e0b" },
                { kind: "collab",  icon: Handshake, title: "Collab",                    desc: "Colabore com equipes externas e convidados",color: "#10b981" },
                { kind: "video",   icon: Video,     title: "Videoconferência",          desc: "Organize videoconferências com convidados", color: "#ef4444" },
              ] as const).map((opt) => (
                <DropdownMenuItem
                  key={opt.title}
                  onSelect={(e) => { e.preventDefault(); openCreate(opt.kind); }}
                  className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-violet-50/80 data-[highlighted]:bg-violet-50/80 gap-3"
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${opt.color}15`, color: opt.color }}
                  >
                    <opt.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-gray-900 leading-tight">{opt.title}</span>
                    <span className="text-[11.5px] text-gray-500 leading-tight mt-0.5 truncate">{opt.desc}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <div className="my-1.5 mx-3 rounded-lg px-2.5 py-1.5 text-[11px] text-violet-700 bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100">
                Tarefas, arquivos, calendário e outras ferramentas
              </div>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setInviteTab("guest"); setInviteOpen(true); }}
                className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-blue-50/80 data-[highlighted]:bg-blue-50/80 gap-3"
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600">
                  <UserPlus className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-blue-600 leading-tight">Convidar usuários</span>
                  <span className="text-[11.5px] text-gray-500 leading-tight mt-0.5 truncate">Convidar vários usuários de uma vez</span>
                </div>
              </DropdownMenuItem>
              <button className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 text-[12px] text-blue-600 hover:bg-blue-50/60 rounded-xl transition">
                <Info className="h-3.5 w-3.5" />
                O que é melhor para mim?
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 mx-1.5 my-0.5 rounded-xl cursor-pointer transition-colors h-[64px]",
                  isActive
                    ? "bg-[hsl(var(--sidebar-primary))] text-white"
                    : "hover:bg-muted"
                )}
              >
                <div className={cn("w-12 h-12 min-w-12 rounded-full flex items-center justify-center text-white text-sm font-medium", c.color)}>
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {c.pinned && <Pin className={cn("h-3 w-3 shrink-0", isActive ? "text-white/80" : "text-muted-foreground")} />}
                      <span className={cn("text-[13.5px] font-medium truncate", isActive ? "text-white" : "text-foreground")}>
                        {c.name}
                      </span>
                    </div>
                    <span className={cn("text-[11px] shrink-0", isActive ? "text-white/80" : "text-muted-foreground")}>
                      {c.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={cn("text-xs truncate", isActive ? "text-white/70" : "text-muted-foreground")}>
                      {c.preview}
                    </span>
                    {c.unread && (
                      <span
                        className={cn(
                          "min-w-[18px] h-[18px] rounded-full px-1.5 flex items-center justify-center text-[11px] font-medium shrink-0",
                          isActive ? "bg-white text-[hsl(var(--sidebar-primary))]" : "bg-[hsl(var(--sidebar-primary))] text-white"
                        )}
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ──────────  CHAT MAIN  ────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[60px] flex items-center gap-3 px-4 shrink-0 border-b border-white/10" style={{ background: "hsl(var(--sidebar-primary))" }}>
          <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-medium">
            {active.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white leading-tight truncate">{active.name.replace(/^#\s?/, "")}</div>
            <div className="text-[11.5px] text-white/75">
              {active.members ?? 0} membros · {active.online ?? 0} online
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[Search, Phone, MoreVertical].map((Icon, i) => (
              <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:bg-white/15 transition-colors">
                <Icon className="h-[17px] w-[17px]" />
              </button>
            ))}
          </div>
        </header>

        {/* Messages with wallpaper */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 relative"
          style={{
            backgroundColor: "#8fadc8",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, #a8c5da 0%, #7ba3c0 35%, #9eb8d0 60%, #6d98b8 100%)",
              opacity: 0.6,
            }}
          />

          <div className="relative z-10 flex flex-col gap-1">
            {/* Date divider */}
            <div className="text-center my-2">
              <span className="text-[11px] text-white bg-black/30 px-3 py-0.5 rounded-[10px]">Hoje</span>
            </div>

            {messages.map((m) => {
              if (m.system) {
                return (
                  <div key={m.id} className="text-center my-1.5">
                    <span className="text-[11.5px] text-white bg-black/30 px-3.5 py-1 rounded-xl inline-block leading-snug">
                      {m.system}
                    </span>
                  </div>
                );
              }

              const isSent = !!m.sent;
              const allFiles: FileAttachment[] = m.files ?? (m.file ? [m.file] : []);
              const hasBubble = !!m.text || !!m.quote;
              return (
                <div key={m.id} className={cn("group/msg flex gap-2 mb-2", isSent && "flex-row-reverse")}>
                  {!isSent && m.sender && (
                    <div className={cn("w-8 h-8 min-w-8 rounded-full flex items-center justify-center text-[11px] font-medium text-white self-end shadow-sm", m.sender.color)}>
                      {m.sender.initials}
                    </div>
                  )}
                  <div className={cn("flex flex-col gap-1 max-w-[68%] min-w-0", isSent && "items-end")}>
                    {!isSent && m.sender && (
                      <div className="text-[11.5px] font-medium pl-0.5" style={{ color: m.sender.nameColor || "hsl(var(--sidebar-primary))" }}>
                        {m.sender.name}
                      </div>
                    )}

                    {/* Bubble + hover actions wrapper */}
                    <div className={cn("relative flex items-center gap-1.5", isSent && "flex-row-reverse")}>
                      {/* Hover action toolbar */}
                      <div
                        className={cn(
                          "opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/95 backdrop-blur rounded-full shadow-md border border-black/5 px-1 py-0.5 z-10",
                          isSent ? "mr-1" : "ml-1"
                        )}
                      >
                        <button
                          onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)}
                          title="Reagir"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-violet-600"
                        >
                          <SmilePlus className="h-[15px] w-[15px]" />
                        </button>
                        <button
                          onClick={() => startReply(m)}
                          title="Responder"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-violet-600"
                        >
                          <Reply className="h-[15px] w-[15px]" />
                        </button>
                      </div>

                      <div className={cn("flex flex-col gap-1.5 min-w-0", isSent && "items-end")}>
                        {hasBubble && (
                          <div
                            className={cn(
                              "px-3.5 py-2 rounded-2xl text-[13px] leading-snug shadow-sm break-words relative",
                              isSent ? "text-white" : "bg-white/95 text-[#1a1a2e] backdrop-blur-sm"
                            )}
                            style={
                              isSent
                                ? { background: "linear-gradient(135deg, hsl(var(--sidebar-primary)) 0%, #6366f1 100%)" }
                                : undefined
                            }
                          >
                            {m.quote && (
                              <div
                                className="border-l-[3px] pl-2 mb-1.5 rounded-r-md py-0.5"
                                style={{
                                  borderColor: isSent ? "rgba(255,255,255,0.7)" : "hsl(var(--sidebar-primary))",
                                  background: isSent ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.06)",
                                }}
                              >
                                <div className="text-[11px] font-medium" style={{ color: isSent ? "rgba(255,255,255,0.95)" : "hsl(var(--sidebar-primary))" }}>
                                  {m.quote.name}
                                </div>
                                <div className={cn("text-xs truncate", isSent ? "text-white/75" : "text-muted-foreground")}>
                                  {m.quote.text}
                                </div>
                              </div>
                            )}
                            {m.text && <div>{m.text}</div>}
                            <span className={cn("block text-right text-[10px] mt-1", isSent ? "text-white/65" : "text-black/40")}>
                              {m.time}
                              {isSent && m.status === "read" && " ✓✓"}
                            </span>
                          </div>
                        )}

                        {/* File cards */}
                        {allFiles.map((f, idx) => {
                          const theme = FILE_THEME[f.kind];
                          const Icon = f.kind === "pdf" ? FileText : f.kind === "xls" ? FileSpreadsheet : f.kind === "doc" ? FileText : FileIcon;
                          return (
                            <div
                              key={idx}
                              className="group/file flex items-center gap-3 rounded-2xl px-3 py-2.5 min-w-[260px] max-w-[320px] border border-white/60 shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.28)] transition-all"
                              style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}
                            >
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                style={{ background: theme.iconBg, color: theme.iconColor }}
                              >
                                <Icon className="h-[19px] w-[19px]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] font-semibold text-[#1a1a2e] truncate">{f.name}</div>
                                <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                  <span className="font-medium tracking-wide" style={{ color: theme.iconColor }}>{theme.label}</span>
                                  <span className="opacity-50">·</span>
                                  <span>{f.size}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-70 group-hover/file:opacity-100 transition">
                                {f.url && (
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Abrir"
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white/70"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                <a
                                  href={f.url || "#"}
                                  download={f.name}
                                  title="Baixar"
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-white/70"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick reaction picker */}
                      {reactPickerFor === m.id && (
                        <div
                          className={cn(
                            "absolute z-20 bottom-full mb-1.5 flex items-center gap-0.5 bg-white rounded-full shadow-xl border border-black/5 px-1.5 py-1",
                            isSent ? "right-0" : "left-0"
                          )}
                        >
                          {QUICK_REACTIONS.map((e) => (
                            <button
                              key={e}
                              onClick={() => toggleReaction(m.id, e)}
                              className="w-8 h-8 rounded-full hover:bg-gray-100 text-[17px] flex items-center justify-center transition hover:scale-125"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {m.reactions && m.reactions.length > 0 && (
                      <div className={cn("flex gap-1 flex-wrap", isSent && "justify-end")}>
                        {m.reactions.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => toggleReaction(m.id, r.emoji)}
                            className="rounded-full px-2 py-0.5 text-[11.5px] flex items-center gap-1 shadow-sm cursor-pointer bg-white/90 hover:bg-white text-gray-700 border border-black/5 transition"
                          >
                            <span>{r.emoji}</span>
                            <span className="font-medium text-gray-600">{r.count}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)}
                          className="rounded-full w-6 h-6 flex items-center justify-center bg-white/70 hover:bg-white text-gray-500 border border-black/5"
                          title="Adicionar reação"
                        >
                          <SmilePlus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing */}
            <div className="flex items-center gap-2 pt-1 pb-0.5">
              <div className="w-7 h-7 rounded-full bg-[#D4537E] flex items-center justify-center text-[10px] font-medium text-white">JM</div>
              <div className="bg-white/95 rounded-[14px] px-3.5 py-2 flex gap-1 items-center shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "200ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "400ms" }} />
              </div>
              <span className="text-[11.5px] text-white/90" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                Juliana está digitando...
              </span>
            </div>

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="px-3 py-2.5 border-t border-white/10 shrink-0 relative"
          style={{ background: "hsl(var(--sidebar-primary))" }}
        >
          {/* Emoji picker */}
          {showEmoji && (
            <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl z-20 border border-black/5 w-[380px] flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 max-h-[360px]">
                {pickerTab === "emoji" ? (
                  EMOJI_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="mb-3 last:mb-0">
                      <div className="text-[11px] font-medium text-gray-500 px-1 mb-1.5 sticky top-0 bg-white">{cat.label}</div>
                      <div className="grid grid-cols-8 gap-1">
                        {cat.emojis.map((e, i) => (
                          <button
                            key={`${cat.label}-${i}-${e}`}
                            onClick={() => { insertAtCursor(e); setShowEmoji(false); }}
                            className="w-9 h-9 rounded-lg hover:bg-gray-100 text-xl flex items-center justify-center"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500 px-1 mb-1.5">Adesivos animados</div>
                    <div className="grid grid-cols-4 gap-2">
                      {STICKERS.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          onClick={() => sendSticker(url)}
                          className="aspect-square rounded-xl hover:bg-gray-100 p-1 flex items-center justify-center transition"
                        >
                          <img src={url} alt="sticker" className="w-full h-full object-contain" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 p-2 border-t border-gray-100 bg-gray-50/60">
                <button
                  onClick={() => setPickerTab("emoji")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition ${
                    pickerTab === "emoji" ? "bg-blue-500 text-white shadow" : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Emoji
                </button>
                <button
                  onClick={() => setPickerTab("stickers")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition ${
                    pickerTab === "stickers" ? "bg-blue-500 text-white shadow" : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Adesivos
                </button>
              </div>
            </div>
          )}
          {/* Mentions */}
          {showMentions && (
            <div className="absolute bottom-full left-3 mb-2 bg-white rounded-2xl shadow-xl py-1.5 z-20 border border-black/5 min-w-[240px] max-h-[280px] overflow-y-auto">
              {mentionUsers.length === 0 ? (
                <div className="px-3 py-3 text-[12px] text-gray-400">Nenhum usuário cadastrado</div>
              ) : (
                mentionUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { insertAtCursor(`@${u.handle} `); setShowMentions(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100 text-left"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-gray-800 truncate leading-tight">{u.name}</div>
                      <div className="text-[11px] text-gray-500 truncate leading-tight">@{u.handle}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files, false); e.target.value = ""; }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files, true); e.target.value = ""; }}
          />

          <div className="flex items-center gap-1.5 bg-white rounded-[24px] pl-3.5 pr-2 py-1.5">
            <div className="flex gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Anexar"
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <Paperclip className="h-[17px] w-[17px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-64">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Monitor className="h-4 w-4 mr-2" />
                    Arquivo neste computador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openAccordPicker}>
                    <HardDrive className="h-4 w-4 mr-2" />
                    Arquivo no Accord
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => imageInputRef.current?.click()}
                title="Enviar imagem"
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ImageIcon className="h-[17px] w-[17px]" />
              </button>
              <button
                onClick={() => { setShowEmoji((v) => !v); setShowMentions(false); }}
                title="Emojis"
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors",
                  showEmoji ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <Smile className="h-[17px] w-[17px]" />
              </button>
              <button
                onClick={() => { setShowMentions((v) => !v); setShowEmoji(false); }}
                title="Mencionar"
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors",
                  showMentions ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
                )}
              >
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
              className="flex-1 bg-transparent outline-none text-[13.5px] text-[#1a1a2e] placeholder:text-gray-400"
            />
            <button
              onClick={sendText}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{ background: input.trim() ? "hsl(var(--sidebar-primary))" : "transparent", color: input.trim() ? "#fff" : "#888" }}
            >
              {input.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

      </main>

      {/* Accord file picker */}
      <Dialog open={accordOpen} onOpenChange={setAccordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Arquivos no Accord</DialogTitle>
          </DialogHeader>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            {accordPath.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => goToPathIndex(i)}
                  className={cn(
                    "px-1.5 py-0.5 rounded hover:bg-muted",
                    i === accordPath.length - 1 && "text-foreground font-medium"
                  )}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={accordSearch}
              onChange={(e) => setAccordSearch(e.target.value)}
              placeholder="Buscar nesta pasta..."
              className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto -mx-2">
            {accordLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : accordEntries.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Pasta vazia.
              </div>
            ) : (
              accordEntries
                .filter((f) => f.name.toLowerCase().includes(accordSearch.toLowerCase()))
                .map((f) => {
                  const isFolder = f.type === "folder";
                  return (
                    <button
                      key={f.id}
                      onClick={() => (isFolder ? enterFolder(f) : pickAccordFile(f))}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        isFolder ? "bg-primary/10" : "bg-muted"
                      )}>
                        {isFolder ? (
                          <HardDrive className="h-4 w-4 text-primary" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {isFolder ? "Pasta" : f.file_size ? formatBytes(f.file_size) : "—"}
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>

        </DialogContent>
      </Dialog>

      {/* ──────────  CREATE COLLAB / GROUP / CHANNEL DIALOG  ────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div
            className="px-6 pt-6 pb-5"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 100%)" }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ background: `${createKindMeta[createKind].color}18`, color: createKindMeta[createKind].color }}
              >
                {(() => {
                  const I = createKindMeta[createKind].Icon;
                  return <I className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-gray-900">
                  {createKindMeta[createKind].title}
                </DialogTitle>
                <p className="text-[12px] text-gray-500 mt-0.5">{createKindMeta[createKind].desc}</p>
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
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar usuários do tenant..."
                  className="w-full rounded-xl bg-gray-50 border border-transparent pl-9 pr-3 py-2 text-sm outline-none focus:border-violet-300 focus:bg-white"
                />
              </div>
              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                {mentionUsers.length === 0 && (
                  <div className="text-center text-[12px] text-gray-400 py-6">Nenhum usuário do tenant encontrado.</div>
                )}
                {mentionUsers
                  .filter((u) => u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map((u) => {
                    const checked = selectedMemberIds.includes(u.id);
                    const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                          checked ? "bg-violet-50/70" : "hover:bg-gray-50"
                        )}
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-medium flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-gray-900 truncate">{u.name}</div>
                          <div className="text-[11px] text-gray-500 truncate">@{u.handle}</div>
                        </div>
                        <div
                          className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                            checked ? "bg-violet-600 border-violet-600" : "border-gray-300"
                          )}
                        >
                          {checked && <span className="text-white text-[10px] leading-none">✓</span>}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
            {createKind === "collab" && (
              <button
                onClick={() => { setCreateOpen(false); setInviteTab("guest"); setInviteOpen(true); }}
                className="text-[12px] font-medium text-emerald-600 hover:underline"
              >
                + Convidar externos
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-3.5 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={submitCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" }}
              >
                Criar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────────  INVITE DIALOG  ────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="px-6 pt-6 pb-4 bg-white">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">Adicionar à collab</DialogTitle>
            <div className="mt-4 grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
              {([
                { id: "colab", label: "Colaboradores" },
                { id: "guest", label: "Convidados" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInviteTab(t.id)}
                  className={cn(
                    "py-2 text-[12.5px] font-medium rounded-lg transition-all",
                    inviteTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {inviteTab === "colab" ? (
            <div className="px-6 pb-5 space-y-3 bg-white">
              <button
                onClick={() => { setInviteOpen(false); openCreate("group"); }}
                className="w-full text-left rounded-xl border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 px-4 py-3 text-[13px] font-medium text-blue-600"
              >
                + Adicionar usuário
              </button>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-2">Usuários do tenant</div>
                <div className="max-h-[260px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {mentionUsers.length === 0 && (
                    <div className="text-center text-[12px] text-gray-400 py-6">Nenhum usuário disponível.</div>
                  )}
                  {mentionUsers.map((u) => {
                    const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-medium flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-gray-900 truncate">{u.name}</div>
                          <div className="text-[11px] text-gray-500 truncate">@{u.handle}</div>
                        </div>
                        <button className="text-[11.5px] text-blue-600 font-medium hover:underline">Adicionar</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 pb-5 bg-white">
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: "linear-gradient(135deg, #d4f5d4 0%, #b4ebc4 100%)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold text-gray-900">Convide seus convidados</div>
                    <p className="text-[11.5px] text-gray-700 mt-1 leading-relaxed">
                      Convidados são colaboradores externos que não fazem parte do seu tenant.
                      Eles terão acesso <b>apenas a esta Collab</b> — nada mais.
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/60 flex items-center justify-center text-2xl shrink-0">🎁</div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4 space-y-4">
                <div>
                  <div className="text-[12px] font-medium text-gray-700 mb-2">Convidar via link</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate text-[11.5px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      {inviteLink}
                    </div>
                    <button
                      onClick={copyInviteLink}
                      className="px-3 py-2 rounded-lg text-[12px] font-medium text-white shadow-sm whitespace-nowrap"
                      style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
                    >
                      {inviteLinkCopied ? "Copiado!" : "Copy link"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="text-[12px] font-medium text-gray-700 mb-2">Convidar via e-mail ou telefone</div>
                  <input
                    value={inviteContact}
                    onChange={(e) => setInviteContact(e.target.value)}
                    placeholder="Adicionar telefone ou e-mail do convidado"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              onClick={() => setInviteOpen(false)}
              className="px-3.5 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              disabled={inviteTab === "guest" && !inviteContact.trim()}
              onClick={() => setInviteOpen(false)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" }}
            >
              Convidar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

