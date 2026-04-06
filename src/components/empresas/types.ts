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
  brandLogoUrl: string;
  brandLogoPath: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  brandAccentColor: string;
  brandBgColor: string;
  brandTextColor: string;
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
  brandLogoUrl: "",
  brandLogoPath: "",
  brandPrimaryColor: "#1E2952",
  brandSecondaryColor: "#4F46E5",
  brandAccentColor: "#10B981",
  brandBgColor: "#F3F4F6",
  brandTextColor: "#1F2937",
};
