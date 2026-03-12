import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyFormData } from "./types";

interface CompanyFormFieldsProps {
  formData: CompanyFormData;
  onChange: (data: CompanyFormData) => void;
  onCnpjSearch: () => void;
}

export function CompanyFormFields({ formData, onChange, onCnpjSearch }: CompanyFormFieldsProps) {
  const handleChange = (field: keyof CompanyFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <div className="flex gap-2">
          <Input
            id="cnpj"
            placeholder="00.000.000/0000-00"
            className="flex-1"
            value={formData.cnpj}
            onChange={(e) => handleChange("cnpj", e.target.value)}
          />
          <Button variant="secondary" onClick={onCnpjSearch}>
            Buscar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="razaoSocial">Razão Social</Label>
          <Input
            id="razaoSocial"
            placeholder="Razão Social"
            value={formData.razaoSocial}
            onChange={(e) => handleChange("razaoSocial", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
          <Input
            id="nomeFantasia"
            placeholder="Nome Fantasia"
            value={formData.nomeFantasia}
            onChange={(e) => handleChange("nomeFantasia", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="responsavel">Responsável</Label>
          <Input
            id="responsavel"
            placeholder="Nome do responsável"
            value={formData.responsavel}
            onChange={(e) => handleChange("responsavel", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@empresa.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            placeholder="(00) 00000-0000"
            value={formData.telefone}
            onChange={(e) => handleChange("telefone", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            placeholder="00000-000"
            value={formData.cep}
            onChange={(e) => handleChange("cep", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="grid gap-2 col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            placeholder="Rua, Avenida..."
            value={formData.endereco}
            onChange={(e) => handleChange("endereco", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            placeholder="Nº"
            value={formData.numero}
            onChange={(e) => handleChange("numero", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            placeholder="Sala, Andar..."
            value={formData.complemento}
            onChange={(e) => handleChange("complemento", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            placeholder="Bairro"
            value={formData.bairro}
            onChange={(e) => handleChange("bairro", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            placeholder="Cidade"
            value={formData.cidade}
            onChange={(e) => handleChange("cidade", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estado">Estado</Label>
          <Input
            id="estado"
            placeholder="UF"
            value={formData.estado}
            onChange={(e) => handleChange("estado", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
