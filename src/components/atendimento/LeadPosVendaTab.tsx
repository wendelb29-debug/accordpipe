import { useState, useEffect } from "react";
import {
  DollarSign, Phone, Mail, FileText, Upload, ExternalLink,
  Save, Loader2, Eye, Link2, StickyNote, Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CrmLead } from "@/hooks/useCrmLeads";

interface LeadPosVendaTabProps {
  lead: CrmLead;
}

interface PostSaleData {
  id?: string;
  pessoa_financeira: string;
  telefone_financeiro: string;
  email_financeiro: string;
  comprovante_url: string;
  comprovante_path: string;
  link_proposta_assinada: string;
  observacoes_venda: string;
}

const emptyData: PostSaleData = {
  pessoa_financeira: "",
  telefone_financeiro: "",
  email_financeiro: "",
  comprovante_url: "",
  comprovante_path: "",
  link_proposta_assinada: "",
  observacoes_venda: "",
};

const isValidUrl = (str: string) => {
  if (!str) return true;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const formatPhone = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function LeadPosVendaTab({ lead }: LeadPosVendaTabProps) {
  const { profile } = useAuth();
  const [data, setData] = useState<PostSaleData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: row } = await (supabase as any)
        .from("lead_post_sale")
        .select("*")
        .eq("lead_id", lead.id)
        .maybeSingle();
      if (row) {
        setData({
          id: row.id,
          pessoa_financeira: row.pessoa_financeira || "",
          telefone_financeiro: row.telefone_financeiro || "",
          email_financeiro: row.email_financeiro || "",
          comprovante_url: row.comprovante_url || "",
          comprovante_path: row.comprovante_path || "",
          link_proposta_assinada: row.link_proposta_assinada || "",
          observacoes_venda: row.observacoes_venda || "",
        });
      } else {
        // Pre-fill from lead
        setData({
          ...emptyData,
          pessoa_financeira: lead.contact_name || lead.company_name || "",
          email_financeiro: lead.email || "",
          telefone_financeiro: lead.phone || "",
        });
      }
      setLoading(false);
    })();
  }, [lead.id]);

  const handleSave = async () => {
    if (data.email_financeiro && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_financeiro)) {
      toast.error("E-mail financeiro inválido");
      return;
    }
    if (data.link_proposta_assinada && !isValidUrl(data.link_proposta_assinada)) {
      toast.error("Link da proposta assinada inválido");
      return;
    }

    setSaving(true);
    const payload = {
      lead_id: lead.id,
      servidor_id: lead.servidor_id,
      pessoa_financeira: data.pessoa_financeira || null,
      telefone_financeiro: data.telefone_financeiro || null,
      email_financeiro: data.email_financeiro || null,
      comprovante_url: data.comprovante_url || null,
      comprovante_path: data.comprovante_path || null,
      link_proposta_assinada: data.link_proposta_assinada || null,
      observacoes_venda: data.observacoes_venda || null,
      updated_by_name: profile?.name || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (data.id) {
      ({ error } = await (supabase as any)
        .from("lead_post_sale")
        .update(payload)
        .eq("id", data.id));
    } else {
      const res = await (supabase as any)
        .from("lead_post_sale")
        .insert(payload)
        .select("id")
        .single();
      error = res.error;
      if (res.data) setData((d) => ({ ...d, id: res.data.id }));
    }

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados pós-venda salvos!");
    }
    setSaving(false);
  };

  const handleUploadComprovante = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `lead-pos-venda/${lead.id}/comprovante_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("contract-pdfs")
      .upload(filePath, file, { contentType: file.type });
    if (uploadErr) {
      toast.error("Erro no upload: " + uploadErr.message);
      setUploading(false);
      return;
    }
    const { data: signedData } = await supabase.storage.from("contract-pdfs").createSignedUrl(filePath, 86400);
    setData((d) => ({
      ...d,
      comprovante_url: signedData?.signedUrl || "",
      comprovante_path: filePath,
    }));
    toast.success("Comprovante enviado!");
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Seção Financeiro */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Dados Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Pessoa Financeira *</Label>
            <Input
              value={data.pessoa_financeira}
              onChange={(e) => setData((d) => ({ ...d, pessoa_financeira: e.target.value }))}
              placeholder="Nome do responsável financeiro"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Telefone Financeiro *</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex items-center gap-1 px-3 bg-muted rounded-md text-xs text-muted-foreground shrink-0">
                +55
              </div>
              <Input
                value={data.telefone_financeiro}
                onChange={(e) => setData((d) => ({ ...d, telefone_financeiro: formatPhone(e.target.value) }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">E-mail Notas e Boletos *</Label>
            <Input
              type="email"
              value={data.email_financeiro}
              onChange={(e) => setData((d) => ({ ...d, email_financeiro: e.target.value }))}
              placeholder="email@exemplo.com"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção Contrato e Pagamento */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Contrato e Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Comprovante Pagamento 1ª Mensalidade</Label>
            <div className="flex items-center gap-2 mt-1">
              {data.comprovante_url ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" asChild>
                    <a href={data.comprovante_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3 w-3" /> Visualizar
                    </a>
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">Arquivo enviado</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Nenhum comprovante</span>
              )}
              <label>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadComprovante(f);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" variant="outline" className="gap-1 text-xs" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Upload
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Link da Proposta Assinada *</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={data.link_proposta_assinada}
                onChange={(e) => setData((d) => ({ ...d, link_proposta_assinada: e.target.value }))}
                placeholder="https://..."
                className="flex-1"
              />
              {data.link_proposta_assinada && isValidUrl(data.link_proposta_assinada) && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1 text-xs"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-3 w-3" /> Visualizar Contrato
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                    <a href={data.link_proposta_assinada} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Preview iframe */}
          {showPreview && data.link_proposta_assinada && isValidUrl(data.link_proposta_assinada) && (
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                <span className="text-xs font-medium flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Preview do Contrato
                </span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowPreview(false)}>
                  Fechar
                </Button>
              </div>
              <iframe
                src={data.link_proposta_assinada}
                className="w-full h-[400px] border-0"
                sandbox="allow-same-origin allow-scripts allow-popups"
                title="Preview Contrato"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção Observações */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" /> Observações da Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.observacoes_venda}
            onChange={(e) => setData((d) => ({ ...d, observacoes_venda: e.target.value }))}
            placeholder="Observações sobre a venda, condições especiais, etc."
            rows={5}
          />
        </CardContent>
      </Card>

      {/* Botão salvar fixo */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
