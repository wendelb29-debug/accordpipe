import { useState, useEffect } from "react";
import { Paperclip, Upload, Trash2, Eye, Download, Loader2, FileText, CreditCard, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CrmLead } from "@/hooks/useCrmLeads";

interface LeadDocsTabProps {
  lead: CrmLead;
}

interface LeadDoc {
  id: string;
  lead_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_path: string;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { key: "cnh", label: "CNH", icon: CreditCard, description: "Carteira Nacional de Habilitação" },
  { key: "cnpj", label: "CNPJ", icon: Building2, description: "Cartão CNPJ ou Contrato Social" },
  { key: "comprovante_endereco", label: "Comprovante de Endereço", icon: MapPin, description: "Conta de luz, água ou telefone" },
  { key: "rg", label: "RG", icon: FileText, description: "Registro Geral" },
  { key: "outro", label: "Outro", icon: Paperclip, description: "Outros documentos" },
];

export function LeadDocsTab({ lead }: LeadDocsTabProps) {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lead_documents")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setDocs((data as LeadDoc[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, [lead.id]);

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `lead-docs/${lead.id}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(filePath, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);

      const { error: insertErr } = await (supabase as any).from("lead_documents").insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        doc_type: docType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_path: filePath,
        file_size: file.size,
        uploaded_by_name: profile?.name || null,
        uploaded_by_user_id: profile?.user_id || null,
      } as any);
      if (insertErr) throw insertErr;

      toast.success("Documento enviado!");
      await fetchDocs();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    }
    setUploading(null);
  };

  const handleDelete = async (doc: LeadDoc) => {
    await supabase.storage.from("contract-pdfs").remove([doc.file_path]);
    await (supabase as any).from("lead_documents").delete().eq("id", doc.id);
    toast.success("Documento removido!");
    await fetchDocs();
  };

  const getDocsForType = (type: string) => docs.filter((d) => d.doc_type === type);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Paperclip className="h-4 w-4" /> Documentos do Lead
      </h3>

      <div className="grid gap-3">
        {DOC_TYPES.map((dt) => {
          const typeDocs = getDocsForType(dt.key);
          const Icon = dt.icon;
          return (
            <Card key={dt.key} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{dt.label}</p>
                      <p className="text-xs text-muted-foreground">{dt.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {typeDocs.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {typeDocs.length} arquivo{typeDocs.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(dt.key, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        asChild
                        disabled={uploading === dt.key}
                      >
                        <span>
                          {uploading === dt.key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          Upload
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {typeDocs.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {typeDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.file_name}</p>
                          <p className="text-muted-foreground">
                            {doc.uploaded_by_name || "—"} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={doc.file_url} download={doc.file_name}>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
