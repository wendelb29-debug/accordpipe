import { useState, useRef } from "react";
import {
  Upload, Search, FolderPlus, FileText, Folder, File as FileIcon2, Image, MoreVertical,
  Eye, Trash2, PenTool, Download, ChevronRight, Home, Loader2, Grid, List,
  FileSignature, Edit2, Send, ArrowLeft, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDriveFiles, type DriveFile } from "@/hooks/useDriveFiles";
import { usePdfContracts } from "@/hooks/usePdfContracts";
import { SignatureBuilderDialog } from "@/components/contratos/SignatureBuilderDialog";
import { PdfContractViewDialog } from "@/components/contratos/PdfContractViewDialog";
import type { PdfContractSigner, PdfContractHistory } from "@/hooks/usePdfContracts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
  normal: { label: "Normal", color: "bg-muted text-muted-foreground", emoji: "" },
  signing: { label: "Em assinatura", color: "bg-yellow-100 text-yellow-800 border-yellow-300", emoji: "🟡" },
  signed: { label: "Assinado", color: "bg-green-100 text-green-800 border-green-300", emoji: "🟢" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-300", emoji: "🔴" },
};

const FileIcon = ({ type, fileType }: { type: string; fileType?: string | null }) => {
  if (type === "folder") return <Folder className="h-10 w-10 text-primary" fill="currentColor" fillOpacity={0.15} />;
  if (fileType?.includes("pdf")) return <FileText className="h-10 w-10 text-destructive" />;
  if (fileType?.includes("image")) return <Image className="h-10 w-10 text-primary" />;
  return <File className="h-10 w-10 text-muted-foreground" />;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documentos() {
  const { profile } = useAuth();
  const [folderStack, setFolderStack] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Documentos" },
  ]);
  const currentFolderId = folderStack[folderStack.length - 1].id;
  const { files, loading, canManage, fetchFiles, createFolder, uploadFile, renameFile, deleteFile, startSigning } = useDriveFiles(currentFolderId);
  const { createContract, fetchSigners, fetchHistory } = usePdfContracts();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  // Dialogs
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DriveFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature flow
  const [signerDialogOpen, setSignerDialogOpen] = useState(false);
  const [signerFile, setSignerFile] = useState<DriveFile | null>(null);
  const [signers, setSigners] = useState([{ name: "", email: "", phone: "", cpf_cnpj: "", address: "" }]);
  const [creatingContract, setCreatingContract] = useState(false);

  // Builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderContractId, setBuilderContractId] = useState("");
  const [builderPdfUrl, setBuilderPdfUrl] = useState("");
  const [builderSigners, setBuilderSigners] = useState<PdfContractSigner[]>([]);

  // View contract
  const [viewContract, setViewContract] = useState<any>(null);
  const [viewSigners, setViewSigners] = useState<PdfContractSigner[]>([]);
  const [viewHistory, setViewHistory] = useState<PdfContractHistory[]>([]);

  const filtered = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const folders = filtered.filter(f => f.type === "folder");
  const docs = filtered.filter(f => f.type === "file");

  const navigateToFolder = (folder: DriveFile) => {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateBack = () => {
    if (folderStack.length > 1) setFolderStack(prev => prev.slice(0, -1));
  };

  const navigateTo = (index: number) => {
    setFolderStack(prev => prev.slice(0, index + 1));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      await uploadFile(fileList[i]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await renameFile(renameTarget.id, renameValue.trim());
    setRenameOpen(false);
    setRenameTarget(null);
  };

  const openRename = (file: DriveFile) => {
    setRenameTarget(file);
    setRenameValue(file.name);
    setRenameOpen(true);
  };

  // Start signing flow
  const openSigningFlow = (file: DriveFile) => {
    setSignerFile(file);
    setSigners([{ name: "", email: "", phone: "", cpf_cnpj: "", address: "" }]);
    setSignerDialogOpen(true);
  };

  const addSigner = () => setSigners(prev => [...prev, { name: "", email: "", phone: "", cpf_cnpj: "", address: "" }]);
  const removeSigner = (idx: number) => setSigners(prev => prev.filter((_, i) => i !== idx));
  const updateSigner = (idx: number, field: string, value: string) => {
    setSigners(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleCreateAndOpenBuilder = async () => {
    if (!signerFile || !signerFile.file_url) return;
    const validSigners = signers.filter(s => s.name.trim());
    if (validSigners.length === 0) {
      toast.error("Adicione pelo menos um contratante");
      return;
    }
    setCreatingContract(true);
    // Create contract via the existing hook
    const contractId = await createContract(
      signerFile.name.replace(/\.pdf$/i, ""),
      `Documento: ${signerFile.name}`,
      // We need to create from URL, not file - let's use the existing PDF
      // Actually createContract expects a File. Let's fetch the file and create from it.
      await fetchFileAsBlob(signerFile.file_url, signerFile.name),
      validSigners
    );

    if (contractId) {
      // Link file to contract
      await startSigning(signerFile.id, contractId);
      // Fetch signers and open builder
      const contractSigners = await fetchSigners(contractId);
      setBuilderContractId(contractId);
      setBuilderPdfUrl(signerFile.file_url);
      setBuilderSigners(contractSigners);
      setSignerDialogOpen(false);
      setBuilderOpen(true);
    }
    setCreatingContract(false);
  };

  const openContractView = async (file: DriveFile) => {
    if (!file.contract_id) return;
    const { data: contract } = await supabase
      .from("pdf_contracts")
      .select("*")
      .eq("id", file.contract_id)
      .single();
    if (!contract) return;
    const [s, h] = await Promise.all([
      fetchSigners(file.contract_id),
      fetchHistory(file.contract_id),
    ]);
    setViewContract(contract);
    setViewSigners(s);
    setViewHistory(h);
  };

  const handleDoubleClick = (file: DriveFile) => {
    if (file.type === "folder") {
      navigateToFolder(file);
    } else {
      setPreviewFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus arquivos e documentos</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)} className="gap-1.5">
                <FolderPlus className="h-4 w-4" /> Nova Pasta
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls" onChange={handleUpload} />
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
          {folderStack.map((folder, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <button
                onClick={() => navigateTo(i)}
                className={cn(
                  "hover:text-primary transition-colors truncate max-w-[120px]",
                  i === folderStack.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {i === 0 ? <Home className="h-4 w-4 inline" /> : folder.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9 w-48" />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Back button */}
      {folderStack.length > 1 && (
        <Button variant="ghost" size="sm" onClick={navigateBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderPlus className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum arquivo encontrado</p>
          <p className="text-sm">Faça upload ou crie uma pasta para começar</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(file => (
            <DriveCard key={file.id} file={file} canManage={canManage}
              onDoubleClick={() => handleDoubleClick(file)}
              onRename={() => openRename(file)}
              onDelete={() => deleteFile(file.id, file.file_path)}
              onPreview={() => setPreviewFile(file)}
              onSign={() => openSigningFlow(file)}
              onViewContract={() => openContractView(file)}
              onOpenBuilder={async () => {
                if (!file.contract_id) return;
                const s = await fetchSigners(file.contract_id);
                setBuilderContractId(file.contract_id);
                setBuilderPdfUrl(file.file_url || "");
                setBuilderSigners(s);
                setBuilderOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {filtered.map(file => (
            <DriveRow key={file.id} file={file} canManage={canManage}
              onDoubleClick={() => handleDoubleClick(file)}
              onRename={() => openRename(file)}
              onDelete={() => deleteFile(file.id, file.file_path)}
              onPreview={() => setPreviewFile(file)}
              onSign={() => openSigningFlow(file)}
              onViewContract={() => openContractView(file)}
              onOpenBuilder={async () => {
                if (!file.contract_id) return;
                const s = await fetchSigners(file.contract_id);
                setBuilderContractId(file.contract_id);
                setBuilderPdfUrl(file.file_url || "");
                setBuilderSigners(s);
                setBuilderOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nome da pasta</Label>
            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Ex: Contratos 2025"
              onKeyDown={e => e.key === "Enter" && handleCreateFolder()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renomear</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={handleRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={open => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          {previewFile?.file_url && (
            previewFile.file_type?.includes("image") ? (
              <img src={previewFile.file_url} alt={previewFile.name} className="max-h-[70vh] object-contain mx-auto" />
            ) : (
              <iframe src={previewFile.file_url} className="w-full h-[70vh]" title={previewFile.name} />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Signer Dialog for signing flow */}
      <Dialog open={signerDialogOpen} onOpenChange={setSignerDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Solicitar Assinatura
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Documento: <strong>{signerFile?.name}</strong>
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Contratantes</Label>
              <Button variant="outline" size="sm" onClick={addSigner}>+ Adicionar</Button>
            </div>
            {signers.map((s, idx) => (
              <Card key={idx}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Contratante {idx + 1}</span>
                    {signers.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 text-destructive text-xs" onClick={() => removeSigner(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Nome *" value={s.name} onChange={e => updateSigner(idx, "name", e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="CPF/CNPJ" value={s.cpf_cnpj} onChange={e => updateSigner(idx, "cpf_cnpj", e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="Email" value={s.email} onChange={e => updateSigner(idx, "email", e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="Telefone" value={s.phone} onChange={e => updateSigner(idx, "phone", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <Input placeholder="Endereço" value={s.address} onChange={e => updateSigner(idx, "address", e.target.value)} className="h-8 text-xs" />
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignerDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAndOpenBuilder} disabled={creatingContract}>
              {creatingContract ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PenTool className="h-4 w-4 mr-1" />}
              Definir Campos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Builder */}
      {builderContractId && (
        <SignatureBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          contractId={builderContractId}
          pdfUrl={builderPdfUrl}
          signers={builderSigners}
          onComplete={() => {
            fetchFiles();
            setBuilderContractId("");
          }}
        />
      )}

      {/* Contract View */}
      <PdfContractViewDialog
        contract={viewContract}
        signers={viewSigners}
        history={viewHistory}
        onClose={() => setViewContract(null)}
        canManage={canManage}
        onCancel={async (id) => {
          const { error } = await supabase.from("pdf_contracts").update({ status: "cancelado" } as any).eq("id", id);
          if (!error) {
            toast.success("Contrato cancelado");
            setViewContract(null);
            fetchFiles();
          }
        }}
      />
    </div>
  );
}

// Helper to fetch file as blob
async function fetchFileAsBlob(url: string, name: string): Promise<File> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new File([blob], name, { type: blob.type || "application/pdf" });
}

// Grid card component
function DriveCard({ file, canManage, onDoubleClick, onRename, onDelete, onPreview, onSign, onViewContract, onOpenBuilder }: {
  file: DriveFile; canManage: boolean;
  onDoubleClick: () => void; onRename: () => void; onDelete: () => void;
  onPreview: () => void; onSign: () => void; onViewContract: () => void; onOpenBuilder: () => void;
}) {
  const status = statusConfig[file.status] || statusConfig.normal;
  const isPdf = file.file_type?.includes("pdf");

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-all" onDoubleClick={onDoubleClick}>
      <CardContent className="p-3 flex flex-col items-center text-center space-y-2">
        <div className="relative w-full flex justify-center pt-2">
          <FileIcon type={file.type} fileType={file.file_type} />
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {file.type === "file" && (
                  <DropdownMenuItem onClick={onPreview}><Eye className="h-4 w-4 mr-2" />Visualizar</DropdownMenuItem>
                )}
                {file.type === "file" && file.file_url && (
                  <DropdownMenuItem onClick={() => window.open(file.file_url!, "_blank")}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onRename}><Edit2 className="h-4 w-4 mr-2" />Renomear</DropdownMenuItem>
                <DropdownMenuSeparator />
                {isPdf && file.status === "normal" && (
                  <DropdownMenuItem onClick={onSign}><FileSignature className="h-4 w-4 mr-2" />Solicitar Assinatura</DropdownMenuItem>
                )}
                {file.status === "signing" && file.contract_id && (
                  <>
                    <DropdownMenuItem onClick={onOpenBuilder}><PenTool className="h-4 w-4 mr-2" />Editor de Campos</DropdownMenuItem>
                    <DropdownMenuItem onClick={onViewContract}><Eye className="h-4 w-4 mr-2" />Ver Contrato</DropdownMenuItem>
                  </>
                )}
                {(file.status === "signed" || file.status === "cancelled") && file.contract_id && (
                  <DropdownMenuItem onClick={onViewContract}><Eye className="h-4 w-4 mr-2" />Ver Contrato</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-xs font-medium text-foreground truncate w-full">{file.name}</p>
        {file.status !== "normal" && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.color)}>
            {status.emoji} {status.label}
          </Badge>
        )}
        {file.type === "file" && file.file_size && (
          <span className="text-[10px] text-muted-foreground">{formatSize(file.file_size)}</span>
        )}
      </CardContent>
    </Card>
  );
}

// List row component
function DriveRow({ file, canManage, onDoubleClick, onRename, onDelete, onPreview, onSign, onViewContract, onOpenBuilder }: {
  file: DriveFile; canManage: boolean;
  onDoubleClick: () => void; onRename: () => void; onDelete: () => void;
  onPreview: () => void; onSign: () => void; onViewContract: () => void; onOpenBuilder: () => void;
}) {
  const status = statusConfig[file.status] || statusConfig.normal;
  const isPdf = file.file_type?.includes("pdf");

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors" onDoubleClick={onDoubleClick}>
      <FileIcon type={file.type} fileType={file.file_type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {file.created_by_name || "—"} · {new Date(file.created_at).toLocaleDateString("pt-BR")}
          {file.file_size ? ` · ${formatSize(file.file_size)}` : ""}
        </p>
      </div>
      {file.status !== "normal" && (
        <Badge variant="outline" className={cn("text-xs shrink-0", status.color)}>
          {status.emoji} {status.label}
        </Badge>
      )}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {file.type === "file" && <DropdownMenuItem onClick={onPreview}><Eye className="h-4 w-4 mr-2" />Visualizar</DropdownMenuItem>}
            {file.type === "file" && file.file_url && <DropdownMenuItem onClick={() => window.open(file.file_url!, "_blank")}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>}
            <DropdownMenuItem onClick={onRename}><Edit2 className="h-4 w-4 mr-2" />Renomear</DropdownMenuItem>
            <DropdownMenuSeparator />
            {isPdf && file.status === "normal" && <DropdownMenuItem onClick={onSign}><FileSignature className="h-4 w-4 mr-2" />Solicitar Assinatura</DropdownMenuItem>}
            {file.status === "signing" && file.contract_id && (
              <>
                <DropdownMenuItem onClick={onOpenBuilder}><PenTool className="h-4 w-4 mr-2" />Editor de Campos</DropdownMenuItem>
                <DropdownMenuItem onClick={onViewContract}><Eye className="h-4 w-4 mr-2" />Ver Contrato</DropdownMenuItem>
              </>
            )}
            {(file.status === "signed" || file.status === "cancelled") && file.contract_id && (
              <DropdownMenuItem onClick={onViewContract}><Eye className="h-4 w-4 mr-2" />Ver Contrato</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
