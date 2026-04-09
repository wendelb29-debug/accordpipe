import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Eye } from "lucide-react";
import { ContractRichEditor } from "./ContractRichEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  initialContent: string;
  onSave: (name: string, htmlContent: string) => Promise<void>;
  mode: "create" | "edit";
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

export function ContractEditorDialog({ open, onOpenChange, templateName, initialContent, onSave, mode }: Props) {
  const [name, setName] = useState(templateName);
  const [htmlContent, setHtmlContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

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

  const getPreviewHtml = () => {
    let preview = htmlContent;
    Object.entries(SAMPLE_DATA).forEach(([key, val]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), val);
    });
    return preview;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{mode === "create" ? "Criar Modelo de Contrato" : "Editar Modelo de Contrato"}</DialogTitle>
          <DialogDescription>
            Use o editor para criar o layout do contrato e insira variáveis dinâmicas pelo painel lateral.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label className="text-xs">Nome do Modelo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contrato de Adesão" className="mt-1" />
            </div>
            <Button
              variant={previewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? "Voltar ao Editor" : "Preview"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6">
          {previewMode ? (
            <ScrollArea className="h-[500px] border rounded-lg">
              <div
                className="prose prose-sm max-w-none px-8 py-6 prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-table:border-collapse prose-td:border prose-td:border-border prose-td:p-2 prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
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
