import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Eye, FileDown } from "lucide-react";
import { ContractRichEditor } from "./ContractRichEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { renderGeneratedDocumentPdf } from "@/lib/renderGeneratedDocumentPdf";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface BrandingConfig {
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  tenantName?: string;
  tenantCnpj?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  initialContent: string;
  onSave: (name: string, htmlContent: string) => Promise<void>;
  mode: "create" | "edit";
  branding?: BrandingConfig;
}

const SAMPLE_DATA: Record<string, string> = {
  "{{tenant_nome}}": "Empresa Modelo LTDA",
  "{{tenant_cnpj}}": "12.345.678/0001-90",
  "{{tenant_razao_social}}": "Empresa Modelo LTDA",
  "{{tenant_email}}": "contato@empresa.com",
  "{{tenant_telefone}}": "(11) 99999-0000",
  "{{tenant_endereco}}": "Rua Principal, 100",
  "{{tenant_cidade}}": "São Paulo",
  "{{tenant_estado}}": "SP",
  "{{nome_completo}}": "João da Silva Santos",
  "{{cpf}}": "123.456.789-00",
  "{{cnpj}}": "98.765.432/0001-10",
  "{{razao_social}}": "Cliente Exemplo LTDA",
  "{{documento_contratante}}": "123.456.789-00",
  "{{email}}": "joao@email.com",
  "{{telefone}}": "(21) 98888-7777",
  "{{whatsapp}}": "(21) 98888-7777",
  "{{data_nascimento}}": "15/03/1990",
  "{{endereco}}": "Av. Brasil, 500",
  "{{numero}}": "500",
  "{{bairro}}": "Centro",
  "{{cidade}}": "Rio de Janeiro",
  "{{estado}}": "RJ",
  "{{cep}}": "20000-000",
  "{{nome_empresa}}": "Cliente Exemplo LTDA",
  "{{data_atual}}": new Date().toLocaleDateString("pt-BR"),
  "{{nome_item}}": "Plano Premium",
  "{{descricao_item}}": "Plano completo com suporte prioritário",
  "{{valor_proposta}}": "R$ 1.500,00",
  "{{valor_total}}": "R$ 1.500,00",
  "{{servicos_contratados}}": "Serviço: Plano Premium\nDescrição: Plano completo\nValor Total: R$ 1.500,00",
  "{{nome_vendedor}}": "Maria Vendedora",
  "{{email_vendedor}}": "maria@empresa.com",
  "{{telefone_vendedor}}": "(11) 97777-6666",
  "{{data_nascimento_vendedor}}": "20/06/1985",
  "{{data_assinatura_cliente}}": "[Pendente]",
  "{{hora_assinatura_cliente}}": "[Pendente]",
  "{{geolocalizacao_cliente}}": "[Pendente]",
  "{{selfie_cliente}}": "[Pendente]",
  "{{data_assinatura_vendedor}}": "[Pendente]",
  "{{hora_assinatura_vendedor}}": "[Pendente]",
  "{{geolocalizacao_vendedor}}": "[Pendente]",
  "{{selfie_vendedor}}": "[Pendente]",
};

function applyBrandingSamples(branding?: BrandingConfig): Record<string, string> {
  const data = { ...SAMPLE_DATA };
  if (branding?.tenantName) {
    data["{{tenant_nome}}"] = branding.tenantName;
    data["{{tenant_razao_social}}"] = branding.tenantName;
  }
  if (branding?.tenantCnpj) {
    data["{{tenant_cnpj}}"] = branding.tenantCnpj;
  }
  return data;
}

export function ContractEditorDialog({ open, onOpenChange, templateName, initialContent, onSave, mode, branding }: Props) {
  const [name, setName] = useState(templateName);
  const [htmlContent, setHtmlContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (open) {
      setName(templateName);
      setHtmlContent(initialContent);
      setPreviewMode(false);
    }
  }, [open, templateName, initialContent]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Defina um nome para o modelo");
    if (!htmlContent.trim() || htmlContent === "<p></p>") return toast.error("O conteúdo do modelo não pode estar vazio");
    setSaving(true);
    try {
      await onSave(name.trim(), htmlContent);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const replaceVars = (html: string) => {
    let result = html;
    const data = applyBrandingSamples(branding);
    Object.entries(data).forEach(([key, val]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
    });
    return result;
  };

  const getPreviewHtml = () => {
    const rendered = replaceVars(htmlContent);
    // Wrap with branding header if logo available
    let headerHtml = "";
    if (branding?.logoUrl) {
      headerHtml = `<div style="text-align:center;margin-bottom:16px;"><img src="${branding.logoUrl}" alt="Logo" style="max-height:60px;max-width:200px;" /></div>`;
    }
    return headerHtml + rendered;
  };

  const handleGenerateTestPdf = async () => {
    setGeneratingPdf(true);
    try {
      const rendered = replaceVars(htmlContent);
      const pdfBytes = await renderGeneratedDocumentPdf(
        name || "Contrato de Teste",
        rendered,
        {
          logoUrl: branding?.logoUrl || undefined,
          primaryColor: branding?.primaryColor || undefined,
          tenantName: branding?.tenantName || undefined,
          tenantCnpj: branding?.tenantCnpj || undefined,
        },
      );
      const arrayBuf = (pdfBytes as Uint8Array).buffer.slice(
        (pdfBytes as Uint8Array).byteOffset,
        (pdfBytes as Uint8Array).byteOffset + (pdfBytes as Uint8Array).byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("PDF de teste gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + (err.message || ""));
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{mode === "create" ? "Criar Modelo de Contrato" : "Editar Modelo de Contrato"}</DialogTitle>
          <DialogDescription>
            Use o editor para criar o layout do contrato com formatação rica, blocos prontos e variáveis dinâmicas.
            {branding?.logoUrl && " A logo do tenant será incluída automaticamente no PDF final."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Nome do Modelo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contrato de Adesão" className="mt-1" />
            </div>
            {branding?.logoUrl && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5 border">
                <img src={branding.logoUrl} alt="Logo" className="h-6 max-w-[80px] object-contain" />
                <span className="text-[10px] text-muted-foreground">Logo incluída no PDF</span>
              </div>
            )}
            <Button
              variant={previewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? "Editor" : "Preview"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTestPdf}
              disabled={generatingPdf || !htmlContent.trim()}
              className="gap-1.5"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF Teste
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6">
          {previewMode ? (
            <ScrollArea className="h-[500px] border rounded-lg bg-background">
              <div className="max-w-[700px] mx-auto py-8 px-10">
                {/* Branded header preview */}
                {branding?.logoUrl && (
                  <div className="text-center mb-4 pb-3" style={{ borderBottom: `2px solid ${branding.primaryColor || '#1E2952'}` }}>
                    <img src={branding.logoUrl} alt="Logo" className="h-12 mx-auto mb-2" />
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-table:border-collapse prose-td:border prose-td:p-2 prose-th:border prose-th:p-2 prose-th:bg-muted/50"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(replaceVars(htmlContent)) }}
                />
                {/* Branded footer preview */}
                <div className="mt-8 pt-3 text-center" style={{ borderTop: `1px solid ${branding?.primaryColor || '#ccc'}` }}>
                  <p className="text-[10px] text-muted-foreground">
                    {branding?.tenantName || "Empresa"} — Documento gerado em {new Date().toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <ContractRichEditor
              content={htmlContent}
              onChange={setHtmlContent}
              className="h-[500px]"
            />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar Modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
