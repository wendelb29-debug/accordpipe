import { useMemo, useState, useEffect } from "react";
import {
  CheckCircle2, AlertCircle, AlertTriangle, Clock, Info, Copy,
  ChevronDown, ChevronRight, Shield, Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─── Official variable registry ───────────────────────────────────────────────

type VarStatus = "supported" | "missing_source" | "signature_only" | "invalid" | "duplicate";
type VarSource = "lead" | "proposta" | "tenant" | "vendedor" | "assinatura_cliente" | "assinatura_vendedor" | "sistema";

interface VarDefinition {
  source: VarSource;
  description: string;
  signatureOnly?: boolean;
}

const OFFICIAL_VARIABLES: Record<string, VarDefinition> = {
  // Lead / Client
  nome_completo: { source: "lead", description: "Nome completo do cliente" },
  cpf: { source: "lead", description: "CPF do cliente" },
  cnpj: { source: "lead", description: "CNPJ do cliente" },
  documento_contratante: { source: "lead", description: "CPF ou CNPJ do contratante" },
  razao_social: { source: "lead", description: "Razão social" },
  email: { source: "lead", description: "E-mail do cliente" },
  telefone: { source: "lead", description: "Telefone do cliente" },
  whatsapp: { source: "lead", description: "WhatsApp do cliente" },
  data_nascimento: { source: "lead", description: "Data de nascimento" },
  endereco: { source: "lead", description: "Endereço do cliente" },
  numero: { source: "lead", description: "Número do endereço" },
  bairro: { source: "lead", description: "Bairro" },
  cidade: { source: "lead", description: "Cidade" },
  estado: { source: "lead", description: "Estado" },
  cep: { source: "lead", description: "CEP" },
  nome_empresa: { source: "lead", description: "Nome da empresa" },
  // Tenant
  tenant_nome: { source: "tenant", description: "Nome do Tenant" },
  tenant_cnpj: { source: "tenant", description: "CNPJ do Tenant" },
  tenant_razao_social: { source: "tenant", description: "Razão social do Tenant" },
  tenant_email: { source: "tenant", description: "E-mail do Tenant" },
  tenant_telefone: { source: "tenant", description: "Telefone do Tenant" },
  tenant_endereco: { source: "tenant", description: "Endereço do Tenant" },
  tenant_cidade: { source: "tenant", description: "Cidade do Tenant" },
  tenant_estado: { source: "tenant", description: "Estado do Tenant" },
  // Proposal
  nome_item: { source: "proposta", description: "Nome do item" },
  descricao_item: { source: "proposta", description: "Descrição do item" },
  valor_proposta: { source: "proposta", description: "Valor da proposta" },
  valor_total: { source: "proposta", description: "Valor total" },
  servicos_contratados: { source: "proposta", description: "Lista de serviços contratados" },
  // Payment MRR
  forma_pagamento_mrr: { source: "proposta", description: "Forma de pagamento MRR" },
  quantidade_parcelas_mrr: { source: "proposta", description: "Quantidade de parcelas MRR" },
  data_primeira_parcela_mrr: { source: "proposta", description: "Data da 1ª parcela MRR" },
  dia_vencimento_mrr: { source: "proposta", description: "Dia de vencimento MRR" },
  meio_pagamento_mrr: { source: "proposta", description: "Meio de pagamento MRR" },
  valor_parcela_mrr: { source: "proposta", description: "Valor da parcela MRR" },
  valor_total_mrr: { source: "proposta", description: "Valor mensal MRR" },
  valor_total_contrato_mrr: { source: "proposta", description: "Valor total do contrato MRR" },
  resumo_pagamento_mrr: { source: "proposta", description: "Resumo do pagamento MRR" },
  parcelas_mrr: { source: "proposta", description: "Lista de parcelas MRR" },
  // Payment P&S
  forma_pagamento_ps: { source: "proposta", description: "Forma de pagamento P&S" },
  quantidade_parcelas_ps: { source: "proposta", description: "Quantidade de parcelas P&S" },
  valor_total_ps: { source: "proposta", description: "Valor total P&S" },
  resumo_pagamento_ps: { source: "proposta", description: "Resumo do pagamento P&S" },
  // Vendor
  nome_vendedor: { source: "vendedor", description: "Nome do vendedor" },
  email_vendedor: { source: "vendedor", description: "E-mail do vendedor" },
  telefone_vendedor: { source: "vendedor", description: "Telefone do vendedor" },
  data_nascimento_vendedor: { source: "vendedor", description: "Data nasc. do vendedor" },
  // Signature - Client
  data_assinatura_cliente: { source: "assinatura_cliente", description: "Data da assinatura", signatureOnly: true },
  hora_assinatura_cliente: { source: "assinatura_cliente", description: "Hora da assinatura", signatureOnly: true },
  geolocalizacao_cliente: { source: "assinatura_cliente", description: "Geolocalização", signatureOnly: true },
  selfie_cliente: { source: "assinatura_cliente", description: "Selfie do cliente", signatureOnly: true },
  // Signature - Vendor
  data_assinatura_vendedor: { source: "assinatura_vendedor", description: "Data da assinatura", signatureOnly: true },
  hora_assinatura_vendedor: { source: "assinatura_vendedor", description: "Hora da assinatura", signatureOnly: true },
  geolocalizacao_vendedor: { source: "assinatura_vendedor", description: "Geolocalização", signatureOnly: true },
  selfie_vendedor: { source: "assinatura_vendedor", description: "Selfie do vendedor", signatureOnly: true },
  // System
  data_atual: { source: "sistema", description: "Data atual" },
};

// Critical variables that MUST have values to allow generation
const CRITICAL_ALWAYS: string[] = [
  "nome_completo",
  "documento_contratante",
  "tenant_nome",
  "tenant_cnpj",
];

// Critical if they appear in the template (proposal-dependent)
const CRITICAL_IF_PRESENT: string[] = [
  "servicos_contratados",
  "valor_total",
];

const sourceLabels: Record<VarSource, string> = {
  lead: "Lead / Cliente",
  proposta: "Proposta",
  tenant: "Tenant",
  vendedor: "Vendedor",
  assinatura_cliente: "Assinatura Cliente",
  assinatura_vendedor: "Assinatura Vendedor",
  sistema: "Sistema",
};

const sourceColors: Record<VarSource, string> = {
  lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  proposta: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  tenant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  vendedor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  assinatura_cliente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  assinatura_vendedor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sistema: "bg-muted text-muted-foreground",
};

const statusConfig: Record<VarStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  supported: { label: "Preenchida", icon: CheckCircle2, color: "text-green-600" },
  missing_source: { label: "Sem valor", icon: AlertCircle, color: "text-amber-600" },
  signature_only: { label: "Preenchida na assinatura", icon: Clock, color: "text-blue-600" },
  invalid: { label: "Inválida", icon: AlertTriangle, color: "text-red-600" },
  duplicate: { label: "Duplicada", icon: Copy, color: "text-orange-600" },
};

interface AuditVariable {
  name: string;
  status: VarStatus;
  source: VarSource | null;
  description: string;
  value: string;
  count: number;
  critical: boolean;
  suggestion?: string;
}

export interface AuditReport {
  variables: AuditVariable[];
  summary: {
    total: number;
    valid: number;
    missingSource: number;
    invalid: number;
    signatureOnly: number;
    duplicated: number;
  };
  criticalMissing: string[];
  suggestions: string[];
  canGenerate: boolean;
}

// ─── Extract variables from text ──────────────────────────────────────────────

function extractVariables(text: string): Map<string, number> {
  const matches = text.match(/\{\{\s*(\w+)\s*\}\}/g) || [];
  const counts = new Map<string, number>();
  for (const m of matches) {
    const name = m.replace(/\{\{|\}\}/g, "").trim();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return counts;
}

// ─── Build audit report ───────────────────────────────────────────────────────

export function buildAuditReport(
  templateText: string,
  resolvedValues: Record<string, string>,
): AuditReport {
  const found = extractVariables(templateText);
  const variables: AuditVariable[] = [];
  const foundNames = new Set(found.keys());

  found.forEach((count, name) => {
    const def = OFFICIAL_VARIABLES[name];
    const resolvedKey = `{{${name}}}`;
    const value = resolvedValues[resolvedKey] || "";

    if (!def) {
      variables.push({
        name, status: "invalid", source: null,
        description: "Variável não reconhecida pelo sistema",
        value: "", count, critical: false,
      });
      return;
    }

    let status: VarStatus = "supported";
    if (def.signatureOnly) {
      status = "signature_only";
    } else if (!value) {
      status = "missing_source";
    }

    const isCritical =
      CRITICAL_ALWAYS.includes(name) ||
      (CRITICAL_IF_PRESENT.includes(name) && foundNames.has(name));

    variables.push({
      name, status, source: def.source,
      description: def.description,
      value, count,
      critical: isCritical,
    });
  });

  // Check duplicates (only flag if >3 occurrences)
  for (const v of variables) {
    if (v.count > 3 && v.status !== "invalid") {
      v.suggestion = `"${v.name}" aparece ${v.count} vezes — verifique se há repetição desnecessária`;
    }
  }

  // Critical variables that are in the template but have no value
  const criticalMissing = variables
    .filter(v => v.critical && v.status === "missing_source")
    .map(v => v.name);

  // Also check critical-always vars that are NOT in the template at all
  for (const name of CRITICAL_ALWAYS) {
    if (!foundNames.has(name)) {
      criticalMissing.push(name);
    }
  }

  // Auto-suggestions
  const suggestions: string[] = [];
  if (foundNames.has("cpf") && foundNames.has("cnpj") && !foundNames.has("documento_contratante")) {
    suggestions.push("Considere usar {{documento_contratante}} em vez de {{cpf}} e {{cnpj}} separados");
  }
  if (foundNames.has("cpf") && foundNames.has("documento_contratante")) {
    suggestions.push("{{cpf}} e {{documento_contratante}} podem ter dados sobrepostos — considere usar apenas {{documento_contratante}}");
  }
  if (foundNames.has("nome_item") && foundNames.has("servicos_contratados")) {
    suggestions.push("{{nome_item}} e {{servicos_contratados}} podem ter dados sobrepostos — use apenas um");
  }
  if (foundNames.has("valor_proposta") && foundNames.has("valor_total")) {
    suggestions.push("{{valor_proposta}} e {{valor_total}} podem ter o mesmo valor — escolha um para evitar confusão");
  }
  for (const v of variables) {
    if (v.suggestion) suggestions.push(v.suggestion);
  }

  const summary = {
    total: variables.length,
    valid: variables.filter(v => v.status === "supported").length,
    missingSource: variables.filter(v => v.status === "missing_source").length,
    invalid: variables.filter(v => v.status === "invalid").length,
    signatureOnly: variables.filter(v => v.status === "signature_only").length,
    duplicated: variables.filter(v => v.count > 3).length,
  };

  const uniqueCriticalMissing = [...new Set(criticalMissing)];
  const canGenerate = uniqueCriticalMissing.length === 0;

  return { variables, summary, criticalMissing: uniqueCriticalMissing, suggestions, canGenerate };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  templateText: string;
  resolvedValues: Record<string, string>;
  compact?: boolean;
  onValidationChange?: (canGenerate: boolean) => void;
}

export function ContractVariableAudit({ templateText, resolvedValues, compact = false, onValidationChange }: Props) {
  const [expanded, setExpanded] = useState(!compact);

  const report = useMemo(
    () => buildAuditReport(templateText, resolvedValues),
    [templateText, resolvedValues],
  );

  const { summary, variables, criticalMissing, suggestions, canGenerate } = report;

  useEffect(() => {
    onValidationChange?.(canGenerate);
  }, [canGenerate, onValidationChange]);

  // Group variables by source
  const grouped = useMemo(() => {
    const map = new Map<string, AuditVariable[]>();
    for (const v of variables) {
      const key = v.source ? sourceLabels[v.source] : "Desconhecida";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [variables]);

  if (variables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        Nenhuma variável <code>{"{{...}}"}</code> encontrada no modelo
      </div>
    );
  }

  // Status message
  const statusMessage = !canGenerate
    ? { text: "Existem variáveis obrigatórias sem valor. Corrija os dados antes de gerar o documento.", type: "error" as const }
    : summary.signatureOnly > 0
    ? { text: "Modelo validado. Algumas variáveis serão preenchidas no processo de assinatura.", type: "info" as const }
    : { text: "Modelo validado com sucesso. O documento está pronto para ser gerado.", type: "success" as const };

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      {/* Status banner */}
      <div className={cn(
        "px-3 py-2 flex items-center gap-2 text-xs font-medium",
        statusMessage.type === "error" && "bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400",
        statusMessage.type === "info" && "bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:text-blue-400",
        statusMessage.type === "success" && "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400",
      )}>
        {statusMessage.type === "error" && <Ban className="h-3.5 w-3.5 shrink-0" />}
        {statusMessage.type === "info" && <Clock className="h-3.5 w-3.5 shrink-0" />}
        {statusMessage.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
        {statusMessage.text}
      </div>

      {/* Summary header (collapsible) */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 border-t hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Preview de preenchimento do contrato
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200">
            {summary.valid} preenchidas
          </Badge>
          {summary.signatureOnly > 0 && (
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200">
              {summary.signatureOnly} assinatura
            </Badge>
          )}
          {summary.missingSource > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200">
              {summary.missingSource} sem valor
            </Badge>
          )}
          {summary.invalid > 0 && (
            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200">
              {summary.invalid} inválida(s)
            </Badge>
          )}
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          {/* Summary stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-border">
            {[
              { label: "Total", value: summary.total, color: "text-foreground" },
              { label: "Preenchidas", value: summary.valid, color: "text-green-600" },
              { label: "Sem valor", value: summary.missingSource, color: "text-amber-600" },
              { label: "Inválidas", value: summary.invalid, color: "text-red-600" },
              { label: "Assinatura", value: summary.signatureOnly, color: "text-blue-600" },
              { label: "Duplicadas", value: summary.duplicated, color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="bg-background px-2 py-2 text-center">
                <div className={cn("text-sm font-bold", s.color)}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Critical missing warning */}
          {criticalMissing.length > 0 && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/10 border-t border-b border-red-100 dark:border-red-900/30">
              <div className="flex items-start gap-2">
                <Ban className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-red-700 dark:text-red-400">
                    Variáveis obrigatórias sem valor — geração bloqueada:
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {criticalMissing.map((name) => (
                      <code key={name} className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
                        {`{{${name}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30">
              <div className="flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Sugestões de otimização:</p>
                  {suggestions.map((s, i) => (
                    <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400">• {s}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detailed variable list grouped by source */}
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {Array.from(grouped.entries()).map(([sourceName, vars]) => (
                <div key={sourceName}>
                  <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {sourceName} ({vars.length})
                  </div>
                  {vars.map((v) => {
                    const cfg = statusConfig[v.status];
                    const Icon = cfg.icon;
                    return (
                      <div key={v.name} className={cn(
                        "px-3 py-1.5 flex items-center gap-2 text-[11px]",
                        v.critical && v.status === "missing_source" && "bg-red-50/50 dark:bg-red-900/5",
                      )}>
                        <Icon className={cn("h-3 w-3 shrink-0", cfg.color)} />
                        <code className="font-mono text-foreground shrink-0">{`{{${v.name}}}`}</code>
                        {v.critical && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 shrink-0">
                            obrigatória
                          </Badge>
                        )}
                        <span className="text-muted-foreground truncate flex-1 min-w-0">
                          {v.status === "signature_only"
                            ? "Preenchida no fluxo de assinatura"
                            : v.value
                            ? ""
                            : v.description}
                        </span>
                        {v.status === "supported" && v.value && (
                          <span className="text-[10px] text-green-600 dark:text-green-400 truncate max-w-[180px] shrink-0" title={v.value}>
                            → {v.value}
                          </span>
                        )}
                        {v.status === "missing_source" && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                            sem valor
                          </span>
                        )}
                        <Badge variant="outline" className={cn("text-[9px] shrink-0 ml-auto", v.source ? sourceColors[v.source] : "")}>
                          {v.source ? sourceLabels[v.source] : "—"}
                        </Badge>
                        {v.count > 1 && (
                          <span className="text-[9px] text-muted-foreground shrink-0">×{v.count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer note */}
          <div className="px-3 py-2 border-t bg-muted/20 text-[10px] text-muted-foreground">
            Variáveis de assinatura serão preenchidas automaticamente durante o processo de assinatura.
            Variáveis sem valor ficarão em branco caso os dados não estejam disponíveis.
          </div>
        </div>
      )}
    </div>
  );
}
