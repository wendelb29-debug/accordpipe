import { useState, useEffect } from "react";
import { Building2, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyFormFields } from "./CompanyFormFields";
import { ContractPreview } from "./ContractPreview";
import { CompanyFormData, initialFormData } from "./types";
import { toast } from "sonner";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CompanyFormData) => void;
  editData?: CompanyFormData | null;
  isEditing?: boolean;
}

export function CompanyFormDialog({ open, onOpenChange, onSave, editData, isEditing }: CompanyFormDialogProps) {
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("cadastro");

  useEffect(() => {
    if (open && isEditing && editData) {
      setFormData(editData);
    } else if (open && !isEditing) {
      setFormData(initialFormData);
    }
  }, [open, isEditing, editData]);

  const handleCnpjSearch = () => {
    if (!formData.cnpj) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }
    // Simulating CNPJ lookup - would integrate with Receita Federal API
    toast.info("Buscando dados do CNPJ...");
    setTimeout(() => {
      setFormData({
        ...formData,
        razaoSocial: "Empresa Exemplo Ltda",
        nomeFantasia: "Empresa Exemplo",
        endereco: "Rua das Flores",
        numero: "123",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01234-567",
      });
      toast.success("Dados do CNPJ carregados com sucesso!");
    }, 1000);
  };

  const handleSave = () => {
    if (!formData.cnpj || !formData.razaoSocial) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    onSave(formData);
    setFormData(initialFormData);
    setActiveTab("cadastro");
  };

  const handleGenerateContract = () => {
    if (!formData.cnpj || !formData.razaoSocial) {
      toast.error("Preencha os dados da empresa antes de gerar o contrato");
      setActiveTab("cadastro");
      return;
    }
    toast.success("Contrato gerado com sucesso! Link de assinatura criado.");
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setActiveTab("cadastro");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Empresa" : "Cadastrar Nova Empresa"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edite os dados cadastrais da empresa" : "Insira o CNPJ para buscar os dados automaticamente ou preencha manualmente"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cadastro" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger value="contrato" className="gap-2">
              <FileSignature className="h-4 w-4" />
              Emitir Contrato
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="cadastro" className="mt-0">
              <CompanyFormFields
                formData={formData}
                onChange={setFormData}
                onCnpjSearch={handleCnpjSearch}
              />
            </TabsContent>

            <TabsContent value="contrato" className="mt-0">
              <ContractPreview
                formData={formData}
                onGenerateContract={handleGenerateContract}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Empresa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
