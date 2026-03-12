import { FileSignature, Send, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyFormData } from "./types";
import { toast } from "sonner";

interface ContractPreviewProps {
  formData: CompanyFormData;
  onGenerateContract: () => void;
}

export function ContractPreview({ formData, onGenerateContract }: ContractPreviewProps) {
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formatAddress = () => {
    const parts = [
      formData.endereco,
      formData.numero && `nº ${formData.numero}`,
      formData.complemento,
      formData.bairro,
      formData.cidade && formData.estado && `${formData.cidade}/${formData.estado}`,
      formData.cep && `CEP: ${formData.cep}`,
    ].filter(Boolean);
    return parts.join(", ") || "[ENDEREÇO NÃO INFORMADO]";
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://orbit.app/assinatura/contrato-001");
    toast.success("Link copiado para a área de transferência!");
  };

  const handleSendEmail = () => {
    if (!formData.email) {
      toast.error("E-mail da empresa não informado!");
      return;
    }
    toast.success(`Link de assinatura enviado para ${formData.email}`);
  };

  return (
    <div className="space-y-4">
      {/* Contract Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Matriz</Label>
          <Select defaultValue="savecar">
            <SelectTrigger>
              <SelectValue placeholder="Selecione a matriz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savecar">Save Car Brasil</SelectItem>
              <SelectItem value="outra">Outra Matriz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Foro</Label>
          <Input 
            placeholder="Cidade/UF" 
            defaultValue={formData.cidade && formData.estado ? `${formData.cidade}/${formData.estado}` : ""} 
          />
        </div>
      </div>

      {/* Contract Preview */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-[300px] overflow-y-auto">
        <div className="prose prose-sm max-w-none text-foreground">
          <h3 className="text-center font-bold text-lg mb-4">
            CONTRATO DE PARCERIA COMERCIAL – REVENDEDOR AUTORIZADO
          </h3>
          
          <p className="text-sm leading-relaxed">
            Pelo presente instrumento particular, de um lado <strong>SAVE CAR BRASIL TECNOLOGIA E SERVIÇOS LTDA</strong>, 
            pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº XX.XXX.XXX/XXXX-XX, com sede na Rua Exemplo, 
            nº 000, Bairro Centro, Cidade/UF, CEP: 00000-000, neste ato representada por seu representante legal, 
            doravante denominada simplesmente <strong>"MATRIZ"</strong>;
          </p>

          <p className="text-sm leading-relaxed mt-2">
            E de outro lado <strong>{formData.razaoSocial || "[RAZÃO SOCIAL]"}</strong>, 
            {formData.nomeFantasia && ` nome fantasia ${formData.nomeFantasia},`} pessoa jurídica de direito privado, 
            inscrita no CNPJ/MF sob o nº <strong>{formData.cnpj || "[CNPJ]"}</strong>, 
            com sede em <strong>{formatAddress()}</strong>, 
            neste ato representada por <strong>{formData.responsavel || "[RESPONSÁVEL]"}</strong>, 
            doravante denominada simplesmente <strong>"REVENDEDOR"</strong>;
          </p>

          <p className="text-sm leading-relaxed mt-2">
            As partes acima qualificadas celebram o presente Contrato de Parceria Comercial – Revendedor Autorizado, 
            que se regerá pelas seguintes cláusulas e condições:
          </p>

          <p className="text-sm text-muted-foreground mt-4">
            [... demais cláusulas do contrato ...]
          </p>

          <p className="text-sm leading-relaxed mt-4">
            E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual 
            teor e forma, na presença de duas testemunhas.
          </p>

          <p className="text-sm text-center mt-4">
            {formData.cidade || "[Cidade]"}, {currentDate}
          </p>
        </div>
      </div>

      {/* Signature Options */}
      <div className="grid gap-2">
        <Label>Tipo de Assinatura</Label>
        <Select defaultValue="govbr">
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="govbr">Gov.br (Assinatura Digital)</SelectItem>
            <SelectItem value="manual">Manual Autenticada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Button onClick={onGenerateContract} className="gap-2">
          <FileSignature className="h-4 w-4" />
          Gerar Contrato PDF
        </Button>
        <Button variant="outline" onClick={handleCopyLink} className="gap-2">
          <Copy className="h-4 w-4" />
          Copiar Link
        </Button>
        <Button variant="outline" onClick={handleSendEmail} className="gap-2">
          <Send className="h-4 w-4" />
          Enviar por E-mail
        </Button>
        <Button variant="ghost" className="gap-2">
          <Download className="h-4 w-4" />
          Baixar PDF
        </Button>
      </div>
    </div>
  );
}
