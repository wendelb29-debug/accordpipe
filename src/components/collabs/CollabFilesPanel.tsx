import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  ExternalLink,
  FolderPlus,
  FilePlus,
  PenSquare,
  HardDrive,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { HexAvatar } from "./HexAvatar";

type FileKind = "pdf" | "xls" | "image" | "file" | "doc";

interface FileAttachment {
  kind: FileKind;
  name: string;
  size: string;
  url?: string;
}

interface CollabFilesPanelProps {
  collab: {
    id: string;
    name: string;
    color?: string | null;
    avatar_url?: string | null;
  };
  messages: Array<{
    id: string;
    sender_id: string | null;
    created_at: string;
    attachments: FileAttachment[];
  }>;
  tenantUsers: Array<{ id: string; name: string }>;
  onUploadClick: () => void;
  onBack: () => void;
}

const KIND_ICON: Record<FileKind, { Icon: typeof FileIcon; color: string; bg: string }> = {
  pdf:   { Icon: FileText,        color: "#dc2626", bg: "#fee2e2" },
  xls:   { Icon: FileSpreadsheet, color: "#16a34a", bg: "#dcfce7" },
  image: { Icon: ImageIcon,       color: "#2563eb", bg: "#dbeafe" },
  doc:   { Icon: FileText,        color: "#2563eb", bg: "#dbeafe" },
  file:  { Icon: FileIcon,        color: "#6b7280", bg: "#f3f4f6" },
};

export function CollabFilesPanel({
  collab,
  messages,
  tenantUsers,
  onUploadClick,
  onBack,
}: CollabFilesPanelProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  const allFiles = useMemo(() => {
    const flat: Array<{
      key: string;
      file: FileAttachment;
      senderName: string;
      created_at: string;
    }> = [];
    for (const m of messages) {
      if (!m.attachments?.length) continue;
      const sender = tenantUsers.find((u) => u.id === m.sender_id);
      m.attachments.forEach((f, i) => {
        flat.push({
          key: `${m.id}-${i}`,
          file: f,
          senderName: sender?.name || "—",
          created_at: m.created_at,
        });
      });
    }
    return flat.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [messages, tenantUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allFiles;
    return allFiles.filter((row) => row.file.name.toLowerCase().includes(q));
  }, [allFiles, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 shrink-0 bg-white">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          title="Voltar à conversa"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>

        <HexAvatar
          size={36}
          background={
            collab.color
              ? `linear-gradient(135deg, ${collab.color} 0%, ${collab.color}cc 100%)`
              : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
          }
          src={collab.avatar_url || null}
          initials={collab.name.slice(0, 2)}
        />

        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-gray-900 leading-tight truncate">
            Arquivos
          </div>
          <div className="text-[11.5px] text-gray-500 leading-tight truncate">{collab.name}</div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-sm">
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-[260px] p-1.5 rounded-2xl border border-gray-200 shadow-2xl bg-white"
          >
            {([
              { icon: FilePlus,   label: "Arquivo do computador", onSelect: onUploadClick },
              { icon: FolderPlus, label: "Pasta",                  onSelect: () => toast.info("Criar pasta — em breve") },
              { icon: HardDrive,  label: "Salvar em Documentos",   onSelect: () => toast.info("Salvar em Documentos do Accord — em breve") },
              { icon: PenSquare,  label: "Lousa",                  onSelect: () => toast.info("Lousa — em breve") },
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
      </div>

      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/60 shrink-0">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar arquivos…"
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-700 placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setView("list")}
            className={`w-8 h-7 rounded flex items-center justify-center transition ${view === "list" ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            title="Lista"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`w-8 h-7 rounded flex items-center justify-center transition ${view === "grid" ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            title="Grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <EmptyState search={search} onUploadClick={onUploadClick} />
        ) : view === "list" ? (
          <ListView rows={filtered} />
        ) : (
          <GridView rows={filtered} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ search, onUploadClick }: { search: string; onUploadClick: () => void }) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500">
        <Search className="w-10 h-10 mb-3 text-gray-300" />
        <div className="text-[14px] font-medium">Nenhum arquivo encontrado</div>
        <div className="text-[12px] mt-1">Tente outro termo de busca.</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="text-[15px] font-semibold text-gray-700 mb-1">Não há arquivos nesta collab ainda</div>
      <div className="text-[12.5px] text-gray-500 mb-6">Compartilhe documentos com a equipe para começar.</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        <button
          onClick={onUploadClick}
          className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400 transition text-center"
        >
          <FilePlus className="w-10 h-10 text-emerald-500 mb-3 group-hover:scale-110 transition" strokeWidth={1.5} />
          <div className="text-[14px] font-semibold text-gray-800">Criar / enviar arquivo</div>
          <div className="text-[12px] text-gray-500 mt-1">Escolha um arquivo do seu computador</div>
        </button>
        <button
          onClick={() => toast.info("Criar pasta — em breve")}
          className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition text-center"
        >
          <FolderPlus className="w-10 h-10 text-gray-400 mb-3 group-hover:scale-110 transition" strokeWidth={1.5} />
          <div className="text-[14px] font-semibold text-gray-800">Criar pasta</div>
          <div className="text-[12px] text-gray-500 mt-1">Organize seus arquivos (em breve)</div>
        </button>
      </div>
    </div>
  );
}

function ListView({ rows }: { rows: Array<{ key: string; file: FileAttachment; senderName: string; created_at: string }> }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="grid grid-cols-[1fr_120px_160px_140px_80px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        <div>Nome</div>
        <div>Tamanho</div>
        <div>Enviado por</div>
        <div>Data</div>
        <div className="text-right">Ações</div>
      </div>
      {rows.map(({ key, file, senderName, created_at }) => {
        const meta = KIND_ICON[file.kind] ?? KIND_ICON.file;
        return (
          <div key={key} className="grid grid-cols-[1fr_120px_160px_140px_80px] gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.bg, color: meta.color }}>
                <meta.Icon className="w-[18px] h-[18px]" />
              </div>
              <span className="text-[13.5px] font-medium text-gray-800 truncate">{file.name}</span>
            </div>
            <div className="text-[12.5px] text-gray-500">{file.size || "—"}</div>
            <div className="text-[12.5px] text-gray-700 truncate">{senderName}</div>
            <div className="text-[12.5px] text-gray-500">{formatDate(created_at)}</div>
            <div className="flex items-center justify-end gap-1">
              {file.url && (
                <>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition" title="Abrir">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a href={file.url} download={file.name} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition" title="Baixar">
                    <Download className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridView({ rows }: { rows: Array<{ key: string; file: FileAttachment; senderName: string; created_at: string }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {rows.map(({ key, file, senderName, created_at }) => {
        const meta = KIND_ICON[file.kind] ?? KIND_ICON.file;
        return (
          <div key={key} className="rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md hover:border-emerald-200 transition cursor-pointer">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: meta.bg, color: meta.color }}>
              <meta.Icon className="w-6 h-6" />
            </div>
            <div className="text-[13px] font-semibold text-gray-800 truncate">{file.name}</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {file.size || "—"} · {formatDate(created_at)}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 truncate">por {senderName}</div>
            {file.url && (
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[11.5px] font-medium text-emerald-600 hover:text-emerald-700">Abrir</a>
                <span className="text-gray-300">·</span>
                <a href={file.url} download={file.name} className="flex-1 text-center text-[11.5px] font-medium text-gray-600 hover:text-gray-800">Baixar</a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
