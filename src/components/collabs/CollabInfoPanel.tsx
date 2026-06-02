import { useRef, useState } from "react";
import {
  X,
  UserPlus,
  Volume2,
  Clock,
  Star,
  Link as LinkIcon,
  Image as ImageIcon,
  BookOpen,
  Camera,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  EyeOff,
  Trash2,
} from "lucide-react";
import { HexAvatar, hexGradientFor } from "./HexAvatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface CollabInfoPanelProps {
  collab: {
    id: string;
    name: string;
    color?: string | null;
    avatar_url?: string | null;
  };
  onClose?: () => void;
  onInvite?: () => void;
  onAvatarChange?: (file: File) => Promise<string | null>;
  canEditAvatar?: boolean;
  counts?: {
    pinned?: number;
    links?: number;
    media?: number;
  };
  onOpenFavorites?: () => void;
  onOpenLinks?: () => void;
  onOpenMedia?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onEdit?: () => void;
  onAddParticipants?: () => void;
  onHide?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export function CollabInfoPanel({ collab, onClose, onInvite, onAvatarChange, canEditAvatar, counts, onOpenFavorites, onOpenLinks, onOpenMedia, isPinned, onTogglePin, onEdit, onAddParticipants, onHide, onDelete, canManage }: CollabInfoPanelProps) {
  const [sound, setSound] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bg =
    collab.color
      ? `linear-gradient(135deg, ${collab.color} 0%, ${collab.color}cc 100%)`
      : hexGradientFor(collab.id);

  const initials = collab.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onAvatarChange) return;
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try { await onAvatarChange(file); } finally { setUploading(false); }
  };


  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
        <h3 className="text-[14px] font-semibold text-gray-900">Sobre collab</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* About */}
        <div className="flex flex-col items-center gap-2 pb-4 border-b border-gray-200 text-center">
          <div className="relative group">
            <HexAvatar
              size={88}
              background={bg}
              src={collab.avatar_url || null}
              initials={initials}
            />
            {canEditAvatar && onAvatarChange && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 bg-black/45 text-white transition disabled:opacity-100"
                  title="Trocar foto do grupo"
                  aria-label="Trocar foto do grupo"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md border-2 border-white flex items-center justify-center transition disabled:opacity-70"
                  title="Trocar foto do grupo"
                  aria-label="Trocar foto do grupo"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
              </>
            )}
          </div>
          <div className="text-[16px] font-semibold text-gray-900 mt-1">
            {collab.name}
          </div>
          {onInvite && (
            <button
              onClick={onInvite}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition mt-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          )}
        </div>

        {/* Toggles */}
        <div className="pt-2">
          <ToggleRow
            icon={<Volume2 className="w-4 h-4" />}
            label="Som"
            on={sound}
            onChange={setSound}
          />
          <ToggleRow
            icon={<Clock className="w-4 h-4" />}
            label="Excluir mensagens automaticamente"
            sub={autoDelete ? "Ativo" : "Nunca"}
            on={autoDelete}
            onChange={setAutoDelete}
          />
        </div>

        {/* Seção Collab */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="block w-[3px] h-3 rounded-sm bg-emerald-500" />
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Collab
            </span>
          </div>
          <MenuRow icon={<Star className="w-4 h-4" />} label="Mensagens favoritas" count={counts?.pinned ?? 0} onClick={onOpenFavorites} />
          <MenuRow icon={<LinkIcon className="w-4 h-4" />} label="Todos os links" count={counts?.links ?? 0} onClick={onOpenLinks} />
          <MenuRow icon={<ImageIcon className="w-4 h-4" />} label="Arquivos e mídia" count={counts?.media ?? 0} onClick={onOpenMedia} />
        </div>
      </div>

      {/* Banner guia */}
      <div className="mx-3 mb-3 mt-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <BookOpen className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-emerald-700 leading-tight">
            Guia de collabs
          </div>
          <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
            Tudo o que você precisa saber
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className="w-7 h-7 flex items-center justify-center text-gray-500 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-900 leading-tight truncate">{label}</div>
        {sub && <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-[34px] h-5 rounded-full transition shrink-0 ${
          on ? "bg-emerald-500" : "bg-gray-300"
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow transition-all ${
            on ? "left-[16px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 py-2 px-1 rounded-lg hover:bg-gray-50 transition text-left">
      <div className="w-7 h-7 flex items-center justify-center text-emerald-600 shrink-0">{icon}</div>
      <span className="flex-1 text-[13px] font-medium text-gray-800">{label}</span>
      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
    </button>
  );
}
