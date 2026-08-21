import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ResolveCloserContext {
  lead?: any;
  user?: any;
  workspaceName?: string;
  metadata?: Record<string, any>;
  customValues?: Record<string, string>;
}

export function resolveCloserTemplate(template: string, context: ResolveCloserContext): string {
  if (!template) return "";

  const now = new Date();
  
  // Extract values from context
  const { lead, user, workspaceName, metadata, customValues } = context;
  
  // Helper for BRL formatting
  const toBRL = (val: number | string | null | undefined) => {
    const n = Number(val);
    if (isNaN(n)) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  // Build replacement map (ignoring case)
  const replacements: Record<string, string> = {
    // Lead Data
    "\\[Nome\\]": lead?.contact_name || lead?.metadata?.client_name || customValues?.Nome || "[Nome]",
    "\\[Cliente\\]": lead?.contact_name || lead?.metadata?.client_name || customValues?.Cliente || "[Cliente]",
    "\\[Telefone\\]": lead?.phone || lead?.metadata?.client_phone || customValues?.Telefone || "[Telefone]",
    "\\[WhatsApp\\]": lead?.phone || lead?.metadata?.client_phone || customValues?.WhatsApp || "[WhatsApp]",
    "\\[Empresa\\]": lead?.company_name || customValues?.Empresa || "Accord Pipe",
    "\\[Email\\]": lead?.email || customValues?.Email || "[Email]",
    
    // Vehicle (Save Car specific)
    "\\[Veiculo\\]": lead?.metadata?.vehicle || customValues?.Veiculo || "[Veiculo]",
    "\\[Placa\\]": lead?.metadata?.placa || customValues?.Placa || "[Placa]",
    "\\[Placa/Modelo\\]": lead?.metadata?.vehicle || lead?.notes || customValues?.["Placa/Modelo"] || "[Placa/Modelo]",
    
    // Responsibility
    "\\[Responsavel\\]": lead?.assigned_to_user_id || user?.name || "[Responsavel]",
    "\\[Vendedor\\]": user?.name || "[Vendedor]",
    "\\[NomeVendedor\\]": user?.name || "[NomeVendedor]",
    
    // Workspace
    "\\[Workspace\\]": workspaceName || "[Workspace]",
    
    // Time
    "\\[Data\\]": format(now, "dd/MM/yyyy", { locale: ptBR }),
    "\\[Hora\\]": format(now, "HH:mm", { locale: ptBR }),
    
    // Financial
    "\\[ValorPS\\]": toBRL(lead?.value_ps || customValues?.ValorPS),
    "\\[ValorMRR\\]": toBRL(lead?.value_mrr || customValues?.ValorMRR),
  };

  let resolved = template;
  
  // Case-insensitive replacement
  for (const [pattern, value] of Object.entries(replacements)) {
    const regex = new RegExp(pattern, "gi");
    resolved = resolved.replace(regex, value);
  }

  return resolved;
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  
  // Brazilian logic
  if (digits.length === 10 || digits.length === 11) {
    if (!digits.startsWith("55")) {
      digits = "55" + digits;
    }
  }
  
  return digits;
}
