import { CompanyStatus } from "@/components/ui/status-badge";

export interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  email: string;
  telefone: string;
  status: CompanyStatus;
  cidade: string;
  estado: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
}

export interface CompanyFormData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export const initialFormData: CompanyFormData = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  responsavel: "",
  email: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};
