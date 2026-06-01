import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  LayoutGrid,
  Grid2x2,
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
  Trash2,
  Settings,
  CheckCircle2,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { HexAvatar } from "./HexAvatar";
import { useDriveFiles } from "@/hooks/useDriveFiles";

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

type ViewMode = "list" | "grid" | "large";
type SortBy = "date" | "name" | "size";

const KIND_ICON: Record<
  FileKind,
  { Icon: typeof FileIcon; color: string; bg: string; label: string }
> = {
  pdf:   { Icon: FileText,        color: "#dc2626", bg: "#fee2e2", label: "PDF" },
  xls:   { Icon: FileSpreadsheet, color: "#16a34a", bg: "#dcfce7", label: "XLSX" },
  image: { Icon: ImageIcon,       color: "#2563eb", bg: "#dbeafe", label: "Imagem" },
  doc:   { Icon: FileText,        color: "#2563eb", bg: "#dbeafe", label: "DOC" },
  file:  { Icon: FileIcon,        color: "#6b7280", bg: "#f3f4f6", label: "Arquivo" },
};

const SORT_LABEL: Record<SortBy, string> = {
  date: "Por data",
  name: "Por nome (A–Z)",
  size: "Por tamanho",
};

function parseSizeBytes(size: string): number {
  if (!size) return 0;
  const m = size.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  const unit = (m[2] || "B").toUpperCase();
  const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return n * (mult[unit] ?? 1);
}

export function CollabFilesPanel({
  collab,
  messages,
  tenantUsers,
  onUploadClick,
  onBack,
}: CollabFilesPanelProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const navigate = useNavigate();
  const { createFolder } = useDriveFiles(null);

  const handleCreateFolder = async () => {
    const suggested = `Collab — ${collab.name}`;
    const name = window.prompt("Nome da nova pasta em Documentos:", suggested);
    if (!name?.trim()) return;
    const created = await createFolder(name.trim());
    if (created) toast.success(`Pasta "${name.trim()}" criada em Documentos`);
  };

  const handleGoToDocumentos = () => navigate("/documentos");

  // Agrega + filtra + ordena
  const rows = useMemo(() => {
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

    const q = search.trim().toLowerCase();
    const filtered = q ? flat.filter((r) => r.file.name.toLowerCase().includes(q)) : flat;

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.file.name.localeCompare(b.file.name, "pt-BR");
      if (sortBy === "size") return parseSizeBytes(b.file.size) - parseSizeBytes(a.file.size);
      return a.created_at < b.created_at ? 1 : -1;
    });

    return sorted;
  }, [messages, tenantUsers, search, sortBy]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 500px at 85% 8%, rgba(16,185,129,0.06), transparent 60%), " +
          "radial-gradient(700px 400px at -5% 100%, rgba(59,130,246,0.05), transparent 60%), " +
          "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      }}
    >
      {/* ROW 1 — header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 shrink-0 bg-white/70 backdrop-blur-md">
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
          <div className="text-[16px] font-semibold text-gray-900 leading-tight truncate">Arquivos</div>
          <div className="text-[11.5px] text-gray-500 leading-tight truncate">{collab.name}</div>
        </div>

        {/* Status + ações rápidas */}
        <div className="hidden md:flex items-center gap-2 mr-1">
          <button
            onClick={handleGoToDocumentos}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
            title="Abrir Documentos do Accord"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Vinculado a Documentos
          </button>
          <button
            onClick={() => toast.info("Lixeira — em breve")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition"
            title="Lixeira"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Lixeira
          </button>
          <button
            onClick={() => toast.info("Configurações — em breve")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition"
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* + Adicionar */}
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
              { icon: FolderPlus, label: "Pasta",                onSelect: handleCreateFolder },
              { icon: HardDrive,  label: "Salvar em Documentos", onSelect: handleGoToDocumentos },
              { icon: PenSquare,  label: "Lousa",                onSelect: () => toast.info("Lousa — em breve") },
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

      {/* ROW 2 — toolbar (busca, ordenação, modos de visualização) */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-white/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 flex-1 max-w-md shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar arquivos…"
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-700 placeholder:text-gray-400"
          />
        </div>

        {/* Aviso da Lixeira (estilo Bitrix) */}
        <div className="hidden lg:block text-[11.5px] text-gray-500 flex-1 text-center truncate">
          Arquivos excluídos ficam na Lixeira por 30 dias
        </div>

        {/* Ordenação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              {SORT_LABEL[sortBy]}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} className="w-[180px] p-1 rounded-xl border border-gray-200 shadow-xl bg-white">
            {(Object.keys(SORT_LABEL) as SortBy[]).map((k) => (
              <DropdownMenuItem
                key={k}
                onSelect={(e) => { e.preventDefault(); setSortBy(k); }}
                className={`rounded-lg px-3 py-2 cursor-pointer text-[13px] focus:bg-emerald-50 data-[highlighted]:bg-emerald-50 ${sortBy === k ? "text-emerald-600 font-semibold" : "text-gray-700"}`}
              >
                {SORT_LABEL[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Modos de visualização */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
          {([
            { mode: "list" as const,  Icon: ListIcon,   title: "Lista" },
            { mode: "grid" as const,  Icon: Grid2x2,    title: "Grade" },
            { mode: "large" as const, Icon: LayoutGrid, title: "Grande" },
          ]).map(({ mode, Icon, title }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`w-8 h-7 rounded flex items-center justify-center transition ${
                view === mode ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
              title={title}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-5">
        {rows.length === 0 ? (
          <EmptyState search={search} onUploadClick={onUploadClick} onCreateFolder={handleCreateFolder} />
        ) : view === "list" ? (
          <ListView rows={rows} />
        ) : view === "grid" ? (
          <GridView rows={rows} />
        ) : (
          <LargeView rows={rows} />
        )}
      </div>
    </div>
  );
}

/* ───────── Sub-componentes ───────── */

function EmptyState({
  search,
  onUploadClick,
  onCreateFolder,
}: {
  search: string;
  onUploadClick: () => void;
  onCreateFolder: () => void;
}) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 text-gray-500">
        <Search className="w-10 h-10 mb-3 text-gray-300" />
        <div className="text-[14px] font-medium">Nenhum arquivo encontrado</div>
        <div className="text-[12px] mt-1">Tente outro termo de busca.</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-[16px] font-semibold text-gray-800 mb-1">Não há arquivos ou pastas nesta collab</div>
      <div className="text-[13px] text-gray-500 mb-8 max-w-md text-center">
        Compartilhe arquivos com a equipe ou crie uma pasta em Documentos do Accord para organizar tudo.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl w-full">
        <button
          onClick={onUploadClick}
          className="group flex flex-col items-center justify-center px-8 py-12 rounded-2xl border-2 border-dashed border-emerald-200 bg-white/60 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-400 transition text-center shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition">
            <FilePlus className="w-9 h-9 text-emerald-600" strokeWidth={1.5} />
          </div>
          <div className="text-[15px] font-semibold text-gray-800">Criar arquivo</div>
          <div className="text-[12.5px] text-gray-500 mt-1">Envie do seu computador</div>
        </button>
        <button
          onClick={onCreateFolder}
          className="group flex flex-col items-center justify-center px-8 py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-300 transition text-center shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition">
            <FolderPlus className="w-9 h-9 text-gray-500 group-hover:text-emerald-600 transition" strokeWidth={1.5} />
          </div>
          <div className="text-[15px] font-semibold text-gray-800">Criar pasta</div>
          <div className="text-[12.5px] text-gray-500 mt-1">Em Documentos do Accord</div>
        </button>
      </div>
    </div>
  );
}

function ListView({ rows }: { rows: Array<{ key: string; file: FileAttachment; senderName: string; created_at: string }> }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_120px_180px_140px_80px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        <div>Nome</div>
        <div>Tamanho</div>
        <div>Enviado por</div>
        <div>Data</div>
        <div className="text-right">Ações</div>
      </div>
      {rows.map(({ key, file, senderName, created_at }) => {
        const meta = KIND_ICON[file.kind] ?? KIND_ICON.file;
        return (
          <div key={key} className="grid grid-cols-[1fr_120px_180px_140px_80px] gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition items-center">
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
          <div key={key} className="rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md hover:border-emerald-200 transition cursor-pointer shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: meta.bg, color: meta.color }}>
              <meta.Icon className="w-6 h-6" />
            </div>
            <div className="text-[13px] font-semibold text-gray-800 truncate">{file.name}</div>
            <div className="text-[11px] text-gray-500 mt-1">{file.size || "—"} · {formatDate(created_at)}</div>
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

function LargeView({ rows }: { rows: Array<{ key: string; file: FileAttachment; senderName: string; created_at: string }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {rows.map(({ key, file, senderName, created_at }) => {
        const meta = KIND_ICON[file.kind] ?? KIND_ICON.file;
        const isImage = file.kind === "image";
        return (
          <div key={key} className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-emerald-200 transition cursor-pointer shadow-sm">
            {/* Thumbnail / preview */}
            <div className="h-40 flex items-center justify-center" style={{ background: isImage && file.url ? `center / cover url(${file.url})` : meta.bg }}>
              {!(isImage && file.url) && (
                <meta.Icon className="w-16 h-16" style={{ color: meta.color }} strokeWidth={1.5} />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[11px] text-gray-500">{file.size || "—"}</span>
              </div>
              <div className="text-[14.5px] font-semibold text-gray-800 truncate">{file.name}</div>
              <div className="text-[11.5px] text-gray-500 mt-0.5">{senderName} · {formatDate(created_at)}</div>
              {file.url && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[12px] font-medium text-emerald-600 hover:text-emerald-700 py-1.5 rounded-md hover:bg-emerald-50">Abrir</a>
                  <a href={file.url} download={file.name} className="flex-1 text-center text-[12px] font-medium text-gray-600 hover:text-gray-800 py-1.5 rounded-md hover:bg-gray-50">Baixar</a>
                </div>
              )}
            </div>
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
