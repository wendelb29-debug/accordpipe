import { useState, useRef } from "react";
import { Upload, Search, FileText, File, Image, Download, Trash2, Eye, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useDocuments } from "@/hooks/useDocuments";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";

const categoryLabels: Record<string, string> = {
  comprovante: "Comprovante",
  cnpj: "CNPJ",
  contrato: "Contrato",
  endereco: "Endereço",
  outro: "Outro",
};

const FileIcon = ({ type }: { type: string | null }) => {
  if (type?.includes("pdf")) return <FileText className="h-5 w-5 text-destructive" />;
  if (type?.includes("image")) return <Image className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("outro");
  const [uploadCompanyId, setUploadCompanyId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, loading, uploadDocument, deleteDocument } = useDocuments();
  const { companies } = useCompanies();
  const { profile } = useAuth();

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === "all" || doc.company_id === selectedCompany;
    return matchesSearch && matchesCompany;
  });

  const comprovantes = filteredDocuments.filter((d) => d.category === "comprovante");
  const empresaDocs = filteredDocuments.filter((d) => d.category !== "comprovante");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadDocument(file, uploadCategory, uploadCompanyId || null);
    setUploading(false);
    setUploadOpen(false);
    setUploadCategory("outro");
    setUploadCompanyId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderDocList = (docs: typeof filteredDocuments, emptyIcon: any, emptyText: string) => (
    <div className="space-y-3">
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          {emptyIcon}
          <p>{emptyText}</p>
        </div>
      ) : (
        docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FileIcon type={doc.file_type} />
              </div>
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.company_name} • {formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {doc.category !== "comprovante" && (
                <Badge variant="secondary">{categoryLabels[doc.category] || doc.category}</Badge>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(doc.file_url)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                {profile?.is_master && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocument(doc.id, doc.file_path)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground">Gerenciamento de arquivos e comprovantes</p>
        </div>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
            <DialogDescription>Selecione o arquivo, categoria e empresa</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-2">
              <Label>Arquivo</Label>
              <Input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required />
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprovante">Comprovante de Pagamento</SelectItem>
                  <SelectItem value="cnpj">Cartão CNPJ</SelectItem>
                  <SelectItem value="contrato">Contrato Social</SelectItem>
                  <SelectItem value="endereco">Comprovante de Endereço</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Empresa</Label>
              <Select value={uploadCompanyId} onValueChange={setUploadCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Documento</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={previewUrl} alt="Documento" className="max-h-[70vh] object-contain mx-auto" />
            ) : (
              <iframe src={previewUrl} className="w-full h-[70vh]" title="Documento" />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-[250px]">
            <FolderOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="comprovantes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="comprovantes" className="gap-2">
              <FileText className="h-4 w-4" />
              Comprovantes ({comprovantes.length})
            </TabsTrigger>
            <TabsTrigger value="empresa" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Documentos da Empresa ({empresaDocs.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="comprovantes">
            <Card>
              <CardHeader>
                <CardTitle>Comprovantes de Pagamento</CardTitle>
                <CardDescription>Comprovantes vinculados aos boletos pagos</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocList(comprovantes, <FileText className="h-12 w-12 mb-4 opacity-50" />, "Nenhum comprovante encontrado")}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="empresa">
            <Card>
              <CardHeader>
                <CardTitle>Documentos da Empresa</CardTitle>
                <CardDescription>Cartão CNPJ, Contrato Social, Comprovante de Endereço e outros</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocList(empresaDocs, <FolderOpen className="h-12 w-12 mb-4 opacity-50" />, "Nenhum documento encontrado")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
