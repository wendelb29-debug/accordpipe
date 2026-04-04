import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyFormData } from "./types";
import { toast } from "sonner";

interface CompanyFormFieldsProps {
  formData: CompanyFormData;
  onChange: (data: CompanyFormData) => void;
  onCnpjSearch: () => void;
}

const cleanDigits = (v: string) => v.replace(/\D/g, "");

const formatCnpj = (v: string) => {
  const d = cleanDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const formatCep = (v: string) => {
  const d = cleanDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatPhone = (v: string) => {
  const d = cleanDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export function CompanyFormFields({ formData, onChange, onCnpjSearch }: CompanyFormFieldsProps) {
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const handleChange = (field: keyof CompanyFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  const handleCnpjSearch = async () => {
    const digits = cleanDigits(formData.cnpj);
    if (digits.length !== 14) {
      toast.error("Digite um CNPJ válido com 14 dígitos");
      return;
    }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      onChange({
        ...formData,
        razaoSocial: data.razao_social || "",
        nomeFantasia: data.nome_fantasia || data.razao_social || "",
        email: data.email || formData.email,
        telefone: data.ddd_telefone_1
          ? formatPhone(`${data.ddd_telefone_1}`)
          : formData.telefone,
        cep: data.cep ? formatCep(data.cep) : formData.cep,
        endereco: data.logradouro || formData.endereco,
        numero: data.numero || formData.numero,
        complemento: data.complemento || formData.complemento,
        bairro: data.bairro || formData.bairro,
        cidade: data.municipio || formData.cidade,
        estado: data.uf || formData.estado,
      });
      toast.success("Dados do CNPJ carregados com sucesso!");
    } catch {
      toast.error("Não foi possível buscar o CNPJ. Verifique e tente novamente.");
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleCepSearch = async (cep: string) => {
    const digits = cleanDigits(cep);
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error();
      onChange({
        ...formData,
        cep: formatCep(digits),
        endereco: data.logradouro || formData.endereco,
        bairro: data.bairro || formData.bairro,
        cidade: data.localidade || formData.cidade,
        estado: data.uf || formData.estado,
        complemento: data.complemento || formData.complemento,
      });
      toast.success("Endereço carregado pelo CEP!");
    } catch {
      toast.error("CEP não encontrado.");
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      {/* CNPJ with search */}
      <div className="grid gap-2">
        <Label htmlFor="cnpj">CNPJ *</Label>
        <div className="flex gap-2">
          <Input
            id="cnpj"
            placeholder="00.000.000/0000-00"
            className="flex-1"
            value={formData.cnpj}
            onChange={(e) => handleChange("cnpj", formatCnpj(e.target.value))}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={handleCnpjSearch}
            disabled={cnpjLoading}
            className="shrink-0"
          >
            {cnpjLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="razaoSocial">Razão Social *</Label>
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
            onChange={(e) => handleChange("telefone", formatPhone(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              placeholder="00000-000"
              value={formData.cep}
              onChange={(e) => {
                const formatted = formatCep(e.target.value);
                handleChange("cep", formatted);
                if (cleanDigits(formatted).length === 8) {
                  handleCepSearch(formatted);
                }
              }}
            />
            {cepLoading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
          </div>
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
            maxLength={2}
            value={formData.estado}
            onChange={(e) => handleChange("estado", e.target.value.toUpperCase())}
          />
        </div>
      </div>
    </div>
  );
}
